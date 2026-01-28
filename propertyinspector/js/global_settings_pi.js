let __piGlobalSettings = {};

function __piRedactForLog(input) {
    if (!input || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(__piRedactForLog);
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (typeof k === 'string' && k.toLowerCase() === 'apikey') {
            out[k] = v ? '[REDACTED]' : '';
        } else {
            out[k] = __piRedactForLog(v);
        }
    }
    return out;
}

function __piSetGlobalSettings(nextSettings) {
    __piGlobalSettings = nextSettings && typeof nextSettings === 'object' ? nextSettings : {};
    window.__piGlobalSettings = __piGlobalSettings;
}

function __piGetVaultPresetName(vaultId) {
    if (!vaultId || !__piGlobalSettings || typeof __piGlobalSettings !== 'object') return '';
    if (!__piGlobalSettings.vaults || typeof __piGlobalSettings.vaults !== 'object') return '';
    const entry = __piGlobalSettings.vaults[vaultId];
    if (!entry || typeof entry !== 'object') return '';
    return typeof entry.vault === 'string' ? entry.vault.trim() : '';
}

window.__piGetVaultPresetName = __piGetVaultPresetName;

if (typeof $SD !== 'undefined') {
    $SD.on('connected', () => {
        // console.log('[PI] Global settings script loaded');
        if ($SD.api && typeof $SD.api.getGlobalSettings === 'function') {
            $SD.api.getGlobalSettings($SD.uuid);
        }
    });

    $SD.on('didReceiveGlobalSettings', (jsonObj) => {
        const settings = (jsonObj && jsonObj.payload && jsonObj.payload.settings) ? jsonObj.payload.settings : {};
        __piSetGlobalSettings(settings);
        const vaultIds = settings && settings.vaults && typeof settings.vaults === 'object' ? Object.keys(settings.vaults) : [];
        const hasLegacyApiKey = !!(settings && typeof settings.apikey === 'string' && settings.apikey.trim());
        // console.log('[PI] didReceiveGlobalSettings:', {
        //     vaultIds,
        //     hasLegacyApiKey
        // });
        if (window.__piDebugGlobalSettings === true) {
            // console.log('[PI] didReceiveGlobalSettings (redacted):', __piRedactForLog(settings));
        }
    });
}
