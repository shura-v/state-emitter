"use strict";
var assign = require("lodash.assign");
var isEqual = require("lodash.isequal");
var isPlainObject = require("lodash.isplainobject");
var Subject_1 = require("rxjs/Subject");
var callback_stack_1 = require("./callback_stack");
require("rxjs/add/operator/publishReplay");
require("rxjs/add/operator/filter");
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
    StateEmitter.prototype.whenEqual = function (expectedState, callback) {
        var _this = this;
        return this.asObservable()
            .filter(function (state) { return isEqual(state, expectedState); })
            .subscribe(function (state) {
            callback(state, _this.previous());
        });
    };
    StateEmitter.prototype.onceEqual = function (expectedState, callback) {
        var self = this;
        return this.asObservable()
            .filter(function (state) { return isEqual(state, expectedState); })
            .subscribe(function (state) {
            this.unsubscribe();
            callback(state, self.previous());
        });
    };
    StateEmitter.prototype.onSubsetMatch = function (subsetToMatch, callback) {
        var _this = this;
        var neverRan = true;
        return this.asObservable()
            .filter(function (newState) {
            var oldState = _this.previous();
            var newStateMatched = newState !== undefined
                && Object.keys(subsetToMatch)
                    .every(function (prop) { return isEqual(subsetToMatch[prop], newState[prop]); });
            if (newStateMatched) {
                if (neverRan) {
                    neverRan = false;
                    return true;
                }
                else {
                    var oldStateNotMatched = oldState === undefined
                        || Object.keys(subsetToMatch)
                            .some(function (prop) { return !isEqual(subsetToMatch[prop], oldState[prop]); });
                    if (oldStateNotMatched) {
                        return true;
                    }
                }
            }
            return false;
        })
            .subscribe(function (state) {
            callback(state, _this.previous());
        });
    };
    StateEmitter.prototype.onceExtendsBy = function (expectedStateSubset, callback) {
        var self = this;
        return this.asObservable()
            .filter(function (state) {
            return state !== undefined &&
                Object.keys(expectedStateSubset)
                    .every(function (prop) { return isEqual(expectedStateSubset[prop], state[prop]); });
        })
            .subscribe(function (state) {
            this.unsubscribe();
            callback(state, self.previous());
        });
    };
    StateEmitter.prototype.callOnEvalOnce = function (evalFn) {
        return this.asObservable()
            .filter(function (state) { return evalFn(state); })
            .subscribe(function () {
            this.unsubscribe();
        });
    };
    StateEmitter.prototype.callOnEval = function (evalFn, callback) {
        var _this = this;
        return this.asObservable()
            .filter(function (state) { return evalFn(state); })
            .subscribe(function (state) {
            callback(state, _this.previous());
        });
    };
    return StateEmitter;
}());
exports.StateEmitter = StateEmitter;
