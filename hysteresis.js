module.exports = function (RED) {

	function HysteresisNode(config) {
		RED.nodes.createNode(this, config);

		let node = this;
		let nodeContext = this.context();

		// this.OutRisingType = config.OutRisingType;
		node.ThresholdRising = config.ThresholdRising;
		// this.OutFallingType = config.OutFallingType;
		node.ThresholdFalling = config.ThresholdFalling;

		// Should we also use the first message received, or only begin to work after the second one?
		node.initialMessage = config.InitialMessage;

		this.property = config.PayloadProperty ?? 'payload';

		// Parse the set values for the thresholds
		const ThresholdRising = Number.parseFloat(node.ThresholdRising);
		const ThresholdFalling = Number.parseFloat(node.ThresholdFalling);

		if (Number.isNaN(ThresholdRising) || Number.isNaN(ThresholdFalling)) {
			node.status({fill: 'red', shape: 'ring', text: 'Thresholds missing'});
			node.error(new Error('One or more thresholds are not set or are not numbers.'));
		}

		// Retrieve the last value from the context
		node.direction = nodeContext.get('direction') ?? undefined;

		// Set initial status
		// if (!ThresholdRising) {
		// 	node.status({fill: 'red', shape: 'ring', text: 'Thresholds missing'});
		// } else {
		node.status({fill: 'yellow', shape: 'ring', text: ThresholdFalling + '/--/' + ThresholdRising});
		// }

		node.on('input', function (msg, send, done) {
			send = send || function () {
				node.send.apply(node, arguments);
			};

			// Get the current value from the message
			// https://nodered.org/docs/api/modules/v/1.3/@node-red_util_util.html#.getMessageProperty
			const currentValue = Number(RED.util.getMessageProperty(msg, node.property));

			// Check if the value is a number
			if (Number.isNaN(currentValue)) {
				node.status({fill: 'red', shape: 'ring', text: 'Payload is not a number'});
				const err = new Error('Payload is not a number');
				if (done) {
					// Node-RED 1.0 compatible
					done(err);
				} else {
					// Node-RED 0.x compatible
					node.error(err, msg);
				}
			}

			const newMessage = RED.util.cloneMessage(msg);

			let newDirection = undefined;

			// If the direction is not set, we are in the initial state.
			// If we are told to use the initial message, we will use it to set the direction.
			if (node.initialMessage && node.direction === undefined) {

				// Check if the current value is above the rising threshold; if so, we are in the high band, and we
				// should send the received message
				if (currentValue >= ThresholdRising) {
					newMessage.hysteresis_direction = 'initial high';
					send(newMessage);

					newDirection = 'high';

					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (initial high band)`
					});

					// Otherwise, if the value is between the falling and rising thresholds, we are in the dead band.
					// We should not send a message, but just inform the user about the current state.
				} else if (ThresholdFalling < currentValue && currentValue < ThresholdRising) {
					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (initial dead band)`
					});

					// Finally, if the value is below the falling threshold, we are in the low band, and we should send
					// the received message.
				} else if (currentValue <= ThresholdFalling) {
					newMessage.hysteresis_direction = 'initial low';
					send(newMessage);

					newDirection = 'low';

					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (initial low band)`
					});
				}
			} else if (node.lastValue !== undefined) {
				if (currentValue > node.lastValue && currentValue >= ThresholdRising && node.direction !== 'high') {
					newMessage.hysteresis_direction = 'high';
					send(newMessage);

					newDirection = 'high';

					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (high band)`
					});
					// falling
				} else if (currentValue < node.lastValue && currentValue <= ThresholdFalling && node.direction !== 'low') {
					newMessage.hysteresis_direction = 'low';
					send(newMessage);

					newDirection = 'low';

					node.status({
						fill: 'blue',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (low band)`
					});
				} else if (currentValue > node.lastValue && currentValue >= ThresholdRising && node.direction === 'high') {
					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (high band rising)`
					});
				} else if (currentValue < node.lastValue && currentValue >= ThresholdRising && node.direction === 'high') {
					node.status({
						fill: 'green',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (high band falling)`
					});
				} else if (currentValue > node.lastValue && currentValue > ThresholdFalling && currentValue < ThresholdRising && node.direction === 'high') {
					node.status({
						fill: 'green',
						shape: 'ring',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (high dead band rising)`
					});
				} else if (currentValue < node.lastValue && currentValue > ThresholdFalling && currentValue < ThresholdRising && node.direction === 'high') {
					node.status({
						fill: 'green',
						shape: 'ring',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (high dead band falling)`
					});
				} else if (currentValue > node.lastValue && currentValue > ThresholdFalling && currentValue < ThresholdRising && node.direction === 'low') {
					node.status({
						fill: 'blue',
						shape: 'ring',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (low dead band rising)`
					});
				} else if (currentValue < node.lastValue && currentValue > ThresholdFalling && currentValue < ThresholdRising && node.direction === 'low') {
					node.status({
						fill: 'blue',
						shape: 'ring',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (low dead band falling)`
					});
				} else if (currentValue > node.lastValue && currentValue <= ThresholdFalling && node.direction === 'low') {
					node.status({
						fill: 'blue',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdRising} (low band rising)`
					});
				} else if (currentValue < node.lastValue && currentValue <= ThresholdFalling && node.direction === 'low') {
					node.status({
						fill: 'blue',
						shape: 'dot',
						text: `${ThresholdFalling}/${currentValue}/${ThresholdFalling} (low band falling)`
					});
				}
			}

			if (newDirection !== undefined) {
				node.direction = newDirection;
				nodeContext.set('direction', newDirection);
			}

			node.lastValue = currentValue;
			nodeContext.set('lastValue', node.lastValue);

			if (done) {
				done();
			}
		});
	}

	RED.nodes.registerType('hysteresis2', HysteresisNode);
};
