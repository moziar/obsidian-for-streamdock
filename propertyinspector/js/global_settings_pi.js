(function() {
    'use strict';
    
    let globalSettings = {};
    let isFirstTimeOpen = true;
    let hasInteracted = false;
    const SAVE_DEBOUNCE_DELAY = 300;
    
    // 获取Action标识和存储键
    const actionKey = getActionKey();
    const firstTimeKey = `firstTime_${actionKey}`;
    
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
        
        // 检查当前页面需要处理的元素类型
        const elementType = vaultElement ? 'vault' : apiKeyElement ? 'apikey' : null;
        
        if (!elementType) {
            console.log('[SmartSettings] No vault or api key element found, skip');
            return;
        }

        console.log(`[SmartSettings] Starting SmartSettings enhancements for ${elementType}...`);

        // 检查首次打开状态
        checkFirstTimeStatus();

        // 增强全局设置处理
        enhanceGlobalSettings(elementType);

        // 增强页面离开处理
        enhancePageLifecycle();

        // 增强元素输入处理
        if (elementType === 'vault') {
            enhanceInput(vaultElement, 'vault');
        } else if (elementType === 'apikey') {
            enhanceInput(apiKeyElement, 'apikey');
        }

        // 请求全局设置
        $SD.api.getGlobalSettings($SD.uuid);

        console.log('[SmartSettings] SmartSettings enhancements completed.');
    }

    /**
     * 检查首次打开状态
     */
    function checkFirstTimeStatus() {
        const hasOpened = localStorage.getItem(firstTimeKey);
        isFirstTimeOpen = !hasOpened;
        console.log(`[SmartSettings] First time open: ${isFirstTimeOpen ? 'Yes' : 'No'}`);
    }

    /**
     * 标记为已打开
     */
    function markAsOpened() {
        if (isFirstTimeOpen) {
            localStorage.setItem(firstTimeKey, 'true');
            isFirstTimeOpen = false;
            console.log('[SmartSettings] Mark as opened.');
        }
    }
    
    /**
     * 增强全局设置处理（基于index_pi.js机制）
     */
    function enhanceGlobalSettings(elementType) {
        // 监听全局设置接收
        $SD.on('didReceiveGlobalSettings', function(jsonObj) {
            globalSettings = jsonObj.payload.settings || {};

            // 无论是否首次打开，都需要处理全局设置
            handleGlobalSettingsReceived(elementType);
        });

        // 监听connected事件获取当前页面设置
        $SD.on('connected', function(jsonObj) {
            console.log('[SmartSettings] Received connected event.');

            // 获取当前页面设置（这是关键信息）
            const currentPageSettings = Utils.getProp(jsonObj, 'actionInfo.payload.settings', {});
            console.log('[SmartSettings] Current page settings:', currentPageSettings);

            // 检查是否已经有对应设置（影响首次打开逻辑）
            const element = document.getElementById(elementType);
            if (element && currentPageSettings[elementType]) {
                element.value = currentPageSettings[elementType];
                console.log(`[SmartSettings] Restore ${elementType} from page settings.`);
            }

            // 更新placeholder
            updateSmartPlaceholder(element, elementType);
        });

        // 增强页面设置处理
        $SD.on('didReceiveSettings', function(jsonObj) {
            const pageSettings = jsonObj.payload.settings || {};

            const element = document.getElementById(elementType);
            if (element && pageSettings[elementType] && !element.value) {
                element.value = pageSettings[elementType];
                console.log(`[SmartSettings] Update ${elementType} from page settings.`);
            }

            updateSmartPlaceholder(element, elementType);
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
     * 增强输入处理（复用index_pi.js机制）
     */
    function enhanceInput(element, elementType) {
        // 监听用户交互
        ['focus', 'input'].forEach(eventType => {
            element.addEventListener(eventType, function() {
                if (!hasInteracted) {
                    hasInteracted = true;
                    console.log(`[SmartSettings] User interacted with ${elementType}.`);
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
     * 拦截index_pi.js的saveSettings函数
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
                if (sdpi_collection && sdpi_collection.key === elementType) {
                    handleSmartSettingSync(sdpi_collection.value, elementType);
                }
            };
        }
    }

    /**
     * 处理全局设置接收
     */
    function handleGlobalSettingsReceived(elementType) {
        const element = document.getElementById(elementType);

        if (isFirstTimeOpen) {
            // 首次打开逻辑：应用预设
            applySmartPreset(element, elementType);
        } else {
            // 非首次打开逻辑：如果当前输入框为空且有全局设置，则显示全局设置
            if (element && !element.value && globalSettings[elementType] && globalSettings[elementType].trim()) {
                element.value = globalSettings[elementType];

                // 触发index_pi.js的更新机制
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
            }
        }

        // 始终更新placeholder
        updateSmartPlaceholder(element, elementType);
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