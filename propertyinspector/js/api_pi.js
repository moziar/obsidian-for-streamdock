// 添加HTTPS复选框事件监听器，动态更改端口输入框的placeholder
document.addEventListener('DOMContentLoaded', function() {
    const httpsCheckbox = document.getElementById('https');
    const portInput = document.getElementById('port');

    if (httpsCheckbox && portInput) {
        // 页面加载时根据保存的设置更新placeholder
        $SD.on('connected', (jsn) => {
            const savedSettings = Utils.getProp(jsn, 'actionInfo.payload.settings', {});
            if (savedSettings.hasOwnProperty('https')) {
                httpsCheckbox.checked = Boolean(savedSettings.https);
                updatePortPlaceholder(httpsCheckbox.checked);
            } else {
                // 默认使用http
                updatePortPlaceholder(false);
            }
        });

        // 监听checkbox变化
        httpsCheckbox.addEventListener('change', function() {
            updatePortPlaceholder(this.checked);
            // 保存设置
            const returnValue = {
                key: 'https',
                value: this.checked
            };
            saveSettings(returnValue);
        });

        // 更新端口输入框的placeholder
        function updatePortPlaceholder(isHttps) {
            if (isHttps) {
                portInput.placeholder = '27124';
            } else {
                portInput.placeholder = '27123';
            }
        }
    }
});