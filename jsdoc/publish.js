"use strict";

const Engine = require("minami/publish");
const markdown = require('jsdoc/util/markdown');

const pkg = require('../package.json');
const { exec } = require('child_process');
const Fs = require('fs').promises;
const Path = require('path');

/**
 * Publishes a modules documentation along with the following:
 * - Drop-down selection for available documentation versions for listing of module versions
 * - A `CHANGELOG.md` link for the current version back to the previously published `npm` version
 * @param {TAFFY} taffyData See <http://taffydb.com/>
 * @param {Object} opts The options (only lists added options, see JSDoc for the full list of configuration options). All
 * of the listed option values can also contain `${}` template literals to paths within the following objects:
 * - `${package}`: The `package.json` object followed by any of it's properties (e.g. `${package.repository.url}/README.md`).
 * - `${publish.lastVersion}`: Will evaluate to the last version published to `npm` (or blank when nothing has been published yet).
 * - `${publish.moduleURL}`: Will basically evaluate to the `homepage` in `package.json`, but will also remove any _hashes_ in the
 * URL (e.g. assuming a `homepage` of `https://example.com/username/module#readme` would become
 * `https://example.com/username/module`).
 * - `${publish.date}`: The current date string formatted as `YYYY-MM-DD`
 * @param {String} [opts.templateProxy] Should reference a path to the actual JSDoc template being used (e.g. 
 * `./node_modules/minami` would be valid assuming that the `minami` template module is installed).
 * @param {Object} [opts.versions] The versions options used to generate links to previously published version docs
 * @param {String} [opts.versions.from] A Semantic Versioning compliant version that designates the first version to show
 * in the version drop-down selection for different docs (omit to list all of them)
 * @param {String} [opts.versions.include] A designation that inidcates what doc versions to show in the drop-down selection.
 * A designation of `major` will only show versions that have been released for __major___ version tags (i.e. the _first_
 * number in the version). A designation of `minor` will only show versions that have been released for __minor__ version
 * tags (i.e. the _second_ number in the version). Any other value, or lack thereof will include all versions.
 * @param {Object} [opts.changelog] The change log options used to generate the change log file and link
 * @param {String} [opts.changelog.line='* %s'] The _format_ for individual commit lines produced in the change log markdown.
 * @param {String} [opts.changelog.header=`## ${version}`] The markdown that will be pre-pended to the change log.
 * @param {Object} [opts.changelog.sections] The sections within the change log which organize changes (omit output a list without sections)
 * @param {String} [opts.changelog.sections.breaks] Section options for breaking changes
 * @param {String} [opts.changelog.sections.breaks.header] Markdown used as a _header_ when there are change log entries for breaking changes
 * @param {String} [opts.changelog.sections.breaks.grep] Section `grep` options for breaking changes
 * @param {String} [opts.changelog.sections.breaks.grep.regexp] The regular expression used as filter in the `git log -grep=` for breaking changes
 * @param {String} [opts.changelog.sections.breaks.grep.ignoreCase] `true` for case-insensitive `git log -i` for breaking changes
 * @param {String} [opts.changelog.sections.breaks.grep.extendedRegexp] `true` for _extended_ regular expressions `git log -E` for breaking changes
 * @param {String} [opts.changelog.sections.breaks.grep.allMatch] `true` to limit all regular expressions in the `grep` for breaking changes
 * @param {String} [opts.changelog.sections.features] Section options for features
 * @param {String} [opts.changelog.sections.features.header] Markdown used as a _header_ when there are change log entries for features
 * @param {String} [opts.changelog.sections.features.grep] Section `grep` options for features
 * @param {String} [opts.changelog.sections.features.grep.regexp] The regular expression used used as filter in the `git log -grep=` for features
 * @param {String} [opts.changelog.sections.features.grep.ignoreCase] `true` for case-insensitive `git log -i` for features
 * @param {String} [opts.changelog.sections.features.grep.extendedRegexp] `true` for _extended_ regular expressions `git log -E` for features
 * @param {String} [opts.changelog.sections.features.grep.allMatch] `true` to limit all regular expressions in the `grep` for features
 * @param {String} [opts.changelog.sections.fixes] Section options for features
 * @param {String} [opts.changelog.sections.fixes.header] Markdown used as a _header_ when there are change log entries for fixes
 * @param {String} [opts.changelog.sections.fixes.grep] Section `grep` options for fixes
 * @param {String} [opts.changelog.sections.fixes.grep.regexp] The regular expression used used as filter in the `git log -grep=` for fixes
 * @param {String} [opts.changelog.sections.fixes.grep.ignoreCase] `true` for case-insensitive `git log -i` for fixes
 * @param {String} [opts.changelog.sections.fixes.grep.extendedRegexp] `true` for _extended_ regular expressions `git log -E` for fixes
 * @param {String} [opts.changelog.sections.fixes.grep.allMatch] `true` to limit all regular expressions in the `grep` for fixes
 * @param {Tutorial} tutorials The turtorials
 */
