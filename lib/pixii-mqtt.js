'use strict';

const mqtt = require('mqtt');
const EventEmitter = require('events');

function defaultCommandTopic(serial) {
  return `pixii/${serial}/control`;
}

class PixiiMqtt extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.client = null;
  }

  connect() {
    const protocol = this.options.tls ? 'mqtts' : 'mqtt';
    const url = `${protocol}://${this.options.host}:${this.options.port}`;
    this.client = mqtt.connect(url, {
      username: this.options.username || undefined,
      password: this.options.password || undefined,
      rejectUnauthorized: this.options.rejectUnauthorized !== false,
      reconnectPeriod: 5000,
      connectTimeout: 15000,
      clean: true,
      clientId: `homey-pixii-${this.options.serial}-${Math.random().toString(16).slice(2, 8)}`
    });

    this.client.on('connect', () => {
      const topics = [
        `pixii/status/${this.options.serial}/+`,
        `pixii/ack/${this.options.serial}`
      ];
      this.client.subscribe(topics, { qos: 1 }, err => {
        if (err) this.emit('error', err);
        else this.emit('connect');
      });
    });
    this.client.on('reconnect', () => this.emit('reconnect'));
    this.client.on('close', () => this.emit('disconnect'));
    this.client.on('error', err => this.emit('error', err));
    this.client.on('message', (topic, payload) => {
      try {
        this.emit('message', topic, JSON.parse(payload.toString('utf8')));
      } catch (err) {
        this.emit('parseError', err, topic, payload.toString('utf8'));
      }
    });
  }

  async publish(payload) {
    if (!this.client?.connected) {
      const error = new Error('MQTT broker is offline');
      error.code = 'MQTT_OFFLINE';
      throw error;
    }
    const topic = this.options.commandTopic || defaultCommandTopic(this.options.serial);
    return new Promise((resolve, reject) => this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, err => err ? reject(err) : resolve()));
  }

  destroy() {
    if (this.client) this.client.end(true);
    this.client = null;
  }
}

module.exports = PixiiMqtt;
module.exports.defaultCommandTopic = defaultCommandTopic;
