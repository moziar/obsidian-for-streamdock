This is a Stream Dock plugin which could help you open Daily Note, open Note or run Obsidian Command.



## Installation

### 1. Download from MiraBox Space

1. Install the local-REST-API on Obsidian
1. Download obsidian-for-streamdock dircetly from [ MiraBox Space](https://space.key123.vip/product?id=20250604000924)



### 2. Manual Installation

1. Install the local-REST-API on Obsidian
2. Download the `.sdPlugin` file from the [release](https://github.com/moziar/obsidian-for-streamdock/releases) page
3. Double click it to install



## Usage

> [!TIP]
>
> You could get the API Key from local-REST-API setting page

### Keypad

#### Open Daily Note

1. Only the API Key is needed



#### Open Note

1. Input the API Key
3. Input the note relative path to `Note Path`, the plugin will auto encode it



#### Note Finder

1. Enter your Vault name
2. Choose the type you want to search (`all`, `tag`, `task`, `file`, `path`, `property`). If you select `task`, you can also specify a task status to match.
3. Enter the search query, or provide a  property name and value if you've selected  `property`. Note that hashtag(`#`) is not required for tag searches.
4. This function requires *StreamDock* software `v3.10.194` or newer. 

 

#### Open Obsidian Web Viewer

1. Only the API Key is needed
2. This function requires Obsidian version `v1.8` or later. Additionally, you need to enable the *Web Viewer* plugin in the Obsidian settings.



#### Open Web Search

1. Only the API Key is needed
2. This function requires Obsidian version `v1.8` or later. Additionally, you need to enable the *Web Viewer* plugin in the Obsidian settings.
3. Recommend using AI search engines like `https://metaso.cn/?q=%s`.



#### Run Command

1. Input the API Key
2. Input the command-id to `Command`. You can get the id from [Local REST API for Obsidian](https://coddingtonbear.github.io/obsidian-local-rest-api/#/)



### Dial

#### Switch Tab

1. Only the API Key is needed
2. Use the dial to switch between tabs



#### Zoom

1. Only the API Key is needed
2. Use the dial to zoom in, zoom out or reset zoom



#### Web Zoom

1. Only the API Key is needed
2. Use the dial to zoom in, zoom out or reset zoom in Web Viewer



#### Note Navigator
1. Select the note type to navigate (Daily/Weekly), the title will auto updates based on it.
2. Enter the API Key
3. This function relies on the Obsidian plugin *Periodic Notes* for navigation. Make sure to install and enable it.
4. Use the dial to navigate through daily and weekly notes by date



## Credits

Thanks to **@data-enabler**, his [streamdeck-web-requests](https://github.com/data-enabler/streamdeck-web-requests) served as the base for this plugin.
