/*tslint:disable:no-any*/
import 'mocha';

import {assert} from 'chai';
import {Application, connect, Fin, Window} from 'hadouken-js-adapter';

// delay necessary to let snap and dock manager do its work...
const DELAY_MS = 100;
const version = '8.56.30.15';

function delayPromise(delay = 200) {
  // tslint:disable-next-line
  return new Promise(resolve => setTimeout(resolve, delay));
}

let fin: Fin;
let win0: Window;
let win1: Window;
let win2: Window;
let win3: Window;
const apps: Application[] = [];
const connectConfig = {
  runtime: {version},
  uuid: 'sd-test'
};
const appConfigTemplate = {
  url: 'about:blank',
  autoShow: true,
  nonPersistent: true,
  saveWindowState: false,
  defaultHeight: 200,
  defaultWidth: 200,
  defaultCenter: true
};

const createWin = async (num: number, opts?: any) => {
  return fin.Application
      .create(
          {...appConfigTemplate, uuid: `win${num}`, name: `win${num}`, ...opts})
      .then((a: any) => {
        apps.push(a);
        return a.run().then(() => a.getWindow());
      });
};

before(() => {
  return connect(connectConfig).then(a => fin = a);
});

// // STRESS TEST - COMMENT OUT FOR NORMAL RUN
// before(async () => {
//     let x = 15;
//     while (x > 5) {
//         createWin(x, {defaultLeft: 800, defaultTop: 800});
//         x = x - 1;
//     }
//     await delayPromise(1500);
//     apps = [];
// });

before(async () => {
  win0 = await createWin(0);
  await delayPromise(1500);
});

after(async () => {
  apps.forEach(a => a.close());
  await delayPromise(1000);
});

