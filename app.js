'use strict';

const Homey = require('homey');

class PixiiHomeApp extends Homey.App {
  async onInit() {
    this.log('Pixii Home app initialized');
  }
}

module.exports = PixiiHomeApp;
