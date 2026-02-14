// 用于提高稳健性
function getGlobalSettingsSafe() {
    if (typeof globalSettings !== 'undefined' && globalSettings && typeof globalSettings === 'object') {
        return globalSettings;
    }
    return {};
}

function resolveVaultName(data) {
    const pageSettings = (data && data.payload && data.payload.settings) ? data.payload.settings : {};
    const trimNonEmpty = (v) => (typeof v === 'string' && v.trim() !== '') ? v.trim() : '';
    const gs = getGlobalSettingsSafe();

    const pageVault =
        (pageSettings.vault && typeof pageSettings.vault === 'string') ? trimNonEmpty(pageSettings.vault)
            : (pageSettings.vault && typeof pageSettings.vault === 'object') ? trimNonEmpty(pageSettings.vault.vault)
                : '';

    let presetVault = '';
    if (pageSettings.vault_id && gs.vaults && gs.vaults[pageSettings.vault_id]) {
        presetVault = trimNonEmpty(gs.vaults[pageSettings.vault_id].vault);
    }

    if (pageVault) {
        return pageVault;
    }

    return presetVault || '';
}

function openUrlAndShowOk(data, url) {
    // 这里会对所有 URI 类操作进行统一的非空判断
    // v3.x: vault name 可能来自 globalSettings.vaults[vault_id]，不一定存在于 pageSettings.vault
    const vault = resolveVaultName(data);
    if (!vault) {
        const gs = getGlobalSettingsSafe();
        const vaultId = (data.payload.settings && data.payload.settings.vault_id) ? data.payload.settings.vault_id : '';
        console.warn('[URI] missing vault:', { action: data.action, vault_id: vaultId, hasVaults: !!gs.vaults });
        showAlert(data.context);
        return;
    }
    
    openUrl(data.context, url);
    showOk(data.context);
}

/**
 * 通用的简单命令执行函数
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       apikey?: string|null,
 *       body?: string|null,
 *     }
 *   },
 * }} data
 * @param {string} defaultUrl - 默认URL
 */
function executeSimpleCommand(data, defaultUrl) {
    const defaultSettings = {
        url: defaultUrl
    };

    const newData = {
        context: data.context,
        payload: {
            settings: {...defaultSettings, ...data.payload.settings},
        },
    };

    sendHttp(newData);
}

/**
 * 具备旋钮功能的函数
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       apikey?: string|null,
 *       body?: string|null,
 *       ticks?: string|null
 *     }
 *   },
 * }} data
 * @param {string} positiveCommand - 正向命令URL（右转）
 * @param {string|null} negativeCommand - 负向命令URL（左转），可选
 */
function dialRotate(data, positiveCommand, negativeCommand) {
    let defaultSettings = {
        url: positiveCommand
    };

    // 如果有负向命令且存在ticks参数，则根据ticks值选择命令
    if (negativeCommand && data.payload.ticks !== undefined) {
        const ticks = data.payload.ticks;
        if (ticks < 0) {
            defaultSettings = {
                url: negativeCommand
            };
        }
    }

    const newData = {
        context: data.context,
        payload: {
            settings: {...defaultSettings, ...data.payload.settings},
        },
    };

    sendHttp(newData);
}


/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       port?:number,
 *       https?:boolean
 *     }
 *   },
 * }} data
 */
/**
 * 获取URL前缀，支持设置优先级：页面设置 > 全局设置 > 默认值
 * @param {object} data - 请求数据
 * @returns {string} URL前缀
 */
function getUrlPrefix(data) {
    // 获取页面设置
    const pageSettings = data.payload.settings || {};
    const gs = getGlobalSettingsSafe();
    
    // Resolve vault settings
    let vaultSettings = {};
    if (pageSettings.vault && typeof pageSettings.vault === 'object') {
        vaultSettings = pageSettings.vault;
    } else if (pageSettings.vault_id && gs.vaults && gs.vaults[pageSettings.vault_id]) {
        vaultSettings = gs.vaults[pageSettings.vault_id];
    }

    // 设置优先级处理：页面设置 > Vault设置 > 全局设置 (legacy)
    const port = pageSettings.port || vaultSettings.port || gs.port;
    
    // HTTPS 状态判断
    let https;
    if (pageSettings.hasOwnProperty('https')) {
        https = Boolean(pageSettings.https);
    } else if (vaultSettings.https !== undefined) {
        https = Boolean(vaultSettings.https);
    } else if (Object.prototype.hasOwnProperty.call(gs, 'https')) {
        https = Boolean(gs.https);
    } else {
        https = false;
    }
    
    const protocol = https ? 'https' : 'http';
    const defaultPort = https ? '27124' : '27123';
    const actualPort = port || defaultPort;
    
    // console.log(`[App] URL prefix generated: ${protocol}://localhost:${actualPort}, HTTPS: ${https}, Port: ${actualPort}, API Key: ${apikey ? '[set]' : '[not set]'}`);
    
    return `${protocol}://localhost:${actualPort}`;
}

