// background.js - Background script for JSON Formatter extension

const BOOLEAN_CONFIGS = [
    {
        name: 'alphabetizeKeys',
        description: 'Alphabetize keys in the formatted JSON',
        defaultValue: false
    }
];

// Default configuration for JSON summarization
const DEFAULT_SPECIFIC_CONFIGS = [
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'code']},
            {type: 'valueRegex', key: 'apiType', regex: '[aA]ction|invoiceItem'}
        ],
        summarizer: {type: 'keyValue', key: 'code'}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'reference']},
            {type: 'valueRegex', key: 'apiType', regex: '(flat|percent)?[Aa]djustment(Rate)?'}
        ],
        summarizer: {type: 'joinedValues', keys: ['reference', 'status']}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['paymentMethodType']},
        ],
        summarizer: {type: 'keyValue', key: 'paymentMethodType'}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'role', 'id']},
            {type: 'valueRegex', key: 'apiType', regex: '[Pp]arty'}
        ],
        summarizer: {type: 'joinedValues', keys: ['role', 'id']}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'numberOfUnits', 'timeUnit']},
            {type: 'valueRegex', key: 'apiType', regex: '[Pp]eriod'}
        ],
        summarizer: {type: 'joinedValues', keys: ['numberOfUnits', 'timeUnit'], joiner: ' '}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'sourceId', 'sourceType']},
            {type: 'valueRegex', key: 'apiType', regex: '[Aa]nchor'}
        ],
        summarizer: {type: 'joinedValues', keys: ['sourceType', 'sourceId']}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'type']},
            {type: 'valueRegex', key: 'apiType', regex: '[Rr]eview|[iI]nvoice'}
        ],
        summarizer: {type: 'joinedValues', keys: ['type', 'status', 'snapshotType']}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'amount', 'currency']},
            {type: 'valueRegex', key: 'apiType', regex: '[Ff]inancial'}
        ],
        summarizer: {type: 'financialAmount', amountKey: 'amount', currencyKey: 'currency'}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'id']},
            {type: 'valueRegex', key: 'apiType', regex: '[Ii]tem'}
        ],
        summarizer: {type: 'keyValue', key: 'id'}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'status']},
            {type: 'valueRegex', key: 'apiType', regex: 'paymentAuthorization'}
        ],
        summarizer: {type: 'keyValue', key: 'status'}
    },
    {
        predicates: [
            {type: 'anyKeyPresent', keys: ['type', 'name']},
            {type: 'valueRegex', key: 'apiType', regex: '[Ee]vent'}
        ],
        summarizer: {type: 'joinedValues', keys: ['type', 'name']}
    }
];

const DEFAULT_CATCHALL_CONFIGS = [
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'status']},
        ],
        summarizer: {type: 'keyValue', key: 'status'}
    },
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'id']},
        ],
        summarizer: {type: 'keyValue', key: 'id'}
    },
    {
        predicates: [
            {type: 'simpleObject', keysToIgnore: ['apiType']}
        ],
        summarizer: {type: 'simpleObject', keysToIgnore: ['apiType']}
    }
];

const DEFAULT_SUMMARIZE_CONFIGS = [
    ...DEFAULT_SPECIFIC_CONFIGS,
    ...DEFAULT_CATCHALL_CONFIGS
];

// Listen for messages from content scripts, popup, and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getAllOptions') {
        sendResponse({
            DEFAULT_SUMMARIZE_CONFIGS,
            BOOLEAN_CONFIGS
        });
        return true; // Keep the message channel open for async response
    }
    
    if (request.message === 'getConfigs') {
        // Return both default and custom configs based on storage settings
        chrome.storage.sync.get(['useDefaultConfig', 'useCustomConfig', 'customConfig', 'booleanConfigs'], function(result) {
            let summarizationConfiguration = [];
            
            if (result.useCustomConfig && result.customConfig && Array.isArray(result.customConfig)) {
                summarizationConfiguration = summarizationConfiguration.concat(result.customConfig);
            }
            
            if (result.useDefaultConfig !== false) { // Default to true if not set
                summarizationConfiguration = summarizationConfiguration.concat(DEFAULT_SUMMARIZE_CONFIGS);
            }

            let booleanConfigurations = {};
            for (const config of BOOLEAN_CONFIGS) {
                booleanConfigurations[config.name] = result.booleanConfigs?.[config.name]?.currentValue;
                if (booleanConfigurations[config.name] === void 0) {
                    booleanConfigurations[config.name] = config.defaultValue;
                }
            }
            
            sendResponse({
                summarizationConfiguration,
                booleanConfigurations
            });
        });
        return true; // Keep the message channel open for async response
    }
});

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default values on first install
        chrome.storage.sync.set({
            useDefaultConfig: true,
            useCustomConfig: false,
            customConfig: null,
            everSaved: false
        });
    }
});

// Handle action button click - open options page
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});
