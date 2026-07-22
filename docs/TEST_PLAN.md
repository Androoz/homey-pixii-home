# Pixii Home for Homey Pro - release test plan

Use this plan for the Athom Test release before submitting the app for certification. Record the Homey Pro model and software version, app version, Pixii Gateway software version, MQTT broker and Pixii battery configuration. Perform control tests with conservative power and duration values and keep the Pixii user interface available for verification.

## 1. Installation and pairing

- Install the app from Athom's Test link on a Homey without an existing Pixii device.
- Add a Pixii Home device using valid non-TLS MQTT settings.
- Confirm that all pairing fields have equal width and only one TLS checkbox is shown.
- Confirm that the default command topic is `pixii/<serial>/control`.
- Confirm the pairing text recommends Broker 2 for an external integration and warns against multiple control publishers.
- Verify that the device becomes available and receives battery, grid, house, energy, status and event values.
- Repeat pairing with an incorrect password and confirm that the localized authentication error is understandable.
- Correct the password in Advanced Settings and confirm automatic recovery without removing the device.
- If available, repeat with TLS and certificate validation enabled.

## 2. Telemetry and presentation

- Compare battery SoC, power, stored energy, grid power, house power, SoH and temperature with the Pixii Gateway.
- Verify units, signs, rounding, icons and Insights recording.
- Confirm that Active service and System status show short titles while their detail capabilities show codes and explanations.
- Generate or observe an information event, warning or alarm and verify System events.
- Test raw, automatic usable-range and manually overridden SoC display modes.
- Restart the app, Homey and Pixii Gateway separately and confirm that values recover.

## 3. Flow triggers and conditions

- Verify battery-level changed, battery-full, charging, discharging and idle triggers.
- Verify active-service and system-status changed triggers.
- Disconnect and reconnect MQTT and verify both connection triggers and the MQTT condition.
- Verify SoC above and SoC below at values immediately around the threshold.
- Verify command succeeded and command failed with a known accepted and rejected request.

## 4. Manual control actions

- Charge at a low power for a short duration and verify positive battery power and a successful ACK.
- Discharge at a low power for a short duration and verify negative battery power and a successful ACK.
- Test Hold battery, Stop charging, Stop discharging and Stop control.
- Set a target SoC above the current SoC and verify Target SoC becomes active.
- Test Power Control with `pacreact_pct` set to zero.
- Verify invalid, unavailable or blocked requests return an understandable Flow error.
- Confirm local Pixii safety limits and service priorities remain authoritative.

## 5. Dynamic grid balancing

- Feed the Grid power tag into the combined Balance grid power action and verify bidirectional control toward a `+100 W` target.
- Verify charge-only and discharge-only modes never request power in the opposite direction.
- Generate grid updates faster than ACK responses and verify only the latest waiting dynamic update is eventually published.
- Feed the Grid power tag into dynamic charging on every grid-power update.
- Create controlled export and verify the requested charging power approaches zero grid power without exceeding the configured maximum.
- Verify the deadband prevents rapid corrections around zero.
- Stop triggering the Flow and verify the safety lease expires.
- Repeat for positive import and dynamic discharging.
- Test transitions directly from export to import and from import to export.
- Confirm no oscillation develops when Pixii battery power affects the grid measurement.
- Confirm the two direction-limited cards are not combined on the same trigger.

## 6. Reliability and concurrency

- Trigger two different control actions almost simultaneously and verify each Flow receives the correct ACK result.
- Run dynamic control for at least two hours and verify MQTT reconnection, memory use and command handling.
- Restart the MQTT broker during an active control lease and verify safe expiry and recovery.
- Disconnect MQTT with one active and several waiting commands and verify no queued command is published after reconnection.
- If Broker 1 and Broker 2 are available, verify that a second controller can replace Homey's command, then remove that controller and confirm stable operation.
- Change broker address, credentials, TLS and command topic one at a time and verify reconnection.
- Leave the battery connected for at least 24 hours and review the app log for uncaught errors.

## 7. Upgrade test

- Install the previous public/test version and create representative Flows using every non-deprecated action.
- Upgrade to the candidate version without removing the device.
- Confirm the device, credentials, custom SoC limits, command topic, capabilities, Insights and existing Flows remain intact.
- Verify migration from the obsolete `pixii/service/<serial>` command topic.

## 8. Language and App Store review

- Run the complete pairing and common Flow paths with Homey set to English and Swedish.
- Check pairing, settings, device capabilities, Flow cards and errors for missing or mixed translations.
- Verify the app and device images at phone and desktop sizes.
- Confirm the App Store description and README identify the app as an independent community integration.
- Confirm GitHub Issues and the privacy notice are available from the App Store support metadata.

## Release acceptance

- All publish-level validation checks pass.
- Automated tests pass.
- No open critical or high-severity test findings remain.
- No control command is acknowledged by the wrong Flow.
- Clean install, reconnect and upgrade tests pass in both supported languages.
- The Test release has run for at least 24 hours without an app crash or lost configuration.
