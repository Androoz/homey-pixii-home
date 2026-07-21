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
    this.tail = Promise.resolve();
    this.pending = null;
  }

  enqueue(command, waitForAck = true) {
    const run = () => this.run(command, waitForAck);
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => undefined);
    return result;
  }

  async run(command, waitForAck) {
    if (!waitForAck) return this.publish(command);

    return new Promise((resolve, reject) => {
      const pending = { command, resolve, reject, timer: null };
      this.pending = pending;
      pending.timer = this.setTimer(() => {
        if (this.pending !== pending) return;
        this.pending = null;
        reject(this.timeoutError());
      }, this.timeoutMs);

      Promise.resolve(this.publish(command)).catch(error => {
        if (this.pending === pending) this.pending = null;
        this.clearTimer(pending.timer);
        reject(error);
      });
    });
  }

  handleAck(ack, error = null) {
    const pending = this.pending;
    if (!pending || !ackMatches(pending.command, ack)) return false;

    this.pending = null;
    this.clearTimer(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve(ack);
    return true;
  }

  cancel(error) {
    const pending = this.pending;
    if (!pending) return false;
    this.pending = null;
    this.clearTimer(pending.timer);
    pending.reject(error);
    return true;
  }
}

module.exports = { SerializedAckQueue, ackMatches };
