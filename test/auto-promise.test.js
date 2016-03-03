'use strict';

let assert = require('assert');
var auto = require('../lib/auto-promise');

describe('auto-promise', function() {
  // Cases covered
  // ✓ value
  // ✓ promise
  // ✓ function returning value
  // ✓ function returning promise

  it('should run a function map in correct order #1', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 100)),
      op2: op1 => new Promise((resolve, reject) => setTimeout(() => resolve(op1 + ' hov'), 150)),
      // Weird formatting intentional :D
      op3: (
        op1 , 
        op2 
       ) => {
        return new Promise((resolve, reject) => resolve(op1 + ' ' + op2));
      }
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      done();
    });
  });

  it('should run a function map in correct order #2', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 150)),
      op2: op1 => new Promise((resolve, reject) => setTimeout(() => resolve(op1 + ' hov'), 100)),
      op3: function(op1, op2) {
        return new Promise((resolve, reject) => resolve(op1 + ' ' + op2));
      },
      op5: function hejsa(op3, op4) {
        return op4 + ' yolo ' + op3;
      },
      op4: 'sup'
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      assert.equal(result.op4, 'sup');
      assert.equal(result.op5, 'sup yolo hej hej hov');
      done();
    });
  });

  it('should run a classic function map in correct order', function(done) {
    auto({
      op1: new Promise((resolve, reject) => setTimeout(() => resolve('hej'), 150)),
      op2: ['op1', results => new Promise((resolve, reject) => setTimeout(() => resolve(results.op1 + ' hov'), 100))],
      op3: ['op1', 'op2', function(results) {
        return new Promise((resolve, reject) => resolve(results.op1 + ' ' + results.op2));
      }],
      op5: function hejsa(op3, op4) {
        return op4 + ' yolo ' + op3;
      },
      op4: 'sup'
    }).then(result => {
      assert.equal(result.op1, 'hej');
      assert.equal(result.op2, 'hej hov');
      assert.equal(result.op3, 'hej hej hov');
      assert.equal(result.op4, 'sup');
      assert.equal(result.op5, 'sup yolo hej hej hov');
      done();
    }).catch(err => {
      console.log('auto-promise.test.js:72 - err', err);
    });
  });

  it('should return empty object if no operations passed', function(done) {
    auto().then(result => {
      assert.deepEqual(result, {});
      done();
    });
  });

  it('should throw an error on circular dependencies', function(done) {
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
