'use strict';

var _ = require('lodash');
var aliases = require('./aliases');

/* jscs:disable jsDoc */
_.transform(aliases, function(obj, value, alias) {
  Object.defineProperty(obj, alias, {
    enumerable: true,
    get: function() { return require('./' + value); },
  });
}, exports);
/* jscs:enable jsDoc */

exports.base = require('./base');
exports.aliases = aliases;
