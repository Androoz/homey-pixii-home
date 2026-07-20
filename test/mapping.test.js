'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mapPayload } = require('../lib/pixii-mapping');

test('maps battery telemetry', () => {
  assert.deepEqual(mapPayload('pixii/status/242001002284/battery', { batt_soc: 89.5, batt_w: -2000 }), [
    { capability: 'measure_power', value: -2000 }
  ]);
});

test('maps meter telemetry', () => {
  assert.deepEqual(mapPayload('pixii/status/242001002284/meter', { building_ac_w: 2300, meter_w: -500 }), [
    { capability: 'pixii_house_power', value: 2300 },
    { capability: 'pixii_grid_power', value: -500 }
  ]);
});

test('maps Pixii charged and discharged energy counters for Homey', () => {
  assert.deepEqual(mapPayload('pixii/status/242001002284/energy', {
    ess_kwh_imp: 1775.45,
    ess_kwh_exp: -1446.95
  }), [
    { capability: 'meter_power', value: 1775.45 },
    { capability: 'meter_power.exported', value: 1446.95 }
  ]);
});
