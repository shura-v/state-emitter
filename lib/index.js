"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var isEqual = require("lodash.isequal");
var isPlainObject = require("lodash.isplainobject");
var callback_stack_1 = require("./callback_stack");
var emitterStack = new callback_stack_1.CallbackStack();
var StateEmitter = (function () {
    function StateEmitter(state) {
        this.state = state;
        this.subscribersCounter = 0;
        this.subscribers = {};
        this.isSetOnce = false;
        this.completed = false;
        if (state !== undefined) {
            this.isSetOnce = true;
        }
    }
    StateEmitter.prototype.next = function (state) {
        if (this.completed) {
            return;
        }
        var arePlainObjects = isPlainObject(state) && isPlainObject(this.state);
        var changed = arePlainObjects
            ? !isEqual(this.state, state)
            : this.state !== state;
        if (!changed) {
            return;
        }
        var newValue = arePlainObjects
            ? __assign({}, this.state, state)
            : state;
        this.previousState = this.state;
        this.state = newValue;
        this.isSetOnce = true;
        this.notify();
    };
    StateEmitter.prototype.notify = function () {
        var _a = this, state = _a.state, previousState = _a.previousState, subscribers = _a.subscribers;
        emitterStack.add(function () {
            Object.keys(subscribers).forEach(function (id) {
                var subscriber = subscribers[id];
                if (subscriber) {
                    subscriber.next(state, previousState);
                }
            });
        });
    };
    StateEmitter.prototype.reset = function () {
        if (!this.isSetOnce) {
            return;
        }
        this.isSetOnce = false;
        this.state = undefined;
        this.previousState = undefined;
    };
    StateEmitter.prototype.get = function () {
        return this.state;
    };
    StateEmitter.prototype.equal = function (state) {
        return isEqual(state, this.state);
    };
    StateEmitter.prototype.subscribe = function (callback, context) {
        var _this = this;
        var subscriber = {
            id: this.subscribersCounter,
            subscribed: true,
            next: function () {
                if (_this.isSetOnce && subscriber.subscribed) {
                    callback.call(context, _this.state, _this.previousState, subscription);
                }
            }
        };
        this.subscribersCounter += 1;
        var unsubscribe = function () {
            subscriber.subscribed = false;
            delete _this.subscribers[subscriber.id];
        };
        var subscription = {
            unsubscribe: unsubscribe,
            destroy: unsubscribe
        };
        this.subscribers[this.subscribersCounter] = subscriber;
        emitterStack.add(function () {
            subscriber.next();
        });
        return subscription;
    };
    StateEmitter.prototype.previous = function () {
        return this.previousState;
    };
    StateEmitter.prototype.complete = function () {
        this.completed = true;
    };
    StateEmitter.prototype.whenEqual = function (expectedState, callback) {
        return this.subscribe(function (state, previousState) {
            if (isEqual(state, expectedState)) {
                callback(state, previousState);
            }
        });
    };
    StateEmitter.prototype.onceEqual = function (expectedState, callback) {
        return this.subscribe(function (state, previousState, subscription) {
            if (isEqual(state, expectedState)) {
                subscription.unsubscribe();
                callback(state, previousState, subscription);
            }
        });
    };
    StateEmitter.prototype.onSubsetMatch = function (subsetToMatch, callback) {
        var neverRan = true;
        var shouldRunCallback = function (state, previousState, subscription) {
            var newStateMatched = state !== undefined
                && Object.keys(subsetToMatch)
                    .every(function (prop) { return isEqual(subsetToMatch[prop], state[prop]); });
            if (newStateMatched) {
                if (neverRan) {
                    neverRan = false;
                    return true;
                }
                else {
                    var oldStateNotMatched = previousState === undefined
                        || Object.keys(subsetToMatch)
                            .some(function (prop) { return !isEqual(subsetToMatch[prop], previousState[prop]); });
                    if (oldStateNotMatched) {
                        return true;
                    }
                }
            }
            return false;
        };
        return this.subscribe(function (state, previousState, subscription) {
            if (shouldRunCallback(state, previousState, subscription)) {
                callback(state, previousState, subscription);
            }
        });
    };
    StateEmitter.prototype.onceExtendsBy = function (expectedStateSubset, callback) {
        return this.subscribe(function (state, previousState, subscription) {
            if (state !== undefined
                && Object.keys(expectedStateSubset)
                    .every(function (prop) {
                    return isEqual(expectedStateSubset[prop], state[prop]);
                })) {
                subscription.unsubscribe();
                callback(state, previousState, subscription);
            }
        });
    };
    StateEmitter.prototype.callOnEvalOnce = function (evalFn) {
        return this.subscribe(function (state, previousState, subscription) {
            if (evalFn(state)) {
                subscription.unsubscribe();
            }
        });
    };
    StateEmitter.prototype.callOnEval = function (evalFn, callback) {
        return this.subscribe(function (state, previousState, subscription) {
            if (evalFn(state)) {
                callback(state, previousState, subscription);
            }
        });
    };
    return StateEmitter;
}());
exports.StateEmitter = StateEmitter;
