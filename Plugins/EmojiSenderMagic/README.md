# EmojiSenderMagic - [Download](https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/EmojiSenderMagic/EmojiSenderMagic.plugin.js)

Allows you to send any emoji or sticker anywhere as an image link.

# Requirements
 - **Node.js**
 - **pica** - (`npm install pica`) - Optional for higher quality image resizing.
 - **puppeteer-lottie** - (`npm install puppeteer-lottie`) - Optional for native sticker conversion support.
 - **FFmpeg** - (at least essential build) - Optional but required if using puppeteer-lottie or if converting animated stickers or emojis.
 - **Chromium** - Required if using puppeteer-lottie, the new Microsoft Edge or Google Chrome work as valid Chromium installations.

Note: When installing `puppeteer-lottie` if you have Edge in your system already it is of no use installing Chromium on NodeJS, to avoid Chromium being installed on NodeJS use `set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` before running the install command.