describe('Snap and Dock Tests', () => {
  const bounds = {height: 200, width: 200, top: 10, left: 10};
  let win0Bounds: any;
  let win1Bounds: any;
  let win2Bounds: any;

  it('Should not snap and dock to hidden windows', async () => {
    await win0.setBounds(bounds);
    await win0.hide();
    win0Bounds = bounds;
    win1 = await createWin(1);
    await delayPromise(DELAY_MS);

    const left = bounds.left + bounds.width + 2;
    const top = bounds.top + 2;
    await win1.moveTo(left, top);
    await delayPromise(DELAY_MS);

    const postMoveBounds = await win1.getBounds();

    assert.equal(postMoveBounds.top, top, 'Expected window not to snap');
    assert.equal(postMoveBounds.left, left, 'Expected window not to snap');
    win1Bounds = postMoveBounds;
    return;
  });

  it('Should not snap and dock to minimized windows', async () => {
    await win0.show();
    await win0.minimize();
    win1.moveBy(-1, -1);
    await delayPromise(DELAY_MS);

    const postMoveBounds = await win1.getBounds();

    assert.equal(
        postMoveBounds.top, win1Bounds.top - 1, 'Expected window not to snap');
    assert.equal(
        postMoveBounds.left, win1Bounds.left - 1,
        'Expected window not to snap');
    win1Bounds = postMoveBounds;
    return;
  });

  it('Should snap and dock two windows', async () => {
    await win0.restore();
    await delayPromise(DELAY_MS);

    win1.moveBy(1, 1);
    await delayPromise(DELAY_MS);

    const postSnapBounds = await win1.getBounds();

    assert.equal(
        postSnapBounds.top, bounds.top, 'Expected top bounds to be equal');
    assert.equal(
        postSnapBounds.left, bounds.left + bounds.width,
        'Expected snapped window to move to right edge of existing');
    win1Bounds = postSnapBounds;
    return;
  });

  it('Should then move together as group after snapped', async () => {
    await win0.moveBy(2, 2);
    await delayPromise(DELAY_MS);

    const postMoveBounds = await win1.getBounds();
    assert.equal(
        win1Bounds.top + 2, postMoveBounds.top,
        'Expected top bounds to be equal');
    assert.equal(
        win1Bounds.left + 2, postMoveBounds.left,
        'Expected left bounds to be equal');
    win1Bounds = postMoveBounds;
    return;
  });

  it('Should not allow window resizing after being snapped and docked',
     async () => {
       await win0.resizeBy(2, 2, 'top-left');
       const postResizeBounds = await win0.getBounds();
       assert.equal(
           postResizeBounds.height, bounds.height,
           'Expected height to be equal');
       assert.equal(
           postResizeBounds.width, bounds.width, 'Expected width to be equal');
       win0Bounds = postResizeBounds;
       return;
     });

  it('Should not allow a third window to snap and dock on top of second window',
     async () => {
       win2 = await createWin(2);
       await delayPromise(DELAY_MS);

       const left = win0Bounds.left + win0Bounds.width + 2;
       const top = win0Bounds.top + 2;
       await win2.moveTo(left, top);
       await delayPromise(DELAY_MS);

       const postMoveBounds = await win2.getBounds();
       assert.equal(
           postMoveBounds.top, top,
           'Expected top bounds to be equal to move to');
       assert.equal(
           postMoveBounds.left, left,
           'Expected left bounds to be equal to move to');
       win2Bounds = postMoveBounds;
       return;
     });

  it('Should allow a third window to snap and dock next to second window',
     async () => {
       const left = win1Bounds.left + win1Bounds.width + 2;
       const top = win1Bounds.top + 2;
       await win2.moveTo(left, top);
       await delayPromise(DELAY_MS);

       const postMoveBounds = await win2.getBounds();
       assert.equal(
           postMoveBounds.top, win1Bounds.top,
           'Expected top bounds to be equal');
       assert.equal(
           postMoveBounds.left, win1Bounds.left + win1Bounds.width,
           'Expected snapped window to move to edge of existing');
       win2Bounds = postMoveBounds;
       return;
     });

  it('On close, should keep windows that share a bound grouped', async () => {
    win3 = await createWin(3);
    await win3.moveTo(
        win0Bounds.left + 2, win0Bounds.top + win0Bounds.height + 2);
    win1Bounds = await win1.getBounds();
    await delayPromise(DELAY_MS);

    await apps[2].close();
    await delayPromise(DELAY_MS);

    await win3.moveBy(10, 10);
    await delayPromise(DELAY_MS);

    const postMoveBounds = await win1.getBounds();
    assert.equal(
        postMoveBounds.top, win1Bounds.top + 10,
        'Expected top bounds to move with group');
    assert.equal(
        postMoveBounds.left, win1Bounds.left + 10,
        'Expected left bounds to move with group');
    win1Bounds = postMoveBounds;
  });

  it('On close, should disband the group if windows are isolated', async () => {
    await apps[0].close();
    await delayPromise(DELAY_MS);

    await win3.moveBy(10, 10);
    await delayPromise(DELAY_MS);

    const postMoveBounds = await win1.getBounds();
    assert.equal(
        win1Bounds.top, postMoveBounds.top, 'Expected top bounds to not move');
    assert.equal(
        win1Bounds.left, postMoveBounds.left,
        'Expected left bounds to not move');

    win1Bounds = postMoveBounds;
    return;
  });

  it('State check: Should still snap two remaining ungrouped windows back together',
     async () => {
       await win3.moveTo(
           win1Bounds.left + win1Bounds.width + 2, win1Bounds.top + 2);
       await delayPromise(DELAY_MS);

       const postSnapBounds = await win3.getBounds();

       assert.equal(
           postSnapBounds.top, win1Bounds.top,
           'Expected top bounds to be equal after snap');
       assert.equal(
           postSnapBounds.left, win1Bounds.left + win1Bounds.width,
           'Expected window to snap to right edge');

       await win1.moveBy(2, 2);
       await delayPromise(DELAY_MS);

       const postMoveBounds = await win3.getBounds();
       assert.equal(
           postSnapBounds.top + 2, postMoveBounds.top,
           'Expected top bounds to be equal');
       assert.equal(
           postSnapBounds.left + 2, postMoveBounds.left,
           'Expected left bounds to be equal');
       return;
     });
});
