// 全局设置管理
let globalSettings = {};

// 定义搜索类型常量
const SearchType = {
    ALL: 'All',
    TAG: 'Tag',
    TASK: 'Task',
    FILE: 'File',
    PATH: 'Path',
    PROPERTY: 'Property',
    ANY: 'AnyTask',
    TODO: 'TodoTask',
    DONE: 'DoneTask'
}

const NoteType = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
};

$SD.on('connected', (jsonObj) => connected(jsonObj));
$SD.on('didReceiveGlobalSettings', (jsonObj) => {
    const settings = jsonObj.payload.settings || {};
    const redactForLog = (input) => {
        if (!input || typeof input !== 'object') return input;
        if (Array.isArray(input)) return input.map(redactForLog);
        const out = {};
        for (const [key, value] of Object.entries(input)) {
            if (typeof key === 'string' && k.toLowerCase() === 'apikey') {
                out[key] = value ? '[REDACTED]' : '';
            } else {
                out[key] = redactForLog(v);
            }
        }
        return out;
    };
    
    console.log('[App] Receive Global Settings:', redactForLog(settings));

    globalSettings = settings;
});

//监听来自 PI 的消息（toggle-color-scheme action）
$SD.on('com.moz.obsidian-for-streamdock.toggle-color-scheme.sendToPlugin', (jsonObj) => handleSendToPlugin(jsonObj));
$SD.on('com.moz.obsidian-for-streamdock.plugin-setting.sendToPlugin', (jsonObj) => handlePluginSettingSendToPlugin(jsonObj));

function connected(jsn) {
    if ($SD && $SD.api && typeof $SD.api.getGlobalSettings === 'function') {
        $SD.api.getGlobalSettings($SD.uuid);
    }

    const events = [
        { event: 'com.moz.obsidian-for-streamdock.run-command.keyDown', handler: runCommand },
        { event: 'com.moz.obsidian-for-streamdock.toggle-color-scheme.keyDown', handler: toggleColorSchemeKeyDown },
        { event: 'com.moz.obsidian-for-streamdock.open-note.keyDown', handler: openNote },
        { event: 'com.moz.obsidian-for-streamdock.open-vault.keyDown', handler: openVault },
        { event: 'com.moz.obsidian-for-streamdock.daily-note.keyDown', handler: dailyNote },
        { event: 'com.moz.obsidian-for-streamdock.web-viewer.keyDown', handler: webViewer },
        { event: 'com.moz.obsidian-for-streamdock.web-searcher.keyDown', handler: webSearcher },
        { event: 'com.moz.obsidian-for-streamdock.note-finder.keyDown', handler: noteFinder },
        { event: 'com.moz.obsidian-for-streamdock.load-workspace.keyDown', handler: loadWorkspace },
        { event: 'com.moz.obsidian-for-streamdock.settings-navigator.keyDown', handler: settingsNavigator },
        { event: 'com.moz.obsidian-for-streamdock.switch-tab.dialRotate', handler: switchTab },
        { event: 'com.moz.obsidian-for-streamdock.zoom.dialRotate', handler: zoomInOut },
        { event: 'com.moz.obsidian-for-streamdock.zoom.dialDown', handler: zoomReset },
        { event: 'com.moz.obsidian-for-streamdock.web-zoom.dialRotate', handler: webZoomInOut },
        { event: 'com.moz.obsidian-for-streamdock.web-zoom.dialDown', handler: webZoomReset },
        { event: 'com.moz.obsidian-for-streamdock.note-navigator.dialRotate', handler: noteNavigator },
        { event: 'com.moz.obsidian-for-streamdock.note-navigator.dialDown', handler: noteNavigatorToCurrent },
        { event: 'com.moz.obsidian-for-streamdock.note-navigator.willAppear', handler: updateNoteNavigatorTitle },
        { event: 'com.moz.obsidian-for-streamdock.note-navigator.didReceiveSettings', handler: updateNoteNavigatorTitle }
    ];

    events.forEach(event => {
        $SD.on(event.event, (jsonObj) => event.handler(jsonObj));
    });
}

