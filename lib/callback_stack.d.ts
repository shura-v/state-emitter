export declare class CallbackStack {
    private readonly stack;
    private inProgress;
    add(callback: () => void): void;
    private run();
}
