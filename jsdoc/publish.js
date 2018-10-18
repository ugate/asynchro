"use strict";

const Engine = require("minami/publish");
const pkg = require('../package.json');
const { exec } = require('child_process');

/**
 * @param {TAFFY} taffyData See <http://taffydb.com/>.
 * @param {object} opts
 * @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
  const thiz = this, args = arguments;
  return new Promise((resolve, reject) => {
    exec(`npm view ${pkg.name} versions --json`, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(`Unable to capture published npm versions for: ${stderr}`));
      if (!stdout) return reject(new Error(`Unable to capture published npm versions for: ${pkg.version}`));
      try {
        const versions = JSON.parse(stdout);
        env.meta = { // accessibility in templates
          package: pkg,
          versions 
        };
        opts.template = opts.templateProxy; // actual template
        resolve(Engine.publish.apply(thiz, args)); // no need to customize how docs are parsed, jut the layout .tmpl files
      } catch(err) {
        reject(err);
      }
    });
  });
};
