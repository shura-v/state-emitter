export declare class CallbackStack {
    private stack;
    private inProgress;
    add(callback: () => void): void;
    private run();
    clear(): void;
}
