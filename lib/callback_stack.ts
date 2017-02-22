export class CallbackStack {
    private stack: (() => void)[] = [];
    private inProgress: boolean = false;

    public add(callback: () => void): void {
        this.stack.push(callback);
        if (!this.inProgress) {
            this.run();
        }
    }

    private run() {
        this.inProgress = true;
        while (this.stack.length > 0) {
            this.stack.shift()();
        }
        this.inProgress = false;
    }

    public clear(): void {
        this.stack = [];
    }
}