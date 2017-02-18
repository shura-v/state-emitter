"use strict";
var __1 = require("..");
var ava_1 = require("ava");
ava_1.default('should not emit new values if completed', function (t) {
    var se = new __1.StateEmitter(0);
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
