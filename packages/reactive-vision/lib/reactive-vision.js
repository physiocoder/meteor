(function () {

  // Call the invokingFn with the results of calling the argFn.
  function compose (invokingFn, argFn) {
    return function () {
      var args = argFn.apply(this, arguments);
      args = _.isArray(args) ? args : [args];
      return invokingFn.apply(this, args);
    };
  }

  function unwrap () {
    var _wrapped = this._wrapped;
    for (var i = 0; i < _wrapped.length; i++) {
      _wrapped[i].reset();
    }
    this._wrapped = [];
  }

  // wrap the original method with the wrapper, and track the wrapper
  // so we can reset it later.
  function wrap (namespace, fn, wrapper, type) {
    var host  = this;
    var old = namespace[fn];

    type = type || 'before';
    
    namespace[fn] = function () {
      var result;
      var args;
      var self = this;

      switch(type) {
        case 'before':
          args = wrapper.apply(this, arguments);
          result = old.apply(this, arguments);
          break;
        case 'after':
          result = old.apply(this, arguments);
          wrapper.apply(this, arguments);
          break;
        case 'composeWithOriginal':
          result = compose(wrapper, old).apply(this, arguments);
          break;
        case 'composeWithWrapper':
          result = compose(old, wrapper).apply(this, arguments);
          break;
      }

      return result;
    };

    host._wrapped.push({
      reset: function () {
        namespace[fn] = old;
      }
    });
  }

  function wrapRangeWithSpan (r) {
    r.operate(function (oldStart, oldEnd) {
      var frag = DomUtils.htmlToFragment("<span></span>");
      oldStart.parentNode.insertBefore(frag, oldStart);
      var spanEl = oldStart.previousSibling;

      var walk = oldStart;

      while (true) {
        var next = walk.nextSibling;
        spanEl.appendChild(walk);

        if (walk === oldEnd)
          break;
        walk = next;
      }
    });
  }

  function unWrapRangeWithSpan (r) {
    r.operate(function (oldStart, oldEnd) {
      var spanEl = oldStart;
      var walk = spanEl.firstChild;
      while (walk) {
        var next = walk.nextSibling;
        oldStart.parentNode.insertBefore(walk, oldStart);
        walk = next;
      }

      spanEl.remove();
    });
  }

  function getRangeRect (range) {
    var rect, el;

    wrapRangeWithSpan(range);
    el = range.firstNode();
    rect = el.getBoundingClientRect();
    unWrapRangeWithSpan(range);

    return {
      top: rect.top,
      left: rect.left,
      height: rect.bottom - rect.top,
      width: rect.right - rect.left
    };
  }

  function highlight (el, after) {
    $(el).animate({
      opacity: 0.5
    }, 1000, function () {
      $(el).animate({
        opacity: 0
      }, 1000, function () {
        after(el);
      });
    });
  }

  function showMask (rect, callback) {
    var self = this;
    var id = Meteor.uuid();
    var mask = $('<div>')
      .attr('id', id) 
      .css({
        position: 'absolute',
        background: self.options.background || 'orange',
        padding: self.options.padding || '0px',
        border: self.options.border || '1px solid red',
        opacity: 0,
        'z-index': 10000,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      })
      .appendTo(document.body);

    highlight(mask, function () {
      mask.remove();
      callback && callback();
    });
  }

  var instance = null;

  function ReactiveVision () {
    if (instance) return instance;
    instance = this;

    this._logCounter = 0;
    this._log = [];
    this._wrapped = [];
    this._callbacks = [];
    this.options = {
      background: 'Orange',
      padding: '0px',
      border: '1px solid Red'
    };

    this.start();
  }

  ReactiveVision.prototype = {
    constructor: ReactiveVision,

    configure: function (options) {
      _.extend(this.options, options);
      return this;
    },

    start: function () {
      this._wrap();
    },

    stop: function () {
      this._unwrap();
    },

    clear: function () {
      this._logCounter = 0;
      this._log = [];
    },

    log: function (msg, options) {
      var message, type;
      if (arguments.length) {
        var name = options.name && '"' + options.name + '"';
        type = (options.type || '') + ' ' + (name || '');
        message = [
          ++this._logCounter,
          ': ',
          type ? '<' + type + '> ' : ' ',
          msg
        ].join('');

        this._log.push(message);
        this.fireLogEvent(message);
      } else {
        return this._log;
      }
    },

    onLog: function (callback) {
      this._callbacks.push(callback);

      if (this._log.length) {
        _.each(this._log, function (msg) {
          callback(msg);
        });
      }

      return this;
    },

    fireLogEvent: function (message) {
      _.each(this._callbacks, function (cb) {
        cb(message);
      });
      return this;
    },

    _wrap: function () {
      var self = this;
      wrap.call(self, Meteor, "_def_template", function (name, raw_func) {
        var wrappedRawFunc = function () {
          var res = raw_func.apply(this, arguments);
          self.log('Rendering', {
            name: name || 'body',
            type: 'Template'
          });
          return res;
        };

        return [name, wrappedRawFunc];
      }, 'composeWithWrapper');

      wrap.call(self, Spark, "renderToRange", function (range, htmlFunc) {
        Deps.afterFlush(function () {
          var rect = getRangeRect(range);
          showMask.call(self, rect);
        });
      }, 'after');

      wrap.call(self, Session, 'set', function (key, value) {
        var stringify = function (v) {
          if (v === undefined)
            return 'undefined';
          return EJSON.stringify(v);
        };

        var oldSerializedValue = 'undefined';
        var stringValue = stringify(value);

        if (_.has(Session.keys, key)) oldSerializedValue = Session.keys[key];
        if (stringValue !== oldSerializedValue) {
          self.log(
            'old: ' + oldSerializedValue + ' new: ' + stringValue,
            {
              type: 'Session',
              name: key
            }
          );
        }
      });

      wrap.call(self, Meteor.Collection.prototype, 'find', function (cursor) {
        var name = this._name;
        var log = function (action, msg) {
          self.log(action + ' ' + msg, {
            type: 'Collection',
            name: name
          });
        };

        cursor.observeChanges({
          added: function (id, fields) {
            log('Added', '_id: ' + id + ' ' + 'fields: ' + EJSON.stringify(fields));
          },

          changed: function (id, fields) {
            log('Changed', '_id: ' + id + ' ' + 'fields: ' + EJSON.stringify(fields));
          },

          movedBefore: function (id, before) {
            log('Moved', '_id: ' + id + ' ' + 'before: ' + EJSON.stringify(before));
          },

          removed: function (id) {
            log('Removed', '_id: ' + id);
          }
        });

        return cursor;

      }, 'composeWithOriginal');
    },

    _unwrap: function () {
      unwrap.call(this);
      return this;
    },
  };

  Meteor.ReactiveVision = new ReactiveVision();
}());
