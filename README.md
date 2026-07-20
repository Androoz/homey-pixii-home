# Pixii Home for Homey Pro

Local Homey SDK v3 integration for Pixii Home through MQTT.

## Included

- One complete Pixii Home battery device
- Usable battery level, battery power, stored energy, grid power, house power, SoH and temperature
- Plain-language active service and system status descriptions based on Pixii's documented enum tables
- MQTT connection status and latest Pixii ACK
- Clear Flow actions to charge, discharge, hold at 0 W and charge to a target SoC
- Simple actions to stop charging or stop discharging without entering a duration
- Dynamic surplus charging driven directly by a negative Grid power Flow tag
- Dynamic import compensation driven directly by a positive Grid power Flow tag
- Flow conditions for SoC and MQTT connectivity
- Flow triggers for accepted and rejected commands
- Clear Flow triggers for battery level, charging state, Pixii connection, active service and system status
- Raw service JSON action for future Pixii services

## Pairing

The app connects directly to the same broker configured in Pixii Gateway. During pairing, enter the broker address, port, credentials and your Pixii Gateway serial number.

Default topics:

```text
pixii/status/<serial>/+
pixii/ack/<serial>
pixii/<serial>/control
```

The command topic can be changed in Advanced Settings if a gateway uses another documented topic layout.

## Power sign convention

The verified Demand Response convention is:

- Negative `pacref`: discharge
- Positive `pacref`: charge

The normal Flow cards hide this sign convention from the user. Both charge and
discharge power are entered as positive values; the app applies the correct
Pixii sign. The older protocol-level Demand Response, Power Control and raw JSON
cards are deprecated and retained only so existing Flows continue to work.

### Dynamic surplus charging

Use the action **Follow grid power for dynamic charging** and drop the current
Grid power tag into the card. A value of `-2500 W` produces a `+2500 W` Pixii
charging request. Zero, import, or export inside the configured deadband produces
a `0 W` request. The card has no duration argument: every incoming house-power
trigger renews a short safety lease configured in the device's Advanced Settings.
Grid power is deliberately used instead of House power because House power may
already include the Pixii battery's own charging or discharging contribution.

Use **Follow grid power for dynamic discharging** for the opposite direction.
A value of `+2500 W` produces a `-2500 W` Pixii discharging request so grid
import approaches 0 W. Zero, export, or import inside the configured deadband
produces a `0 W` request. Triggering the card on every Grid power update renews
its short safety lease, so the Flow card has no duration argument.

## Usable battery level

By default, the displayed battery level uses Pixii's `batt_soc_usable` value.
If that value is unavailable, the app scales raw `batt_soc` between the
configured `batt_soc_min` and `batt_soc_max` limits. Automatic scaling can be
disabled or overridden with custom 0% and 100% raw SoC limits in Advanced
Settings.

## Development

```bash
npm install
npx homey app validate
npx homey app run
```

Always test control commands at low power and short duration first. Pixii safety limits and locally configured service priorities remain authoritative.
