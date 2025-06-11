const express = require("express");
const router = express.Router();
const deviceService = require("../lib/device-service");
const mapping = require("../lib/mapping");
const { DiscoveryDevice } = require("st-schema");
const { refreshLoop, loadedDevices } = require("../etc/js/mesh");

/**
 * Primary devices page
 */
router.get("/", async (req, res) => {
	if (req.session.username) {
		res.render("devices/index", {
			redirectButton: req.session.oauth,
		});
	} else {
		res.redirect("/authorize");
	}
});

/**
 * Returns view model data for the devices page
 */
router.get("/viewData", async (req, res) => {
	const devices = req.session.username
		? Array.from(loadedDevices.values())
		: [];
	res.send({
		username: req.session.username,
		devices: devices,
		deviceTypes: mapping.deviceTypeNames(),
	});
});

/**
 * Handles device commands from devices page (updates memory only)
 */
router.post("/command", async (req, res) => {
	const { username, externalId, states: externalStates } = req.body;
	const device = Array.from(loadedDevices.values()).find(
		d => d.externalId === externalId
	);

	if (!device) {
		return res.status(404).send({ error: "Device not found" });
	}

	const allStates = device.states || {};

	if ("temperatureScale" in externalStates) {
		if (allStates.temperatureScale !== externalStates.temperatureScale) {
			const newStates = { temperatureScale: externalStates.temperatureScale };

			for (const name of Object.keys(allStates)) {
				if (mapping.isTemperatureAttribute(name)) {
					newStates[name] = convertTemperature(
						allStates[name],
						allStates.temperatureScale || "F",
						externalStates.temperatureScale
					);
				}
			}

			device.states = { ...allStates, ...newStates };
			await deviceService.updateProactiveState(username, externalId, newStates);
		} else {
			device.states = { ...allStates, ...externalStates };
		}
	} else {
		device.states = { ...allStates, ...externalStates };
		await deviceService.updateProactiveState(
			username,
			externalId,
			externalStates
		);
	}

	res.send({});
});

/**
 * Handles device creation requests from devices page (adds to memory)
 */
router.post("/create", async (req, res) => {
	const deviceType = mapping.deviceTypeForName(req.body.deviceType);

	const externalId = `mem-${Date.now()}`;
	const newDevice = {
		id: externalId, // Optional internal ID
		externalId,
		displayName: req.body.displayName || deviceType.name,
		handlerType: deviceType.type,
		states: { ...deviceType.states },
	};

	loadedDevices.set(externalId, newDevice);

	const discoveryDevice = new DiscoveryDevice(
		newDevice.externalId,
		newDevice.displayName,
		newDevice.handlerType
	)
		.manufacturerName("Example ST Schema Connector")
		.modelName(newDevice.handlerType);

	deviceService.addDevice(req.session.username, discoveryDevice);
	res.send(newDevice);
});

/**
 * Handles device deletion requests from devices page (removes from memory)
 */
router.post("/delete", async (req, res) => {
	const deviceIds = req.body.deviceIds;
	const removed = [];

	for (const id of deviceIds) {
		const foundKey =
			Array.from(loadedDevices.values()).find(d => d.externalId === id)?.id ||
			id;
		if (loadedDevices.delete(foundKey)) {
			removed.push(id);
		}
	}

	res.send({ count: removed.length, items: removed });
});

/**
 * Opens SSE stream to devices page
 */
router.get(
	"/stream",
	async (req, res, next) => {
		res.flush = () => {};
		next();
	},
	deviceService.sse.init
);

module.exports = router;

function convertTemperature(temperature, fromUnit, toUnit) {
	if (fromUnit === toUnit) return temperature;
	if (toUnit === "C") return Math.round((10 * (temperature - 32)) / 9) / 2;
	return Math.round((9 * temperature) / 5 + 32);
}

function injectTemperatureScale(devices) {
	for (const device of devices) {
		if (mapping.missingTemperatureScale(device.states)) {
			device.states.temperatureScale = "F";
		}
	}
	return devices;
}
