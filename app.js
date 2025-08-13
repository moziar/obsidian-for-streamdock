$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    const events = [
        { event: 'com.moz.obsidian-for-streamdock.run-command.keyDown', handler: runCommand },
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
 *     }
 *   },
 * }} data
 */
function runCommand(data) {
    const command = data.payload.settings.command || '';
    const defaultUrl = `http://127.0.0.1:27123/commands/${command}`;
    executeSimpleCommand(data, defaultUrl);
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
    let defaultUrl = getVaultUrl(data);
    openUrlAndShowOk(data,defaultUrl);
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string,
 *       note_path?: string,
 *     }
 *   },
 * }} data
 */
function openNote(data) {
    const notePath = data.payload.settings.note_path || '';

    if (!notePath) {
        showAlert(data.context);
        return;
    }

    const encodedNotePath = encodeURIComponent(notePath.trim());

    let defaultUrl = getVaultUrl(data);
    defaultUrl += `&file=${encodedNotePath}`;

    openUrlAndShowOk(data, defaultUrl);
}

function getVaultUrl(data) {
    const vault = data.payload.settings.vault;
    if ( !vault ){
        showAlert(data.context);
    } else {
        return `obsidian://open?vault=${encodeURIComponent(vault.trim())}`;
    }
}

/**
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       vault?: string,
 *       auto_mode?: string
 *     }
 *   },
 * }} data
 */
function dailyNote(data) {
    const vault = data.payload.settings.vault || '';

    if (!vault) {
        showAlert(data.context);
        return;
    }

    const encodedVault = encodeURIComponent(vault.trim());
    let defaultUrl = `obsidian://daily?vault=${encodedVault}`;
    const autoMode = data.payload.settings.auto_mode;
    
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
 *       note_type?: string|null
 *       }
 *   },
 * }} data
 */
function noteNavigatorToCurrent(data) {
    const noteType = data.payload.settings.note_type || NoteType.DAILY;
    let url = '';

    switch (noteType) {
        case NoteType.WEEKLY:
            url = 'http://127.0.0.1:27123/commands/periodic-notes:open-weekly-note';
            break;
        case NoteType.DAILY:
        default:
            url = 'http://127.0.0.1:27123/commands/daily-notes/';
            break;
    }

    executeSimpleCommand(data, url);
}

function webViewer(data) {
    executeSimpleCommand(data, 'http://127.0.0.1:27123/commands/webviewer:open/');
}

function webSearcher(data) {
    executeSimpleCommand(data, 'http://127.0.0.1:27123/commands/webviewer:search/');
}

function switchTab(data) {
    dialRotate(
        data,
        'http://127.0.0.1:27123/commands/workspace:next-tab',
        'http://127.0.0.1:27123/commands/workspace:previous-tab'
    );
}

function zoomInOut(data) {
    dialRotate(
        data,
        'http://127.0.0.1:27123/commands/window:zoom-in',
        'http://127.0.0.1:27123/commands/window:zoom-out'
    );
}

function zoomReset(data) {
    executeSimpleCommand(data, 'http://127.0.0.1:27123/commands/window:reset-zoom');
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

const NoteType = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
};

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
 *     }
 *   },
 * }} data
 */
function noteNavigator(data) {
    const noteType = data.payload.settings.note_type || NoteType.DAILY;

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
        `http://127.0.0.1:27123/commands/${nextCommand}`,
        `http://127.0.0.1:27123/commands/${prevCommand}`
    );
}

function webZoomInOut(data) {
    dialRotate(
        data,
        'http://127.0.0.1:27123/commands/webviewer:zoom-in',
        'http://127.0.0.1:27123/commands/webviewer:zoom-out'
    );
}

function webZoomReset(data) {
    executeSimpleCommand(data, 'http://127.0.0.1:27123/commands/webviewer:zoom-reset');
}

function openUrlAndShowOk(data, url) {
    // 这里会对所有 URI 类操作进行统一的非空判断
    if (!data.payload.settings.vault) {
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
    const vault = data.payload.settings.vault || '';
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
 *       vault?: string,
 *       workspace?: string
 *     }
 *   },
 * }} data
 */
function loadWorkspace(data) {
    const vault = data.payload.settings.vault || '';
    const workspace = data.payload.settings.workspace || '';

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
    const vault = data.payload.settings.vault || '';
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
    const headers = `Authorization: Bearer ${data.payload.settings.apikey || ''}`;
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
