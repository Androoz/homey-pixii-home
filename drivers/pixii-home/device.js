'use strict';

const Homey = require('homey');
const PixiiMqtt = require('../../lib/pixii-mqtt');
const { defaultCommandTopic } = require('../../lib/pixii-mqtt');
const { mapPayload } = require('../../lib/pixii-mapping');
const { calculateDynamicChargePower, calculateDynamicDischargePower, calculateDynamicBalancePower } = require('../../lib/power-control');
const { calculateDisplayedSoc, getSystemStatusInfo, getServiceInfo, getSystemEventsText } = require('../../lib/pixii-values');
const { SerializedAckQueue } = require('../../lib/serialized-ack-queue');

class PixiiHomeDevice extends Homey.Device {
  async onInit() {
    this.lastStatusAt = 0;
    this.commandQueue = new SerializedAckQueue({
      publish: payload => this.publishService(payload),
      setTimer: (callback, timeout) => this.homey.setTimeout(callback, timeout),
      clearTimer: timer => this.homey.clearTimeout(timer),
      timeoutError: () => new Error(this.homey.__('errors.ack_timeout'))
    });
    await this.ensureCapabilities();
    const settings = this.getSettings();
    const serial = settings.serial || this.getData().id;
    const obsoleteDefault = `pixii/service/${serial}`;
    if (settings.command_topic === obsoleteDefault) {
      settings.command_topic = defaultCommandTopic(serial);
      await this.setSettings({ command_topic: settings.command_topic });
      this.log(`Migrated command topic to ${settings.command_topic}`);
    }
    this.connectMqtt(settings);
    this.availabilityTimer = this.homey.setInterval(() => this.checkAvailability(), 30000);
  }

  async ensureCapabilities() {
    for (const capability of ['meter_power.exported', 'pixii_service_text', 'pixii_service_details', 'pixii_system_status_text', 'pixii_system_status_details', 'pixii_system_events']) {
      if (!this.hasCapability(capability)) await this.addCapability(capability).catch(this.error);
    }
    for (const capability of ['pixii_service', 'pixii_system_status']) {
      if (this.hasCapability(capability)) await this.removeCapability(capability).catch(this.error);
    }
  }

  connectMqtt(settings) {
    this.commandQueue?.cancel(new Error(this.homey.__('errors.connection_changed')));
    this.mqtt?.destroy();
    const s = settings || this.getSettings();
    this.mqtt = new PixiiMqtt({
      host: s.host,
      port: s.port,
      username: s.username,
      password: s.password,
      serial: s.serial || this.getData().id,
      tls: s.tls,
      rejectUnauthorized: s.reject_unauthorized,
      commandTopic: s.command_topic || undefined
    });
    this.mqtt.on('connect', async () => {
      await this.setCapabilityValue('pixii_mqtt_connected', true).catch(this.error);
      await this.setAvailable().catch(this.error);
      if (this.mqttWasConnected !== true) {
        await this.homey.flow.getDeviceTriggerCard('mqtt_connection_restored').trigger(this, {}, {}).catch(this.error);
      }
      this.mqttWasConnected = true;
    });
    this.mqtt.on('disconnect', async () => {
      this.commandQueue.cancel(new Error(this.homey.__('errors.offline')));
      await this.setCapabilityValue('pixii_mqtt_connected', false).catch(this.error);
      if (this.mqttWasConnected === true) {
        await this.homey.flow.getDeviceTriggerCard('mqtt_connection_lost').trigger(this, {}, {}).catch(this.error);
      }
      this.mqttWasConnected = false;
    });
    this.mqtt.on('error', err => this.handleMqttError(err));
    this.mqtt.on('parseError', (err, topic) => this.error(`Invalid JSON on ${topic}:`, err));
    this.mqtt.on('message', (topic, payload) => this.handleMessage(topic, payload));
    this.mqtt.connect();
  }

