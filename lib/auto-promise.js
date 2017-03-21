
'use strict';

module.exports = (tasks) => {
  return new Promise((resolve, reject) => {
    if (!tasks) {
      return resolve({});
    }

    let taskNames = Object.keys(tasks);
    if (!taskNames.length) {
      return resolve({});
    }

    // Parse function params and determine dependencies
    let params = {};
    let dependencies = taskNames.reduce((out, taskName) => {
      let task = tasks[taskName];
      if (typeof task === 'function') {
        // Inject style
        let fn = task;
        let args = extractArgs(fn);
        params[taskName] = out[taskName] = args;
        if (looksLikeCallback(args)) {
          params[taskName] = out[taskName] = params[taskName].slice(0, -1);
          tasks[taskName] = promisify(tasks[taskName]);
        }
      } else if (Array.isArray(task)) {
        // Classic auto style
        out[taskName] =  task.length > 1 ? task.slice(0, -1) : [];
        params[taskName] = 'results';
        // Assume last element is the value/function, redefine operation
        let fn = task.slice(-1)[0];
        let args = extractArgs(fn);
        tasks[taskName] = looksLikeCallback(args, true) ? promisify(fn, true, true) : fn;
      } else {
        out[taskName] = [];
      }
      return out;
    }, {});

    // Check if all dependencies are accounted for
    Object.keys(dependencies).forEach(dep => {
      let deps = dependencies[dep];
      deps.forEach(d => {
        if (!(d in tasks)) {
          throw new Error(`Dependency ${d} not defined`);
        }
        if (d === dep) {
          throw new Error(`Circular dependency for ${d}`);
        }
      });
    });

    // Object for final results
    let results = {};
    let resolved = {};

    // This will run until we got everything resolved
    let resolver = () => {
      let batch = [];
      let order = [];
      Object.keys(dependencies).forEach(opkey => {
        if (opkey in results) {
          return;
        }
        let value = tasks[opkey];
        // If value is a function, run it and see what we get - it might be a promise!
        if (typeof value === 'function') {
          // Check if dependencies are met ...
          let deps = dependencies[opkey];
          if (!deps.filter(d => !(d in results)).length) {
            // Then redefine as result of function call with injected args
            let args = params[opkey] === 'results' ? [results] : params[opkey].map(d => results[d]);
            // Note: value goes on to be checked for promise status further down
            value = value.apply(null, args);
          } else {
            // Dependencies are not fulfilled yet, wait for next batch
            return;
          }
        }

        // If value is a promise, add it to batch
        if (value && value.then && typeof value.then === 'function') {
          batch.push(value);
          order.push(opkey);
          return;
        }

        // Else, just add it to results
        results[opkey] = value;
      });

      if (!batch.length) {
        if (Object.keys(results).length !== Object.keys(tasks).length) {
          let unresolved = Object.keys(tasks).reduce((out, op) => {
            if (!results[op]) {
              out.push(op);
            }
            return out;
          }, []);

          throw new Error('Unresolvable dependencies: ' + unresolved.join(', '));
        }
        return results;
      }

      return Promise.all(batch).then(values => {
        values.forEach((value, i) => results[order[i]] = value);
      }).then(resolver);
    };

    // Kick off
    resolve(resolver());
  });
};

function last(arr) {
  return arr[arr.length - 1];
}

function looksLikeCallback(args, reverse) {
  return !!~['callback', 'cb'].indexOf(reverse ? args[0] : last(args));
  // return !!~['callback', 'cb'].indexOf(args[0]);
}

function callbackParamIndex(args, reverse) {
  return args.reduce(arg => ['callback', 'cb'].indexOf(arg));
  // return !!~['callback', 'cb'].indexOf(args[0]);
}

function promisify(fn, reverse, collapse) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      args[reverse ? 'unshift' : 'push'](function() {
        let results = Array.prototype.slice.call(arguments);
        if (results[0]) {
          return reject(results[0]);
        }

        resolve(collapse && results.length > 2 ? results.slice(1) : results[1]);
      });
      fn.apply(null, args);
    });
  };
}

/*
  Helper function to parse out argument names, adapted from
  https://github.com/angular/angular.js/blob/43f72066e107445204aee074d7b4f184e9c05d9e/src/auto/injector.js
*/
var ASYNC_ARROW_ARG = /^async\s(.+?)=>/
var ARROW_ARG = /^([^\(]+?)=>/;
var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m;
// var FN_ARG_SPLIT = /,/;
// var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function extractArgs(fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, ''),
      args = fnText.match(ASYNC_ARROW_ARG) || fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
  return args[1].replace(/[\s]*/g, '').split(/,/).filter(item => !!item);
}
