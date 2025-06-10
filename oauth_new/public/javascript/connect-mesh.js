const API_URL = "https://cloud.connect-mesh.io/api/core/devices";
const STATUS_URL = id =>
	`https://cloud.connect-mesh.io/api/core/devices/${id}/status`;

const loadedDevices = new Map();

function getGroupName(name) {
	return name.replace(/\s*\d+$/, "");
}

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

	if (!response.ok) throw new Error(`Status fetch failed: ${response.status}`);
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
		const groupName = getGroupName(status.name);
		const container = document.getElementById("deviceContainer");

		let groupBox = document.getElementById(`group-${groupName}`);
		if (!groupBox) {
			groupBox = document.createElement("div");
			groupBox.id = `group-${groupName}`;
			groupBox.style.border = "1px solid #faaf19";
			groupBox.style.marginBottom = "20px";
			groupBox.style.padding = "10px";
			groupBox.style.borderRadius = "10px";
			groupBox.style.boxShadow = "0 0 8px #faaf19";
			groupBox.innerHTML = `<h2 style="color:#faaf19">${groupName}</h2>`;
			container.appendChild(groupBox);
		}

		let row = document.getElementById(`row-${status.id}`);
		if (!row) {
			row = document.createElement("div");
			row.id = `row-${status.id}`;
			row.style.marginBottom = "5px";
			row.style.padding = "5px";
			row.style.borderRadius = "5px";
			groupBox.appendChild(row);
		}

		row.className = status.power ? "on" : "off";
		row.innerHTML = `
        <strong>${status.name}</strong> — 
        ${status.lightness}% | ${status.temperature}K
      `;

		loadedDevices.set(device.id, device);
	} catch (err) {
		console.warn(`Retrying ${device.name}: ${err.message}`);
	}
}

async function refreshLoop() {
	try {
		if (loadedDevices.size === 0) {
			const devices = await fetchDevices();
			devices.forEach(d => loadedDevices.set(d.id, d));
		}

		const deviceList = Array.from(loadedDevices.values());

		for (const device of deviceList) {
			updateDeviceStatus(device);
			await new Promise(r => setTimeout(r, 300));
		}
	} catch (err) {
		console.error("Error in refresh loop:", err.message);
	} finally {
		setTimeout(refreshLoop, 5000);
	}
}

refreshLoop();