  async handleMqttError(err) {
    this.error('MQTT:', err);
    const authRejected = Number(err?.code) === 5 || /not authorized/i.test(err?.message || '');
    if (authRejected) {
      await this.setCapabilityValue('pixii_mqtt_connected', false).catch(this.error);
      await this.setUnavailable(this.homey.__('errors.auth_rejected')).catch(this.error);
    }
  }

  async handleMessage(topic, payload) {
    this.lastStatusAt = Date.now();
    if (topic.includes('/ack/')) {
      await this.handleAck(payload);
      return;
    }
    const type = topic.split('/').pop();
    if (type === 'battery') {
      const settings = this.getSettings();
      const displayedSoc = calculateDisplayedSoc(payload, {
        scaleToUsable: settings.soc_scale_usable !== false,
        useCustomLimits: settings.soc_custom_limits === true,
        customMin: settings.soc_custom_min,
        customMax: settings.soc_custom_max
      });
      if (Number.isFinite(displayedSoc)) await this.updateTelemetry('measure_battery', displayedSoc);
    }
    if (type === 'core') {
      const language = this.homey.i18n.getLanguage();
      if (payload.srv_type !== undefined) {
        await this.updateDescribedValue('pixii_service_text', 'pixii_service_details', getServiceInfo(payload.srv_type, language), 'active_service_changed', 'service');
      }
      if (payload.sys_status !== undefined) {
        await this.updateDescribedValue('pixii_system_status_text', 'pixii_system_status_details', getSystemStatusInfo(payload.sys_status, language), 'system_status_changed', 'status');
      }
      if (payload.sys_events !== undefined) {
        await this.setCapabilityValue('pixii_system_events', getSystemEventsText(payload.sys_events, language)).catch(this.error);
      }
    }
    for (const { capability, value } of mapPayload(topic, payload)) {
      if (this.hasCapability(capability) && Number.isFinite(value)) await this.updateTelemetry(capability, value);
    }
  }

  async updateTelemetry(capability, value) {
    const previous = this.getCapabilityValue(capability);
    await this.setCapabilityValue(capability, value).catch(this.error);
    if (previous === null || previous === undefined || previous === value) return;

    if (capability === 'measure_battery') {
      await this.homey.flow.getDeviceTriggerCard('battery_level_changed')
        .trigger(this, { level: value }, {}).catch(this.error);
      if (previous < 99.5 && value >= 99.5) {
        await this.homey.flow.getDeviceTriggerCard('battery_became_full')
          .trigger(this, { level: value }, {}).catch(this.error);
      }
    }

    if (capability === 'measure_power') {
      const state = power => power > 100 ? 'charging' : power < -100 ? 'discharging' : 'idle';
      const previousState = state(Number(previous));
      const nextState = state(Number(value));
      if (previousState !== nextState) {
        const cardId = nextState === 'charging' ? 'battery_started_charging'
          : nextState === 'discharging' ? 'battery_started_discharging'
            : 'battery_became_idle';
        await this.homey.flow.getDeviceTriggerCard(cardId)
          .trigger(this, { power: value }, {}).catch(this.error);
      }
    }
  }

  async updateDescribedValue(capability, detailsCapability, info, cardId, tokenName) {
    const previous = this.getCapabilityValue(capability);
    await this.setCapabilityValue(capability, info.title).catch(this.error);
    await this.setCapabilityValue(detailsCapability, info.details).catch(this.error);
    if (previous !== null && previous !== undefined && previous !== info.title) {
      await this.homey.flow.getDeviceTriggerCard(cardId)
        .trigger(this, { code: info.code, [tokenName]: info.title }, {}).catch(this.error);
    }
  }

