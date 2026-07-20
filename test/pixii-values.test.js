'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDisplayedSoc, getSystemStatusInfo, getServiceInfo, getSystemEventsText } = require('../lib/pixii-values');

test('uses Pixii usable SoC when available', () => {
  assert.equal(calculateDisplayedSoc({ batt_soc: 90, batt_soc_usable: 100 }), 100);
});

test('describes the Pixii system events bitfield', () => {
  assert.equal(getSystemEventsText(0, 'en'), 'No active events');
  assert.equal(getSystemEventsText((2 ** 22) + (2 ** 23), 'en'), 'Minimum SoC reached, Maximum SoC reached');
  assert.equal(getSystemEventsText(2 ** 16, 'sv'), 'Batterikalibrering rekommenderas');
  assert.equal(getSystemEventsText(2 ** 17, 'en'), 'Unknown event (17)');
});

test('prefers valid reserved limits over an invalid zero usable SoC', () => {
  assert.equal(calculateDisplayedSoc({ batt_soc: 76.4, batt_soc_usable: 0, batt_soc_min: 10, batt_soc_max: 90 }), 83);
});

test('scales raw SoC using automatic reserved limits', () => {
  assert.equal(calculateDisplayedSoc({ batt_soc: 90, batt_soc_min: 10, batt_soc_max: 90 }), 100);
  assert.equal(calculateDisplayedSoc({ batt_soc: 50, batt_soc_min: 10, batt_soc_max: 90 }), 50);
  assert.equal(calculateDisplayedSoc({ batt_soc: 10, batt_soc_min: 10, batt_soc_max: 90 }), 0);
});

test('supports custom displayed SoC limits', () => {
  assert.equal(calculateDisplayedSoc(
    { batt_soc: 85 },
    { useCustomLimits: true, customMin: 5, customMax: 85 }
  ), 100);
});

test('can expose raw SoC without usable-range scaling', () => {
  assert.equal(calculateDisplayedSoc({ batt_soc: 90, batt_soc_usable: 100 }, { scaleToUsable: false }), 90);
});

test('describes documented status and service codes', () => {
  assert.deepEqual(getSystemStatusInfo(1, 'en'), {
    code: 1,
    title: 'Normal',
    description: 'No registered issues',
    details: '1 — No registered issues'
  });
  assert.deepEqual(getSystemStatusInfo(2, 'en'), {
    code: 2,
    title: 'Normal',
    description: 'Information event; operation is normal',
    details: '2 — Information event; operation is normal'
  });
  assert.equal(getServiceInfo(102, 'sv').title, 'Demand response');
  assert.equal(getServiceInfo(102, 'sv').details, '102 — Aktiv effekt styrs av demand response');
});
