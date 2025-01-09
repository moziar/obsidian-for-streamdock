$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    $SD.on('com.moz.obsidian-for-streamdock.daily-note.keyDown', (jsonObj) => dailyNote(jsonObj));
    $SD.on('com.moz.obsidian-for-streamdock.open-note.keyDown', (jsonObj) => openNote(jsonObj));
};

/**
 * @param {{
*   context: string,
*   payload: {
*     settings: {
*       url?: string,
*       method?: string,
*       contentType?: string|null,
*       headers?: string|null,
*       body?: string|null,
*     }
*   },
* }} data
*/
function openNote(data) {
   const notepath = data.payload.settings.notepath || '';
   const encodedNotepath = encodeURIComponent(notepath);
   const defaultSettings = {
       url: `http://127.0.0.1:27123/open/${encodedNotepath}?newLeaf=true`,
       method: 'POST',
       contentType: 'application/json',
       headers: `Authorization: Bearer ${data.payload.settings.apikey || ''}`,
       body: '',
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
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       headers?: string|null,
 *       body?: string|null,
 *     }
 *   },
 * }} data
 */
function dailyNote(data) {
    const defaultSettings = {
        url: 'http://127.0.0.1:27123/commands/daily-notes/',
        method: 'POST',
        contentType: 'application/json',
        headers: `Authorization: Bearer ${data.payload.settings.apikey || ''}`,
        body: '',
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
 * @param {{
 *   context: string,
 *   payload: {
 *     settings: {
 *       url?: string,
 *       method?: string,
 *       contentType?: string|null,
 *       headers?: string|null,
 *       body?: string|null,
 *     }
 *   },
 * }} data
 */
function sendHttp(data) {
    const { url, method, contentType, headers, body } = data.payload.settings;
    log('sendHttp', { url, method, contentType, headers, body });

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

    log(fullHeaders);

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