'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDynamicChargePower, calculateDynamicDischargePower, calculateDynamicBalancePower } = require('../lib/power-control');

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

test('balances import and export toward a configurable grid target', () => {
  assert.equal(calculateDynamicBalancePower(-2500, 0, 100, 5000, 5000, 50), 2600);
  assert.equal(calculateDynamicBalancePower(2500, 0, 100, 5000, 5000, 50), -2400);
});

test('holds the current command inside the target deadband', () => {
  assert.equal(calculateDynamicBalancePower(150, 1200, 100, 5000, 5000, 100), 1200);
});

test('supports direction-limited balancing modes', () => {
  assert.equal(calculateDynamicBalancePower(2500, 0, 100, 5000, 5000, 50, 'charge_only'), 0);
  assert.equal(calculateDynamicBalancePower(-2500, 0, 100, 5000, 5000, 50, 'discharge_only'), 0);
});

test('limits bidirectional balancing power independently', () => {
  assert.equal(calculateDynamicBalancePower(-12000, 0, 0, 3000, 5000, 100), 3000);
  assert.equal(calculateDynamicBalancePower(12000, 0, 0, 3000, 5000, 100), -5000);
});
