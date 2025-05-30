const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://mqtt');
const hostIP = process.env.HOST_LAN_IP ?? '';
let counter = 0
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker!');

  // fire every 5s, no matter what
  const timer = setInterval(() => {
    counter++
    console.log(`🔄 Publishing host IP: ${hostIP}, counter = ${counter}`);
    counter == 5 ? clearInterval(timer) : null
    client.publish(
      'presence',
      hostIP,            // same payload each time
      { qos: 1 },        // ensure the broker actually delivers every message
      err => {
        if (err) console.error('Publish error:', err);
      }
    );
  }, 30000);
});

client.on('error', err => {
  console.error('MQTT Error:', err);
});
