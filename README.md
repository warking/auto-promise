auto-promise
============

[![Build Status](https://secure.travis-ci.org/backhand/auto-promise.png?branch=master)](https://travis-ci.org/backhand/auto-promise)

auto-promise is yet another version of the awesome async.auto, but for promises. In contrast to other implementations it can be used in two modes: Injected and classic. Also, it supports node-style callbacks intermixed.

Installation:
-------------
npm install auto-promise

Usage:
------
````
let auto = require('auto-promise');
  
auto(tasks).then(results => { ... });
````


Tasks can be defined in an injected and a "classic" way, and these can be mixed. Task values can be a literal, a function or a function returning a promise, and will behave as expected.

### Injected
In the injected way, the parameters of task functions are parsed out and matched to task keys:

````
auto({
  ...
  taskX: function(taskY) { return taskY; },
  ...
})
````
This is equivalent to the following definition in classic mode.

### Classic

````
auto({
  ...
  taskX: ['taskY', function(results) { return results.taskY; }]
  ...
})
````

### Mixed example

````
auto({
  task1: 'Hello',
  task2: task1 => {
    return ' world';
  },
  task3: (task1, task2) => new Promise((resolve, reject) => resolve('!')),
  task4: (task1, task2, task3) => task1 + task2 + task3
}).then(results => {
  console.log(results);
  /* 
    Results are now. { 
      task1: 'Hello',
      task2: ' world',
      task3: '!',
      task4: 'Hello world!'
  */
});
````
