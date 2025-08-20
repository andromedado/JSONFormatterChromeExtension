let DEFAULT_SUMMARIZE_CONFIGS;
let BOOLEAN_CONFIGS;
let domLoaded = false;

let id = 1;
const el = (tag, content, parent, attrs) => {
    const element = document.createElement(tag);
    if (content != void 0) {
        if (/HTML/.test(Object.prototype.toString.call(content))) {
            element.appendChild(content);
        } else {
            element.innerText = content;
        }
    }
    if (parent) {
        parent.appendChild(element);
    }
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            element.setAttribute(key, value);
        }
    }
    element.id = `json-${id++}`;
    return element;
};

chrome.runtime.sendMessage({message: 'getAllOptions'}, function(response) {
    if (chrome.runtime.lastError) {
        console.error('Error getting default configs:', chrome.runtime.lastError);
        DEFAULT_SUMMARIZE_CONFIGS = [];
    } else {
        DEFAULT_SUMMARIZE_CONFIGS = response.DEFAULT_SUMMARIZE_CONFIGS || [];
        BOOLEAN_CONFIGS = response.BOOLEAN_CONFIGS || [];
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
const booleanConfigsEl = document.getElementById('booleanConfigs');

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

    const styleEl = el('style', void 0, void 0, {
        type: 'text/css'
    });
    // Insert the style tag as the first child of the header element
    const header = document.querySelector('head');
    header.insertBefore(styleEl, header.firstChild);
    chrome.runtime.sendMessage({message: 'getConfigs'}, function(response) {
        if (!chrome.runtime.lastError) {
            styleEl.textContent = response.style;
        }
    });

    defaultConfigEl.value = JSON.stringify(DEFAULT_SUMMARIZE_CONFIGS, null, 2);
    chrome.storage.sync.get(['customConfig', 'useDefaultConfig', 'useCustomConfig', 'everSaved', 'booleanConfigs'], function(result) {
        if (result.customConfig) {
            customConfigEl.value = JSON.stringify(result.customConfig, null, 2);
        }
        useDefaultConfigEl.checked = result.useDefaultConfig || !result.everSaved;
        useCustomConfigEl.checked = result.useCustomConfig;
        enforceCustomConfig();

        for (const config of BOOLEAN_CONFIGS) {
            const dt = el('dt', void 0, booleanConfigsEl);
            let checked = result.booleanConfigs?.[config.name]?.currentValue;
            if (checked === void 0) {
                checked = config.defaultValue;
            }
            const label = el('label', void 0, dt);
            const input = el('input', void 0, label, {
                class: 'boolean-config',
                type: 'checkbox'
            });
            input.checked = checked;
            input.dataset.configName = config.name;
            el('span', config.name, label);
            el('dd', config.description, booleanConfigsEl);
            //checkbox.addEventListener('change', () => {
        }
    });
}

// Save configuration to storage
function saveConfig() {
    const customConfigText = customConfigEl.value.trim();
    const useDefaultConfig = useDefaultConfigEl.checked;
    const useCustomConfig = useCustomConfigEl.checked;
    let customConfigValue = null;
    let booleanConfigs = {};

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

        for (const input of document.querySelectorAll('.boolean-config')) {
            const configName = input.dataset.configName;
            booleanConfigs[configName] = {
                currentValue: input.checked
            };
        }
            
        // Save to storage
        chrome.storage.sync.set({
            customConfig: customConfigValue,
            booleanConfigs,
            useDefaultConfig,
            useCustomConfig,
            everSaved: true
        }, function() {
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