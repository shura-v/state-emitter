import * as isEqual from 'lodash.isequal';
import * as isPlainObject from 'lodash.isplainobject';
import {CallbackStack} from './callback_stack';

const emitterStack = new CallbackStack();

export type StateEmitterCallback<T> = ((state: T,
                                        previousState?: T,
                                        subscription?: ISubscription) => void);

export interface ISubscription {
    unsubscribe(): void,
    destroy(): void,
}

interface ISubscriber<T> {
    subscribed: boolean,
    id: number,
    notify: StateEmitterCallback<T>
}

export interface IStateEmitterOptions {
    distinct?: boolean,
    cloneMergeObjectsOnNext?: boolean;
    onComplete?: () => {};
}

export class StateEmitter<T> {
    private subscribersCounter = 0;
    private subscribers: {
        [id: number]: ISubscriber<T>
    } = {};
    private isSetOnce = false;
    private previousState: T;
    private completed = false;

    private distinct: boolean;
    private cloneMergeObjectsOnNext: boolean;
    private onComplete: () => void;

    constructor(private state?: T, options: IStateEmitterOptions = {}) {
        if (state !== undefined) {
            this.isSetOnce = true;
        }

        const {distinct = true} = options;
        const {cloneMergeObjectsOnNext = true} = options;

        this.distinct = distinct;
        this.cloneMergeObjectsOnNext = cloneMergeObjectsOnNext;
        this.onComplete = options.onComplete;
    }

    private isChanged(newState: T, oldState: T): boolean {
        const arePlainObjects = (this.distinct || this.cloneMergeObjectsOnNext)
            && isPlainObject(newState)
            && isPlainObject(oldState);

        const changed = arePlainObjects
            ? !isEqual(newState, oldState)
            : newState !== oldState;

        return !this.distinct || changed;
    }

    public next(state: T): void {
        if (this.completed) {
            return;
        }

        if (!this.isChanged(this.state, state)) {
            return;
        }

        const arePlainObjects = (this.distinct || this.cloneMergeObjectsOnNext)
            && isPlainObject(state)
            && isPlainObject(this.state);

        const newValue = this.cloneMergeObjectsOnNext && arePlainObjects
            ? {
                ... this.state as Object,
                ... state as Object
            } as T
            : state;
        this.previousState = this.state;
        this.state = newValue;
        this.isSetOnce = true;
        this.notifyAll();
    }

    private notifyAll() {
        const {state, previousState, subscribers} = this;
        emitterStack.add(() => {
            Object.keys(subscribers).forEach((id) => {
                const subscriber = subscribers[id];
                if (subscriber) {
                    subscriber.notify(state, previousState);
                }
            });
        });
    }

    public reset(): void {
        if (!this.isSetOnce) {
            return;
        }
        this.isSetOnce = false;
        this.state = undefined;
        this.previousState = undefined;
        this.completed = false;
    }

    public get(): T {
        return this.state;
    }

    public equal(state: T): boolean {
        return isEqual(state, this.state);
    }

    public subscribe(callback: StateEmitterCallback<T>, context?: Object): ISubscription {
        let lastEmittedValue: T;
        const subscriber: ISubscriber<T> = {
            id: this.subscribersCounter,
            subscribed: true,
            notify: (state, previousState) => {
                if (!this.isChanged(state, lastEmittedValue)) {
                    return;
                }
                if (this.isSetOnce && subscriber.subscribed) {
                    if (this.completed) {
                        unsubscribe();
                    }
                    lastEmittedValue = state;
                    callback.call(context, state, previousState, subscription);
                }
            }
        };

        const unsubscribe = () => {
            subscriber.subscribed = false;
            delete this.subscribers[subscriber.id];
        };

        const subscription = {
            subscriberId: subscriber.id,
            unsubscribe,
            destroy: unsubscribe,
        };

        this.subscribers[this.subscribersCounter] = subscriber;

        this.subscribersCounter += 1;

        const state = this.state;
        const previousState = this.previousState;
        emitterStack.add(() => {
            subscriber.notify(state, previousState);
        });
        return subscription;
    }

    public previous(): T {
        return this.previousState;
    }

    public complete(): void {
        if (!this.completed) {
            this.completed = true;
            this.subscribers = {};

            if (this.onComplete) {
                const onComplete = this.onComplete;
                delete this.onComplete;

                onComplete.call(this);
            }
        }
    }

    public whenEqual(expectedState: T,
                     callback: StateEmitterCallback<T>): ISubscription {
        return this.subscribe((state, previousState) => {
            if (isEqual(state, expectedState)) {
                callback(state, previousState);
            }
        });
    }

    public onceEqual(expectedState: T,
                     callback: StateEmitterCallback<T>): ISubscription {
        return this.subscribe((state: T, previousState: T, subscription: ISubscription) => {
            if (isEqual(state, expectedState)) {
                subscription.unsubscribe();
                callback(state, previousState, subscription);
            }
        });
    }

    public onSubsetMatch<U extends Partial<T>>(subsetToMatch: U,
                                               callback: StateEmitterCallback<T>): ISubscription {
        let neverRan = true;
        const shouldRunCallback = (state: T, previousState: T, subscription: ISubscription): boolean => {
            const newStateMatched = state !== undefined
                && Object.keys(subsetToMatch)
                    .every(prop => isEqual(subsetToMatch[prop], state[prop]))
            ;
            if (newStateMatched) {
                if (neverRan) {
                    neverRan = false;
                    return true;
                } else {
                    const oldStateNotMatched = previousState === undefined
                        || Object.keys(subsetToMatch)
                            .some(prop => !isEqual(subsetToMatch[prop], previousState[prop]))
                    ;
                    if (oldStateNotMatched) {
                        return true;
                    }
                }
            }
            return false;
        };
        return this.subscribe((state: T, previousState: T, subscription: ISubscription) => {
            if (shouldRunCallback(state, previousState, subscription)) {
                callback(state, previousState, subscription);
            }
        });
    }

    public onceExtendsBy<U extends Partial<T>>(expectedStateSubset: U,
                                               callback: StateEmitterCallback<T>): ISubscription {
        return this.subscribe((state: T, previousState: T, subscription: ISubscription) => {
            if (state !== undefined
                && Object.keys(expectedStateSubset)
                    .every(prop => {
                        return isEqual(expectedStateSubset[prop], state[prop]);
                    })
            ) {
                subscription.unsubscribe();
                callback(state, previousState, subscription);
            }
        });
    }

    public callOnEvalOnce(evalFn: (evalValue?: T) => boolean): ISubscription {
        return this.subscribe((state: T, previousState: T, subscription: ISubscription) => {
            if (evalFn(state)) {
                subscription.unsubscribe();
            }
        });
    }

    public callOnEval(evalFn: (evalValue?: T) => boolean,
                      callback: StateEmitterCallback<T>): ISubscription {
        return this.subscribe((state: T, previousState: T, subscription: ISubscription) => {
            if (evalFn(state)) {
                callback(state, previousState, subscription);
            }
        });
    }
}