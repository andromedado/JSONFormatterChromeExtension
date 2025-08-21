// background.js - Background script for JSON Formatter extension

const BOOLEAN_CONFIGS = [
    {
        name: 'alphabetizeKeys',
        description: 'Alphabetize keys in the formatted JSON',
        defaultValue: false
    },
    {
        name: 'hoistIdToTop',
        description: 'If the ID key is present, move it to the top of the object',
        defaultValue: false
    },
    {
        name: 'jumpToComplexRootKey',
        description: 'If no breadcrumbs are specified in the hash, jump to the first complex root object on load',
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
        name: 'ID Priority Types',
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'id']},
            {type: 'valueRegex', key: 'apiType', regex: '[Ss]eller|[Uu]ser'}
        ],
        summarizer: {type: 'keyValue', key: 'id'}
    },
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

const COLOR_CONFIGS = [ {
    type: 'background-color',
    selector: 'body',
    key: 'bodyBackgroundColor',
    name: 'Page Background Color',
    description: 'The background color of the page',
    defaultValue: '#EEEEEE',
    examples: [
        {
            text: 'This is page text',
            rowClasses: ['body-text']
        }
    ]
}, {
    type: 'color',
    selector: 'body',
    key: 'bodyColor',
    name: 'Page Text Color',
    description: 'The base text color for the page',
    defaultValue: '#000000',
    examples: [
        {
            text: 'This is page text',
            rowClasses: ['body-text']
        }
    ]
}, {
    type: 'background-color',
    selector: '.active',
    key: 'activeBackgroundColor',
    name: 'Active Background Color',
    description: 'The background color of the active element',
    examples: [
        {
            text: 'This element is active',
            rowClasses: ['active']
        }
    ],
    defaultValue: '#FFF9C4'
}, {
    type: 'color',
    selector: '.active',
    key: 'activeTextColor',
    name: 'Active Text Color',
    description: 'The text color of the active element',
    examples: [
        {
            text: 'This element is active',
            rowClasses: ['active']
        }
    ],
    defaultValue: '#000000'
}, {
    type: 'color',
    selector: '.raw',
    key: 'rawTextColor',
    name: 'Type-Hint Text Color',
    description: 'The text color of the nesting type-hints',
    examples: [
        {
            text: 'NESTED-TYPE-EXAMPLE {} ▷',
            rowClasses: ['raw']
        },
        {
            text: 'ACTIVE-NESTED-TYPE-EXAMPLE {} ▷',
            rowClasses: ['raw', 'active']
        }
    ],
    defaultValue: '#6162b9'
}, {
    type: 'color',
    selector: '.jsoned',
    key: 'jsonedTextColor',
    name: 'Simple ValueText Color',
    description: 'The text color of the primitive values',
    examples: [
        {
            text: '"This is a primitive value like string or number"',
            rowClasses: ['jsoned', 'body-text']
        },
        {
            text: '"This is an active primitive value"',
            rowClasses: ['jsoned', 'active']
        }
    ],
    defaultValue: '#b96161'
}, {
    type: 'background-color',
    selector: '.active-selection',
    key: 'activeSelectionBackgroundColor',
    name: 'Active Selection Background Color',
    description: 'The background color of selected text in active row',
    examples: [
        {
            text: 'This element is active and selected',
            textClasses: ['active-selection'],
            rowClasses: ['active']
        }
    ],
    defaultValue: '#ffb957'
}, {
    type: 'color',
    selector: '.active-selection',
    key: 'activeSelectionTextColor',
    name: 'Active Selection Text Color',
    description: 'The text color of selected text in active row',
    examples: [
        {
            text: 'This element is active and selected',
            textClasses: ['active-selection'],
            rowClasses: ['active']
        }
    ],
    defaultValue: '#000000'
} ];


// Listen for messages from content scripts, popup, and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getAllOptions') {
        sendResponse({
            DEFAULT_SUMMARIZE_CONFIGS,
            BOOLEAN_CONFIGS,
            COLOR_CONFIGS
        });
        return true; // Keep the message channel open for async response
    }
    
    if (request.message === 'getConfigs') {
        // Return both default and custom configs based on storage settings
        const storagePromise = new Promise((resolve) => {
            chrome.storage.sync.get(['useDefaultConfig', 'useCustomConfig', 'customConfig', 'booleanConfigs', 'colorConfigs'], function(result) {
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
                
                resolve({
                    summarizationConfiguration,
                    booleanConfigurations, 
                    colorConfigurations: result.colorConfigs || {}
                });
            });
        });

        const stylePromise = new Promise((resolve, reject) => {
            const url = chrome.runtime.getURL('style.css');
            fetch(url).then((response) => {
                return response.text().then((text) => {
                    resolve(text);
                });
            }).catch(reject);
        });

        Promise.all([storagePromise, stylePromise]).then(([storage, style]) => {

            for (const config of COLOR_CONFIGS) {
                const value = storage.colorConfigurations?.[config.key]?.currentValue || config.defaultValue;
                style = style + `\n${config.selector} { ${config.type}: ${value}; }`;
            }

            sendResponse({
                ...storage,
                style
            });
        }).catch((e) => {
            console.error(e);
            sendResponse({
                error: e.message
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
