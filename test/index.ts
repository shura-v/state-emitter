import {StateEmitter} from "../lib";
import test from 'ava';

test('should not emit new values if completed', (t) => {
    const se = new StateEmitter<number>(0);
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
    stateEmitter.whenEqual(true, () => {
        t.pass();
    });
    stateEmitter.next(true);
});

test('Should not call function on false', (t) => {
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
    t.plan(1);
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
    stateEmitter.next({
        connected: true,
        reason: 2
    });
    stateEmitter.next({
        connected: true,
        reason: 3
    });
    stateEmitter.onceExtendsBy({connected: true}, () => {
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
        connected: true,
        reason: 5
    });
    t.is(counter, 1);
});