function handleSendToPlugin(jsonObj) {
    const payload = jsonObj.payload || {};
    const message = payload.property_inspector;
    if (!message || !message.type) return;
    if (message.type === 'toggleColorScheme') {
        const context = payload.targetContext || jsonObj.context;
        toggleColorSchemeSync(context);
    }
}

function handlePluginSettingSendToPlugin(jsonObj) {
    const payload = jsonObj.payload || {};
    const message = payload.property_inspector;
    if (!message || !message.type) return;
    if (message.type === 'saveVaultSettings') {
        const vaultId = message.vaultId;
        const vaultSettings = message.vaultSettings || {};
        if (!vaultId) return;

        if (!globalSettings || typeof globalSettings !== 'object') globalSettings = {};
        if (!globalSettings.vaults || typeof globalSettings.vaults !== 'object') globalSettings.vaults = {};

        globalSettings.vaults[vaultId] = {
            vault: vaultSettings.vault || '',
            apikey: vaultSettings.apikey || '',
            port: vaultSettings.port || '',
            https: !!vaultSettings.https
        };

        if ($SD && $SD.api && typeof $SD.api.setGlobalSettings === 'function') {
            $SD.api.setGlobalSettings($SD.uuid, globalSettings);
        }
        if ($SD && $SD.api && typeof $SD.api.getGlobalSettings === 'function') {
            $SD.api.getGlobalSettings($SD.uuid);
        }
        if ($SD && $SD.api && typeof $SD.api.sendToPropertyInspector === 'function') {
            $SD.api.sendToPropertyInspector(
                jsonObj.context,
                { property_inspector: { type: 'globalSettingsUpdated', vaultId } },
                'com.moz.obsidian-for-streamdock.plugin-setting'
            );
        }
        return;
    }

    if (message.type === 'globalSettingsUpdated') {
        if ($SD && $SD.api && typeof $SD.api.getGlobalSettings === 'function') {
            $SD.api.getGlobalSettings($SD.uuid);
        }
    }
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *     url?: string,
 *     method?: string,
 *     contentType?: string|null,
 *     apikey?: string,
 *     body?: string|null,
 *     command?: string,
 *     port?:number
 *     }
 *   },
 * }} data
 */
function runCommand(data) {
    const command = data.payload.settings.command || '';
    const urlPrefix = getUrlPrefix(data);
    const defaultUrl = `${urlPrefix}/commands/${command}`;
    executeSimpleCommand(data, defaultUrl);
}

// 校对亮色/暗色模式
function toggleColorSchemeSync(context) {
    const hasIsDarkMode = Object.prototype.hasOwnProperty.call(globalSettings, 'isDarkMode');
    const currentIsDarkMode = hasIsDarkMode ? !!globalSettings.isDarkMode : false;
    const nextIsDarkMode = !currentIsDarkMode;

    setState(context, nextIsDarkMode ? 1 : 0);

    globalSettings = Object.assign({}, globalSettings, { isDarkMode: nextIsDarkMode });

    if ($SD && $SD.api && typeof $SD.api.setGlobalSettings === 'function') {
        $SD.api.setGlobalSettings($SD.uuid, globalSettings);
    }
}

//切换亮色/暗色模式
function toggleColorSchemeKeyDown(data) {
    const { context } = data;

    toggleColorSchemeSync(context);

    const command = 'theme:toggle-light-dark';
    const urlPrefix = getUrlPrefix(data);
    const defaultUrl = `${urlPrefix}/commands/${command}`;

    executeSimpleCommand(data, defaultUrl);
}

/**
 * Helper to resolve vault name from settings (supports new Vault ID and legacy direct value)
 */
