'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SerializedAckQueue, ackMatches } = require('../lib/serialized-ack-queue');

test('matches acknowledgements by service and method', () => {
  const command = { service: 'demandresponse', method: 'set' };
  assert.equal(ackMatches(command, { service: 'demandresponse', method: 'set' }), true);
  assert.equal(ackMatches(command, { service: 'targetsoc', method: 'set' }), false);
  assert.equal(ackMatches(command, { service: 'demandresponse', method: 'get' }), false);
});

test('serializes commands until the matching acknowledgement arrives', async () => {
  const published = [];
  const queue = new SerializedAckQueue({ publish: async command => published.push(command) });
  const first = queue.enqueue({ service: 'demandresponse', method: 'set', values: { pacref: 1000 } });
  const second = queue.enqueue({ service: 'targetsoc', method: 'set', values: { socref: 80 } });

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 1);
  assert.equal(queue.handleAck({ service: 'targetsoc', method: 'set' }), false);
  assert.equal(published.length, 1);
  assert.equal(queue.handleAck({ service: 'demandresponse', method: 'set', response: 65535 }), true);
  await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 2);
  queue.handleAck({ service: 'targetsoc', method: 'set', response: 65535 });
  await second;
});

test('continues with the next command after a rejected acknowledgement', async () => {
  const published = [];
  const queue = new SerializedAckQueue({ publish: async command => published.push(command) });
  const first = queue.enqueue({ service: 'demandresponse', method: 'set' });
  const second = queue.enqueue({ service: 'powercontrol', method: 'set' });

  await new Promise(resolve => setImmediate(resolve));
  queue.handleAck({ service: 'demandresponse', method: 'set' }, new Error('rejected'));
  await assert.rejects(first, /rejected/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 2);
  queue.handleAck({ service: 'powercontrol', method: 'set' });
  await second;
});

test('times out a command and advances the queue', async () => {
  const published = [];
  const queue = new SerializedAckQueue({
    publish: async command => published.push(command),
    timeoutMs: 5,
    timeoutError: () => new Error('ack timeout')
  });
  const first = queue.enqueue({ service: 'demandresponse', method: 'set' });
  const second = queue.enqueue({ service: 'targetsoc', method: 'set' });

  await assert.rejects(first, /ack timeout/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 2);
  queue.handleAck({ service: 'targetsoc', method: 'set' });
  await second;
});

test('keeps only the latest waiting replaceable command', async () => {
  const published = [];
  const queue = new SerializedAckQueue({ publish: async command => published.push(command) });
  const first = queue.enqueueLatest({ service: 'demandresponse', method: 'set', values: { pacref: 1000 } }, 'dynamic');
  const replaced = queue.enqueueLatest({ service: 'demandresponse', method: 'set', values: { pacref: 2000 } }, 'dynamic');
  const latest = queue.enqueueLatest({ service: 'demandresponse', method: 'set', values: { pacref: 3000 } }, 'dynamic');

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 1);
  assert.equal(published[0].values.pacref, 1000);
  assert.deepEqual(await replaced, { superseded: true });

  queue.handleAck({ service: 'demandresponse', method: 'set' });
  await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 2);
  assert.equal(published[1].values.pacref, 3000);
  queue.handleAck({ service: 'demandresponse', method: 'set' });
  await latest;
});

test('cancel rejects the active command and clears all waiting commands', async () => {
  const published = [];
  const queue = new SerializedAckQueue({ publish: async command => published.push(command) });
  const first = queue.enqueue({ service: 'demandresponse', method: 'set' });
  const second = queue.enqueue({ service: 'targetsoc', method: 'set' });

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 1);
  queue.cancel(new Error('connection changed'));
  await assert.rejects(first, /connection changed/);
  await assert.rejects(second, /connection changed/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 1);
});
