$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    $SD.on('com.moz.obsidian-for-streamdock.run-command.keyDown', (jsonObj) => runCommand(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.open-note.keyDown', (jsonObj) => openNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.daily-note.keyDown', (jsonObj) => dailyNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-viewer.keyDown', (jsonObj) => webViewer(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-searcher.keyDown', (jsonObj) => webSearcher(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-finder.keyDown', (jsonObj) => noteFinder(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.load-workspace.keyDown', (jsonObj) => loadWorkspace(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.settings-navigator.keyDown', (jsonObj) => settingsNavigator(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.switch-tab.dialRotate', (jsonObj) => switchTab(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.zoom.dialRotate', (jsonObj) => zoomInOut(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.zoom.dialDown', (jsonObj) => zoomReset(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-zoom.dialRotate', (jsonObj) => webZoomInOut(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-zoom.dialDown', (jsonObj) => webZoomReset(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.dialRotate', (jsonObj) => noteNavigator(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.dialDown', (jsonObj) => dailyNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.willAppear', (jsonObj) => updateNoteNavigatorTitle(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.didReceiveSettings', (jsonObj) => updateNoteNavigatorTitle(jsonObj));
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
 *       notepath?: string,
 *     }
 *   },
 * }} data
 */
function openNote(data) {
    const vault = encodeURIComponent(data.payload.settings.vault.trim()) || '';
    const notePath = encodeURIComponent(data.payload.settings.notepath.trim()) || '';

    if (!vault || !notePath) {
        showAlert(data.context);
    } else {
        let defaultUrl = `obsidian://open?vault=${vault}&file=${notePath}`;

        openUrl(data.context, defaultUrl);
        showOk(data.context);
    }
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
function dailyNote(data) {
    const vault = encodeURIComponent(data.payload.settings.vault.trim()) || '';

    if (!vault) {
        showAlert(data.context);
    } else {
        let defaultUrl = `obsidian://daily?vault=${vault}`;

        openUrl(data.context, defaultUrl);
        showOk(data.context);
    }
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
 *       noteType?: string|null,
 *     }
 *   },
 * }} data
 */
function updateNoteNavigatorTitle(data) {
    const {context, payload} = data;
    const settings = payload.settings;
    const noteType = settings.noteType || NoteType.DAILY;
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
*        noteType?: string|null,
 *     }
 *   },
 * }} data
 */
function noteNavigator(data) {
    const noteType = data.payload.settings.noteType || NoteType.DAILY;

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
    const vault = encodeURIComponent(data.payload.settings.vault.trim()) || '';
    const type = data.payload.settings.type || SearchType.ALL;
    let query = data.payload.settings.query || '';
    const property_key = data.payload.settings.property_key || '';
    const property_value = data.payload.settings.property_value || '';
    const status = data.payload.settings.status || SearchType.ANY;

    let switchType = type;
    if (type === SearchType.TASK) {
        switchType = status;
    }

    let defaultUrl = `obsidian://search?vault=${vault}&query=`;
    let prefix = getPrefixByType(switchType);

    if (switchType === SearchType.PROPERTY) {
        query = `[${property_key.trim()}:${property_value.trim()}]`;
    } else if (switchType === SearchType.PATH) {
        query = `path:"${query.trim()}"`;
    }

    // 在组合 URL 阶段进行编码，保证去除前后空格
    defaultUrl += `${prefix}${encodeURIComponent(query.trim())}`;

    openUrl(data.context, defaultUrl);
    showOk(data.context);
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
    const vault = encodeURIComponent(data.payload.settings.vault.trim()) || '';
    const workspace = encodeURIComponent(data.payload.settings.workspace.trim()) || '';

    let defaultUrl = `obsidian://adv-uri?vault=${vault}&workspace=${workspace}`;

    openUrl(data.context, defaultUrl);
    showOk(data.context);
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
    const vault = encodeURIComponent(data.payload.settings.vault.trim()) || '';
    const plugin_id = encodeURIComponent(data.payload.settings.plugin_id.trim()) || '';

    let defaultUrl = `obsidian://adv-uri?vault=${vault}&settingid=${plugin_id}`;

    openUrl(data.context, defaultUrl);
    showOk(data.context);
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
