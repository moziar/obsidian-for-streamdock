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

/**
 * Save settings to global settings
 * This function collects all form values and saves them to global settings under the selected vault_id
 */
function saveSettingToGlobal() {
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
        $SD.api.setGlobalSettings($SD.uuid, currentGlobalSettings);
        console.log(`Settings saved to global for ${vaultId}:`, vaultSettings);
    }

    // Provide user feedback
    const saveButton = document.getElementById('save_setting_button');
    if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
            saveButton.textContent = originalText;
        }, 2000);
    }
    
    return vaultSettings;
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
    if (document.getElementById('vault_id')) {
        const saveButton = document.getElementById('save_setting_button');
        if (saveButton) {
            // Remove any existing listeners to avoid duplicates
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            
            // Add the event listener to the new button
            newSaveButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                saveSettingToGlobal();
            });
        }

        // Add change listener to vault_id dropdown to switch settings
        const vaultIdSelect = document.getElementById('vault_id');
        if (vaultIdSelect) {
            vaultIdSelect.addEventListener('change', function() {
                updateFormFromGlobal();
            });
        }
    }
    
    // Request global settings
    if ($SD && $SD.uuid) {
        $SD.api.getGlobalSettings($SD.uuid);
    }
});

/**
 * Listen for global settings received event
 */
if ($SD) {
    $SD.on('didReceiveGlobalSettings', function(payload) {
        currentGlobalSettings = payload.payload.settings || {};
        console.log('Received global settings:', currentGlobalSettings);
        
        // Update form if we are on the plugin settings page
        if (document.getElementById('vault_id')) {
            updateFormFromGlobal();
        }
    });
}

// Export the function so it can be used elsewhere if needed
if (typeof window !== 'undefined') {
    window.saveSettingToGlobal = saveSettingToGlobal;
}
