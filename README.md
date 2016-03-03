auto-promise
=======================

[![Build Status](https://secure.travis-ci.org/backhand/auto-promise.png?branch=master)](https://travis-ci.org/backhand/auto-promise)

auto-promise is yet another version of the awesome async.auto, but for promises. In contrast to other implementations it can be used in two modes: Injected and classic.

Installation:
------------------------
npm install auto-promise

Usage:
------

    require('auto-promise');


    
Injected


Classic
-------
In "classic" mode auto will expec object of properties whose values is an array of dependencies and a function in the endInstead of It uses dependency injection
