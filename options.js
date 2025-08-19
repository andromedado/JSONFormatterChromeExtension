let DEFAULT_SUMMARIZE_CONFIGS;
let domLoaded = false;

chrome.runtime.sendMessage({message: 'getDefaultConfigs'}, function(response) {
    if (chrome.runtime.lastError) {
        console.error('Error getting default configs:', chrome.runtime.lastError);
        DEFAULT_SUMMARIZE_CONFIGS = [];
    } else {
        DEFAULT_SUMMARIZE_CONFIGS = response || [];
    }
    initIfReady();
});

function domContentLoaded() {
    domLoaded = true;
    initIfReady();
}

// DOM elements
const customConfigEl = document.getElementById('customConfig');
const defaultConfigEl = document.getElementById('defaultConfig');
const useDefaultConfigEl = document.getElementById('useDefaultConfig');
const useCustomConfigEl = document.getElementById('useCustomConfig');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

function enforceCustomConfig() {
    if (useCustomConfigEl.checked) {
        customConfigEl.classList.remove('none');
    } else {
        customConfigEl.classList.add('none');
    }
}

// Load configuration from storage
function initIfReady() {
    if (!domLoaded || !DEFAULT_SUMMARIZE_CONFIGS) {
        return;
    }

    defaultConfigEl.value = JSON.stringify(DEFAULT_SUMMARIZE_CONFIGS, null, 2);
    chrome.storage.sync.get(['customConfig', 'useDefaultConfig', 'useCustomConfig', 'everSaved'], function(result) {
        if (result.customConfig) {
            customConfigEl.value = JSON.stringify(result.customConfig, null, 2);
        }
        useDefaultConfigEl.checked = result.useDefaultConfig || !result.everSaved;
        useCustomConfigEl.checked = result.useCustomConfig;
        enforceCustomConfig();
    });
}

// Save configuration to storage
function saveConfig() {
    const customConfigText = customConfigEl.value.trim();
    const useDefaultConfig = useDefaultConfigEl.checked;
    const useCustomConfig = useCustomConfigEl.checked;
    let customConfigValue = null;

    try {
        if (customConfigText) {
            customConfigValue = JSON.parse(customConfigText);
            if (useCustomConfig) {
                // Basic validation
                if (!Array.isArray(customConfigValue)) {
                    showStatus('Configuration must be an array', 'error');
                    return;
                }
                
                // Validate each config item
                for (let i = 0; i < customConfigValue.length; i++) {
                    const item = customConfigValue[i];
                    if (!item.predicates || !item.summarizer) {
                        showStatus(`Configuration item ${i + 1} must have 'predicates' and 'summarizer' properties`, 'error');
                        return;
                    }
                }
            }
        }
            
        // Save to storage
        chrome.storage.sync.set({customConfig: customConfigValue, useDefaultConfig, useCustomConfig, everSaved: true}, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving configuration: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Configuration saved successfully!', 'success');
            }
        });
        
    } catch (error) {
        showStatus('Invalid JSON: ' + error.message, 'error');
        console.error(error);
        console.error(customConfigText);
    }
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
useCustomConfig.addEventListener('change', enforceCustomConfig);

// Load configuration when page loads
document.addEventListener('DOMContentLoaded', domContentLoaded); 