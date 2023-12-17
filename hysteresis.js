module.exports = function (RED) {

	function HysteresisNode(config) {
		/* Setup */
		RED.nodes.createNode(this, config);

		let node = this;
		let nodeContext = this.context();

		node.ThresholdRising = config.ThresholdRising;
		node.ThresholdFalling = config.ThresholdFalling;
		// Parse the set values for the thresholds
		const ThresholdRising = Number.parseFloat(node.ThresholdRising);
		const ThresholdFalling = Number.parseFloat(node.ThresholdFalling);

		if (Number.isNaN(ThresholdRising) || Number.isNaN(ThresholdFalling)) {
			node.status({fill: 'red', shape: 'ring', text: "Thresholds missing"});
			node.error("One or more thresholds are not set or are not numbers.");
		}

		// Should we also use the first message received, or only begin to work after the second one?
		node.initialMessage = config.InitialMessage;
		this.property = config.PayloadProperty ?? 'payload';

		this.propertyType = config.PayloadPropertyType ?? 'msg';

		/* Execution */
		// Retrieve the last value from the context
		node.direction = nodeContext.get('direction') ?? undefined;

		node.status({fill: 'yellow', shape: 'ring', text: ThresholdFalling + '/--/' + ThresholdRising});

		node.on('input', function (msg, send, done) {
			send = send || function () {
				node.send.apply(node, arguments);
			};

			done = done || function (err) {
				if (err) {
					node.error(err, msg);
				}
			};

			// Get the current value from the message.
			// Since the return value is 'any', we need to parse it to a number.
			// If the message property does not exist, we will get `undefined`, and `Number(undefined)` returns `NaN`.
			// Because of this, we need to be sure that we got a number.
			const currentValue = Number(RED.util.evaluateNodeProperty(node.property, node.propertyType, node, msg));

			// Check if the value is a number
			if (Number.isNaN(currentValue)) {
				node.status({fill: 'red', shape: 'ring', text: 'Payload is not a number'});
				const err = new Error(`Payload "${currentValue}" is not a number`);
				done(err);
			}

			const newMessage = RED.util.cloneMessage(msg);

			let newDirection = undefined;

			function setStatus(color, shape, text) {
				node.status({
					fill: color,
					shape: shape,
					text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (${text})`
				});
			}

			/**
			 * This section handles the hysteresis logic.<br>
			 * It checks the current value against the last value, and the thresholds, and determines if the direction
			 * of the system.<br>
			 * If the direction changes, it will send a message with the new direction, and update the context.
			 */
			// If the direction is not set, we are in the initial state.
			// If we are told to use the initial message, we will use it to set the direction.
			if (node.initialMessage && node.direction === undefined) {
				if (currentValue >= ThresholdRising) {
					// Check if the current value is above the rising threshold; if so, we are in the high band, and we
					// should send the received message
					newMessage.hysteresis_direction = 'initial high';
					newDirection = 'high';

					send(newMessage);
					setStatus('green', 'dot', 'initial high band');
				} else if (ThresholdFalling < currentValue && currentValue < ThresholdRising) {
					// Otherwise, if the value is between the falling and rising thresholds, we are in the dead band.
					// We should not send a message, but just inform the user about the current state.
					setStatus('green', 'dot', 'initial dead band');
				} else if (currentValue <= ThresholdFalling) {
					// Finally, if the value is below the falling threshold, we are in the low band, and we should send
					// the received message.
					newMessage.hysteresis_direction = 'initial low';
					newDirection = 'low';

					send(newMessage);
					setStatus('green', 'dot', 'initial low band');
				}
			} else if (node.lastValue !== undefined) {
				// Rising Value Logic: Determines behavior when the current value is increasing.
				if (currentValue > node.lastValue) {
					// High Threshold Crossing: Detects transition into the high state.
					if (currentValue >= ThresholdRising) {
						// State Change to High: Triggers when moving from a non-high state to a high state.
						if (node.direction !== 'high') {
							// Action: Signal high state, update status, and notify.
							newMessage.hysteresis_direction = 'high';
							newDirection = 'high';
							send(newMessage);
							setStatus('green', 'dot', 'high band');
						} else {
							// Stabilization: Remains in high state without further action.
							setStatus('green', 'dot', 'high band rising');
						}
					}
					// Dead Band Logic (Rising): Handles values between thresholds, stabilizing output.
					else if (currentValue > ThresholdFalling && currentValue < ThresholdRising) {
						if (node.direction === 'high') {
							setStatus('green', 'ring', 'high dead band rising');
						} else if (node.direction === 'low') {
							setStatus('blue', 'ring', 'low dead band rising');
						}
					}
					// Low Band Stabilization: Maintains low state, preventing frequent state toggling.
					else if (currentValue <= ThresholdFalling && node.direction === 'low') {
						setStatus('blue', 'dot', 'low band rising');
					}
				}
				// Falling Value Logic: Determines behavior when the current value is decreasing.
				else if (currentValue < node.lastValue) {
					// Low Threshold Crossing: Detects transition into the low state.
					if (currentValue <= ThresholdFalling) {
						// State Change to Low: Triggers when moving from a non-low state to a low state.
						if (node.direction !== 'low') {
							// Action: Signal low state, update status, and notify.
							newMessage.hysteresis_direction = 'low';
							newDirection = 'low';
							send(newMessage);
							setStatus('blue', 'dot', 'low band');
						} else {
							// Stabilization: Remains in low state without further action.
							setStatus('blue', 'dot', 'low band falling');
						}
					}
					// Dead Band Logic (Falling): Manages values within thresholds, ensuring stability.
					else if (currentValue > ThresholdFalling && currentValue < ThresholdRising) {
						if (node.direction === 'high') {
							setStatus('green', 'ring', 'high dead band falling');
						} else if (node.direction === 'low') {
							setStatus('blue', 'ring', 'low dead band falling');
						}
					}
					// High Band Stabilization: Maintains high state, preventing frequent state changes.
					else if (currentValue >= ThresholdRising && node.direction === 'high') {
						setStatus('green', 'dot', 'high band falling');
					}
				}
			}

			if (newDirection !== undefined) {
				node.direction = newDirection;
				nodeContext.set('direction', newDirection);
			}

			node.lastValue = currentValue;
			nodeContext.set('lastValue', node.lastValue);

			done();
		});
	}

	RED.nodes.registerType('hysteresis2', HysteresisNode);
};
