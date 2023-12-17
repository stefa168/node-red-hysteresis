# node-red-hysteresis

[![npm version](https://badge.fury.io/js/@stefa168%2Fnode-red-hysteresis.svg)](https://badge.fury.io/js/@stefa168%2Fnode-red-hysteresis)
![GitHub](https://img.shields.io/github/license/stefa168/node-red-hysteresis)
![npm](https://img.shields.io/npm/dt/%40stefa168%2Fnode-red-hysteresis)

Provides a hysteresis or deadband function.

> **Note**: this fork is currently being re-written, so the documentation below may not be accurate.  
> Currently, only the fixed threshold mode is supported.
>
> The main new feature is the ability to specify the payload path to use for the hysteresis value.

## Details

This node implements a hysteresis or deadband function, effectively managing signal fluctuations within a defined range.

### Key Functionalities

Upon receiving a message, the node compares the value of the specified property path with the defined thresholds.
Depending on the value, the node may emit the received message.

The following cases are possible:

* The value is above the upper threshold: the node will emit the received message.
* The value is below the lower threshold: the node will emit the received message.
* The value is between the upper and lower threshold: the node will not emit the received message.

Some exceptions to the above cases are possible, depending on the node settings:

* If the **Send initial message** option is enabled, the node will emit the received message regardless of the value,
  but only once, when the flow is started.
* If the **Re-send message if still in High-Band** option is enabled, the node will emit the received message if the
  value is still above the upper threshold.
* If the **Re-send message if still in Low-Band** option is enabled, the node will emit the received message if the
  value is still below the lower threshold.

### Notes

* When the flow is first started, the node won't have any previous value to compare with, so the node will emit the
  received message regardless of the value. This behaviour can be disabled by unchecking the **Send initial message**
  option.

### Use Cases
* The node can only handle numerical values. If the value of the specified property path is not numerical, the node will
  throw an error.
* In control systems, hysteresis can be used to filter signals so that the output reacts less rapidly than it otherwise
  would, by taking recent history into account. For example, a thermostat controlling a heater may switch the heater on
  when the temperature drops below A, but not turn it off until the temperature rises above B. For instance, if one
  wishes to maintain a temperature of 20 °C then one might set the thermostat to turn the heater on when the temperature
  drops to below 18 °C and off when the temperature exceeds 22 °C. Similarly, a pressure switch can be designed to
  exhibit hysteresis, with pressure set-points substituted for temperature thresholds.