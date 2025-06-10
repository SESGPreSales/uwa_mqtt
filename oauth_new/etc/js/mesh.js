// require("dotenv").config({ path: __dirname + "/../../.env" });

const API_URL = "https://cloud.connect-mesh.io/api/core/devices";
const STATUS_URL = id =>
	`https://cloud.connect-mesh.io/api/core/devices/${id}/status`;

const NETWORK_ID = process.env.MESH_NETWORK;
const MESH_TOKEN = process.env.MESH_TOKEN;

const loadedDevices = new Map();

// function getGroupName(name) {
// 	return name.replace(/\s*\d+$/, "");
// }

async function fetchDevices() {
	const response = await fetch(API_URL, {
		headers: {
			Authorization: MESH_TOKEN,
			Accept: "application/json",
		},
	});
	if (!response.ok) throw new Error(`Device fetch failed: ${response.status}`);
	const devices = await response.json();
	return devices
		.filter(d => d.networkId === NETWORK_ID)
		.map(d => ({ name: d.name, id: d.uniqueId }));
}

async function fetchStatus(device) {
	const response = await fetch(STATUS_URL(device.id), {
		headers: {
			Authorization: MESH_TOKEN,
			Accept: "*/*",
		},
	});

	if (!response.ok)
		throw new Error(
			`Status fetch failed: ${response.statusText} - ${response.status}`
		);
	const status = await response.json();

	return {
		name: device.name,
		id: device.id,
		lightness: Math.round((status.state.lightness / 65536) * 100),
		temperature: status.state.temperature,
		power: status.state.power,
	};
}

async function updateDeviceStatus(device) {
	try {
		const status = await fetchStatus(device);

		//map status inside device
		console.log(device);
		console.log(status);

		loadedDevices.set(device.id, status);
	} catch (err) {
		loadedDevices.set(device.id, err);
		// console.warn(`Retrying ${device.name}: ${err.message}`);
	}
}

async function refreshLoop() {
	try {
		console.log("Starting refresh loop...");

		if (loadedDevices.size === 0) {
			// console.log("Fetching devices...");
			const devices = await fetchDevices();
			// console.log(`Fetched ${devices.length} devices`);
			devices.forEach(d => loadedDevices.set(d.id, d));
		}

		const deviceList = Array.from(loadedDevices.values());

		console.log(`Number of fetched Devices is : ${deviceList.length}`);

		for (const device of deviceList) {
			// console.log(`Updating device ${device.id}`);
			updateDeviceStatus(device);
			await new Promise(r => setTimeout(r, 300));
		}

		console.log("Finished loop, returning loadedDevices...");
		return loadedDevices;
	} catch (err) {
		console.error("Error in refresh loop:", err.message);
	} finally {
		// setTimeout(refreshLoop, 15000);
	}
}

// refreshLoop();

module.exports = {
	refreshLoop,
	loadedDevices,
};
