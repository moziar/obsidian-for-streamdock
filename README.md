A StreamDock plugin which could help you open notes, run obsidian commands, search notes, switch tabs or navigate through daily and weekly notes by date. 



## 🌟 Highlight

1. Support both keypad and dial function.
2. Cold launch any note, any vault.
3. Run all the obsidian commands you want.
4. Visible validation, all the critical parameters have a notice.
5. Beautiful and elegant icon pack design.
6. Multiple languages support.



## 📦 Installation

### 1. Download from MiraBox Space

1. Install *Local-REST-API*, *Advanced URI*, *Periodic Notes* plugin on Obsidian.
1. Download obsidian-for-streamdock dircetly from [ MiraBox Space](https://space.key123.vip/product?id=20250604000924).



### 2. Manual Installation

1. Install *Local-REST-API*, *Advanced URI*, *Periodic Notes* plugin on Obsidian.
2. Download the `.sdPlugin` file from the [release](https://github.com/moziar/obsidian-for-streamdock/releases) page.
3. Double click it to install.



## 🚀 Usage

> [!TIP]
>
> You could get the `API Key` from local-REST-API setting page.



### Keypad

#### Open Daily Note

1. Only the API Key is needed.
1. Will open your daily note directly even if obsidian did not open.



#### Open Note

1. Enter your Vault name.
2. Enter the unique note name, or note relative path to `Note Path`, the plugin will auto encode it.
3. Files that aren't in `.md` format must have an extension.
4. Support open note when the obsidian did not open.



#### Open Vault

1. Enter the Vault you want to open.
2. This is helpful when you have mutiple vaults.
3. Support cold launch.



#### Note Finder

1. Enter your Vault name.
2. Choose the type you want to search (`all`, `tag`, `task`, `file`, `path`, `property`). If you select `task`, you can also specify a task status to match.
3. Enter the search query, or provide a  property name and value if you've selected  `property`. Note that hashtag(`#`) is not required for tag searches.

 

#### Web Viewer

1. Only the API Key is needed.
2. This function requires Obsidian version `v1.8` or later. Additionally, you need to enable the *Web Viewer* plugin in the Obsidian settings.



#### Web Searcher

1. Only the API Key is needed.
2. This function requires Obsidian version `v1.8` or later. Additionally, you need to enable the *Web Viewer* plugin in the Obsidian settings.
3. Recommend using AI search engines like `https://metaso.cn/?q=%s`.



#### Run Command

1. Enter the API Key.
2. Enter the Command ID. You can get the ID from [Local REST API for Obsidian](https://coddingtonbear.github.io/obsidian-local-rest-api/#/).



#### Load Workspace

1. Only the vault name is needed.
2. This is useful when you have multiple workspace.
3. This function requires  *Obsidian Advanced URI plugin*, install it before use.



#### Settings Navigator

1. Enter your Vault name.
2. Enter the plugin ID. You could get it from [Local REST API for Obsidian](https://coddingtonbear.github.io/obsidian-local-rest-api/#/).
3. You could use this function to open community plugins setting quickly.
4. This function requires  *Obsidian Advanced URI plugin*, install it before use.



### Dial

#### Switch Tab

1. Only the API Key is needed.
2. Use the dial to switch between tabs.



#### Web Zoom

1. Only the API Key is needed.
2. Use the dial to zoom in, zoom out or reset zoom in Web Viewer.



#### Zoom

1. Only the API Key is needed.
2. Use the dial to zoom in, zoom out or reset zoom.



#### Note Navigator

1. Select the note type to navigate (Daily/Weekly), the title will automatically updates based on it.
2. Enter the API Key.
3. Use the dial to navigate through daily and weekly notes by date.
4. This function relies on the Obsidian plugin *Periodic Notes* for navigation. Make sure to install and enable it.



## 🤝 Credits

Thanks to **@data-enabler**, his [streamdeck-web-requests](https://github.com/data-enabler/streamdeck-web-requests) served as the base for this plugin.
