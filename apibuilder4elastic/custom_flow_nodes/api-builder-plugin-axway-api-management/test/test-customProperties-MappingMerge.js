const { expect } = require('chai');
const { MockRuntime } = require('@axway/api-builder-test-utils');
const getPlugin = require('../src');
const path = require('path');
const fs = require('fs');
const nock = require('nock');
const envLoader = require('dotenv');

describe('Merge custom properties tests', () => {

	let plugin;
	let flowNode;
	beforeEach(async () => {
		plugin = await MockRuntime.loadPlugin(getPlugin, {MOCK_LOOKUP_API:"true"});
		plugin.setOptions({ validateOutputs: true });
		flowNode = plugin.getFlowNode('axway-api-management');
	});

	describe('#Index mapping merge tests', () => {
		it('should error custom properties are missing', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ });

			expect(value).to.be.instanceOf(Error)
				.and.to.have.property('message', 'Missing required parameter: customProperties');
			expect(output).to.equal('error');
		});

		it('should error when desiredIndexTemplate is missing', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ customProperties: { } });

			expect(value).to.be.instanceOf(Error)
				.and.to.have.property('message', 'Missing required parameter: desiredIndexTemplate');
			expect(output).to.equal('error');
		});

		it('should return noUpdate if mergeCustomProperties is false', async () => {
			var desiredIndexTemplate = JSON.parse(fs.readFileSync('./test/testInput/desiredIndexTemplate.json'), null);
			const { value, output } = await flowNode.mergeCustomProperties({ 
				customProperties: JSON.parse(fs.readFileSync('./test/testInput/customPropertiesConfig.json'), null), 
				desiredIndexTemplate: desiredIndexTemplate, 
				mergeCustomProperties: false
			});

			expect(output).to.equal('noUpdate');
			expect(value).to.deep.equal(desiredIndexTemplate);
		});

		it('should NOT error when actualIndexTemplate is missing', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ 
				customProperties: JSON.parse(fs.readFileSync('./test/testInput/customPropertiesConfig.json'), null), 
				desiredIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/desiredIndexTemplate.json'), null), 
				mergeCustomProperties: true
			});

			expect(output).to.equal('next');
			expect(value.mappings.properties['customProperties.customProperty1']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty1'].type).to.equal('text');
			expect(value.mappings.properties['customProperties.customProperty2']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty2'].type).to.equal('keyword');
			expect(value.mappings.properties['customProperties.customProperty3']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty3'].type).to.equal('keyword');
		});

		it('should merge into indexMappingTemplate as custom properties are missing', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ 
				customProperties: JSON.parse(fs.readFileSync('./test/testInput/customPropertiesConfig.json'), null), 
				desiredIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/desiredIndexTemplate.json'), null),
				actualIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/actualIndexTemplate.json'), null), 
				mergeCustomProperties: true
			});
			expect(output).to.equal('next');
			expect(value.mappings.properties['customProperties.customProperty1']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty1'].type).to.equal('text');
			expect(value.mappings.properties['customProperties.customProperty2']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty2'].type).to.equal('keyword');
			expect(value.mappings.properties['customProperties.customProperty3']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty3'].type).to.equal('keyword');
		});

		it('should result in no update required as custom properties already part of the mapping', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ 
				customProperties: JSON.parse(fs.readFileSync('./test/testInput/customPropertiesConfig.json'), null), 
				desiredIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/desiredIndexTemplateWithCustomProps.json'), null),
				actualIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/actualIndexTemplateWithCustomProps.json'), null), 
				mergeCustomProperties: true
			});
			expect(output).to.equal('noUpdate');
			expect(value.mappings.properties['customProperties.customProperty1']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty1'].type).to.equal('text');
			expect(value.mappings.properties['customProperties.customProperty2']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty2'].type).to.equal('keyword');
			expect(value.mappings.properties['customProperties.customProperty3']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty3'].type).to.equal('keyword');
		});

		it('should result in an update as some of the required custom properties are missing', async () => {
			const { value, output } = await flowNode.mergeCustomProperties({ 
				customProperties: JSON.parse(fs.readFileSync('./test/testInput/customPropertiesConfig.json'), null), 
				desiredIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/desiredIndexTemplate.json'), null),
				actualIndexTemplate: JSON.parse(fs.readFileSync('./test/testInput/actualIndexTemplateWithLessCustomProps.json'), null), 
				mergeCustomProperties: true
			});
			expect(output).to.equal('next');
			expect(value.mappings.properties['customProperties.customProperty1']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty1'].type).to.equal('text');
			expect(value.mappings.properties['customProperties.customProperty2']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty2'].type).to.equal('keyword');
			expect(value.mappings.properties['customProperties.customProperty3']).to.be.an('Object');
			expect(value.mappings.properties['customProperties.customProperty3'].type).to.equal('keyword');
		});
	});
});
