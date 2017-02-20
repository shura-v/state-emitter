import * as assign from 'lodash.assign';
import * as isEqual from 'lodash.isequal';
import * as isPlainObject from 'lodash.isplainobject';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';
import {PartialObserver} from 'rxjs/Observer';
import {CallbackStack} from './callback_stack';
import 'rxjs/add/operator/publishReplay';
import 'rxjs/add/operator/filter';

const emitterStack = new CallbackStack();

export type StateEmitterCallback<T> = ((value: T, previousValue?: T) => void);

export class StateEmitter<T> {
    private subject$ = new Subject<T>();
    private observable$: Observable<T>;
    private isSetOnce = false;
    private previousValue: T;
    private value: T;
    private completed = false;

    constructor(initialValue?: T) {
        this.observable$ = this.subject$.publishReplay(1).refCount();
        this.observable$.subscribe(); // undisposable subscription
        if (initialValue !== undefined) {
            this.next(initialValue);
        }
    }

    public asObservable(): Observable<T> {
        return this.observable$;
    }

    public next(value: T): void {
        if (this.completed) {
            return;
        }
        const arePlainObjects = isPlainObject(value) && isPlainObject(this.value);
        const changed = arePlainObjects
            ? !isEqual(this.value, value)
            : this.value !== value;
        if (!changed) {
            return;
        }
        const newValue = arePlainObjects
            ? assign({}, this.value, value)
            : value;
        this.previousValue = this.value;
        this.value = newValue;
        if (changed) {
            emitterStack.add(() => {
                this.subject$.next(newValue);
                this.isSetOnce = true;
            });
        }
    }

    public reset(): void {
        if (!this.isSetOnce) {
            return;
        }
        this.isSetOnce = false;
        this.value = undefined;
        this.previousValue = undefined;
    }

    public get(): T {
        return this.value;
    }

    public equal(value: T): boolean {
        return isEqual(value, this.value);
    }

    public subscribe(observerOrNext?: PartialObserver<T> | StateEmitterCallback<T>, context?: Object): Subscription {
        return this.observable$.subscribe(state => {
            if (typeof observerOrNext === 'function') {
                (<StateEmitterCallback<T>> observerOrNext).call(context, state, this.previousValue);
            } else {
                (<PartialObserver<T>> observerOrNext).next(state);
            }
        });
    }

    public previous(): T {
        return this.previousValue;
    }

    public complete(): void {
        this.completed = true;
        this.subject$.complete();
    }

    public whenEqual(expectedState: T,
                     callback: (newState?: T, oldState?: T) => void): Subscription {
        return this.asObservable()
            .filter(state => isEqual(state, expectedState))
            .subscribe(state => {
                callback(state, this.previous());
            })
            ;
    }

    public onceEqual(expectedState: T,
                     callback: (newState?: T, oldState?: T) => void): Subscription {
        const self = this;
        return this.asObservable()
            .filter(state => isEqual(state, expectedState))
            .subscribe(function (state) { // tslint:disable-line:only-arrow-functions
                this.unsubscribe(); // tslint:disable-line:no-invalid-this
                callback(state, self.previous());
            })
            ;
    }

    public onSubsetMatch<U extends Partial<T>>(subsetToMatch: U,
                         callback: (newState?: T, oldState?: T) => void): Subscription {
        let neverRan = true;
        return this.asObservable()
            .filter(newState => {
                const oldState = this.previous();
                const newStateMatched = newState !== undefined
                    && Object.keys(subsetToMatch)
                        .every(prop => isEqual(subsetToMatch[prop], newState[prop]))
                ;
                if (newStateMatched) {
                    if (neverRan) {
                        neverRan = false;
                        return true;
                    } else {
                        const oldStateNotMatched = oldState === undefined
                            || Object.keys(subsetToMatch)
                                .some(prop => !isEqual(subsetToMatch[prop], oldState[prop]))
                        ;
                        if (oldStateNotMatched) {
                            return true;
                        }
                    }
                }
                return false;
            })
            .subscribe(state => {
                callback(state, this.previous());
            })
            ;
    }

    public onceExtendsBy<U extends Partial<T>>(expectedStateSubset: U,
                                               callback: (newState?: T, oldState?: T) => void): Subscription {
        const self = this;
        return this.asObservable()
            .filter(state => {
                return state !== undefined &&
                    Object.keys(expectedStateSubset)
                        .every(prop => {
                            return isEqual(expectedStateSubset[prop], state[prop]);
                        })
                    ;
            })
            .subscribe(function (state) { // tslint:disable-line:only-arrow-functions
                this.unsubscribe(); // tslint:disable-line:no-invalid-this
                callback(state, self.previous());
            })
            ;
    }

    public callOnEvalOnce(evalFn: (evalValue?: T) => boolean): Subscription {
        return this.asObservable()
            .filter(state => {
                if (evalFn(state)) {
                    return true;
                }
            })
            .subscribe(function () { // tslint:disable-line:only-arrow-functions
                this.unsubscribe(); // tslint:disable-line:no-invalid-this
            })
            ;
    }

    public callOnEval(evalFn: (evalValue?: T) => boolean,
                      callback: (value?: T, previous?: T) => void): Subscription {
        return this.asObservable()
            .filter(state => {
                if (evalFn(state)) {
                    return true;
                }
            })
            .subscribe(state => {
                callback(state, this.previous())
            })
            ;
    }
}
