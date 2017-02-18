"use strict";
var lib_1 = require("../lib");
var ava_1 = require("ava");
ava_1.default('should not emit new values if completed', function (t) {
    var se = new lib_1.StateEmitter(0);
    se.subscribe(function (x) {
        t.true(x <= 3);
    });
    se.next(1);
    se.next(2);
    se.next(3);
    se.complete();
    se.next(4);
    se.next(5);
    se.subscribe(function (x) {
        t.true(x === 3);
    });
});
var stateEmitter;
ava_1.default.beforeEach(function () {
    stateEmitter = new lib_1.StateEmitter();
    stateEmitter.next(false);
});
ava_1.default('Should call function on true', function (t) {
    stateEmitter.whenEqual(true, function () {
        t.pass();
    });
    stateEmitter.next(true);
});
ava_1.default('Should not call function on false', function (t) {
    stateEmitter.whenEqual(true, function () {
        t.fail();
    });
    stateEmitter.next(false);
});
ava_1.default('Should call function on true three times given multiple state updates', function (t) {
    var counter = 0;
    stateEmitter.whenEqual(true, function () {
        counter += 1;
    });
    stateEmitter.next(true);
    stateEmitter.next(false);
    stateEmitter.next(true);
    stateEmitter.next(true);
    stateEmitter.next(false);
    stateEmitter.next(false);
    stateEmitter.next(false);
    stateEmitter.next(true);
    stateEmitter.next(true);
    t.is(counter, 3);
});
ava_1.default('Should call function only once on expected state change', function (t) {
    var counter = 0;
    stateEmitter.onceEqual(true, function () {
        counter += 1;
    });
    stateEmitter.next(true);
    stateEmitter.next(false);
    stateEmitter.next(true);
    stateEmitter.next(false);
    t.is(counter, 1);
});
ava_1.default('Should call function when connected state becomes true', function (t) {
    var counter = 0;
    var stateEmitter = new lib_1.StateEmitter({
        connected: true,
        reason: 0
    });
    stateEmitter.next({
        connected: false,
        reason: 1
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 6
    });
    stateEmitter.onSubsetMatch({
        connected: true
    }, function () {
        counter += 1;
    });
    stateEmitter.next({
        connected: false,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: false,
        reason: 1
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 6
    });
    t.is(counter, 3);
});
ava_1.default('Should call function when connected state is true only once', function (t) {
    var counter = 0;
    var stateEmitter = new lib_1.StateEmitter();
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 3
    });
    stateEmitter.onceExtendsBy({ connected: true }, function () {
        counter += 1;
    });
    stateEmitter.next({
        connected: false,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 5
    });
    t.is(counter, 1);
});
