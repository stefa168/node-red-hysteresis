module.exports = function (RED) {

	function HysteresisNode(config) {
		RED.nodes.createNode(this, config);

		this.ThresholdType = config.ThresholdType || 'fixed';
		this.ThresholdRising = config.ThresholdRising;
		this.ThresholdFalling = config.ThresholdFalling;
		this.TopicThreshold = config.TopicThreshold;
		this.TopicCurrent = config.TopicCurrent;
		this.ThresholdDeltaRising = config.ThresholdDeltaRising;
		this.ThresholdDeltaFalling = config.ThresholdDeltaFalling;
		this.DynRaiseError = config.DynRaiseError;
		this.InitialMessage = config.InitialMessage;
		this.OutRisingType = config.OutRisingType;
		this.OutRisingValue = config.OutRisingValue;
		this.OutFallingType = config.OutFallingType;
		this.OutFallingValue = config.OutFallingValue;
		this.OutTopicType = config.OutTopicType;
		this.OutTopicValue = config.OutTopicValue || '';
		this.PayloadProperty = config.PayloadProperty || 'payload';

		if (this.OutRisingType !== 'pay') {
			if ((this.OutRisingType === 'num') && (!Number.isNaN(this.OutRisingValue))) {
				this.OutRisingValue = Number.parseFloat(this.OutRisingValue);
			} else if (this.OutRisingType === 'bool' && (this.OutRisingValue === 'true' || this.OutRisingValue === 'false')) {
				(this.OutRisingValue === 'true' ? this.OutRisingValue = true : this.OutRisingValue = false);
			} else if (this.OutRisingValue === 'null') {
				this.OutRisingType = 'null';
				this.OutRisingValue = null;
			} else {
				this.OutRisingValue = String(this.OutRisingValue);
			}
		}

		if (this.OutFallingType !== 'pay') {
			if ((this.OutFallingType === 'num') && (!Number.isNaN(this.OutFallingValue))) {
				this.OutFallingValue = Number.parseFloat(this.OutFallingValue);
			} else if (this.OutFallingType === 'bool' && (this.OutFallingValue === 'true' || this.OutFallingValue === 'false')) {
				(this.OutFallingValue === 'true' ? this.OutFallingValue = true : this.OutFallingValue = false);
			} else if (this.OutFallingValue === 'null') {
				this.OutFallingType = 'null';
				this.OutFallingValue = null;
			} else {
				this.OutFallingValue = String(this.OutFallingValue);
			}
		}

		// Define a node context
		var nodeContext = this.context();

		let node = this;
		let TriggerValueRising = nodeContext.get('TriggerValueRising') || '';
		let TriggerValueFalling = nodeContext.get('TriggerValueFalling') || '';
		if (this.ThresholdType === 'fixed') {
			TriggerValueRising = Number.parseFloat(this.ThresholdRising);
			TriggerValueFalling = Number.parseFloat(this.ThresholdFalling);
		}
		// get from context or clear direction flag
		node.direction = nodeContext.get('Direction') || '';

		// Set initial status
		if (!TriggerValueRising) {
			node.status({fill: 'red', shape: 'ring', text: 'Thresholds missing'});
		} else {
			node.status({fill: 'yellow', shape: 'ring', text: TriggerValueFalling + '/--/' + TriggerValueRising});
		}

		this.on('input', function (msg, send, done) {
			// For maximum backwards compatibility, check that send exists.
			// If this node is installed in Node-RED 0.x, it will need to
			// fall back to using `node.send`
			send = send || function () {
				node.send.apply(node, arguments);
			};

			// Check for proper topic when using dynamic threshold
			if (this.ThresholdType === 'dynamic' && msg.topic === this.TopicThreshold && !Number.isNaN(msg[this.PayloadProperty])) {
				TriggerValueRising = Number.parseFloat(msg[this.PayloadProperty]) + Number.parseFloat(this.ThresholdDeltaRising);
				TriggerValueFalling = Number.parseFloat(msg[this.PayloadProperty]) - Number.parseFloat(this.ThresholdDeltaFalling);
				nodeContext.set('TriggerValueRising', TriggerValueRising);
				nodeContext.set('TriggerValueFalling', TriggerValueFalling);
				node.status({fill: 'yellow', shape: 'ring', text: TriggerValueFalling + '/--/' + TriggerValueRising});
			}

			// Raise error when receiving a 'TopicCurrent' payload but no dynamic threshold set
			if (Object.prototype.hasOwnProperty.call(msg, this.PayloadProperty) && this.ThresholdType === 'dynamic' &&
				!TriggerValueRising && msg.topic === this.TopicCurrent && this.DynRaiseError) {
				const err = new Error('Thresholds missing');
				if (err) {
					if (done) {
						// Node-RED 1.0 compatible
						done(err);
					} else {
						// Node-RED 0.x compatible
						node.error(err, msg);
					}
				}
			}

			// original msg object
			const msgNew = RED.util.cloneMessage(msg);
			// set topic
			if (this.OutTopicType === 'str') {
				msgNew.topic = this.OutTopicValue;
			}

			if ((Object.prototype.hasOwnProperty.call(msg, this.PayloadProperty) && this.ThresholdType === 'fixed' && !Number.isNaN(msg[this.PayloadProperty])) ||
				(Object.prototype.hasOwnProperty.call(msg, this.PayloadProperty) && this.ThresholdType === 'dynamic' && msg.topic === this.TopicCurrent && TriggerValueRising && !Number.isNaN(msg[this.PayloadProperty]))) {
				const CurrentValue = Number.parseFloat(msg[this.PayloadProperty]);
				// Cover the case where no initial values are known
				if (this.InitialMessage && node.direction === '' && !Number.isNaN(CurrentValue)) {
					if (CurrentValue >= TriggerValueRising) {
						msgNew.payload = (this.OutRisingType === 'pay' ? msgNew.payload : this.OutRisingValue);
						msgNew.hystdirection = 'initial high';
						send(msgNew);
						node.direction = 'high';
						nodeContext.set('Direction', node.direction);
						node.status({
							fill: 'green',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (initial high band)'
						});
					} else if ((CurrentValue > TriggerValueFalling) && (CurrentValue < TriggerValueRising)) {
						node.status({
							fill: 'green',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (initial dead band)'
						});
					} else if (CurrentValue <= TriggerValueFalling) {
						msgNew.payload = (this.OutFallingType === 'pay' ? msgNew.payload : this.OutFallingValue);
						msgNew.hystdirection = 'initial low';
						send(msgNew);
						node.direction = 'low';
						nodeContext.set('Direction', node.direction);
						node.status({
							fill: 'blue',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (initial low band)'
						});
					}
					// Last value known. Work as hysteresis
				} else if (!Number.isNaN(CurrentValue) && node.LastValue) {
					// rising
					if (CurrentValue > node.LastValue && CurrentValue >= TriggerValueRising && node.direction !== 'high') {
						msgNew.payload = (this.OutRisingType === 'pay' ? msgNew.payload : this.OutRisingValue);
						msgNew.hystdirection = 'high';
						send(msgNew);
						node.direction = 'high';
						nodeContext.set('Direction', node.direction);
						node.status({
							fill: 'green',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (high band)'
						});
						// falling
					} else if (CurrentValue < node.LastValue && CurrentValue <= TriggerValueFalling && node.direction !== 'low') {
						msgNew.payload = (this.OutFallingType === 'pay' ? msgNew.payload : this.OutFallingValue);
						msgNew.hystdirection = 'low';
						send(msgNew);
						node.direction = 'low';
						nodeContext.set('Direction', node.direction);
						node.status({
							fill: 'blue',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (low band)'
						});
					} else if (CurrentValue > node.LastValue && CurrentValue >= TriggerValueRising && node.direction === 'high') {
						node.status({
							fill: 'green',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (high band rising)'
						});
					} else if (CurrentValue < node.LastValue && CurrentValue >= TriggerValueRising && node.direction === 'high') {
						node.status({
							fill: 'green',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (high band falling)'
						});
					} else if (CurrentValue > node.LastValue && CurrentValue > TriggerValueFalling && CurrentValue < TriggerValueRising && node.direction === 'high') {
						node.status({
							fill: 'green',
							shape: 'ring',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (high dead band rising)'
						});
					} else if (CurrentValue < node.LastValue && CurrentValue > TriggerValueFalling && CurrentValue < TriggerValueRising && node.direction === 'high') {
						node.status({
							fill: 'green',
							shape: 'ring',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (high dead band falling)'
						});
					} else if (CurrentValue > node.LastValue && CurrentValue > TriggerValueFalling && CurrentValue < TriggerValueRising && node.direction === 'low') {
						node.status({
							fill: 'blue',
							shape: 'ring',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (low dead band rising)'
						});
					} else if (CurrentValue < node.LastValue && CurrentValue > TriggerValueFalling && CurrentValue < TriggerValueRising && node.direction === 'low') {
						node.status({
							fill: 'blue',
							shape: 'ring',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (low dead band falling)'
						});
					} else if (CurrentValue > node.LastValue && CurrentValue <= TriggerValueFalling && node.direction === 'low') {
						node.status({
							fill: 'blue',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueRising + ' (low band rising)'
						});
					} else if (CurrentValue < node.LastValue && CurrentValue <= TriggerValueFalling && node.direction === 'low') {
						node.status({
							fill: 'blue',
							shape: 'dot',
							text: TriggerValueFalling + '/' + CurrentValue + '/' + TriggerValueFalling + ' (low band falling)'
						});
					}
				}
				node.LastValue = CurrentValue;
				nodeContext.set('LastValue', node.LastValue);

				if (done) {
					done();
				}
			}
		});
	}

	RED.nodes.registerType('hysteresis2', HysteresisNode);
};
