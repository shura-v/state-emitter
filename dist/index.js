"use strict";
var assign = require('lodash.assign');
var isEqual = require('lodash.isequal');
var isPlainObject = require('lodash.isplainobject');
var Subject_1 = require("rxjs/Subject");
var callback_stack_1 = require("./callback_stack");
require("rxjs/add/operator/publishReplay");
var emitterStack = new callback_stack_1.CallbackStack();
var StateEmitter = (function () {
    function StateEmitter(initialValue) {
        this.subject$ = new Subject_1.Subject();
        this.isSetOnce = false;
        this.completed = false;
        this.observable$ = this.subject$.publishReplay(1).refCount();
        this.observable$.subscribe();
        if (initialValue !== undefined) {
            this.next(initialValue);
        }
    }
    StateEmitter.prototype.asObservable = function () {
        return this.observable$;
    };
    StateEmitter.prototype.next = function (value) {
        var _this = this;
        if (this.completed) {
            return;
        }
        var arePlainObjects = isPlainObject(value) && isPlainObject(this.value);
        var changed = arePlainObjects
            ? !isEqual(this.value, value)
            : this.value !== value;
        if (!changed) {
            return;
        }
        var newValue = arePlainObjects
            ? assign({}, this.value, value)
            : value;
        this.previousValue = this.value;
        this.value = newValue;
        if (changed) {
            emitterStack.add(function () {
                _this.subject$.next(newValue);
                _this.isSetOnce = true;
            });
        }
    };
    StateEmitter.prototype.reset = function () {
        if (!this.isSetOnce) {
            return;
        }
        this.isSetOnce = false;
        this.value = undefined;
        this.previousValue = undefined;
    };
    StateEmitter.prototype.get = function () {
        return this.value;
    };
    StateEmitter.prototype.equal = function (value) {
        return isEqual(value, this.value);
    };
    StateEmitter.prototype.subscribe = function (observerOrNext, context) {
        var _this = this;
        return this.observable$.subscribe(function (state) {
            if (typeof observerOrNext === 'function') {
                observerOrNext.call(context, state, _this.previousValue);
            }
            else {
                observerOrNext.next(state);
            }
        });
    };
    StateEmitter.prototype.previous = function () {
        return this.previousValue;
    };
    StateEmitter.prototype.complete = function () {
        this.completed = true;
        this.subject$.complete();
    };
    return StateEmitter;
}());
exports.StateEmitter = StateEmitter;
