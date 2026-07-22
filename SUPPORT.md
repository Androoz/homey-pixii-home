# Support and feedback

Pixii Home for Homey Pro is an independent community project and is not an official Pixii or Athom integration.

Report bugs, request features or provide feedback through [GitHub Issues](https://github.com/Androoz/homey-pixii-home/issues). Before opening an issue, include the app version, Homey Pro version, Pixii Gateway software version, the affected Flow card and relevant diagnostics. Never include MQTT passwords, private certificates or other credentials.

For questions about the Pixii hardware, Gateway configuration, warranty or safety limits, contact Pixii or the system installer.

## Conflicting MQTT controllers

Pixii supports two simultaneous broker connections. The documented typical configuration uses Broker 1 as the local/onboard broker and Broker 2 for an external integration, so Broker 2 is the recommended first choice for Homey. If a requested battery power appears briefly and then returns to another value, check both brokers and every connected controller. Only one controller should publish to `pixii/<serial>/control`.
