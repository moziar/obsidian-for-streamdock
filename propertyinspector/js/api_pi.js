/**
 * API and Global Settings Management for Plugin Setting Page
 * This script adds save functionality specifically for the plugin-setting.html page
 * It ensures all settings including vault_id are saved to global settings under a specific vault ID
 */

// Ensure $SD is available
if (typeof $SD === 'undefined') {
    console.error('Stream Deck API not initialized');
}

let currentGlobalSettings = {};

let saveDebounceTimer = null;

function isPluginSettingPage() {
    return !!document.getElementById('save_setting_button');
}

function redactForLog(input) {
    if (!input || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(redactForLog);
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (typeof k === 'string' && k.toLowerCase() === 'apikey') {
            out[k] = v ? '[REDACTED]' : '';
        } else {
            out[k] = redactForLog(v);
        }
    }
    return out;
}

function requestGlobalSettings(reason = '') {
    if (!$SD || !$SD.api || typeof $SD.api.getGlobalSettings !== 'function' || !$SD.uuid) return;
    console.log(`[plugin-setting] getGlobalSettings ${reason}`.trim());
    $SD.api.getGlobalSettings($SD.uuid);
}

/**
 * Save settings to global settings
 * This function collects all form values and saves them to global settings under the selected vault_id
 * @param {boolean} showFeedback - Whether to show the "Saved!" feedback on the button
 */
function saveSettingToGlobal(showFeedback = true) {
    // Get form values from the plugin setting page
    const vaultId = document.getElementById('vault_id')?.value;
    const vaultName = document.getElementById('vault')?.value;
    const apiKey = document.getElementById('apikey')?.value;
    const port = document.getElementById('port')?.value;
    const httpsEnabled = document.getElementById('https')?.checked;

    if (!vaultId) {
        console.error('No Vault ID selected');
        return;
    }

    // Initialize vaults object if it doesn't exist
    if (!currentGlobalSettings.vaults) {
        currentGlobalSettings.vaults = {};
    }

    // Prepare settings object for this specific vault
    const vaultSettings = {
        vault: vaultName,
        apikey: apiKey,
        port: port,
        https: httpsEnabled
    };

    // Save to global settings object
    currentGlobalSettings.vaults[vaultId] = vaultSettings;

    // Persist to Stream Deck
    if ($SD && $SD.uuid) {
        console.log(`[plugin-setting] setGlobalSettings vaultId=${vaultId}`, {
            vault: vaultName ? '[set]' : '[empty]',
            apikey: apiKey ? '[set]' : '[empty]',
            port: port || '',
            https: !!httpsEnabled
        });
        if (typeof sendValueToPlugin === 'function') {
            sendValueToPlugin({ type: 'saveVaultSettings', vaultId, vaultSettings }, 'property_inspector');
            console.log('[plugin-setting] sent saveVaultSettings to plugin');
            setTimeout(() => requestGlobalSettings('after save (delayed)'), 250);
        } else if ($SD.api && typeof $SD.api.setGlobalSettings === 'function') {
            $SD.api.setGlobalSettings($SD.uuid, currentGlobalSettings);
            console.log('[plugin-setting] setGlobalSettings payload (redacted):', redactForLog(currentGlobalSettings));
            requestGlobalSettings('after save');
        }
    }

    // Provide user feedback
    if (showFeedback) {
        const saveButton = document.getElementById('save_setting_button');
        if (saveButton) {
            const originalText = saveButton.getAttribute('data-original-text') || saveButton.textContent;
            if (!saveButton.hasAttribute('data-original-text')) {
                saveButton.setAttribute('data-original-text', originalText);
            }
            saveButton.textContent = 'Saved!';
            setTimeout(() => {
                saveButton.textContent = originalText;
            }, 2000);
        }
    }
    
    return vaultSettings;
}

/**
 * Debounced auto-save function
 */
function debouncedAutoSave() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    saveDebounceTimer = setTimeout(() => {
        console.log('Auto-saving to global settings...');
        saveSettingToGlobal(false); // Don't show feedback for auto-save to avoid flickering
    }, 500); // 500ms debounce
}

/**
 * Update the form fields based on the currently selected Vault ID
 */
function updateFormFromGlobal() {
    const vaultIdSelect = document.getElementById('vault_id');
    if (!vaultIdSelect) return;

    const vaultId = vaultIdSelect.value;
    const vaults = currentGlobalSettings.vaults || {};
    const settings = vaults[vaultId] || {};
    console.log(`[plugin-setting] updateFormFromGlobal vaultId=${vaultId}`, settings);

    // Populate vault name
    const vaultInput = document.getElementById('vault');
    if (vaultInput) {
        vaultInput.value = settings.vault || '';
    }
    
    // Populate API key
    const apiKeyTextarea = document.getElementById('apikey');
    if (apiKeyTextarea) {
        apiKeyTextarea.value = settings.apikey || '';
    }
    
    // Populate port
    const portInput = document.getElementById('port');
    if (portInput) {
        portInput.value = settings.port || '';
    }
    
    // Populate https checkbox
    const httpsCheckbox = document.getElementById('https');
    if (httpsCheckbox) {
        httpsCheckbox.checked = !!settings.https;
    }
}

/**
 * Enhanced event listener for the save button
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the plugin-setting page specifically
    // We check for save_setting_button to ensure we are on the plugin settings page, 
    // not on an action page that happens to have vault_id (which all actions now have)
    const saveButton = document.getElementById('save_setting_button');
    
    if (document.getElementById('vault_id') && saveButton) {
        // Remove any existing listeners to avoid duplicates
        const newSaveButton = saveButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);
        
        // Add the event listener to the new button
        newSaveButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveSettingToGlobal();
        });

        // Add change listener to vault_id dropdown to switch settings
        const vaultIdSelect = document.getElementById('vault_id');
        if (vaultIdSelect) {
            vaultIdSelect.addEventListener('change', function() {
                if (!currentGlobalSettings || !currentGlobalSettings.vaults) {
                    requestGlobalSettings('on vault_id change (not loaded yet)');
                }
                updateFormFromGlobal();
            });
        }
    }
});

// Ensure we request global settings when connected
if ($SD) {
    $SD.on('connected', function(jsonObj) {
        if (isPluginSettingPage()) {
            requestGlobalSettings('on connected');
        }
    });
}

/**
 * Listen for global settings received event
 */
if ($SD) {
    $SD.on('didReceiveGlobalSettings', function(jsonObj) {
        currentGlobalSettings = (jsonObj && jsonObj.payload && jsonObj.payload.settings) ? jsonObj.payload.settings : {};
        console.log('[plugin-setting] didReceiveGlobalSettings:', currentGlobalSettings);
        
        // Update form ONLY if we are on the plugin settings page
        if (document.getElementById('vault_id') && isPluginSettingPage()) {
            updateFormFromGlobal();
        }
    });

    $SD.on('sendToPropertyInspector', function(jsonObj) {
        const msg = jsonObj && jsonObj.payload && jsonObj.payload.property_inspector;
        if (!msg || msg.type !== 'globalSettingsUpdated') return;
        requestGlobalSettings(`on plugin ack (${msg.vaultId || ''})`.trim());
    });
}

// Export the function so it can be used elsewhere if needed
if (typeof window !== 'undefined') {
    window.saveSettingToGlobal = saveSettingToGlobal;
}
