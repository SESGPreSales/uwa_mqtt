const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://mqtt");

const hostIP = process.env.HOST_LAN_IP;
console.log("Host LAN IP is:", hostIP);

// console.log(hostIP);

client.on("connect", () => {
	client.subscribe("presence", err => {
		if (!err) {
			client.publish("presence", hostIP);
		}
	});
});

client.on("message", (topic, message) => {
	// message is Buffer
	console.log(message.toString());
	client.end();
});
