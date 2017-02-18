import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { PartialObserver } from 'rxjs/Observer';
import 'rxjs/add/operator/publishReplay';
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
}
