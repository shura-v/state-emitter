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
        while (this.stack.length > 0) {
            this.stack.shift()();
        }
        this.inProgress = false;
    };
    CallbackStack.prototype.clear = function () {
        this.stack = [];
    };
    return CallbackStack;
}());
exports.CallbackStack = CallbackStack;
