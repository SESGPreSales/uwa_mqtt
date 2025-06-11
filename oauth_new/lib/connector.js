"use strict";
const { refreshLoop, loadedDevices } = require("../etc/js/mesh");
const mapping = require("./mapping");
const deviceService = require("./device-service");
const deviceTypes = require("./device-types");
const {
	SchemaConnector,
	DeviceErrorTypes,
	GlobalErrorTypes,
} = require("st-schema");

const clientId = process.env.ST_CLIENT_ID;
const clientSecret = process.env.ST_CLIENT_SECRET;

const connector = new SchemaConnector()
	.clientId(clientId)
	.clientSecret(clientSecret)
	.enableEventLogging()

	// DISCOVERY HANDLER
	.discoveryHandler(async (accessToken, response) => {
		for (const device of loadedDevices.values()) {
			const d = response.addDevice(
				device.externalId,
				device.displayName,
				mapping.handlerType(device.handlerType)
			);
			d.manufacturerName("STS");
			d.modelName(device.handlerType);
			if (deviceTypes[device.handlerType]?.deviceCategory) {
				d.addCategory(deviceTypes[device.handlerType].deviceCategory);
			}
		}
	})

	// STATE REFRESH HANDLER
	.stateRefreshHandler(async (accessToken, response, data) => {
		const externalDeviceIds = data.devices.map(d => d.externalDeviceId);
		for (const device of loadedDevices.values()) {
			if (externalDeviceIds.includes(device.externalId)) {
				response.addDevice(
					device.externalId,
					mapping.stStatesFor(device.states)
				);
			}
		}
	})

	// COMMAND HANDLER
	.commandHandler(async (accessToken, response, devices) => {
		const ops = devices.map(
			async ({ externalDeviceId, deviceCookie, commands }) => {
				const externalDevice = Array.from(loadedDevices.values()).find(
					d => d.externalId === externalDeviceId
				);

				if (externalDevice) {
					const externalStates = mapping.externalStatesFor(commands);
					const stStates = mapping.stStatesFor(
						externalStates,
						externalDevice.states
					);

					response.addDevice(externalDeviceId, stStates, deviceCookie);

					deviceService.updateProactiveState(
						"local", // placeholder username if needed
						externalDeviceId,
						externalStates,
						accessToken
					);

					// If you want to update `loadedDevices` state in-memory:
					externalDevice.states = {
						...externalDevice.states,
						...externalStates,
					};
				} else {
					response
						.addDevice(externalDeviceId, [], deviceCookie)
						.setError("Device not found", DeviceErrorTypes.DEVICE_DELETED);
				}
			}
		);

		await Promise.all(ops);
	})

	// CALLBACK HANDLER — Now a no-op or console.log
	.callbackAccessHandler(
		async (accessToken, callbackAuthentication, callbackUrls) => {
			console.log("Callback info received but not persisted.");
			// Optionally store in memory or skip entirely
		}
	)

	// INTEGRATION DELETED HANDLER — Also a no-op
	.integrationDeletedHandler(async accessToken => {
		console.log("Integration deleted for token:", accessToken);
		// Optionally clear memory cache or ignore
	});

module.exports = connector;