function resolveVaultName(data) {
    const pageSettings = data.payload.settings || {};
    if (pageSettings.vault_id && globalSettings.vaults && globalSettings.vaults[pageSettings.vault_id]) {
        const v = globalSettings.vaults[pageSettings.vault_id].vault;
        return typeof v === 'string' ? v : '';
    }
    if (pageSettings.vault && typeof pageSettings.vault === 'string') {
        return pageSettings.vault;
    }
    if (pageSettings.vault && typeof pageSettings.vault === 'object') {
        const v = pageSettings.vault.vault;
        return typeof v === 'string' ? v : '';
    }
    return '';
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string,
 *     }
 *   },
 * }} data
 */
function openVault(data) {
    const vault = resolveVaultName(data);

    if (!vault) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    let defaultUrl = `obsidian://open?vault=${encodedVault}`;

    openUrlAndShowOk(data,defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *     vault?: string,
 *     note_path?: string,
 *     auto_mode?: boolean
 *     }
 *   },
 * }} data
 */
function openNote(data) {
    const vault = resolveVaultName(data);
    const notePath = data.payload.settings.note_path || '';
    const autoMode = data.payload.settings.auto_mode;

    if (!notePath || !vault) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    const encodedNotePath = encodeURIComponent(notePath.trim());

    let defaultUrl = `obsidian://open?vault=${encodedVault}&file=${encodedNotePath}`

    if (autoMode === false) {
        // 使用默认的 obsidian://open 协议
    } else if (autoMode === true) {
        // 区分路径和文件名
        // 如果包含路径分隔符，认为是路径；否则认为是文件名
        if (notePath.includes('/') || notePath.includes('\\')) {
            // 使用 filepath 参数
            defaultUrl = `obsidian://adv-uri?vault=${encodedVault}&filepath=${encodedNotePath}&openmode=true`;
        } else {
            // 使用 filename 参数
            defaultUrl = `obsidian://adv-uri?vault=${encodedVault}&filename=${encodedNotePath}&openmode=true`;
        }
    }

    openUrlAndShowOk(data, defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string,
 *       auto_mode?: boolean
 *     }
 *   },
 * }} data
 */
function dailyNote(data) {
    const vault = resolveVaultName(data) || '';
    const autoMode = data.payload.settings.auto_mode;

    if (!vault) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    let defaultUrl = `obsidian://daily?vault=${encodedVault}`;
    
    // 直接使用布尔值检查
    if (autoMode === false) {
        // 使用默认的 obsidian://daily 协议
    } else if (autoMode === true) {
        defaultUrl = `obsidian://adv-uri?vault=${encodedVault}&daily=true&openmode=true`;
    }

    openUrlAndShowOk(data, defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *     payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       apikey?: string|null,
 *       body?: string|null,
 *       note_type?: string|null,
 *       port?:number
 *       }
 *   },
 * }} data
 */
function noteNavigatorToCurrent(data) {
    const noteType = data.payload.settings.note_type || NoteType.DAILY;
    const urlPrefix = getUrlPrefix(data);
    let url = '';

    switch (noteType) {
        case NoteType.WEEKLY:
            url = `${urlPrefix}/commands/periodic-notes:open-weekly-note`;
            break;
        case NoteType.DAILY:
        default:
            url = `${urlPrefix}/commands/daily-notes/`;
            break;
    }

    executeSimpleCommand(data, url);
}

function webViewer(data) {
    const urlPrefix = getUrlPrefix(data);
    executeSimpleCommand(data, `${urlPrefix}/commands/webviewer:open/`);
}

function webSearcher(data) {
    const urlPrefix = getUrlPrefix(data);
    executeSimpleCommand(data, `${urlPrefix}/commands/webviewer:search/`);
}

function switchTab(data) {
    const urlPrefix = getUrlPrefix(data);
    dialRotate(
        data,
        `${urlPrefix}/commands/workspace:next-tab`,
        `${urlPrefix}/commands/workspace:previous-tab`
    );
}

