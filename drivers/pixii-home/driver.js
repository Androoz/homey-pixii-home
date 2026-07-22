'use strict';

const Homey = require('homey');
const { defaultCommandTopic } = require('../../lib/pixii-mqtt');

class PixiiHomeDriver extends Homey.Driver {
  async onInit() {
    this.registerFlowCards();
  }

  registerFlowCards() {
    const actions = {
      charge_battery: ({ device, power, duration }) => device.chargeBattery(power, duration),
      discharge_battery: ({ device, power, duration }) => device.dischargeBattery(power, duration),
      hold_battery: ({ device, duration }) => device.holdBattery(duration),
      stop_charging: ({ device }) => device.stopCharging(),
      stop_discharging: ({ device }) => device.stopDischarging(),
      charge_to_soc: ({ device, soc }) => device.chargeToSoc(soc),
      dynamic_charge_from_grid_power: ({ device, grid_power }) => device.dynamicChargeFromGridPower(grid_power),
      dynamic_discharge_from_grid_power: ({ device, grid_power }) => device.dynamicDischargeFromGridPower(grid_power),
      balance_grid_power: ({ device, grid_power, target, mode }) => device.dynamicBalanceFromGridPower(grid_power, target, mode),
      demand_response: ({ device, power, duration }) => device.setDemandResponse(power, duration),
      target_soc: ({ device, soc, duration }) => device.setTargetSoc(soc, duration),
      power_control: ({ device, power, reactive, duration }) => device.setPowerControl(power, reactive, duration),
      stop_control: ({ device }) => device.stopControl(),
      publish_service: ({ device, payload }) => device.publishRawService(payload)
    };

    Object.entries(actions).forEach(([id, listener]) => {
      this.homey.flow.getActionCard(id).registerRunListener(listener);
    });

    this.homey.flow.getConditionCard('soc_above')
      .registerRunListener(({ device, soc }) => device.getCapabilityValue('measure_battery') > soc);
    this.homey.flow.getConditionCard('soc_below')
      .registerRunListener(({ device, soc }) => device.getCapabilityValue('measure_battery') < soc);
    this.homey.flow.getConditionCard('mqtt_connected')
      .registerRunListener(({ device }) => device.isMqttConnected());
  }

  async onPair(session) {
    let candidate;

    session.setHandler('save_connection', async data => {
      const settings = data || {};
      if (!settings.host || !settings.serial) throw new Error(this.homey.__('pair.missing'));
      candidate = {
        name: `Pixii Home ${settings.serial}`,
        data: { id: String(settings.serial) },
        settings: {
          host: String(settings.host).trim(),
          port: Number(settings.port) || (settings.tls ? 8883 : 1883),
          username: settings.username || '',
          password: settings.password || '',
          serial: String(settings.serial).trim(),
          tls: Boolean(settings.tls),
          command_topic: defaultCommandTopic(String(settings.serial).trim())
        }
      };
      return true;
    });

    session.setHandler('list_devices', async () => candidate ? [candidate] : []);
  }
}

module.exports = PixiiHomeDriver;