exports.publish = function(taffyData, opts, tutorials) {
  const thiz = this, args = arguments;
  return new Promise((resolve, reject) => {
    env.meta = { package: pkg }; // accessibility in templates
    exec(`npm view ${pkg.name} versions --json`, async (error, stdout, stderr) => {
      try {
        // need to account for first-time publish where module does not exist in npm
        const versions = (!error && !stderr && stdout) || '[]', latestVersion = JSON.parse(versions).pop() || '';
        env.meta.publish = {
          lastVersion: latestVersion || pkg.version,
          moduleURL: pkg.homepage.replace(/#[^\/]*/g, ''),
          date: formatedDate()
        };
        await Fs.mkdir(opts.destination, { recursive: true });
        const verPath = Path.join(opts.destination, 'versions.json'), chglogPath = Path.join(opts.destination, 'CHANGELOG.html');
        const verWriteProm = Fs.writeFile(verPath, versions);
        const span = latestVersion ? `v${latestVersion}..HEAD ` : '';
        const line = opts.changelog && opts.changelog.line ? pkgr(opts.changelog.line, env.meta).replace(/"/g, '\\"') : '* %s';
        const header = opts.changelog && opts.changelog.header ? pkgr(opts.changelog.header, env.meta) : `## ${pkg.version}`;
        const gitlog = (grepo) => {
          const grep = grepo && grepo.regexp ? `--grep="${pkgr(grepo.regexp, env.meta).replace(/"/g, '\\"')}" ` : '';
          const rxi = grepo && grepo.ignoreCase ? '-i ' : '', rxe = grepo && grepo.extendedRegexp ? '-E ' : '';
          return new Promise((resolve, reject) => {
            exec(`git --no-pager log ${span}--oneline --no-merges ${rxi}${rxe}${grep}--pretty=format:"${line}" `, async (error, stdout, stderr) => {
              if (error) return reject(error);
              if (stderr) return reject(new Error(`Failed to generate CHANGELOG: ${stderr}`));
              resolve(stdout || '');
            });
          });
        };
        try {
          await verWriteProm;
        } catch (err) {
          err.message += ` (Unable to write ${verPath})`;
          return reject(err);
        }
        var chglog = '', cltxt = '', clps = [], sctns = opts.changelog && opts.changelog.sections;
        if (sctns) {
          if (sctns.breaks && sctns.breaks.grep) clps.push({ promise: gitlog(sctns.breaks.grep), opts: sctns.breaks });
          if (sctns.features && sctns.features.grep) clps.push({ promise: gitlog(sctns.features.grep), opts: sctns.features });
          if (sctns.fixes && sctns.fixes.grep) clps.push({ promise: gitlog(sctns.fixes.grep), opts: sctns.fixes });
        } else chglog += await gitlog();
        for (let cl of clps) {
          try {
            cltxt = await cl.promise;
            if (cltxt) chglog += `\n\n${cl.opts.header}\n${cltxt}`;
          } catch (err) {
            err.message += ` (Unable to capture CHANGELOG section "${cl.opts.header}" for grep "${cl.opts.grep}")`;
            return reject(err);
          }
        }
        try {
          const parse = markdown.getParser();
          chglog = parse(`${header}\n${chglog}`);
          await Fs.writeFile(chglogPath, chglog);
        } catch(err) {
          err.message += ` (Unable to write ${chglogPath})`;
          return reject(err);
        }
        opts.template = opts.templateProxy; // actual template
        resolve(Engine.publish.apply(thiz, args)); // no need to customize how docs are parsed, jut the layout.tmpl file
      } catch(err) {
        reject(err);
      }
    });
  });
};

/**
 * Replaces each `${}` that contains `.` delimited paths to values within a supplied object
 * (e.g. `Testing ${someObject.someValue}` using object `{ someObject: { sameValue: 123 }}`
 * results in `Testing 123`
 * @param {String} str The templated string to perform the replacements on
 * @param {Object} obj The object where values will be extracted from
 * @returns {String} The parsed template string
 */
function pkgr(str, obj) {
  return str.replace(/\$\{([^\}]*)\}/g, (mtch, path) => {
    var paths = path.split('.'), val = obj;
    if (!paths.length) return mtch;
    for (let i = 0, ln = paths.length; i < ln; i++) {
      if (i < ln - 1 && !val.hasOwnProperty(paths[i])) return mtch;
      val = val[paths[i]];
    }
    return val;
  });
}

/**
 * Generates a formatted date string
 * @param {Date} [date=new Date()] The date to format
 * @param {String} [delimiter='-'] The date delimiter
 * @returns {String} The formmated date 
 */
function formatedDate(date, delimiter = '-') {
  date = date || new Date();
  return `${date.getFullYear()}${delimiter}${('0' + (date.getMonth() + 1)).slice(-2)}${delimiter}${('0' + date.getDate()).slice(-2)}`;
}