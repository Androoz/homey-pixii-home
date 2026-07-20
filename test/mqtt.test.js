'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultCommandTopic } = require('../lib/pixii-mqtt');

test('uses the Pixii gateway control topic by default', () => {
  assert.equal(defaultCommandTopic('242001002284'), 'pixii/242001002284/control');
});