function zoomInOut(data) {
    const urlPrefix = getUrlPrefix(data);
    dialRotate(
        data,
        `${urlPrefix}/commands/window:zoom-in`,
        `${urlPrefix}/commands/window:zoom-out`
    );
}

function zoomReset(data) {
    const urlPrefix = getUrlPrefix(data);
    executeSimpleCommand(data, `${urlPrefix}/commands/window:reset-zoom`);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       note_type?: string|null,
 *     }
 *   },
 * }} data
 */
function updateNoteNavigatorTitle(data) {
    const {context, payload} = data;
    const settings = payload.settings;
    const noteType = settings.note_type || NoteType.DAILY;
    let title = 'Daily';
    if (noteType === NoteType.WEEKLY) {
        title = 'Weekly';
    }
    setTitle(context, title);
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
 *       ticks?: string|null,
 *       note_type?: string|null,
 *       port?:number
 *     }
 *   },
 * }} data
 */
function noteNavigator(data) {
    const noteType = data.payload.settings.note_type || NoteType.DAILY;
    const urlPrefix = getUrlPrefix(data);

    let nextCommand;
    let prevCommand;

    switch (noteType) {
        case NoteType.WEEKLY:
            nextCommand = 'periodic-notes:next-weekly-note';
            prevCommand = 'periodic-notes:prev-weekly-note';
            break;
        case NoteType.DAILY:
        default:
            nextCommand = 'periodic-notes:next-daily-note';
            prevCommand = 'periodic-notes:prev-daily-note';
            break;
    }

    dialRotate(
        data,
        `${urlPrefix}/commands/${nextCommand}`,
        `${urlPrefix}/commands/${prevCommand}`
    );
}

function webZoomInOut(data) {
    const urlPrefix = getUrlPrefix(data);
    dialRotate(
        data,
        `${urlPrefix}/commands/webviewer:zoom-in`,
        `${urlPrefix}/commands/webviewer:zoom-out`
    );
}

function webZoomReset(data) {
    const urlPrefix = getUrlPrefix(data);
    executeSimpleCommand(data, `${urlPrefix}/commands/webviewer:zoom-reset`);
}

function openUrlAndShowOk(data, url) {
    // 这里会对所有 URI 类操作进行统一的非空判断
    // v3.x: vault name 可能来自 globalSettings.vaults[vault_id]，不一定存在于 pageSettings.vault
    const vault = resolveVaultName(data);
    if (!vault) {
        const vaultId = (data.payload.settings && data.payload.settings.vault_id) ? data.payload.settings.vault_id : '';
        console.warn('[URI] missing vault:', { action: data.action, vault_id: vaultId, hasVaults: !!(globalSettings && globalSettings.vaults) });
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
 *       vault?: string,
 *       type?: string|null,
 *       query?: string|null,
 *       property_key?: string|null,
 *       property_value?: string|null,
 *       status?: string|null
 *     }
 *   },
 * }} data
 */
function noteFinder(data) {
    const vault = resolveVaultName(data) || '';
    const type = data.payload.settings.type || SearchType.ALL;
    let query = data.payload.settings.query || '';
    const property_key = data.payload.settings.property_key || '';
    const property_value = data.payload.settings.property_value || '';
    const status = data.payload.settings.status || SearchType.ANY;

    if (!vault){
        showAlert(data.context);
        return;
    }

    let switchType = type;
    if (type === SearchType.TASK) {
        switchType = status;
    }

    let defaultUrl = `obsidian://search?vault=${vault}&query=`;
    let prefix = getPrefixByType(switchType);

    if (switchType === SearchType.PROPERTY) {
        if (!property_key || !property_value){
            showAlert(data.context);
            return;
        }
        query = `[${property_key.trim()}:${property_value.trim()}]`;
    } else {
        if (!query){
            showAlert(data.context);
            return;
        }

        // path 场景需要使用 exactly match
        if (switchType === SearchType.PATH) {
            query = `path:"${query.trim()}"`;
        }
    }

    // 在组合 URL 阶段进行编码，保证去除前后空格
    const encodedQuery = encodeURIComponent(query.trim());
    defaultUrl += `${prefix}${encodedQuery}`;

    openUrlAndShowOk(data,defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string|null,
 *       workspace?: string
 *     }
 *   },
 * }} data
 */