/**
 * 获取API Key，支持设置优先级：Vault设置 > 页面设置 > 全局设置
 * @param {object} data - 请求数据
 * @returns {string} API Key
 */
function getApiKey(data) {
    const pageSettings = data.payload.settings || {};
    const gs = getGlobalSettingsSafe();
    const pageApiKey = (typeof pageSettings.apikey === 'string') ? pageSettings.apikey.trim() : '';
    if (pageApiKey) return pageApiKey;

    if (pageSettings.vault_id && gs.vaults && gs.vaults[pageSettings.vault_id]) {
        const vaultApiKey = gs.vaults[pageSettings.vault_id].apikey;
        return (typeof vaultApiKey === 'string') ? vaultApiKey.trim() : '';
    }

    return (typeof gs.apikey === 'string') ? gs.apikey.trim() : '';
}

function getPrefixByType(type) {
    let prefix = '';
    switch (type) {
        case SearchType.ALL:
        default:
            prefix = '';
            break;
        case SearchType.TAG:
            prefix = 'tag:';
            break;
        case SearchType.FILE:
            prefix = 'file:';
            break;
        case SearchType.ANY:
            prefix = 'task:';
            break;
        case SearchType.TODO:
            prefix = 'task-todo:';
            break;
        case SearchType.DONE:
            prefix = 'task-done:';
            break;
    }
    return prefix;
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       apikey?: string|null,
 *       body?: string|null,
 *     }
 *   },
 * }} data
 */
function sendHttp(data) {
    const url = data.payload.settings.url;
    const method = 'POST';
    const contentType = 'application/json';
    // 使用支持全局设置的API Key获取方法
    const apikey = getApiKey(data);
    const headers = `Authorization: Bearer ${apikey}`;
    const body = '';

    // log('sendHttp', { url, method, contentType, headers, body });

    let defaultHeaders = contentType ? {
        'Content-Type': contentType
    } : {};
    let inputHeaders = {};

    if (headers) {
        const headersArray = headers.split(/\n/);

        for (let i = 0; i < headersArray.length; i += 1) {
            if (headersArray[i].includes(':')) {
                const [headerItem, headerItemValue] = headersArray[i].split(/:(.*)/);
                const trimmedHeaderItem = headerItem.trim();
                const trimmedHeaderItemValue = headerItemValue.trim();

                if (trimmedHeaderItem) {
                    inputHeaders[trimmedHeaderItem] = trimmedHeaderItemValue;
                }
            }
        }
    }

    const fullHeaders = {
        ...defaultHeaders,
        ...inputHeaders
    }

    // log(fullHeaders);

    if (!url || !method) {
        showAlert(data.context);
        return;
    }
    fetch(
        url,
        {
            cache: 'no-cache',
            headers: fullHeaders,
            method,
            body: ['GET', 'HEAD'].includes(method) ? undefined : body,
        })
        .then(checkResponseStatus)
        .then(() => showOk(data.context))
        .catch(err => {
            showAlert(data.context);
            logErr(err);
        });
}

/**
 * @param {void | Response} resp
 * @returns {Promise<Response>}
 */
async function checkResponseStatus(resp) {
    if (!resp) {
        throw new Error();
    }
    if (!resp.ok) {
        throw new Error(`${resp.status}: ${resp.statusText}\n${await resp.text()}`);
    }
    return resp;
}

/**
 * @param {WebSocket} ws
 */
function onOpen(ws) {
    log(`Connection to ${ws.url} opened`);
}

/**
 * @param {WebSocket} ws
 * @param {CloseEvent} evt
 */
function onClose(ws, evt) {
    log(`Connection to ${ws.url} closed:`, evt.code, evt.reason);
}

/**
 * @param {string} context
 * @param {string} title
 * @param {number=} state
 */
function setTitle(context, title, state) {
    $SD.api.setTitle(context, title, undefined, state);
}

/**
 * @param {string} context
 * @param {string} url
 */
function openUrl(context, url) {
    $SD.api.openUrl(context, url);
}

/**
 * @param {string} context
 */
function showOk(context) {
    $SD.api.showOk(context);
}

/**
 * @param {string} context
 */
function showAlert(context) {
    $SD.api.showAlert(context);
}

/**
 * @param {...unknown} msg
 */
function log(...msg) {
    console.log(...msg);
    $SD.api.logMessage(msg.map(stringify).join(' '));
}

/**
 * @param {...unknown} msg
 */
function logErr(...msg) {
    console.error(...msg);
    $SD.api.logMessage(msg.map(stringify).join(' '));
}

/**
 * @param {unknown} input
 * @returns {string}
 */
function stringify(input) {
    if (typeof input !== 'object' || input instanceof Error) {
        return input.toString();
    }
    return JSON.stringify(input, null, 2);
}

/**
 * @param {string} context
 * @param {number} state
 */
function setState(context, state) {
    $SD.api.setState(context, state);
}

function __setGlobalSettingsForTest(nextSettings) {
    globalSettings = nextSettings || {};
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resolveVaultName,
        getUrlPrefix,
        getApiKey,
        __setGlobalSettingsForTest
    };
}
