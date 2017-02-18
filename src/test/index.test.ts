import {StateEmitter} from "..";
import test from 'ava';

test('should not emit new values if completed', (t) => {
    const se = new StateEmitter<number>(0);
    se.subscribe((x) => {
        t.true(x <= 3);
    });
    se.next(1);
    se.next(2);
    se.next(3);
    se.complete();
    se.next(4);
    se.next(5);
    se.subscribe((x) => {
        t.true(x === 3);
    });
});