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
    next: StateEmitterCallback<T>,
}

export interface IStateEmitterOptions {
    distinct?: boolean,
    cloneMergeObjectsOnNext?: boolean;
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

    constructor(private state?: T, options?: IStateEmitterOptions) {
        if (state !== undefined) {
            this.isSetOnce = true;
        }
     
        this.distinct = (options && options.distinct !== undefined) ? options.distinct : true;
        this.cloneMergeObjectsOnNext = (options && options.cloneMergeObjectsOnNext !== undefined) ? options.cloneMergeObjectsOnNext : true;
    }

    public next(state: T): void {
        if (this.completed) {
            return;
        }

        const arePlainObjects = (this.distinct || this.cloneMergeObjectsOnNext) && isPlainObject(state) && isPlainObject(this.state);

        if (this.distinct) {
            const changed = arePlainObjects
                ? !isEqual(this.state, state)
                : this.state !== state;
            if (!changed) {
                return;
            }
        }

        const newValue = (this.cloneMergeObjectsOnNext && arePlainObjects)
            ? {
                ... this.state as Object,
                ... state as Object
            } as T
            : state;
        this.previousState = this.state;
        this.state = newValue;
        this.isSetOnce = true;
        this.notify();
    }

    private notify() {
        const {state, previousState, subscribers} = this;
        emitterStack.add(() => {
            Object.keys(subscribers).forEach((id) => {
                const subscriber = subscribers[id];
                if (subscriber) {
                    subscriber.next(state, previousState);
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
    }

    public get(): T {
        return this.state;
    }

    public equal(state: T): boolean {
        return isEqual(state, this.state);
    }

    public subscribe(callback: StateEmitterCallback<T>, context?: Object): ISubscription {
        const subscriber = {
            id: this.subscribersCounter,
            subscribed: true,
            next: () => {
                const shouldCall = this.isSetOnce && subscriber.subscribed;
                if (this.completed) {
                    unsubscribe();
                }

                if (shouldCall) {
                    callback.call(context, this.state, this.previousState, subscription);
                }
            }
        };

        const unsubscribe = () => {
            subscriber.subscribed = false;
            delete this.subscribers[subscriber.id];
        };

        const subscription = {
            unsubscribe,
            destroy: unsubscribe
        };

        this.subscribers[this.subscribersCounter] = subscriber;

        this.subscribersCounter += 1;

        emitterStack.add(() => {
            subscriber.next();
        });
        return subscription;
    }

    public previous(): T {
        return this.previousState;
    }

    public complete(): void {
        this.completed = true;
        this.subscribers = {};
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