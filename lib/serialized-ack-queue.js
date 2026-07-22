'use strict';

function normalized(value) {
  return value === undefined || value === null ? null : String(value).toLowerCase();
}

function ackMatches(command, ack) {
  const expectedService = normalized(command.service || command.mode);
  const actualService = normalized(ack.service || ack.mode);
  const expectedMethod = normalized(command.method);
  const actualMethod = normalized(ack.method);

  if (expectedService && expectedService !== actualService) return false;
  if (expectedMethod && expectedMethod !== actualMethod) return false;
  if (command.m_id !== undefined && ack.m_id !== undefined && String(command.m_id) !== String(ack.m_id)) return false;
  return true;
}

class SerializedAckQueue {
  constructor({ publish, setTimer = setTimeout, clearTimer = clearTimeout, timeoutMs = 10000, timeoutError }) {
    this.publish = publish;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.timeoutMs = timeoutMs;
    this.timeoutError = timeoutError || (() => new Error('Timed out while waiting for an acknowledgement'));
    this.items = [];
    this.pending = null;
  }

  enqueue(command, waitForAck = true) {
    return this.add({ command, waitForAck, replaceKey: null });
  }

  enqueueLatest(command, replaceKey, waitForAck = true) {
    if (!replaceKey) return this.enqueue(command, waitForAck);
    return this.add({ command, waitForAck, replaceKey });
  }

  add({ command, waitForAck, replaceKey }) {
    return new Promise((resolve, reject) => {
      if (replaceKey) {
        const previousIndex = this.items.findIndex(item => item.replaceKey === replaceKey);
        if (previousIndex >= 0) {
          const [superseded] = this.items.splice(previousIndex, 1);
          superseded.resolve({ superseded: true });
        }
      }
      this.items.push({ command, waitForAck, replaceKey, resolve, reject, timer: null });
      this.drain();
    });
  }

  drain() {
    if (this.pending || this.items.length === 0) return;
    const item = this.items.shift();
    this.pending = item;

    if (item.waitForAck) {
      item.timer = this.setTimer(() => {
        if (this.pending !== item) return;
        this.pending = null;
        item.reject(this.timeoutError());
        this.drain();
      }, this.timeoutMs);
    }

    Promise.resolve(this.publish(item.command)).then(result => {
      if (item.waitForAck || this.pending !== item) return;
      this.pending = null;
      item.resolve(result);
      this.drain();
    }).catch(error => {
      if (this.pending !== item) return;
      this.pending = null;
      if (item.timer) this.clearTimer(item.timer);
      item.reject(error);
      this.drain();
    });
  }

  handleAck(ack, error = null) {
    const pending = this.pending;
    if (!pending || !pending.waitForAck || !ackMatches(pending.command, ack)) return false;

    this.pending = null;
    if (pending.timer) this.clearTimer(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve(ack);
    this.drain();
    return true;
  }

  cancel(error) {
    const reason = error || new Error('Command queue was cancelled');
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      if (pending.timer) this.clearTimer(pending.timer);
      pending.reject(reason);
    }
    const queued = this.items.splice(0);
    queued.forEach(item => item.reject(reason));
    return Boolean(pending || queued.length);
  }
}

module.exports = { SerializedAckQueue, ackMatches };
