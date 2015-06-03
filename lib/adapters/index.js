'use strict';

var _ = require('lodash');
var aliases = require('./aliases');

_.transform(aliases, function(obj, value, alias) {
  obj[alias] = require('./' + value);
}, exports);

exports.base = require('./base');
exports.aliases = aliases;