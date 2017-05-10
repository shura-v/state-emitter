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
var ReactiveEmitter = (function () {
    function ReactiveEmitter(state, options) {
        if (options === void 0) { options = {}; }
        this.state = state;
        this.subscribersCounter = 0;
        this.subscribers = {};
        this.isSetOnce = false;
        this.completed = false;
        if (state !== undefined) {
            this.isSetOnce = true;
        }
        var _a = options.distinct, distinct = _a === void 0 ? true : _a;
        var _b = options.cloneMergeObjectsOnNext, cloneMergeObjectsOnNext = _b === void 0 ? true : _b;
        this.distinct = distinct;
        this.cloneMergeObjectsOnNext = cloneMergeObjectsOnNext;
        this.onComplete = options.onComplete;
    }
    ReactiveEmitter.prototype.isChanged = function (newState, oldState) {
        var arePlainObjects = (this.distinct || this.cloneMergeObjectsOnNext)
            && isPlainObject(newState)
            && isPlainObject(oldState);
        var changed = arePlainObjects
            ? !isEqual(newState, oldState)
            : newState !== oldState;
        return !this.distinct || changed;
    };
    ReactiveEmitter.prototype.next = function (state) {
        if (this.completed) {
            return;
        }
        if (!this.isChanged(this.state, state)) {
            return;
        }
        var arePlainObjects = (this.distinct || this.cloneMergeObjectsOnNext)
            && isPlainObject(state)
            && isPlainObject(this.state);
        var newValue = this.cloneMergeObjectsOnNext && arePlainObjects
            ? __assign({}, this.state, state)
            : state;
        this.previousState = this.state;
        this.state = newValue;
        this.isSetOnce = true;
        this.notifyAll();
    };
    ReactiveEmitter.prototype.notifyAll = function () {
        var _a = this, state = _a.state, previousState = _a.previousState, subscribers = _a.subscribers;
        emitterStack.add(function () {
            Object.keys(subscribers).forEach(function (id) {
                var subscriber = subscribers[id];
                if (subscriber) {
                    subscriber.notify(state, previousState);
                }
            });
        });
    };
    ReactiveEmitter.prototype.reset = function () {
        if (!this.isSetOnce) {
            return;
        }
        this.isSetOnce = false;
        this.state = undefined;
        this.previousState = undefined;
        this.completed = false;
    };
    ReactiveEmitter.prototype.get = function () {
        return this.state;
    };
    ReactiveEmitter.prototype.equal = function (state) {
        return isEqual(state, this.state);
    };
    ReactiveEmitter.prototype.subscribe = function (callback, context) {
        var _this = this;
        var lastEmittedValue;
        var subscriber = {
            id: this.subscribersCounter,
            subscribed: true,
            notify: function (state, previousState) {
                if (!_this.isChanged(state, lastEmittedValue)) {
                    return;
                }
                if (_this.isSetOnce && subscriber.subscribed) {
                    if (_this.completed) {
                        unsubscribe();
                    }
                    lastEmittedValue = state;
                    callback.call(context, state, previousState, subscription);
                }
            }
        };
        var unsubscribe = function () {
            subscriber.subscribed = false;
            delete _this.subscribers[subscriber.id];
        };
        var subscription = {
            subscriberId: subscriber.id,
            unsubscribe: unsubscribe,
            destroy: unsubscribe,
        };
        this.subscribers[this.subscribersCounter] = subscriber;
        this.subscribersCounter += 1;
        var state = this.state;
        var previousState = this.previousState;
        emitterStack.add(function () {
            subscriber.notify(state, previousState);
        });
        return subscription;
    };
    ReactiveEmitter.prototype.previous = function () {
        return this.previousState;
    };
    ReactiveEmitter.prototype.complete = function () {
        if (!this.completed) {
            this.completed = true;
            this.subscribers = {};
            if (this.onComplete) {
                var onComplete = this.onComplete;
                delete this.onComplete;
                onComplete.call(this);
            }
        }
    };
    ReactiveEmitter.prototype.whenEqual = function (expectedState, callback) {
        return this.subscribe(function (state, previousState) {
            if (isEqual(state, expectedState)) {
                callback(state, previousState);
            }
        });
    };
    ReactiveEmitter.prototype.onceEqual = function (expectedState, callback) {
        return this.subscribe(function (state, previousState, subscription) {
            if (isEqual(state, expectedState)) {
                subscription.unsubscribe();
                callback(state, previousState, subscription);
            }
        });
    };
    ReactiveEmitter.prototype.onSubsetMatch = function (subsetToMatch, callback) {
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
    ReactiveEmitter.prototype.onceExtendsBy = function (expectedStateSubset, callback) {
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
    ReactiveEmitter.prototype.callOnEvalOnce = function (evalFn) {
        return this.subscribe(function (state, previousState, subscription) {
            if (evalFn(state)) {
                subscription.unsubscribe();
            }
        });
    };
    ReactiveEmitter.prototype.callOnEval = function (evalFn, callback) {
        return this.subscribe(function (state, previousState, subscription) {
            if (evalFn(state)) {
                callback(state, previousState, subscription);
            }
        });
    };
    return ReactiveEmitter;
}());
exports.ReactiveEmitter = ReactiveEmitter;
