export declare type StateEmitterCallback<T> = ((state: T, previousState?: T, subscription?: ISubscription) => void);
export interface ISubscription {
    unsubscribe(): void;
    destroy(): void;
}
export declare class StateEmitter<T> {
    private state;
    private subscribersCounter;
    private subscribers;
    private isSetOnce;
    private previousState;
    private completed;
    constructor(state?: T);
    next(state: T): void;
    private notify();
    reset(): void;
    get(): T;
    equal(state: T): boolean;
    subscribe(callback: StateEmitterCallback<T>, context?: Object): ISubscription;
    previous(): T;
    complete(): void;
    whenEqual(expectedState: T, callback: StateEmitterCallback<T>): ISubscription;
    onceEqual(expectedState: T, callback: StateEmitterCallback<T>): ISubscription;
    onSubsetMatch<U extends Partial<T>>(subsetToMatch: U, callback: StateEmitterCallback<T>): ISubscription;
    onceExtendsBy<U extends Partial<T>>(expectedStateSubset: U, callback: StateEmitterCallback<T>): ISubscription;
    callOnEvalOnce(evalFn: (evalValue?: T) => boolean): ISubscription;
    callOnEval(evalFn: (evalValue?: T) => boolean, callback: StateEmitterCallback<T>): ISubscription;
}
