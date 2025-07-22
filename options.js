// Default configuration that matches the original summarizeConfigs
const DEFAULT_CONFIG = [
    {
        predicates: [
            {type: 'keysPresent', keys: ['apiType', 'code']},
            {type: 'valueRegex', key: 'apiType', regex: '[Aa]ction'}
        ],
        summarizer: {type: 'keyValue', key: 'code'}
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

// DOM elements
const configTextarea = document.getElementById('configTextarea');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
//const clearBtn = document.getElementById('clearBtn');
//const loadExampleBtn = document.getElementById('loadExample');
const statusDiv = document.getElementById('status');

// Load configuration from storage
function loadConfig() {
    chrome.storage.sync.get(['summarizeConfigs'], function(result) {
        if (result.summarizeConfigs) {
            configTextarea.value = JSON.stringify(result.summarizeConfigs, null, 2);
        } else {
            configTextarea.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
        }
    });
}

// Save configuration to storage
function saveConfig() {
    const configText = configTextarea.value.trim();
    
    if (!configText) {
        showStatus('Configuration cannot be empty', 'error');
        return;
    }
    
    try {
        const config = JSON.parse(configText);
        
        // Basic validation
        if (!Array.isArray(config)) {
            showStatus('Configuration must be an array', 'error');
            return;
        }
        
        // Validate each config item
        for (let i = 0; i < config.length; i++) {
            const item = config[i];
            if (!item.predicates || !item.summarizer) {
                showStatus(`Configuration item ${i + 1} must have 'predicates' and 'summarizer' properties`, 'error');
                return;
            }
        }
        
        // Save to storage
        chrome.storage.sync.set({summarizeConfigs: config}, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving configuration: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Configuration saved successfully!', 'success');
            }
        });
        
    } catch (error) {
        showStatus('Invalid JSON: ' + error.message, 'error');
    }
}

// Reset to default configuration
function resetConfig() {
    if (confirm('Are you sure you want to reset to the default configuration? This will overwrite your current settings.')) {
        configTextarea.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
        chrome.storage.sync.set({summarizeConfigs: DEFAULT_CONFIG}, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error resetting configuration: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Configuration reset to default!', 'success');
            }
        });
    }
}

// Clear configuration (use empty array)
function clearConfig() {
    if (confirm('Are you sure you want to clear the configuration? This will disable all custom summaries.')) {
        const emptyConfig = [];
        configTextarea.value = JSON.stringify(emptyConfig, null, 2);
        chrome.storage.sync.set({summarizeConfigs: emptyConfig}, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error clearing configuration: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Configuration cleared!', 'success');
            }
        });
    }
}

// Load example configuration
function loadExample() {
    configTextarea.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
    showStatus('Example configuration loaded. Click "Save Configuration" to apply it.', 'success');
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Hide status after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Event listeners
saveBtn.addEventListener('click', saveConfig);
resetBtn.addEventListener('click', resetConfig);
//clearBtn.addEventListener('click', clearConfig);
//loadExampleBtn.addEventListener('click', loadExample);

// Load configuration when page loads
document.addEventListener('DOMContentLoaded', loadConfig); 