  async handleAck(payload) {
    const success = Number(payload.response) === 65535 || payload.response_msg === 'success' || payload.response_text === 'success';
    const message = payload.response_msg || payload.response_text || JSON.stringify(payload);
    await this.setCapabilityValue('pixii_last_ack', message).catch(this.error);
    const matched = this.commandQueue.handleAck(
      payload,
      success ? null : new Error(this.homey.__('errors.ack', { message }))
    );
    if (!matched && this.commandQueue.pending) {
      this.log(`Ignored unrelated Pixii ACK while waiting for ${this.commandQueue.pending.command.service || this.commandQueue.pending.command.mode || 'command'}`);
    }
    if (matched) {
      const card = this.homey.flow.getDeviceTriggerCard(success ? 'command_succeeded' : 'command_failed');
      await card.trigger(this, { service: payload.service || '', message }, {}).catch(this.error);
    }
  }

  async sendService(payload, waitForAck = true, replaceKey = null) {
    if (replaceKey) return this.commandQueue.enqueueLatest(payload, replaceKey, waitForAck);
    return this.commandQueue.enqueue(payload, waitForAck);
  }

  async publishService(payload) {
    if (!this.isMqttConnected()) throw new Error(this.homey.__('errors.offline'));
    this.commandSequence = (this.commandSequence || 0) + 1;
    this.log(`MQTT command #${this.commandSequence} -> ${this.mqtt.getCommandTopic()}: ${JSON.stringify(payload)}`);
    try {
      await this.mqtt.publish(payload);
    } catch (error) {
      if (error?.code === 'MQTT_OFFLINE') throw new Error(this.homey.__('errors.offline'));
      throw error;
    }
  }

  setDemandResponse(power, duration) {
    return this.sendService({ service: 'demandresponse', method: 'set', values: { pacref: Number(power) }, starttime: 'now', duration: Number(duration) });
  }

  setLatestDynamicDemandResponse(power, duration) {
    return this.sendService(
      { service: 'demandresponse', method: 'set', values: { pacref: Number(power) }, starttime: 'now', duration: Number(duration) },
      true,
      'dynamic-grid-balance'
    );
  }

  chargeBattery(power, durationMinutes) {
    return this.setDemandResponse(Math.abs(Number(power)), Math.round(Number(durationMinutes) * 60));
  }

  dischargeBattery(power, durationMinutes) {
    return this.setDemandResponse(-Math.abs(Number(power)), Math.round(Number(durationMinutes) * 60));
  }

  holdBattery(durationMinutes) {
    return this.setDemandResponse(0, Math.round(Number(durationMinutes) * 60));
  }

  stopCharging() {
    this.dynamicBatteryPower = 0;
    this.dynamicPowerUpdatedAt = 0;
    const leaseSeconds = Number(this.getSetting('dynamic_charge_lease')) || 300;
    return this.setLatestDynamicDemandResponse(0, leaseSeconds);
  }

  stopDischarging() {
    this.dynamicBatteryPower = 0;
    this.dynamicPowerUpdatedAt = 0;
    const leaseSeconds = Number(this.getSetting('dynamic_discharge_lease')) || 300;
    return this.setLatestDynamicDemandResponse(0, leaseSeconds);
  }

  chargeToSoc(soc) {
    return this.setTargetSoc(soc, 0);
  }

  dynamicChargeFromGridPower(gridPower) {
    const maxChargePower = Number(this.getSetting('dynamic_charge_max')) || 10000;
    const deadband = Number(this.getSetting('dynamic_charge_deadband')) || 100;
    const leaseSeconds = Number(this.getSetting('dynamic_charge_lease')) || 300;
    const now = Date.now();
    const currentPower = this.dynamicPowerUpdatedAt && now - this.dynamicPowerUpdatedAt <= leaseSeconds * 1000
      ? Math.max(0, this.dynamicBatteryPower || 0)
      : 0;
    const chargePower = calculateDynamicChargePower(gridPower, currentPower, maxChargePower, deadband);
    this.dynamicBatteryPower = chargePower;
    this.dynamicPowerUpdatedAt = now;
    return this.setLatestDynamicDemandResponse(chargePower, leaseSeconds);
  }

