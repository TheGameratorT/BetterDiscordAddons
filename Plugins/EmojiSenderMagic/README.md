# EmojiSenderMagic - [Download](https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/EmojiSenderMagic/EmojiSenderMagic.plugin.js)

Allows you to send any emoji or sticker anywhere as an image link.

# How does it work?
By default, this plugin will unlock all of the emojis and stickers on every server. \
 \
You can use them just as you would with any emoji/sticker, however when you click them, they will be converted and resized, then uploaded to a channel specified in the plugin settings (this channel will work as a cache so that you don't have to convert an emoji/sticker every time that you use one), linked to the configuration file and finally uploaded to the channel where you wanted to send it to as a URL (that Discord will automatically display as an iamge if the channel has such permissions). This makes sure that your emojis and stickers can be sent as fast as possible after you used them at least once. \
 \
Messages are also automatically split whenever an emoji is found in-between the message text. \
 \
There is a setting that allows disabling the upload of emojis to a channel and instead use the `?size=48` flag of Discord images, however, this will not work for images smaller than 48px because Discord servers only upscale the image, not downscale. \
Animated stickers always require a channel because they must be converted from APNG/Lottie to GIF first.

# Requirements
 - **Node.js**
 - **pica** - (`npm install pica`) - Optional for higher quality image resizing.
 - **puppeteer-lottie** - (`npm install puppeteer-lottie`) - Optional for native sticker conversion support.
 - **FFmpeg** - (at least essential build) - Optional but required if using puppeteer-lottie or if converting animated stickers or emojis.
 - **Chromium** - Required if using puppeteer-lottie, the new Microsoft Edge or Google Chrome work as valid Chromium installations.

Note: When installing `puppeteer-lottie` if you have Edge in your system already it is of no use installing Chromium on NodeJS, to avoid Chromium being installed on NodeJS use `set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` before running the install command.
