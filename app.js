$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    $SD.on('com.moz.obsidian-for-streamdock.run-command.keyDown', (jsonObj) => runCommand(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.open-note.keyDown', (jsonObj) => openNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.daily-note.keyDown', (jsonObj) => dailyNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-viewer.keyDown', (jsonObj) => webViewer(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-searcher.keyDown', (jsonObj) => webSearcher(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-finder.keyDown', (jsonObj) => noteFinder(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.switch-tab.dialRotate', (jsonObj) => switchTab(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.zoom.dialRotate', (jsonObj) => zoomInOut(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.zoom.dialDown', (jsonObj) => zoomReset(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-zoom.dialRotate', (jsonObj) => webZoomInOut(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.web-zoom.dialDown', (jsonObj) => webZoomReset(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.dialRotate', (jsonObj) => noteNavigator(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.dialDown', (jsonObj) => dailyNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.willAppear', (jsonObj) => updateNavigatorTitle(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.note-navigator.didReceiveSettings', (jsonObj) => updateNavigatorTitle(jsonObj));
};

function runCommand(data) {
    const command = data.payload.settings.command || '';
    const defaultUrl = `http://127.0.0.1:27123/commands/${command}`;
    executeSimpleCommand(data, defaultUrl);
}

function openNote(data) {
    const notePath = data.payload.settings.notepath || '';
    const encodedNotepath = encodeURIComponent(notePath);
    const defaultUrl = `http://127.0.0.1:27123/open/${encodedNotepath}?newLeaf=true`;
    executeSimpleCommand(data, defaultUrl);
}

function dailyNote(data) {
    const noteType = data.payload.settings.noteType || NoteType.DAILY;
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

function updateNavigatorTitle(data) {
    const { context, payload } = data;
    const settings = payload.settings;
    const noteType = settings.noteType || NoteType.DAILY;
    let title = 'Daily';
    if (noteType === NoteType.WEEKLY) {
        title = 'Weekly';
    }
    $SD.api.setTitle(context, title);
}

const NoteType = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
};

function noteNavigator(data) {
    const noteType = data.payload.settings.noteType || NoteType.DAILY;

    let nextCommand = '';
    let prevCommand = '';

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
            settings: { ...defaultSettings, ...data.payload.settings },
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
 * @param {string} negativeCommand - 负向命令URL（左转），可选
 */
function dialRotate(data, positiveCommand, negativeCommand = null) {
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
            settings: { ...defaultSettings, ...data.payload.settings },
        },
    };

    sendHttp(newData);
}

const SearchType = {
    ALL: 'All',
    TAG: 'Tag',
    TASK: 'Task',
    TASK_TODO: 'TaskTodo',
    TASK_DONE: 'TaskDone',
    PROPERTY: 'Property'
}

// 测试用，这里后面需要做处理
function noteFinder(data) {
    const vault = encodeURIComponent(data.payload.settings.vault) || '';
    const type = data.payload.settings.type || SearchType.ALL;
    let query = encodeURIComponent(data.payload.settings.query) || '';
    const property_key = data.payload.settings.property_key || '';
    const property_value = data.payload.settings.property_value || '';

    let prefix = '';

    if ( !vault ) {
        showAlert(data.context);
    } else {
        let defaultUrl = `obsidian://search?vault=${vault}&query=`;    

        switch (type) {     
            case SearchType.ALL:
            default:
                prefix = '';
                break;
            case SearchType.TAG:
                prefix = 'tag:';
                break;
            case SearchType.TASK:
                prefix = 'task:';
                break;
            case SearchType.TASK_TODO:
                prefix = 'task-todo:';
                break;
            case SearchType.TASK_DONE:
                prefix = 'task-done:';
                break;
            case SearchType.PROPERTY:
                query = encodeURIComponent(`[${property_key}:${property_value}]`);
                break;
        }
        
        defaultUrl += `${prefix}${query}`;

        $SD.api.openUrl(data.context, defaultUrl);
        showOk(data.context);
    }
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
        'Content-Type':  contentType
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
