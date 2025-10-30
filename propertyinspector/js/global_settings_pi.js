(function() {
    'use strict';
    
    let globalSettings = {};
    let isFirstTimeOpen = true;
    let hasInteracted = false;
    let isUserModifying = false; // 跟踪是否为用户主动修改
    let needsHttpsInheritance = false; // 记录是否需要继承HTTPS设置
    let needsPortInheritance = false; // 记录是否需要继承Port设置
    let firstTimeKey = null; // 将在connected事件中初始化
    const SAVE_DEBOUNCE_DELAY = 300;
    
    // 获取Action标识
    const actionKey = getActionKey();
    
    // 等待DOM和index_pi.js加载完成
    document.addEventListener('DOMContentLoaded', function() {
        // 确保在index_pi.js之后初始化
        setTimeout(() => {
            initializeSmartEnhancements();
        }, 100);
    });
    
    /**
     * 获取Action标识（复用原有逻辑）
     */
    function getActionKey() {
        const title = document.title || '';
        const match = title.match(/com\.moz\.obsidian-for-streamdock\.([^.]+)/); 
        return match ? match[1] : 'unknown';
    }
    
    /**
     * 初始化智能增强功能（基于index_pi.js基础设施）
     */
    function initializeSmartEnhancements() {
        const vaultElement = document.getElementById('vault');
        const apiKeyElement = document.getElementById('apikey');
        const portElement = document.getElementById('port');
        const httpsElement = document.getElementById('https');
        
        // 检查当前页面需要处理的元素类型
        let elementTypes = [];
        if (vaultElement) elementTypes.push('vault');
        if (apiKeyElement) elementTypes.push('apikey');
        if (portElement && httpsElement) elementTypes.push('port_https');
        
        if (elementTypes.length === 0) {
            console.log('[SmartSettings] No supported elements found, skip');
            return;
        }

        console.log(`[SmartSettings] Starting SmartSettings enhancements for: ${elementTypes.join(', ')}`);

        // 检查首次打开状态
        checkFirstTimeStatus();

        // 增强全局设置处理
        enhanceGlobalSettings(elementTypes);

        // 增强页面离开处理
        enhancePageLifecycle();

        // 增强元素输入处理
        elementTypes.forEach(type => {
            if (type === 'vault') {
                enhanceInput(vaultElement, 'vault');
            } else if (type === 'apikey') {
                enhanceInput(apiKeyElement, 'apikey');
            } else if (type === 'port_https') {
                enhancePortHttpsInput(portElement, httpsElement);
            }
        });

        // 请求全局设置
        $SD.api.getGlobalSettings($SD.uuid);

        console.log('[SmartSettings] SmartSettings enhancements completed.');
    }

    /**
     * 检查首次打开状态
     */
    function checkFirstTimeStatus() {
        // 如果还没有firstTimeKey，尝试从$SD.actionInfo中获取
        if (!firstTimeKey && $SD.actionInfo && $SD.actionInfo.context) {
            firstTimeKey = `firstTime_${actionKey}_${$SD.actionInfo.context}`;
            console.log('[SmartSettings] Generated firstTimeKey from actionInfo:', firstTimeKey);
        }
        
        if (!firstTimeKey) {
            console.log('[SmartSettings] firstTimeKey not yet available, defaulting to first time open');
            isFirstTimeOpen = true;
            return;
        }
        
        const hasOpened = localStorage.getItem(firstTimeKey);
        isFirstTimeOpen = !hasOpened;
        console.log(`[SmartSettings] First time open: ${isFirstTimeOpen ? 'Yes' : 'No'} (key: ${firstTimeKey})`);
    }

    /**
     * 标记为已打开
     */
    function markAsOpened() {
        if (isFirstTimeOpen && firstTimeKey) {
            localStorage.setItem(firstTimeKey, 'true');
            isFirstTimeOpen = false;
            console.log('[SmartSettings] Mark as opened with key:', firstTimeKey);
        }
    }
    
    /**
     * 增强全局设置处理（基于index_pi.js机制）
     */
    function enhanceGlobalSettings(elementTypes) {
        // 监听全局设置接收
        $SD.on('didReceiveGlobalSettings', function(jsonObj) {
            globalSettings = jsonObj.payload.settings || {};

            // 无论是否首次打开，都需要处理全局设置
            handleGlobalSettingsReceived(elementTypes);
        });

        // 监听connected事件获取当前页面设置
        $SD.on('connected', function(jsonObj) {
            console.log('[SmartSettings] Received connected event.');
            
            // 获取按钮的唯一标识符（context）
            const context = Utils.getProp(jsonObj, 'actionInfo.context', null) || ($SD.actionInfo && $SD.actionInfo.context);
            console.log('[SmartSettings] Context from connected event:', context);
            
            if (context && !firstTimeKey) {
                firstTimeKey = `firstTime_${actionKey}_${context}`;
                console.log('[SmartSettings] Generated unique firstTimeKey:', firstTimeKey);
                
                // 重新检查首次打开状态
                checkFirstTimeStatus();
                console.log('[SmartSettings] After recheck - Is first time open:', isFirstTimeOpen);
            }

            // 获取当前页面设置（这是关键信息）
            const currentPageSettings = Utils.getProp(jsonObj, 'actionInfo.payload.settings', {});
            console.log('[SmartSettings] Current page settings:', currentPageSettings);
            console.log('[SmartSettings] Is first time open:', isFirstTimeOpen);
            console.log('[SmartSettings] Current inheritance flags - HTTPS:', needsHttpsInheritance, 'Port:', needsPortInheritance);

            // 保存当前的用户修改状态
            const wasUserModifying = isUserModifying;
            isUserModifying = false; // 恢复页面设置不视为用户修改

            elementTypes.forEach(type => {
                if (type === 'vault') {
                    const element = document.getElementById('vault');
                    if (element && currentPageSettings.vault) {
                        element.value = currentPageSettings.vault;
                        console.log('[SmartSettings] Restore vault from page settings.');
                    }
                    updateSmartPlaceholder(element, 'vault');
                } else if (type === 'apikey') {
                    const element = document.getElementById('apikey');
                    if (element && currentPageSettings.apikey) {
                        element.value = currentPageSettings.apikey;
                        console.log('[SmartSettings] Restore apikey from page settings.');
                    }
                    updateSmartPlaceholder(element, 'apikey');
                } else if (type === 'port_https') {
                    const portElement = document.getElementById('port');
                    const httpsElement = document.getElementById('https');
                    
                    console.log('[SmartSettings] Processing port_https in connected event');
                    console.log('[SmartSettings] Port element:', portElement ? 'found' : 'not found');
                    console.log('[SmartSettings] HTTPS element:', httpsElement ? 'found' : 'not found');
                    
                    // 检查是否有页面设置
                    const hasPortSetting = currentPageSettings.hasOwnProperty('port');
                    const hasHttpsSetting = currentPageSettings.hasOwnProperty('https');
                    
                    console.log('[SmartSettings] Has port setting:', hasPortSetting, 'value:', currentPageSettings.port);
                    console.log('[SmartSettings] Has https setting:', hasHttpsSetting, 'value:', currentPageSettings.https);
                    console.log('[SmartSettings] Before setting inheritance flags - isFirstTimeOpen:', isFirstTimeOpen);
                    
                    // 重置继承标记（防止之前的状态影响）
                    needsPortInheritance = false;
                    needsHttpsInheritance = false;
                    
                    if (hasPortSetting) {
                        portElement.value = currentPageSettings.port;
                        console.log('[SmartSettings] Restore port from page settings.');
                    } else if (isFirstTimeOpen) {
                        // 新建按钮且没有port设置，标记需要继承
                        needsPortInheritance = true;
                        console.log('[SmartSettings] SET: New button needs port inheritance');
                    }
                    
                    if (hasHttpsSetting) {
                        httpsElement.checked = Boolean(currentPageSettings.https);
                        console.log('[SmartSettings] Restore https from page settings.');
                    } else if (isFirstTimeOpen) {
                        // 新建按钮且没有https设置，标记需要继承
                        needsHttpsInheritance = true;
                        console.log('[SmartSettings] SET: New button needs https inheritance - will set to global value when received');
                    }
                    
                    console.log('[SmartSettings] After setting inheritance flags - HTTPS:', needsHttpsInheritance, 'Port:', needsPortInheritance);
                    
                    updatePortPlaceholder();
                }
            });

            // 恢复原来的用户修改状态
            isUserModifying = wasUserModifying;
        });

        // 增强页面设置处理
        $SD.on('didReceiveSettings', function(jsonObj) {
            const pageSettings = jsonObj.payload.settings || {};

            elementTypes.forEach(type => {
                if (type === 'vault') {
                    const element = document.getElementById('vault');
                    if (element && pageSettings.vault && !element.value) {
                        element.value = pageSettings.vault;
                        console.log('[SmartSettings] Update vault from page settings.');
                    }
                    updateSmartPlaceholder(element, 'vault');
                } else if (type === 'apikey') {
                    const element = document.getElementById('apikey');
                    if (element && pageSettings.apikey && !element.value) {
                        element.value = pageSettings.apikey;
                        console.log('[SmartSettings] Update apikey from page settings.');
                    }
                    updateSmartPlaceholder(element, 'apikey');
                } else if (type === 'port_https') {
                    const portElement = document.getElementById('port');
                    const httpsElement = document.getElementById('https');
                    
                    // 保存当前的用户修改状态
                    const wasUserModifying = isUserModifying;
                    isUserModifying = false;
                    
                    if (portElement && pageSettings.port && !portElement.value) {
                        portElement.value = pageSettings.port;
                        console.log('[SmartSettings] Update port from page settings.');
                    }
                    
                    if (httpsElement && pageSettings.hasOwnProperty('https')) {
                        httpsElement.checked = Boolean(pageSettings.https);
                        console.log('[SmartSettings] Update https from page settings.');
                    }
                    
                    // 恢复原来的用户修改状态
                    isUserModifying = wasUserModifying;
                    
                    updatePortPlaceholder();
                }
            });
        });
    }

    /**
     * 增强页面生命周期处理
     */
    function enhancePageLifecycle() {
        // 页面关闭时标记为非首次
        window.addEventListener('beforeunload', function() {
            if (hasInteracted) {
                markAsOpened();
                console.log('[SmartSettings] Page closed, mark as non-first time.');
            }
        });

        // 页面失焦时检查
        window.addEventListener('blur', function() {
            if (hasInteracted) {
                markAsOpened();
                console.log('[SmartSettings] Page blurred, mark as non-first time.');
            }
        });
    }

    /**
     * 增强Port和HTTPS输入处理
     */
    function enhancePortHttpsInput(portElement, httpsElement) {
        console.log('[SmartSettings] Enhancing port and https input handling');
        
        // 监听用户交互 - Port
        ['focus', 'input', 'change'].forEach(eventType => {
            portElement.addEventListener(eventType, function() {
                if (eventType === 'focus') {
                    // focus事件标记用户开始交互，但不标记为修改
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log('[SmartSettings] User started interacting with port.');
                    }
                } else {
                    // input和change事件标记为用户修改
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log('[SmartSettings] User interacted with port.');
                    }
                    isUserModifying = true;
                    console.log('[SmartSettings] User is modifying port, enabling sync');
                }
                updatePortPlaceholder();
            });
        });
        
        // 监听用户交互 - HTTPS
        ['focus', 'input'].forEach(eventType => {
            httpsElement.addEventListener(eventType, function() {
                if (eventType === 'focus') {
                    // focus事件标记用户开始交互，但不标记为修改
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log('[SmartSettings] User started interacting with https.');
                    }
                } else {
                    // input事件标记为用户修改
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log('[SmartSettings] User interacted with https.');
                    }
                    isUserModifying = true;
                    console.log('[SmartSettings] User is modifying https, enabling sync');
                }
            });
        });
        
        // HTTPS的change事件单独处理，包含智能端口切换逻辑
        httpsElement.addEventListener('change', function() {
            if (!hasInteracted) {
                hasInteracted = true;
                console.log('[SmartSettings] User interacted with https (change).');
            }
            
            // 标记为用户修改
            isUserModifying = true;
            console.log('[SmartSettings] User is modifying https, enabling sync');
            
            // 处理智能端口切换
            handleHttpsToggleWithPortUpdate();
            
            // 直接同步到全局设置
            if (isUserModifying) {
                const portValue = portElement.value;
                const httpsValue = httpsElement.checked;
                syncPortHttpsToGlobalSettings(portValue, httpsValue);
                
                // 同时保存到页面设置
                if (window.saveSettings) {
                    window.saveSettings({ key: 'https', value: httpsValue });
                    console.log('[SmartSettings] Saved https change to page settings');
                }
                
                console.log('[SmartSettings] Direct sync triggered for HTTPS change');
            }
        });
        
        // port输入框失焦时检查保存默认值
        portElement.addEventListener('blur', function() {
            const currentPortValue = portElement.value?.trim() || '';
            if (!currentPortValue && hasInteracted) {
                const defaultPort = getDefaultPort();
                console.log('[SmartSettings] Port is empty on blur, setting default:', defaultPort);
                
                // 设置默认值到输入框
                portElement.value = defaultPort;
                
                // 触发input事件来保存设置
                const inputEvent = new Event('input', { bubbles: true });
                portElement.dispatchEvent(inputEvent);
            }
        });
        
        // 初始化placeholder
        updatePortPlaceholder();
        
        // 拦截index_pi.js的saveSettings函数
        setTimeout(() => {
            interceptPortHttpsSaveSettings();
        }, 100);
    }

    /**
     * 增强输入处理（复用index_pi.js机制）
     */
    function enhanceInput(element, elementType) {
        // 监听用户交互
        ['focus', 'input'].forEach(eventType => {
            element.addEventListener(eventType, function() {
                if (eventType === 'focus') {
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log(`[SmartSettings] User started interacting with ${elementType}.`);
                    }
                } else {
                    if (!hasInteracted) {
                        hasInteracted = true;
                        console.log(`[SmartSettings] User interacted with ${elementType}.`);
                    }
                    isUserModifying = true;
                }
            });
        });

        // 初始化placeholder
        updateSmartPlaceholder(element, elementType);
        
        // 拦截index_pi.js的saveSettings函数来增强功能
        setTimeout(() => {
            interceptSaveSettings(elementType);
        }, 100);
    }
    
    /**
     * 获取默认端口值
     */
    function getDefaultPort() {
        const httpsElement = document.getElementById('https');
        if (!httpsElement) return '27123';
        
        const httpsValue = httpsElement.checked;
        return httpsValue ? '27124' : '27123';
    }
    
    /**
     * 检查当前端口是否为默认值
     */
    function isDefaultPort(portValue, httpsValue) {
        const defaultHttpPort = '27123';
        const defaultHttpsPort = '27124';
        
        if (httpsValue) {
            return portValue === defaultHttpsPort;
        } else {
            return portValue === defaultHttpPort;
        }
    }
    
    /**
     * 处理HTTPS状态变化时的智能端口切换
     */
    function handleHttpsToggleWithPortUpdate() {
        const portElement = document.getElementById('port');
        const httpsElement = document.getElementById('https');
        
        if (!portElement || !httpsElement) return;
        
        const currentPortValue = portElement.value?.trim() || '';
        const newHttpsValue = httpsElement.checked;
        const oldHttpsValue = !newHttpsValue; // 切换前的状态
        
        console.log('[SmartSettings] HTTPS toggle detected. Port:', currentPortValue, 'HTTPS:', oldHttpsValue, '->', newHttpsValue);
        
        // 检查当前端口是否为切换前状态的默认值
        if (isDefaultPort(currentPortValue, oldHttpsValue)) {
            const newDefaultPort = getDefaultPort();
            console.log('[SmartSettings] Current port is default for previous HTTPS state, switching to new default:', newDefaultPort);
            
            // 更新端口值
            portElement.value = newDefaultPort;
            
            // 触发input事件以保存设置
            const inputEvent = new Event('input', { bubbles: true });
            portElement.dispatchEvent(inputEvent);
            
            // 标记为已交互
            hasInteracted = true;
        }
        
        // 总是更新placeholder
        updatePortPlaceholder();
    }
    
    /**
     * 更新port输入框的placeholder
     */
    function updatePortPlaceholder() {
        const portElement = document.getElementById('port');
        if (!portElement) return;

        portElement.placeholder = getDefaultPort();
    }
    
    /**
     * 同步Port和HTTPS到全局设置
     */
    function syncPortHttpsToGlobalSettings(portValue, httpsValue) {
        // 防抖延迟同步到全局设置
        setTimeout(() => {
            const needsUpdate = globalSettings.port !== portValue?.trim() || 
                              globalSettings.https !== httpsValue;
            
            if (needsUpdate) {
                // 更新全局设置
                if (portValue && portValue.trim()) {
                    globalSettings.port = portValue.trim();
                }
                globalSettings.https = httpsValue;
                
                $SD.api.setGlobalSettings($SD.uuid, globalSettings);
                console.log('[SmartSettings] Synced port and https to global settings:', {
                    port: globalSettings.port,
                    https: globalSettings.https
                });
            }
        }, SAVE_DEBOUNCE_DELAY);
        
        hasInteracted = true;
    }
    
    /**
     * 拦截Port和HTTPS的saveSettings函数
     */
    function interceptPortHttpsSaveSettings() {
        // 保存原始函数
        const originalSaveSettings = window.saveSettings;
        
        if (originalSaveSettings) {
            // 重写saveSettings函数增加智能功能
            window.saveSettings = function(sdpi_collection) {
                // 调用原始函数（保持原有功能）
                originalSaveSettings.call(this, sdpi_collection);
                
                // 增强功能：只有在用户实际修改时才同步到全局设置
                if (sdpi_collection && (sdpi_collection.key === 'port' || sdpi_collection.key === 'https') && isUserModifying) {
                    const portElement = document.getElementById('port');
                    const httpsElement = document.getElementById('https');
                    
                    if (portElement && httpsElement) {
                        const portValue = portElement.value;
                        const httpsValue = httpsElement.checked;
                        
                        // 只有在用户修改时才同步到全局设置
                        syncPortHttpsToGlobalSettings(portValue, httpsValue);
                        console.log('[SmartSettings] Triggered sync after user modification of', sdpi_collection.key);
                    }
                } else if (sdpi_collection && (sdpi_collection.key === 'port' || sdpi_collection.key === 'https')) {
                    console.log('[SmartSettings] Skipped sync - not user modification, just page restoration');
                }
            };
            
            console.log('[SmartSettings] Port/HTTPS saveSettings intercepted successfully');
        }
    }

    /**
     * 处理全局设置接收
     */
    function handleGlobalSettingsReceived(elementTypes) {
        console.log('[SmartSettings] Handling global settings received. Global settings:', {
            port: globalSettings.port,
            https: globalSettings.https,
            hasHttpsProperty: globalSettings.hasOwnProperty('https')
        });
        
        // 在处理全局设置时再次尝试生成firstTimeKey
        if (!firstTimeKey && $SD.actionInfo && $SD.actionInfo.context) {
            firstTimeKey = `firstTime_${actionKey}_${$SD.actionInfo.context}`;
            console.log('[SmartSettings] Generated firstTimeKey in global settings handler:', firstTimeKey);
            // 重新检查首次打开状态
            checkFirstTimeStatus();
        }
        
        // 在全局设置处理中设置继承标记
        if (isFirstTimeOpen && elementTypes.includes('port_https')) {
            // 检查当前页面设置中是否已有设置
            const currentSettings = $SD.actionInfo ? ($SD.actionInfo.payload ? $SD.actionInfo.payload.settings : {}) : {};
            
            const hasPortSetting = currentSettings && currentSettings.hasOwnProperty('port');
            const hasHttpsSetting = currentSettings && currentSettings.hasOwnProperty('https');
            
            console.log('[SmartSettings] Checking current page settings for inheritance:');
            console.log('[SmartSettings] Current settings:', currentSettings);
            console.log('[SmartSettings] Has port setting:', hasPortSetting, 'value:', currentSettings.port);
            console.log('[SmartSettings] Has https setting:', hasHttpsSetting, 'value:', currentSettings.https);
            
            // 重置继承标记（防止之前的状态影响）
            needsPortInheritance = false;
            needsHttpsInheritance = false;
            
            if (!hasPortSetting) {
                needsPortInheritance = true;
                console.log('[SmartSettings] SET: New button needs port inheritance (from global settings handler)');
            }
            
            if (!hasHttpsSetting) {
                needsHttpsInheritance = true;
                console.log('[SmartSettings] SET: New button needs https inheritance (from global settings handler)');
            }
            
            console.log('[SmartSettings] Final inheritance flags - HTTPS:', needsHttpsInheritance, 'Port:', needsPortInheritance);
        }
        
        elementTypes.forEach(type => {
            if (type === 'vault') {
                const element = document.getElementById('vault');
                if (isFirstTimeOpen) {
                    applySmartPreset(element, 'vault');
                } else {
                    if (element && !element.value && globalSettings.vault && globalSettings.vault.trim()) {
                        element.value = globalSettings.vault;
                        const event = new Event('input', { bubbles: true });
                        element.dispatchEvent(event);
                    }
                }
                updateSmartPlaceholder(element, 'vault');
                
            } else if (type === 'apikey') {
                const element = document.getElementById('apikey');
                if (isFirstTimeOpen) {
                    applySmartPreset(element, 'apikey');
                } else {
                    if (element && !element.value && globalSettings.apikey && globalSettings.apikey.trim()) {
                        element.value = globalSettings.apikey;
                        const event = new Event('input', { bubbles: true });
                        element.dispatchEvent(event);
                    }
                }
                updateSmartPlaceholder(element, 'apikey');
                
            } else if (type === 'port_https') {
                const portElement = document.getElementById('port');
                const httpsElement = document.getElementById('https');
                
                if (!portElement || !httpsElement) return;
                
                // 保存当前的用户修改状态
                const wasUserModifying = isUserModifying;
                
                if (isFirstTimeOpen) {
                    // 首次打开逻辑：应用全局设置
                    console.log('[SmartSettings] First time open - processing port_https inheritance. Needs HTTPS:', needsHttpsInheritance, 'Needs Port:', needsPortInheritance);
                    isUserModifying = false;
                    
                    // 检查是否需要继承HTTPS设置
                    if (needsHttpsInheritance) {
                        console.log('[SmartSettings] Processing HTTPS inheritance. Global HTTPS:', globalSettings.https, 'Has HTTPS property:', globalSettings.hasOwnProperty('https'));
                        
                        // 先应用全局https设置，参考app.js的逻辑
                        let httpsValue;
                        if (globalSettings.hasOwnProperty('https')) {
                            // 全局设置中有https属性，使用全局设置
                            httpsValue = Boolean(globalSettings.https);
                            console.log('[SmartSettings] Applied global https on first open:', globalSettings.https, '-> boolean:', httpsValue);
                        } else {
                            // 没有全局https设置，使用默认值 false
                            httpsValue = false;
                            console.log('[SmartSettings] Applied default https (false) on first open');
                            
                            // 将默认值同步到全局设置
                            globalSettings.https = false;
                            $SD.api.setGlobalSettings($SD.uuid, globalSettings);
                        }
                        
                        // 设置到界面元素
                        console.log('[SmartSettings] Setting HTTPS checkbox to:', httpsValue);
                        httpsElement.checked = httpsValue;
                        if (window.saveSettings) {
                            window.saveSettings({key: 'https', value: httpsValue});
                            console.log('[SmartSettings] Saved HTTPS to page settings:', httpsValue);
                        }
                        
                        // 添加延时验证机制，确保状态正确设置
                        setTimeout(() => {
                            if (httpsElement.checked !== httpsValue) {
                                console.warn('[SmartSettings] HTTPS state mismatch detected! Expected:', httpsValue, 'Actual:', httpsElement.checked, '- Correcting...');
                                httpsElement.checked = httpsValue;
                                if (window.saveSettings) {
                                    window.saveSettings({key: 'https', value: httpsValue});
                                }
                            } else {
                                console.log('[SmartSettings] HTTPS state verified correct:', httpsValue);
                            }
                        }, 500);
                        
                        needsHttpsInheritance = false; // 清除标记
                        console.log('[SmartSettings] HTTPS inheritance completed');
                    }
                    
                    // 检查是否需要继承Port设置
                    if (needsPortInheritance) {
                        // 应用全局port设置，参考app.js的逻辑
                        let portValue;
                        if (globalSettings.port && globalSettings.port.trim()) {
                            // 全局设置中有port值，使用全局设置
                            portValue = globalSettings.port;
                            console.log('[SmartSettings] Applied global port on first open:', globalSettings.port);
                        } else {
                            // 没有全局port设置，使用默认值（根据https状态计算）
                            portValue = getDefaultPort();
                            console.log('[SmartSettings] Applied default port on first open:', portValue);
                        }
                        
                        // 设置到界面元素
                        portElement.value = portValue;
                        if (window.saveSettings) {
                            window.saveSettings({key: 'port', value: portValue});
                        }
                        
                        needsPortInheritance = false; // 清除标记
                    }
                } else {
                    // 非首次打开逻辑：只处理port，不处理https
                    isUserModifying = false;
                    
                    if (!portElement.value && globalSettings.port && globalSettings.port.trim()) {
                        portElement.value = globalSettings.port;
                        if (window.saveSettings) {
                            window.saveSettings({key: 'port', value: globalSettings.port});
                        }
                        console.log('[SmartSettings] Showed global port value:', globalSettings.port);
                    }
                }
                
                // 恢复原来的用户修改状态
                isUserModifying = wasUserModifying;
                
                updatePortPlaceholder();
            }
        });
    }
    
    /**
     * 拦截index_pi.js的saveSettings函数（一般情况）
     */
    function interceptSaveSettings(elementType) {
        // 保存原始函数
        const originalSaveSettings = window.saveSettings;

        if (originalSaveSettings) {
            // 重写saveSettings函数增加智能功能
            window.saveSettings = function(sdpi_collection) {
                // 调用原始函数（保持原有功能）
                originalSaveSettings.call(this, sdpi_collection);

                // 增强功能：如果是对应元素修改，同步到全局设置
                if (sdpi_collection && sdpi_collection.key === elementType && isUserModifying) {
                    handleSmartSettingSync(sdpi_collection.value, elementType);
                }
            };
        }
    }

    /**
     * 智能预设应用（只在首次打开时执行）
     */
    function applySmartPreset(element, settingType) {
        // 非首次打开，不执行预设
        if (!isFirstTimeOpen) {
            return;
        }

        // 没有元素或全局设置
        if (!element || !globalSettings[settingType]) {
            return;
        }

        // 首次打开，应用全局预设
        // 使用index_pi.js的机制来设置值
        element.value = globalSettings[settingType];

        // 触发index_pi.js的保存机制
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);

        // 更新placeholder
        updateSmartPlaceholder(element, settingType);
    }

    /**
     * 更新智能placeholder
     */
    function updateSmartPlaceholder(element, settingType) {
        if (!element) return;

        let placeholderText = settingType === 'vault' ? 'Enter vault name here' : 'Enter API Key here';

        if (isFirstTimeOpen) {
            if (globalSettings[settingType] && globalSettings[settingType].trim()) {
                placeholderText = globalSettings[settingType].trim();
            } else {
                placeholderText = settingType === 'vault' ? 
                    'Enter vault name here, will save automatically' : 
                    'Enter new API Key, will save automatically';
            }
        } else {
            if (element.value && element.value.trim()) {
                placeholderText = settingType === 'vault' ? 
                    'Enter vault name here' : 
                    'Enter new API Key';
            } else if (globalSettings[settingType] && globalSettings[settingType].trim()) {
                placeholderText = globalSettings[settingType].trim();
            }
        }

        if (element.placeholder !== placeholderText) {
            element.placeholder = placeholderText;
        }
    }

    /**
     * 处理智能设置同步（实现 globalSetting = 最后一个输入的设置值）
     */
    function handleSmartSettingSync(settingValue, settingType) {
        if (!settingValue || !settingValue.trim()) {
            console.log(`[SmartSettings] ${settingType} is empty, will not sync to global.`);
            return;
        }

        const trimmedValue = settingValue.trim();

        // 防抖延迟同步到全局设置
        setTimeout(() => {
            if (globalSettings[settingType] !== trimmedValue) {
                globalSettings[settingType] = trimmedValue;
                $SD.api.setGlobalSettings($SD.uuid, globalSettings);
                console.log(`[SmartSettings] Sync the last ${settingType} input into global settings.`);
            }
        }, SAVE_DEBOUNCE_DELAY);

        // 标记用户已交互
        hasInteracted = true;
    }

})();