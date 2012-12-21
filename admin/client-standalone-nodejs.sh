#!/bin/bash

## Creates a self-contained Meteor library that is suitable for
## building standalone clients that run in nodejs rather than the
## browser.

set -e

PACKAGES_DIR=`dirname $0`/../packages

echo '/****************************************'
echo ' * Do not edit. This file is generated from Meteor. To regenerate, run:'
echo ' *'
echo ' *   mycheckout/meteor/admin/client-standalone-nodejs.sh > file.js'
echo ' *'
echo ' * where "mycheckout" is the path to your Meteor checkout, and'
echo ' * "file.js" is the path to this file.'
echo ' ***************************************/'
echo

# underscore (depended on by 'meteor')
cat $PACKAGES_DIR/underscore/underscore.js

# 'meteor' package (automatically depended on by all packages)
cat $PACKAGES_DIR/meteor/server_environment.js
cat $PACKAGES_DIR/meteor/helpers.js
cat $PACKAGES_DIR/meteor/timers.js
cat $PACKAGES_DIR/meteor/fiber_helpers.js
cat $PACKAGES_DIR/meteor/dynamics_nodejs.js

# misc dependencies
cat $PACKAGES_DIR/logging/logging.js
cat $PACKAGES_DIR/uuid/uuid.js

# minimongo (livedata depends on it, for subscription management)
cat $PACKAGES_DIR/minimongo/minimongo.js
cat $PACKAGES_DIR/minimongo/selector.js
cat $PACKAGES_DIR/minimongo/sort.js
cat $PACKAGES_DIR/minimongo/uuid.js
cat $PACKAGES_DIR/minimongo/modify.js
cat $PACKAGES_DIR/minimongo/diff.js

# livedata - client side
# (does not provide a 'default connection')
cat $PACKAGES_DIR/livedata/stream_client_nodejs.js
cat $PACKAGES_DIR/livedata/livedata_common.js
cat $PACKAGES_DIR/livedata/livedata_connection.js
cat $PACKAGES_DIR/livedata/client_convenience.js

# mongo-livedata - client side
cat $PACKAGES_DIR/mongo-livedata/local_collection_driver.js
cat $PACKAGES_DIR/mongo-livedata/collection.js

# Packages that are force-loaded in Meteor that we do not load:
# deps, session, spark, templating, startup, past.
