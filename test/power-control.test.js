'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDynamicChargePower, calculateDynamicDischargePower } = require('../lib/power-control');

test('turns negative grid power into positive charge power', () => {
  assert.equal(calculateDynamicChargePower(-2475, 0, 10000, 100), 2475);
});

test('corrects dynamic charging and holds it inside the deadband', () => {
  assert.equal(calculateDynamicChargePower(800, 2000, 10000, 100), 1200);
  assert.equal(calculateDynamicChargePower(-75, 2000, 10000, 100), 2000);
});

test('limits the dynamic charging power', () => {
  assert.equal(calculateDynamicChargePower(-12000, 0, 5000, 100), 5000);
});

test('turns positive grid power into negative discharge power', () => {
  assert.equal(calculateDynamicDischargePower(2475, 0, 10000, 100), -2475);
});

test('corrects dynamic discharging and holds it inside the deadband', () => {
  assert.equal(calculateDynamicDischargePower(-800, -2000, 10000, 100), -1200);
  assert.equal(calculateDynamicDischargePower(75, -2000, 10000, 100), -2000);
});

test('limits the dynamic discharging power', () => {
  assert.equal(calculateDynamicDischargePower(12000, 0, 5000, 100), -5000);
});