  dynamicDischargeFromGridPower(gridPower) {
    const maxDischargePower = Number(this.getSetting('dynamic_discharge_max')) || 10000;
    const deadband = Number(this.getSetting('dynamic_discharge_deadband')) || 100;
    const leaseSeconds = Number(this.getSetting('dynamic_discharge_lease')) || 300;
    const now = Date.now();
    const currentPower = this.dynamicPowerUpdatedAt && now - this.dynamicPowerUpdatedAt <= leaseSeconds * 1000
      ? Math.min(0, this.dynamicBatteryPower || 0)
      : 0;
    const dischargePower = calculateDynamicDischargePower(gridPower, currentPower, maxDischargePower, deadband);
    this.dynamicBatteryPower = dischargePower;
    this.dynamicPowerUpdatedAt = now;
    return this.setLatestDynamicDemandResponse(dischargePower, leaseSeconds);
  }

  dynamicBalanceFromGridPower(gridPower, targetGridPower, mode) {
    const maxChargePower = Number(this.getSetting('dynamic_charge_max')) || 10000;
    const maxDischargePower = Number(this.getSetting('dynamic_discharge_max')) || 10000;
    const deadband = Number(this.getSetting('dynamic_balance_deadband')) || 100;
    const leaseSeconds = Number(this.getSetting('dynamic_balance_lease')) || 300;
    const now = Date.now();
    const currentPower = this.dynamicPowerUpdatedAt && now - this.dynamicPowerUpdatedAt <= leaseSeconds * 1000
      ? this.dynamicBatteryPower || 0
      : 0;
    const requestedPower = calculateDynamicBalancePower(
      gridPower,
      currentPower,
      targetGridPower,
      maxChargePower,
      maxDischargePower,
      deadband,
      mode
    );
    this.dynamicBatteryPower = requestedPower;
    this.dynamicPowerUpdatedAt = now;
    return this.setLatestDynamicDemandResponse(requestedPower, leaseSeconds);
  }

  setTargetSoc(soc, duration) {
    const payload = { service: 'targetsoc', method: 'set', values: { socref: Number(soc) }, starttime: 'now' };
    if (Number(duration) > 0) payload.duration = Number(duration);
    return this.sendService(payload);
  }

  setPowerControl(power, reactive, duration) {
    return this.sendService({ service: 'powercontrol', method: 'set', values: { pacref: Number(power), pacreact_pct: Number(reactive) }, starttime: 'now', duration: Number(duration) });
  }

  stopControl() {
    return this.setDemandResponse(0, 60);
  }

  async publishRawService(payload) {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return this.sendService(parsed);
  }

  isMqttConnected() { return Boolean(this.mqtt?.client?.connected); }

  async checkAvailability() {
    const timeout = (Number(this.getSetting('availability_timeout')) || 120) * 1000;
    if (this.lastStatusAt && Date.now() - this.lastStatusAt > timeout) await this.setUnavailable(this.homey.__('errors.status_timeout')).catch(this.error);
  }

  async onSettings({ newSettings, changedKeys }) {
    if (newSettings.soc_custom_limits === true && Number(newSettings.soc_custom_max) <= Number(newSettings.soc_custom_min)) {
      throw new Error(this.homey.__('errors.soc_limits'));
    }
    if (changedKeys.some(key => ['host', 'port', 'username', 'password', 'serial', 'tls', 'reject_unauthorized', 'command_topic'].includes(key))) {
      // onSettings is called before Homey has persisted the values, therefore
      // getSettings() can still return the previous credentials here.
      this.connectMqtt({ ...this.getSettings(), ...newSettings });
    }
  }

  async onDeleted() {
    if (this.availabilityTimer) this.homey.clearInterval(this.availabilityTimer);
    this.commandQueue.cancel(new Error(this.homey.__('errors.offline')));
    this.mqtt?.destroy();
  }
}

module.exports = PixiiHomeDevice;
