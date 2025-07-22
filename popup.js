// DOM elements
const openOptionsBtn = document.getElementById('openOptions');
const formatCurrentBtn = document.getElementById('formatCurrent');
const statusDiv = document.getElementById('status');

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

// Open options page
function openOptions() {
    chrome.runtime.openOptionsPage();
}

// Format current page
function formatCurrentPage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: triggerFormat
            }, (result) => {
                if (chrome.runtime.lastError) {
                    showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    showStatus('Page formatted!', 'success');
                }
            });
        }
    });
}

// Function to trigger formatting on the current page
function triggerFormat() {
    // Check if the page content is JSON
    const pageContent = document.body.innerText.trim();
    if (pageContent.startsWith('{') || pageContent.startsWith('[')) {
        try {
            JSON.parse(pageContent);
            // If we get here, it's valid JSON, so trigger the formatter
            // The content script should already be running and will handle this
            showStatus('JSON detected on page. If not formatted, refresh the page.', 'success');
        } catch (e) {
            showStatus('Page does not contain valid JSON', 'error');
        }
    } else {
        showStatus('Page does not contain JSON content', 'error');
    }
}

// Event listeners
openOptionsBtn.addEventListener('click', openOptions);
formatCurrentBtn.addEventListener('click', formatCurrentPage);

// Show status when popup opens
document.addEventListener('DOMContentLoaded', () => {
    showStatus('JSON Formatter is active', 'success');
}); 