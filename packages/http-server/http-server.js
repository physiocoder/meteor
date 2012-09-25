// XXX depend on a dummy ArrayBuffer package
// XXX align names with our http client API
// XXX let the user control what we gzip

(function () {

HttpServer = {};

/**
 * Listen for HTTP requests that match a pattern.
 *
 * @param {String} host The hostname to listen on. It may be a
 * specific host like "mydomain.com" or "site.mydomain.com", or it may
 * be a wildcard that starts with "*.", such as "*.mydomain.com", or
 * "*.site.mydomain.com". Wildcards match exactly one name part, that
 * is, "*.mydomain.com" does not match "subsite.site.mydomain.com". It
 * can also be an IP address, such as "1.1.1.1", to listen to all
 * requests received on a particular IP. When listening on an IP, if a
 * request is received that doesn't include a HTTP/1.1 Host: header,
 * it will be rejected with a 400 error code (Bad Request.) The string
 * host also optionally * contain a port, as in
 * "mydomain.com:1234". If no port is provided it defaults to 80. No
 * IDNA encoding is * performed, so if you want to listen on a
 * hostname that contains * characters other than letters, digits, and
 * hyphens, you will need * to perform the IDNA encoding yourself.
 *
 * @param {RegExp} urlPattern The URL pattern to listen for. The URL
 * will be formatted as a relative URL beginning with a '/', for
 * example '/' or '/mypage?thing=1'.
 *
 * @param {Function} handler The function to call when a HTTP request
 * is received on `host` for a path matching `pathRegexp`. It receives
 * one argument, the request.
 *
 * @return {Object} A handle for the listener. It is an object with
 * one method `stop`. Call `stop()` to stop listening.
 *
 * This function will throw an exception if the process doesn't have
 * permission to listen to requests on the requested `host`.
 *
 * If the client sends an "Expect: 100-continue" header, the server
 * will automatically respond with "100 Continue" to tell the client
 * to send the rest of the request. In the future, we might provide a
 * hook to let your code reject such a request after looking at the
 * headers, rather than telling the client to send the request body.
 *
 * XXX specify what happens if multiple match
 */

HttpServer.listen = function (host, urlPattern, handler) {
};

/**
 * Represents an inbound HTTP request (as delivered by
 * HttpServer.listen.)
 */
HttpServer.Request = function (method, host, url, headers) {
  /**
   * {String} The HTTP verb, such as 'GET' or 'POST'.
   */
  this.method = method;

  /**
   * {String} The host where the request was received, possibly
   * including a port, for example "mydomain.com" or
   * "site.mydomain.com:3000". Unlike the 'host' argument to
   * HttpServer.listen, this will never be an IP address and will
   * never contain a "*" wildcard.
   */
  this.host = host;

  /**
   * {String} The URL requested, such as '/' or '/mypage?thing=1'.
   */
  this.url = url;

  /**
   * {String} The HTTP protocol version used for the request, such as
   * '1.1'.
   */
  this.httpVersion = httpVersion;

  /**
   * {Object} The request headers, as a map from strings to
   * strings. The complete set of headers may not be available until
   * after all of the request data is read (specifically: if the
   * client uses chunked encoding, then headers will be modified after
   * calling read()/readString() to include any trailers that are sent
   * after the last chunk.)
   */
  this.headers = headers;

  /**
   * {Boolean} True if the "chunked" encoding will be used to send the
   * response data. This will be true for modern (HTTP 1.1) clients,
   * and false for old clients.
   *
   * When chunkedResponse is false, your application code should be
   * sure to (manually) set a Content-Length header. If you do not,
   * Meteor will have to turn off connection keepalive, which for many
   * sites will decrease performance.
   *
   * Also when chunkedResponse is false, it is an error to pass
   * headers ("trailers") to `end`.
   */
  this.chunkedResponse = (this.httpVersion === "1.1");

  /**
   * {Boolean} True if an error occurred (for example, the client
   * dropped the connection) and Meteor has given up on sending a
   * response, meaning that there is no point in calling functions
   * like write().
   */
  this.error = false;
};

_.extend(HttpServer.Request.prototype, {
  /**
   * Read the contents of the request body. If no `callback` is
   * provided, the contents of the body are read off of the network
   * into a buffer and returned as an ArrayBuffer. Otherwise,
   * `callback` is synchronously called zero or more times with a
   * single argument, an ArrayBuffer, to deliver the request body in
   * smaller pieces. The function will not return until the entire
   * request body has been read.
   *
   * If the entire request body was not read successfully, then this
   * function returns `false`. Otherwise it return the data (no
   * callback provided) or `true` (if a callbacks was provided.)
   *
   * When using a callback, the callback can return `false` to stop
   * reading the body and drop the HTTP connection (for example, if
   * the client tries to send an unreasonably large amount of data.)
   *
   * XXX we need to provide the ability to set a timeout on how long
   * it can take to read a request, probably in terms of both
   * wallclock time and transfer rate, and give it a reasonable
   * default value
   */
  read: function (callback) {
  },

  /**
   * Works just like 'read', but returns the body as a string rather
   * than an ArrayBuffer. The correct character encoding will be
   * automatically determined from the request headers. Specifically,
   * the character encoding will be determined by the 'charset' option
   * to Content-Type header, and if this option isn't present, then
   * the HTTP default of ISO-8859-1 will be used.
   */
  readString: function (callback) {
  },

  /**
   * Begin sending the response to the request. The only required
   * argument is statusCode.
   *
   * @param {Number} statusCode an HTTP status code, such as 200 or
   * 404
   *
   * @param {String} reasonPhrase a human-readable message to go with
   * statusCode, for example "Not found" for 404. If omitted or set to
   * null, Meteor will supply a default phrase that's appropriate for
   * statusCode.
   *
   * @params {Object} headers HTTP headers to send with the response
   * (a map from strings to strings.)
   *
   * If `error` is true then this method does nothing.
   *
   * In general the headers are sent exactly as supplied, but there is
   * special handling for a few headers:
   *
   * Date: If you do not supply a Date header, then Meteor will supply
   * one with the current server time, as required by the standard.
   *
   * Transfer-Encoding: Do not supply this header. Meteor will choose
   * an appropriate transfer coding and set the header ('chunked' for
   * HTTP/1.1 clients, or no encoding for older clients.)
   *
   * Connection: If you don't supply a Connection header, and
   * `chunkedResponse` is false, and you do not provide a
   * Content-Length header, then Meteor will supply a "Connection:
   * close" header. (But this is probably unnecessary in normal use,
   * since if `chunkedResponse` is false, you are talking to a
   * pre-HTTP/1.1 client and the default is no keepalive. For that
   * reason, this may be removed in the future.)
   */
  begin: function (statusCode, reasonPhrase, headers) {
  },

  /**
   * Send the body of the response. This function may be called
   * multiple times to write successive parts of the response.
   *
   * @param {ArrayBuffer} data Response data to send to the client
   *
   * This function may block until buffer space is available. It has
   * no effect if `error` is true (for example, if the remote has
   * dropped the connection.)
   */
  write: function (data) {
  },

  /**
   * Just like `write` but takes a string rather than an
   * `ArrayBuffer`. If the string contains non-ASCII characters they
   * will be automatically encoded (using the encoding specified in
   * the `charset` option on the `Content-Type` response header if
   * provided, or else the HTTP default encoding, ISO-8859-1.)
   */
  writeString: function (data) {
  },

  /**
   * Finish responding to the request. Must be called exactly once,
   * after all of the response body data has been written with
   * `write`.
   *
   * `headers` may be additional HTTP headers to send in the
   * 'trailers' portion of the response. (This is only allowed when
   * `chunkedResponse` is true. If false, and headers are given, an
   * exception is thrown.)
   */
  end: function (headers) {
  }
});

})();


/*
request:
 - events: data, end, close
 - attributes: method, url, headers, trailers, httpVersion
 - methods:
   - setEncoding
   - pause, resume
   - connection

The model is that you get the data as a buffer, unless you've called
setEncoding in which case you get it as a string (having been decoded
as instructed.)

response:
 - events: close
 - methods:
   - writeContinue
   - writeHead(statusCode, [reasonPhrase, headers])
     - if you call write() first, we'll write the header for you
     - based on properties you set: statusCode, setHeader
       - date's set for you (sendDate)
       - can modify/read headers before they're sent
   - write, end
     - write returns true if entirely flushed. else, can listen for 'drain'
       event
   - addTrailers

The model is that you can pass in strings, but only if you specify the
encoding. Setting headers correctly to match is up to you.

*/
