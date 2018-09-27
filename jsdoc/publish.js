"use strict";

const Engine = require("minami/publish");
const pkg = require('../package.json');

/**
 * @param {TAFFY} taffyData See <http://taffydb.com/>.
 * @param {object} opts
 * @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
  env.meta = {
    package: pkg // package accessibility in templates
  };
  opts.template = "./node_modules/minami"; // actual template
  return Engine.publish.apply(this, arguments); // no need to customize how docs are parsed, jut the layout .tmpl files
};
