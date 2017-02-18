const assign = require('lodash.assign');
const isEqual = require('lodash.isequal');
const isPlainObject = require('lodash.isplainobject');
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';
import {PartialObserver} from 'rxjs/Observer';
import {CallbackStack} from './callback_stack';
import 'rxjs/add/operator/publishReplay';

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
}