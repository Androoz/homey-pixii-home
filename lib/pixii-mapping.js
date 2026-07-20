'use strict';

const mappings = {
  battery: {
    batt_w: 'measure_power',
    batt_soh: 'pixii_battery_soh',
    batt_temp: 'pixii_battery_temperature',
    batt_temp_max: 'pixii_battery_temperature'
  },
  energy: {
    batt_soc_kwh: 'pixii_battery_energy',
    ess_kwh_imp: 'meter_power'
  },
  meter: {
    building_ac_w: 'pixii_house_power',
    meter_w: 'pixii_grid_power'
  },
  core: {}
};

function mapPayload(topic, payload) {
  const type = topic.split('/').pop();
  const mapping = mappings[type] || {};
  return Object.entries(mapping)
    .filter(([field]) => payload[field] !== undefined && payload[field] !== null)
    .map(([field, capability]) => ({ capability, value: Number(payload[field]) }));
}

module.exports = { mapPayload };
