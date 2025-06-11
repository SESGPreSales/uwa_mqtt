"use strict";

const mapping = require("./mapping");
const SSE = require("express-sse");
const { DiscoveryRequest, StateUpdateRequest } = require("st-schema");
const { loadedDevices } = require("../etc/js/mesh");

const clientId = process.env.ST_CLIENT_ID;
const clientSecret = process.env.ST_CLIENT_SECRET;

// In-memory callback storage
const callbackRegistry = new Map(); // Map<username, Array<callbackInfo>>

module.exports = {
	/**
	 * Send state update to all registered callbacks and the SSE stream.
	 */
	async updateProactiveState(
		username,
		externalDeviceId,
		externalStates,
		skipThisToken
	) {
		const device = Array.from(loadedDevices.values()).find(
			d => d.externalId === externalDeviceId
		);
		if (!device) {
			console.warn(`Device with externalId ${externalDeviceId} not found.`);
			return;
		}

		const deviceState = [
			{
				externalDeviceId,
				states: mapping.stStatesFor(externalStates, device.states),
			},
		];

		// Emit to SSE
		this.sse.send(deviceState);

		// Send to all callbacks
		const callbacks = callbackRegistry.get(username) || [];
		console.log(`${callbacks.length} CALLBACKS FOUND`);

		const stateUpdateRequest = new StateUpdateRequest(clientId, clientSecret);

		for (const cb of callbacks) {
			if (
				cb.access_token !== skipThisToken &&
				cb.callbackAuth &&
				cb.callbackUrls
			) {
				try {
					await stateUpdateRequest.updateState(
						cb.callbackUrls,
						cb.callbackAuth,
						deviceState,
						refreshedAuth => {
							cb.callbackAuth = refreshedAuth;
							console.log(`Token refreshed for ${cb.access_token}`);
						}
					);
				} catch (err) {
					console.error(
						`Error updating state: "${err}" ${cb.callbackUrls.stateCallback} ${cb.access_token} ${username}`
					);
				}
			}
		}
	},

	/**
	 * Notify all registered connectors that a device has been added.
	 */
	async addDevice(username, device) {
		const deviceHandlerType = mapping.handlerType(device.deviceHandlerType);
		const callbacks = callbackRegistry.get(username) || [];
		console.log(`${callbacks.length} CALLBACKS FOUND`);

		for (const cb of callbacks) {
			if (cb.callbackAuth && cb.callbackUrls) {
				try {
					const discoveryRequest = new DiscoveryRequest(clientId, clientSecret);
					discoveryRequest.addDevice(device);

					await discoveryRequest.sendDiscovery(
						cb.callbackUrls,
						cb.callbackAuth,
						refreshedAuth => {
							cb.callbackAuth = refreshedAuth;
							console.log(`Token refreshed for ${cb.access_token}`);
						}
					);

					console.log(
						`Device added successfully ${cb.callbackUrls.stateCallback}`
					);
				} catch (err) {
					console.error(
						`Error adding device: "${err}" ${cb.callbackUrls.stateCallback} ${cb.access_token}`
					);
				}
			}
		}
	},

	/**
	 * Called by the connector to register a callback for a user
	 */
	registerCallback(username, callbackInfo) {
		if (!callbackRegistry.has(username)) {
			callbackRegistry.set(username, []);
		}
		const userCallbacks = callbackRegistry.get(username);
		const existingIndex = userCallbacks.findIndex(
			cb => cb.access_token === callbackInfo.access_token
		);

		if (existingIndex !== -1) {
			userCallbacks[existingIndex] = callbackInfo;
		} else {
			userCallbacks.push(callbackInfo);
		}
	},

	/**
	 * Remove all callbacks for a user (e.g. on integration deletion)
	 */
	clearCallbacks(username) {
		callbackRegistry.delete(username);
	},

	sse: new SSE(),
};
