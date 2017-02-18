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
        const stack = this.stack.slice();
        this.stack = [];
        stack.forEach(callback => callback());
        this.inProgress = false;
        if (this.stack.length) {
            this.run();
        }
    }

    public clear(): void {
        this.stack = [];
    }
}