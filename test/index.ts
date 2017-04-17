import {StateEmitter} from "../lib";
import test from 'ava';

test('should emit new values once subscribed, and should not emit unchanged values if distinct is not false', (t) => {
    const allOptions = [undefined, {distinct: true}, {distinct: false}];
    const callCounts = [1, 1, 2];

    allOptions.forEach((options, idx) => {
        const se = new StateEmitter<number>(0, options);
        let callCount = 0;
        se.subscribe((x) => {
            t.is(x, 0);
            callCount++;
        });
        se.next(0);
        t.is(callCount, callCounts[idx]);
    });
});

test('should emit merge object values by default, and dont merge those if cloneMergeObjectsOnNext=false', (t) => {
    type IObj = {x?: boolean, y?: boolean}

    const allOptions = [undefined, {cloneMergeObjectsOnNext: true}, {cloneMergeObjectsOnNext: false}];
    const equalVals = [false, false, true];

    allOptions.forEach((options, idx) => {
        const objX = {x: true};
        const objY = {y: true};

        const se = new StateEmitter<IObj>(objX, options);
        t.is(true, se.get() === objX);

        se.next(objY);

        t.is(se.get() === objY, equalVals[idx]);
    });
});

test('should emit new values to 2 subscribers', (t) => {
    const se = new StateEmitter<number>(0);
    let counter = 0;
    se.subscribe((x) => {
        counter += 1;
    });
    se.subscribe((x) => {
        counter += 1;
    });
    se.next(1);
    t.is(counter, 4);
});

test('get() should return current value', (t) => {
    const se = new StateEmitter<number>(0);
    t.plan(2);
    se.subscribe((x) => {
        t.is(x, 0);
        t.is(se.get(), 0);
    });
});

test('equal()', (t) => {
    const se = new StateEmitter<number>(0);
    t.plan(1);
    if (se.equal(1)) {
        t.fail();
    } else if (se.equal(0)) {
        t.pass();
    }
});

test('reset()', (t) => {
    const se = new StateEmitter<number>(0);
    se.reset();
    se.subscribe(() => {
        t.fail();
    })
});

test('previous() and get()', (t) => {
    const se = new StateEmitter<number>(0);
    se.next(1);
    se.subscribe((state, previousState) => {
        t.is(state, 1);
        t.is(previousState, 0);
        t.true(state === se.get());
        t.true(previousState === se.previous());
    });
});

test('should notify about values once subscribed', (t) => {
    const se = new StateEmitter<number>(0);
    t.plan(1);
    se.subscribe((x) => {
        t.is(x, 0);
    });
});

test('should not emit new values if completed', (t) => {
    const se = new StateEmitter<number>(0);
    t.plan(1);
    se.complete();
    se.next(1);
    se.subscribe((x) => {
        t.is(x, 0);
    });
});

let stateEmitter: StateEmitter<boolean>;

test.beforeEach(() => {
    stateEmitter = new StateEmitter<boolean>();
    stateEmitter.next(false);
});

test('Should call function on true', (t) => {
    t.plan(1);
    stateEmitter.whenEqual(true, () => {
        t.pass();
    });
    stateEmitter.next(true);
});

test('Should not call function on false', (t) => {
    t.plan(0);
    stateEmitter.whenEqual(true, () => {
        t.fail();
    });
    stateEmitter.next(false);
});

test('Should call function on true three times given multiple state updates', (t) => {
    let counter = 0;
    stateEmitter.whenEqual(true, () => {
        counter += 1;
    });
    //First state update to true
    stateEmitter.next(true);
    stateEmitter.next(false);
    //Second state update to true
    stateEmitter.next(true);
    stateEmitter.next(true);
    stateEmitter.next(false);
    stateEmitter.next(false);
    stateEmitter.next(false);
    //Third state update to true
    stateEmitter.next(true);
    stateEmitter.next(true);
    t.is(counter, 3);
});

test('Should call function only once on expected state change', (t) => {
    let counter = 0;
    stateEmitter.onceEqual(true, () => {
        counter += 1;
    });
    //First state update to true
    stateEmitter.next(true);
    stateEmitter.next(false);
    //Second state update to true
    stateEmitter.next(true);
    stateEmitter.next(false);
    t.is(counter, 1);
});

interface IConnectedState {
    connected: boolean,
    reason: number
}

test('Should call function when connected state becomes true', (t) => {
    let counter = 0;
    const stateEmitter = new StateEmitter<IConnectedState>({
        connected: true,
        reason: 0
    });
    stateEmitter.next({
        connected: false,
        reason: 1
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 6
    });
    stateEmitter.onSubsetMatch({
        connected: true
    }, () => {
        counter += 1;
    });
    stateEmitter.next({
        connected: false,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: false,
        reason: 1
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 6
    });
    t.is(counter, 3);
});

test('Should call function when connected state is true only once', (t) => {
    let counter = 0;
    const stateEmitter = new StateEmitter<IConnectedState>();
    stateEmitter.onceExtendsBy({connected: true}, () => {
        counter += 1;
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 3
    });
    stateEmitter.next({
        connected: false,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 5
    });
    t.is(counter, 1);
});

test('callOnEval()', (t) => {
    let counter = 0;
    const stateEmitter = new StateEmitter<IConnectedState>();
    stateEmitter.callOnEval((state) => {
        if (state.reason === 2) {
            return true;
        }
    }, () => {
        counter += 1;
    })
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    t.is(counter, 1);
});

test('callOnEvalOnce()', (t) => {
    let counter = 0;
    const stateEmitter = new StateEmitter<IConnectedState>();
    stateEmitter.callOnEvalOnce((state) => {
        if (state.reason === 2) {
            counter += 1;
            return true;
        }
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 1
    });
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    t.is(counter, 1);
});
