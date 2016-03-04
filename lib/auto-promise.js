'use strict';

module.exports = (ops) => {
  return new Promise((resolve, reject) => {
    if(!ops) {
      return resolve({});
    }

    let opkeys = Object.keys(ops);
    if(!opkeys.length) {
      return resolve({});
    }

    // Parse function params and determine dependencies
    let params = {};
    let dependencies = opkeys.reduce((out, item) => {
      let task = ops[item];
      if(typeof task === 'function') {
        // Inject style
        let fn = task;
        let args = extractArgs(fn);
        params[item] = out[item] = args;
        if(looksLikeCallback(args)) {
          params[item] = out[item] = params[item].slice(0, -1);
          ops[item] = promisify(ops[item]);
        }
      } else if(Array.isArray(task)) {
        // Classic auto style
        out[item] =  task.length > 1 ? task.slice(0, -1) : [];
        params[item] = 'results';
        // Assume last element is the value/function, redefine operation
        let fn = task.slice(-1)[0];
        let args = extractArgs(fn);
        ops[item] = looksLikeCallback(args) ? promisify(fn) : fn;
      } else {
        out[item] = [];
      }
      return out;
    }, {});

    
    // Check if all dependencies are accounted for
    Object.keys(dependencies).forEach(dep => {
      let deps = dependencies[dep];
      deps.forEach(d => {
        if(!ops[d]) {
          throw new Error(`Dependency ${d} not defined`);
        }
        if(d === dep) {
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
        if(opkey in results) {
          return;
        }
        let value = ops[opkey];
        // If value is a function ...
        if(typeof value === 'function') {
          // Check if dependencies are met ...
          let deps = dependencies[opkey];
          if(!deps.filter(d => !(d in results)).length) {
            // Then redefine as result of function call with injected args
            let args = params[opkey] === 'results' ? [ results ] : params[opkey].map(d => results[d]);
            // Note: value goes on to be checked for promise status further down
            value = value.apply(null, args);
          } else {
            // Dependencies are not fulfilled yet, wait for next batch
            return;
          }
        }

        // If value is a promise, add it to batch
        if(value && value.then && typeof value.then === 'function') {
          batch.push(value);
          order.push(opkey);
          return;
        }

        // Else, just add it to results
        results[opkey] = value;
      });

      if(!batch.length) {
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

function looksLikeCallback(args) {
  return !!~['callback', 'cb'].indexOf(last(args));
}

function promisify(fn) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push((err, result) => {
        if(err) {
          return reject(err);
        }

        resolve(result);
      });
      fn.apply(null, args);
    });
  };
}

/* 
  Helper function to parse out argument names, adapted from
  https://github.com/angular/angular.js/blob/43f72066e107445204aee074d7b4f184e9c05d9e/src/auto/injector.js
*/
var ARROW_ARG = /^([^\(]+?)=>/;
var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m;
// var FN_ARG_SPLIT = /,/;
// var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function extractArgs(fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, ''),
      args = fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
  return args[1].replace(/[\s]*/g, '').split(/,/);
}
