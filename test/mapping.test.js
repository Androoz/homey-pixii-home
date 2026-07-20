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
