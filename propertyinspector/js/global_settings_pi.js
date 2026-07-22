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

/**
 * 刷新 Vault ID 下拉框的显示文本
 * 当全局设置中存在某个 Vault ID 对应的 vault name 时，
 * 将该 option 的文本显示为 "Vault N - {vault name}"；
 * 否则回退为 "Vault N"。
 * 该函数会保留当前选中的 value（只改文本，不改选中状态）。
 */
function __piRefreshVaultIdLabels() {
    const select = document.getElementById('vault_id');
    if (!select) return;
    const vaults = (__piGlobalSettings && __piGlobalSettings.vaults && typeof __piGlobalSettings.vaults === 'object')
        ? __piGlobalSettings.vaults : {};
    Array.from(select.options).forEach(opt => {
        const vid = opt.value;                       // "Vault1"
        const num = vid.replace('Vault', '');        // "1"
        const name = (vaults[vid] && typeof vaults[vid].vault === 'string')
            ? vaults[vid].vault.trim() : '';
        opt.textContent = name ? `Vault ${num} - ${name}` : `Vault ${num}`;
    });
}

window.__piGetVaultPresetName = __piGetVaultPresetName;
window.__piRefreshVaultIdLabels = __piRefreshVaultIdLabels;

if (typeof $SD !== 'undefined') {
    $SD.on('connected', () => {
        // console.log('[PI] Global settings script loaded');
        __piRefreshVaultIdLabels();
        if ($SD.api && typeof $SD.api.getGlobalSettings === 'function') {
            $SD.api.getGlobalSettings($SD.uuid);
        }
    });

    $SD.on('didReceiveGlobalSettings', (jsonObj) => {
        const settings = (jsonObj && jsonObj.payload && jsonObj.payload.settings) ? jsonObj.payload.settings : {};
        __piSetGlobalSettings(settings);
        __piRefreshVaultIdLabels();
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
