# node-red-hysteresis

[![npm version](https://badge.fury.io/js/node-red-contrib-hysteresis.svg)](https://badge.fury.io/js/node-red-contrib-hysteresis)

Provides a hysteresis or deadband function.

> **Note**: this fork is currently being re-written, so the documentation below may not be accurate.  
> Currently, only the fixed threshold mode is supported.
> 
> The main new feature is the ability to specify the payload path to use for the hysteresis value.
## Details

When a message arrives, the node will evaluate if the `msg.payload` is above a defined `Upper Threshold` or below a `Lower Threshold`, while taking into account the previous value. Whenever this happens a `msg` is send to the output. Following rules do apply:

*   `msg.payload` is greater than previous `msg.payload` AND `msg.payload` greater or equal `Upper Threshold` then send output
*   `msg.payload` is lesser than previous `msg.payload` AND `msg.payload` lesser or equal `Lower Threshold` then send output
*   `msg.payload` is greater than `Lower Threshold` but lower than `Upper Threshold` do nothing
*   Once a threshold has been hit, no new output will be send until the respective opposite threshold is triggered

## Fixed versus Dynamic Thresholds

In the node settings either fixed or dynamic threshold can be specified.

### Fixed Thresholds

Fixed thresholds allows to directly specify a `Upper Threshold` and `Lower Threshold`. Both values have to be valid float numbers.

### Dynamic Thresholds

Dynamic thresholds expect following settings:

*   `Topic Threshold` specifies a message topic under which a triggering point is send as `msg.payload`.
*   `Topic Current` specifies a message topic under which the current values are send. This values are then matched against the respective thresholds.
*   `Hysteresis+` is the upper delta for the triggering point. The `msg.payload` from `Threshold Topic` plus the `Hysteresis+` value equals the `Upper Threshold`.
*   `Hysteresis-` is the lower delta for the triggering point. The `msg.payload` from `Threshold Topic` minus the `Hysteresis-` value equals the `Lower Threshold`.
*   `Raise error on missing threshold` will create an error object in case the threshold is missing and `Topic Current` value arrives. This can be handled via a  `Catch` node. Also see the included examples 

**Note:** 
The values set in dynamic mode will typically not survive a node-red deploy or restart. With version **0.3.0** the node will save all relevant settings as context. Using a persistent context store, e.g. file, will allow the node to recover these values and continue from there.

## Send initial message

After starting node-red or deploying the flow, the hysteresis node does not know any previous values nor is able to determine the direction how the values develop. `Send initial message` will simply match the first valid value against the lower or upper limit and send an output if any of the levels is exceeded respectively underran.

## Output Options

In the node Output settings either `Original Payload / Topic` or custom values can be specified.

## Node Status
The node makes extensive use of status information. These can be used to react on status changes with the `Status` node. Also see the included examples for a how-to.

## Use cases

In control systems, hysteresis can be used to filter signals so that the output reacts less rapidly than it otherwise would, by taking recent history into account. For example, a thermostat controlling a heater may switch the heater on when the temperature drops below A, but not turn it off until the temperature rises above B. For instance, if one wishes to maintain a temperature of 20 °C then one might set the thermostat to turn the heater on when the temperature drops to below 18 °C and off when the temperature exceeds 22 °C.

Similarly, a pressure switch can be designed to exhibit hysteresis, with pressure set-points substituted for temperature thresholds.