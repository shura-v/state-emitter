import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { PartialObserver } from 'rxjs/Observer';
import 'rxjs/add/operator/publishReplay';
import 'rxjs/add/operator/filter';
export declare type StateEmitterCallback<T> = ((value: T, previousValue?: T) => void);
export declare class StateEmitter<T> {
    private subject$;
    private observable$;
    private isSetOnce;
    private previousValue;
    private value;
    private completed;
    constructor(initialValue?: T);
    asObservable(): Observable<T>;
    next(value: T): void;
    reset(): void;
    get(): T;
    equal(value: T): boolean;
    subscribe(observerOrNext?: PartialObserver<T> | StateEmitterCallback<T>, context?: Object): Subscription;
    previous(): T;
    complete(): void;
    whenEqual(expectedState: T, callback: (newState?: T, oldState?: T) => void): Subscription;
    onceEqual(expectedState: T, callback: (newState?: T, oldState?: T) => void): Subscription;
    onSubsetMatch<U extends Partial<T>>(subsetToMatch: U, callback: (newState?: T, oldState?: T) => void): Subscription;
    onceExtendsBy<U extends Partial<T>>(expectedStateSubset: U, callback: (newState?: T, oldState?: T) => void): Subscription;
    callOnEvalOnce(evalFn: (evalValue?: T) => boolean): Subscription;
    callOnEval(evalFn: (evalValue?: T) => boolean, callback: (value?: T, previous?: T) => void): Subscription;
}
