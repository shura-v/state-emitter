export declare type ReactiveEmitterCallback<T> = ((state: T, previousState?: T, subscription?: ISubscription) => void);
export interface ISubscription {
    unsubscribe(): void;
    destroy(): void;
}
export interface IReactiveEmitterOptions {
    distinct?: boolean;
    cloneMergeObjectsOnNext?: boolean;
    onComplete?: () => {};
}
export declare class ReactiveEmitter<T> {
    private state;
    private subscribersCounter;
    private subscribers;
    private isSetOnce;
    private previousState;
    private completed;
    private distinct;
    private cloneMergeObjectsOnNext;
    private onComplete;
    constructor(state?: T, options?: IReactiveEmitterOptions);
    private isChanged(newState, oldState);
    next(state: T): void;
    private notifyAll();
    reset(): void;
    get(): T;
    equal(state: T): boolean;
    subscribe(callback: ReactiveEmitterCallback<T>, context?: Object): ISubscription;
    previous(): T;
    complete(): void;
    whenEqual(expectedState: T, callback: ReactiveEmitterCallback<T>): ISubscription;
    onceEqual(expectedState: T, callback: ReactiveEmitterCallback<T>): ISubscription;
    onSubsetMatch<U extends Partial<T>>(subsetToMatch: U, callback: ReactiveEmitterCallback<T>): ISubscription;
    onceExtendsBy<U extends Partial<T>>(expectedStateSubset: U, callback: ReactiveEmitterCallback<T>): ISubscription;
    callOnEvalOnce(evalFn: (evalValue?: T) => boolean): ISubscription;
    callOnEval(evalFn: (evalValue?: T) => boolean, callback: ReactiveEmitterCallback<T>): ISubscription;
}
