'use strict';

function calculateDynamicChargePower(gridPower, currentChargePower = 0, maxChargePower = 10000, deadband = 100) {
  const measuredPower = Number(gridPower);
  const currentPower = Math.max(0, Number(currentChargePower) || 0);
  const limit = Math.max(0, Number(maxChargePower) || 0);
  const threshold = Math.max(0, Number(deadband) || 0);

  if (!Number.isFinite(measuredPower)) throw new TypeError('Grid power must be a number');

  // Pixii reports grid export as negative power. Demand Response expects a
  // positive pacref for charging, hence the sign inversion.
  if (Math.abs(measuredPower) <= threshold) return Math.min(Math.round(currentPower), limit);
  return Math.max(0, Math.min(Math.round(currentPower - measuredPower), limit));
}

function calculateDynamicDischargePower(gridPower, currentDischargePower = 0, maxDischargePower = 10000, deadband = 100) {
  const measuredPower = Number(gridPower);
  const currentPower = Math.min(0, Number(currentDischargePower) || 0);
  const limit = Math.max(0, Number(maxDischargePower) || 0);
  const threshold = Math.max(0, Number(deadband) || 0);

  if (!Number.isFinite(measuredPower)) throw new TypeError('Grid power must be a number');

  // Pixii reports grid import as positive power. Demand Response expects a
  // negative pacref for discharging, so the requested import compensation is
  // returned with a negative sign.
  if (Math.abs(measuredPower) <= threshold) return Math.max(Math.round(currentPower), -limit);
  return Math.min(0, Math.max(Math.round(currentPower - measuredPower), -limit));
}

module.exports = { calculateDynamicChargePower, calculateDynamicDischargePower };
