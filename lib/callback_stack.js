"use strict";
var CallbackStack = (function () {
    function CallbackStack() {
        this.stack = [];
        this.inProgress = false;
    }
    CallbackStack.prototype.add = function (callback) {
        this.stack.push(callback);
        if (!this.inProgress) {
            this.run();
        }
    };
    CallbackStack.prototype.run = function () {
        this.inProgress = true;
        var stack = this.stack.slice();
        this.stack = [];
        stack.forEach(function (callback) { return callback(); });
        this.inProgress = false;
        if (this.stack.length) {
            this.run();
        }
    };
    CallbackStack.prototype.clear = function () {
        this.stack = [];
    };
    return CallbackStack;
}());
exports.CallbackStack = CallbackStack;
