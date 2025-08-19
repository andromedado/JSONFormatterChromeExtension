// background.js - Background script for JSON Formatter extension

// Default configuration for JSON summarization
const DEFAULT_SUMMARIZE_CONFIGS = [
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'code']},
            {type: 'valueRegex', key: 'apiType', regex: 'action|invoiceItem'}
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
            {type: 'keysPresent', keys: ['apiType', 'type', 'status']},
            {type: 'valueRegex', key: 'apiType', regex: '[Rr]eview'}
        ],
        summarizer: {type: 'joinedValues', keys: ['type', 'status']}
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
            {type: 'simpleObject', keysToIgnore: ['apiType']}
        ],
        summarizer: {type: 'simpleObject', keysToIgnore: ['apiType']}
    }
];

// Listen for messages from content scripts, popup, and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getDefaultConfigs') {
        sendResponse(DEFAULT_SUMMARIZE_CONFIGS);
        return true; // Keep the message channel open for async response
    }
    
    if (request.message === 'getConfigs') {
        // Return both default and custom configs based on storage settings
        chrome.storage.sync.get(['useDefaultConfig', 'useCustomConfig', 'customConfig'], function(result) {
            let configuration = [];
            
            if (result.useDefaultConfig !== false) { // Default to true if not set
                configuration = configuration.concat(DEFAULT_SUMMARIZE_CONFIGS);
            }
            
            if (result.useCustomConfig && result.customConfig && Array.isArray(result.customConfig)) {
                configuration = configuration.concat(result.customConfig);
            }
            
            sendResponse(configuration);
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
