const { expect } = require('chai');
const { MockRuntime } = require('@axway/api-builder-test-utils');
const getPlugin = require('../src');
const path = require('path');
const fs = require('fs');
const nock = require('nock');
const envLoader = require('dotenv');
const decache = require('decache');

describe('Test group based API lookup', () => {
	let plugin;
	let flowNode;
	// Loads environment variables from .env-multiple-groups - which has multiple API-Managers (mocked) configured 
	const envFilePath = path.join(__dirname, '.env-multiple-groups');
	if (fs.existsSync(envFilePath)) {
		delete process.env.API_MANAGER; // Otherwise it is not overwritten
		envLoader.config({ path: envFilePath });
	}
	// Delete the cached module 
	decache('../config/axway-api-utils.default.js');
	var pluginConfig = require('../config/axway-api-utils.default.js').pluginConfig['api-builder-plugin-axway-api-management'];

	beforeEach(async () => {
		plugin = await MockRuntime.loadPlugin(getPlugin,pluginConfig);
		plugin.setOptions({ validateOutputs: true });
		flowNode = plugin.getFlowNode('axway-api-management');
	});

	describe('#lookupAPIDetails', () => {
		// This only fails, if really multiple API-Manager are configured (for that the parameter-value of API_MANAGER is checked if it contains a #)
		it('should return an error for a given groupId: group-unknown, which is not configured', async () => {
			
			const { value, output } = await flowNode.lookupAPIDetails({ 
				apiName: 'Petstore HTTPS', apiPath: '/v1/petstore', groupId: 'group-unknown'
			});

			expect(value).to.be.instanceOf(Error)
				.and.to.have.property('message', 'You have configured API-Manager URLs based on groupIds (e.g. group-a#https://manager-host.com:8075), but the groupId: group-unknown ist NOT configured. Please check the configuration parameter: API_MANAGER');
			expect(output).to.equal('error');
		});

		it('should return the API-Details from the correct API-Manager based on the given groupId', async () => {
			nock('https://mocked-api-manager-1:8175').get('/api/portal/v1.3/proxies?field=name&op=eq&value=Petstore HTTPS').replyWithFile(200, './test/testReplies/apimanager/manager-1/apiProxyManager1.json');
			nock('https://mocked-api-manager-1:8175').get(`/api/portal/v1.3/organizations/2bfaa1c2-49ab-4059-832d-team-a`).replyWithFile(200, './test/testReplies/apimanager/manager-1/orgTeamA.json');

			nock('https://mocked-api-manager-2:8275').get('/api/portal/v1.3/proxies?field=name&op=eq&value=Petstore HTTPS').replyWithFile(200, './test/testReplies/apimanager/manager-2/apiProxyManager2.json');
			nock('https://mocked-api-manager-2:8275').get(`/api/portal/v1.3/organizations/2bfaa1c2-49ab-4059-832d-team-b`).replyWithFile(200, './test/testReplies/apimanager/manager-2/orgTeamB.json');
			// This API exists with the same criterias on both API-Managers, but the organization and version different
			// This tests makes sure, the correct API-Manager has returned the API-Details based on the groupId
			let { value, output } = await flowNode.lookupAPIDetails({ 
				apiName: 'Petstore HTTPS', apiPath: '/v1/petstore', groupId: 'group-5'
			});
			expect(value.organizationName).to.equal(`Team B`);
			expect(value.name).to.equal(`Petstore HTTPS`);
			expect(value.path).to.equal(`/v1/petstore`);
			expect(value.version).to.equal(`1.0.5 Manager 2`);
			expect(output).to.equal('next');

			let { value: value2, output: output2 } = await flowNode.lookupAPIDetails({ 
				apiName: 'Petstore HTTPS', apiPath: '/v1/petstore', groupId: 'group-1'
			});
			expect(value2.organizationName).to.equal(`Team A`);
			expect(value2.name).to.equal(`Petstore HTTPS`);
			expect(value2.path).to.equal(`/v1/petstore`);
			expect(value2.version).to.equal(`1.0.5 Manager 1`);
			expect(output2).to.equal('next');
			nock.cleanAll();
		});
	});
});