function loadWorkspace(data) {
    const vault = resolveVaultName(data) || '';
    const workspace = data.payload.settings.workspace || '';
    const vaultId = (data.payload.settings && data.payload.settings.vault_id) ? data.payload.settings.vault_id : '';
    console.log('[LoadWorkspace] settings:', { vault_id: vaultId, vault: vault ? '[set]' : '[empty]', workspace: workspace ? '[set]' : '[empty]' });

    if (!vault || !workspace) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    const encodedWorkspace = encodeURIComponent(workspace.trim());

    let defaultUrl = `obsidian://adv-uri?vault=${encodedVault}&workspace=${encodedWorkspace}`;
    openUrlAndShowOk(data,defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string,
 *       plugin_id?: string
 *     }
 *   },
 * }} data
 */
function settingsNavigator(data) {
    const vault = resolveVaultName(data) || '';
    const plugin_id = data.payload.settings.plugin_id || '';

    if (!vault || !plugin_id) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    const encodedPluginId = encodeURIComponent(plugin_id.trim());

    let defaultUrl = `obsidian://adv-uri?vault=${encodedVault}&settingid=${encodedPluginId}`;

    openUrlAndShowOk(data,defaultUrl);
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
    
    // Resolve vault settings
    let vaultSettings = {};
    if (pageSettings.vault_id && globalSettings.vaults && globalSettings.vaults[pageSettings.vault_id]) {
        vaultSettings = globalSettings.vaults[pageSettings.vault_id];
    } else if (pageSettings.vault && typeof pageSettings.vault === 'object') {
        vaultSettings = pageSettings.vault;
    } else if (pageSettings.vault && typeof pageSettings.vault === 'string') {
        // 回退：如果 pageSettings.vault 是字符串，构造一个最小对象
        vaultSettings = { vault: pageSettings.vault };
    }

    // 设置优先级处理：Vault设置 > 页面设置 > 全局设置 (legacy)
    const port = vaultSettings.port || pageSettings.port || globalSettings.port;
    
    // HTTPS 状态判断
    let https;
    if (vaultSettings.https !== undefined) {
        https = Boolean(vaultSettings.https);
    } else if (pageSettings.hasOwnProperty('https')) {
        https = Boolean(pageSettings.https);
    } else if (globalSettings.hasOwnProperty('https')) {
        https = Boolean(globalSettings.https);
    } else {
        https = false;
    }
    
    const apikey = vaultSettings.apikey || pageSettings.apikey || globalSettings.apikey;
    
    const protocol = https ? 'https' : 'http';
    const defaultPort = https ? '27124' : '27123';
    const actualPort = port || defaultPort;
    
    console.log(`[App] URL prefix generated: ${protocol}://localhost:${actualPort}, HTTPS: ${https}, Port: ${actualPort}, API Key: ${apikey ? '[set]' : '[not set]'}`);
    
    return `${protocol}://localhost:${actualPort}`;
}

/**
 * 获取API Key，支持设置优先级：Vault设置 > 页面设置 > 全局设置
 * @param {object} data - 请求数据
 * @returns {string} API Key
 */
function getApiKey(data) {
    const pageSettings = data.payload.settings || {};
    
    // Resolve vault settings
    if (pageSettings.vault_id && globalSettings.vaults && globalSettings.vaults[pageSettings.vault_id]) {
        return globalSettings.vaults[pageSettings.vault_id].apikey || '';
    }

    return pageSettings.apikey || globalSettings.apikey || '';
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
 */
function setTitle(context, title) {
    $SD.api.setTitle(context, title);
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
