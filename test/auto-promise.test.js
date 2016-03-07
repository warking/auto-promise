'use strict';

let assert = require('assert');
var auto = require('../lib/auto-promise');

describe('auto-promise', function() {
  // Cases covered
  // ✓ value
  // ✓ promise
  // ✓ function returning value
  // ✓ function returning promise
  // ✓ function with no arguments
  // ✓ falsy value
  // ✓ function returning falsy value
  // ✓ promise resolving to falsy value
  // ✓ classic function with dependencies
  // ✓ classic function with no dependencies
  // - Callback function errors
  // ✓ function(task1, ...) syntax
  // ✓ (task1, ...) => { expr } syntax
  // ✓ (task1, ...) => expr syntax
  // ✓ (results, ...) => { expr } syntax
  // ✓ (results, ...) => expr syntax

  it('should run a function map in correct order #1', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 10)),
      op2: op1 => new Promise((resolve, reject) => setTimeout(() => resolve(op1 + ' hov'), 15)),
      // Weird formatting intentional :D
      op3: (
        op1 , 
        op2 
       ) => {
        return new Promise((resolve, reject) => resolve(op1 + ' ' + op2));
      },
      op4: () => false
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      assert.equal(result.op4, false);
      done();
    }).catch(done);
  });

  it('should run a function map in correct order #2', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 15)),
      op2: op1 => new Promise((resolve, reject) => setTimeout(() => resolve(op1 + ' hov'), 10)),
      op3: function(op1, op2) {
        return new Promise((resolve, reject) => resolve(op1 + ' ' + op2));
      },
      op5: function hejsa(op3, op4) {
        return op4 + ' yolo ' + op3;
      },
      op4: 'sup',
      op6(op4) {
        return 'hi ' + op4;
      },
      op7: (op4) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve(), 10);
        });
      }
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      assert.equal(result.op4, 'sup');
      assert.equal(result.op5, 'sup yolo hej hej hov');
      assert.equal(result.op6, 'hi sup');
      assert.equal(result.op7, null);
      done();
    }).catch(done);
  });

  it('should run a classic function map in correct order', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 15)),
      op2: ['op1', results => new Promise((resolve, reject) => setTimeout(() => resolve(results.op1 + ' hov'), 10))],
      op3: ['op1', 'op2', function(results) {
        return new Promise((resolve, reject) => resolve(results.op1 + ' ' + results.op2));
      }],
      op5: function hejsa(op3, op4) {
        return op4 + ' yolo ' + op3;
      },
      op4: 'sup',
      op6: false
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      assert.equal(result.op4, 'sup');
      assert.equal(result.op5, 'sup yolo hej hej hov');
      assert.equal(result.op6, false);
      done();
    }).catch(done);
  });

  it('should work with node-style callbacks', function(done) {
    let asyncMethod = function(arg1, callback) {
      setTimeout(() => callback(null, arg1 + ' hov'), 10);
    };
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 10)),
      op2: (op1, callback) => {
        asyncMethod(op1, callback);
      },
      op3: [function(callback, results) {
        asyncMethod('hovsa', callback);
      }],
      op4: ['op2', function(callback, results) {
        asyncMethod('hovsa' + results.op3, callback);
      }]
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hovsa hov');
      assert.equal(result.op4, 'hovsahovsa hov hov');
      done();
    }).catch(done);
  });

  it('should catch exceptions in node-style callback', function(done) {
    let asyncMethod = function(arg1, callback) {
      setTimeout(() => callback(null, arg1 + ' hov'), 10);
    };
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 10)),
      op2: (op1, callback) => {
        throw new Error('>:(');
      }
    }).then(result => {
      return done(new Error('Fail'));
    }).catch(err => {
      assert.ok(err);
      assert.equal(err, 'Error: >:(');
      done();
    });
  });

  it('should return empty object if no operations passed', function(done) {
    auto().then(result => {
      assert.deepEqual(result, {});
      done();
    });
  });

  it('should throw an error on self-referencing dependencies', function(done) {
    auto({
      op1: 'hej',
      op2: op2 => 'hov'
    }).then(result => {
      assert.fail('Not supposed to be here');
      done();
    }).catch(err => {
      assert.ok(err);
      assert.equal(err, 'Error: Circular dependency for op2');
      done();
    });
  });

  it('should throw an error on circular dependencies', function(done) {
    auto({
      op1: (op2) => {
        return 'hi';
      },
      op2: (op3) => {
        return 'ho';
      },
      op3: (op1) => {
        return 'hi ho';
      }
    }).then(result => {
      assert.fail('Not supposed to be here');
      done();
    }).catch(err => {
      assert.equal(err, 'Error: Unresolvable dependencies: op1, op2, op3');
      done();
    });
  });

  it('should throw an error on undefined dependencies', function(done) {
    auto({
      op1: 'hej',
      op2: op3 => 'hov'
    }).then(result => {
      assert.fail('Not supposed to be here');
      done();
    }).catch(err => {
      assert.ok(err);
      assert.equal(err, 'Error: Dependency op3 not defined');
      done();
    });

  });
}); // End describe auto-promise
