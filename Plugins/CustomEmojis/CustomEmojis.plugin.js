/**
 * @name CustomEmojis
 * @version 1.0.0
 * @description Allows you to send any emoji anywhere as an image link.
 */

/*
	Based on EmojiUtilities by Zerebos
	https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/EmojiUtilities
*/

/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
	const config = {
		info: {
			name: "CustomEmojis",
			authors: [{
				name: "TheGameratorT",
				github_username: "TheGameratorT"
			}],
			version: "1.0.0",
			description: "Allows you to send any emoji anywhere as an image link.",
			github: "https://github.com/TheGameratorT/BetterDiscordAddons/tree/master/Plugins/CustomEmojis",
			github_raw: "https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/CustomEmojis/CustomEmojis.plugin.js"
		},
		defaultConfig: [{
			type: "switch",
			id: "prioritizeCustoms",
			name: "Prioritize Custom Emojis",
			note: "When searching for an emoji or autocompleting, show the custom emojis first.",
			value: false
		}],
		main: "index.js"
	};

	return !global.ZeresPluginLibrary ? class {

	constructor() { this._config = config; }
	getName() { return config.info.name; }
	getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
	getDescription() { return config.info.description; }
	getVersion() { return config.info.version; }
	load() {
		BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
			confirmText: "Download Now",
			cancelText: "Cancel",
			onConfirm: () => {
				require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
					if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
					await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
				});
			}
		});
	}
	start() {}
	stop() {}

	} : (([Plugin, Api]) => {

	/* ================ CLASS START ================ */

	const plugin = (Plugin, Api) => {

	const {
		Patcher,
		WebpackModules,
		PluginUtilities,
		ReactComponents,
		DiscordAPI,
		DiscordModules,
		DiscordSelectors,
		DCM,
		Utilities,
		Modals
	} = Api;

	const escPress = new KeyboardEvent("keydown", {key: "Escape", code: "Escape", which: 27, keyCode: 27, bubbles: true});

	const CustomIcon = (({DiscordModules}) => {
		const ce = DiscordModules.React.createElement;
		return class CustomIcon extends DiscordModules.React.Component {
			render() {
				return ce("img", {
					src: "https://discord.com/assets/67069a13e006345ce28ecc581f2ed162.svg",
					height: this.props.height || "24px",
					width: this.props.width || "24px",
					className: this.props.className,
					viewBox: "0 0 24 24"
				});
			}
		};
	})(Api);

	class CustomEmoji {
		constructor(name, url) {
			this.allNamesString = `:.${name}:`;
			this.animated = false;
			this.available = true;
			this.guildId = "-1";
			this.id = `T${url}`;
			this.managed = false;
			this.name = `.${name}`;
			this.require_colons = true;
			this.roles = [];
			this.url = url;
		}
	};

	const defaultSettings = {
		gifsicleWarnShown: false,
		prioritizeCustoms: false
	};

	const EmojiInfo = DiscordModules.EmojiInfo;
	const EmojiUtils = DiscordModules.EmojiUtils;
	const EmojiStore = DiscordModules.EmojiStore;
	const ImageResolver = DiscordModules.ImageResolver;
	const MessageActions = DiscordModules.MessageActions;
	const LocaleManager = DiscordModules.LocaleManager;
	const UserSettings = DiscordAPI.UserSettings;

	return class CustomEmojis extends Plugin
	{
		onStart()
		{
			this.labels = this.loadLabels();
			this.settings = PluginUtilities.loadSettings(this.getName(), defaultSettings);

			this.loadGifsicle();
			this.loadEmojis();
			this.patchEmojiSearch();
			this.patchEmojiPickerEmojis();
			this.patchEmojiPickerCategories();
			this.patchSendMessage();
			this.patchSetLocale();

			this.promises = { state: { cancelled: false }, cancel() { this.state.cancelled = true; } };
			Utilities.suppressErrors(this.patchEmojiComponent.bind(this), "Emoji Patch")(this.promises);
			Utilities.suppressErrors(this.patchMessageContextMenu.bind(this), "Message Context Menu Patch")();
			Utilities.suppressErrors(this.patchEmojiPicker.bind(this), "Emoji Picker Patch")(this.promises);
		}

		onStop()
		{
			Patcher.unpatchAll();
			this.promises.cancel();
			if (EmojiUtils.originalCategories)
				EmojiUtils.categories = EmojiUtils.originalCategories;
		}

		getSettingsPanel()
		{
            const panel = this.buildSettingsPanel();
            panel.addListener(void(0));
            return panel.getElement();
        }

		loadGifsicle()
		{
			this.gifsicle = null;
			this.execa = null;
			try {
				this.gifsicle = require("gifsicle");
				this.execa = require("execa");
			}
			catch (exception) {
				if (this.settings.gifsicleWarnShown)
					return;
				this.warnMissingGifsicle();
				this.settings.gifsicleWarnShown = true;
				PluginUtilities.saveSettings(this.getName(), this.settings);
			}
		}

		loadEmojis()
		{
			this.customEmojiData = PluginUtilities.loadData(this.getName(), "customEmojis", []);
			this.customEmojis = this.customEmojiData.map(e => this.createCustomEmojiFromURL(e));
		}

		// Patch the the emoji search
		patchEmojiSearch()
		{
			const EmojiParser = WebpackModules.getModule(m => m.parse && m.parsePreprocessor && m.unparse);
			Patcher.after(EmojiParser, "parse", (self, [, emojiInfo], retval) =>
			{
				if (emojiInfo[1] == ":")
				{
					const nameEnd = emojiInfo.indexOf(":", 2) + 1;
					if (nameEnd > 0 && emojiInfo[nameEnd] == "T")
						retval.content = emojiInfo.substring(1, nameEnd); // allNamesString
				}
			});

			Patcher.after(EmojiUtils, "search", (self, [e, name, n, r, i], retval) =>
			{
				var customs = this.customEmojis.filter(e =>
				{
					var lname = e.name.toLowerCase();
					return lname.startsWith(name) || lname.startsWith("." + name);
				});

				if (this.settings.prioritizeCustoms)
					retval.unlocked = [...customs, ...retval.unlocked];
				else
					retval.unlocked = [...retval.unlocked, ...customs];
			});
		}

		// Patch the emojis to display the custom image instead
		patchEmojiPickerEmojis()
		{
			Patcher.after(EmojiInfo, "isEmojiDisabled", (self, [emoji]) =>
			{
				if (this.isEmojiCustom(emoji))
					return false;
			});

			Patcher.after(ImageResolver, "getEmojiURL", (self, [emoji]) =>
			{
				if (this.isEmojiCustom(emoji))
					return emoji.id.substr(1);
			});
		}

		patchEmojiPickerCategories()
		{
			EmojiUtils.originalCategories = EmojiUtils.categories;
			Object.defineProperty(EmojiUtils, "categories", {writable: true, value: [this.labels.category, ...EmojiUtils.originalCategories]});

			// Add custom category
			Patcher.after(EmojiStore, "getByCategory", (self, args) =>
			{
				if (args[0] == this.labels.category)
					return this.customEmojis;
			});

			// Give the fake categories an icon
			const EmojiCategoryIcon = WebpackModules.getModule(m => m.default && m.default.type && m.default.type.toString().includes("FOOD"));
			Patcher.after(EmojiCategoryIcon.default, "type", (self, [props]) =>
			{
				if (props.categoryId == this.labels.category)
					return DiscordModules.React.createElement(CustomIcon, props);
			});
		}

		// Add context menu to emojis in emoji picker
		async patchEmojiPicker()
		{
			const EmojiPickerListRow = WebpackModules.getModule(m => m.default && m.default.displayName == "EmojiPickerListRow");
			Patcher.after(EmojiPickerListRow, "default", (self, args, retval) =>
			{
				const emojiComponents = retval.props.children;
				for (var e = 0; e < emojiComponents.length; e++)
				{
					const emoji = emojiComponents[e].props.children.props.emoji;
					var ecp = emojiComponents[e].props;

					const isCustom = this.isEmojiCustom(emoji);
					if (isCustom)
					{
						ecp.onClick = (event) =>
						{
							const textArea = document.querySelector(DiscordSelectors.Textarea.textArea);
							if (!textArea)
								return;
	
							const slateEditor = Utilities.findInTree(textArea.__reactInternalInstance$, e => e && e.wrapText, {walkable: ["return", "stateNode", "editorRef"]});
							if (!slateEditor)
								return;
							
							var text = emoji.allNamesString;
							if (!event.shiftKey)
								text += " ";
							slateEditor.insertText(text);

							if (!event.shiftKey)
								document.dispatchEvent(escPress);
						}

						ecp.onContextMenu = (event) =>
						{
							const menu = DCM.buildMenu([{
								type: "group",
								items: [{
									label: this.labels.unlink,
									closeOnClick: true,
									action: () => this.unlinkCustomEmoji(emoji)
								}]
							}]);
							DCM.openContextMenu(event, menu);
						}
					}
					else
					{
						ecp.onContextMenu = (event) =>
						{
							const menu = DCM.buildMenu([{
								type: "group",
								items: [{
									label: this.labels.steal,
									closeOnClick: true,
									action: () => this.createCustomEmoji(emoji)
								}]
							}]);
							DCM.openContextMenu(event, menu);
						}
					}
				}
			});
		}

		// Patch the emoji context to allow stealing emojis from messages
		async patchEmojiComponent(promiseState)
		{
			const Emoji = await ReactComponents.getComponentByName("Emoji", ".emoji");
			if (promiseState.cancelled)
				return;
			
			Patcher.after(Emoji.component.prototype, "render", (self, args, retval) =>
			{
				self.props.src = self.getSrc(); // Get the image source url in advance

				const emoji = self.props;
				emoji.id = "0";                                 // Prevent isEmojiCustom from failing
				emoji.name = emoji.emojiName.replace(/:/g, ""); // Allow the creator to give a default filename
				emoji.url = emoji.src;                          // Allow the creator to fetch the image source

				retval.props.onContextMenu = async () => {
					this.currentEmojiContext = emoji;
				};

				return retval;
			});

			Emoji.forceUpdateAll();
		}

		// Patch the mensage context to allow custom emoji linking
		patchMessageContextMenu()
		{
			const MessageContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "MessageContextMenu");
			Patcher.after(MessageContextMenu, "default", (self, [props], retval) =>
			{
				// If right clicking an emote.

				const target = props.target;
				if (target && target.classList && target.classList.contains("emoji"))
				{
					const newEntry = DCM.buildMenuChildren([{
						type: "group",
						items: [{
							label: this.labels.steal,
							closeOnClick: true,
							action: () => this.createCustomEmoji(this.currentEmojiContext)
						}]
					}]);
		
					const menu = retval.props.children;
					menu.splice(5, 0, newEntry);
					return;
				}

				// If right clicking an image.

				const image = props.attachment;
				if (image && image.content_type && image.content_type.startsWith("image"))
				{
					const newEntry = DCM.buildMenuChildren([
						{
							type: "group",
							items: [{
								label: this.labels.link,
								closeOnClick: true,
								action: () => this.linkCustomEmoji(image.url)
							}]
						}
					]);
	
					const menu = retval.props.children;
					menu.splice(5, 0, newEntry);
				}
			});
		}

		patchSendMessage()
		{
			Patcher.instead(MessageActions, "sendMessage", (self, [a, msg, c, info]) =>
			{
				// Split the message when a custom emoji is found
				const content = msg.content;
				var strs = [""];

				var i = 0;
				var j = 0;
				begin: while (i < content.length)
				{
					const chr = content[i];
					if (chr == ":")
					{
						const substr = content.substr(i);
						for (var k = 0; k < this.customEmojis.length; k++)
						{
							const emoji = this.customEmojis[k];
							const emojiName = emoji.allNamesString;
							if (substr.startsWith(emojiName))
							{
								if (strs[j] != "")
									j++;
								strs[j] = emoji.url;

								i += emojiName.length;
								strs[++j] = "";
								continue begin;
							}
						}
					}

					strs[j] += chr;
					i++;
				}

				// Filter out empty strings
				strs = strs.filter(str => {
					const trim = str.replace(/ /g, "");
					return trim.length > 0;
				});

				// Send the messages by order
				for (var i = 0; i < strs.length; i++)
				{
					var msgArgs = [a, {...msg}, c, i == 0 ? {...info} : {}];
					msgArgs[1].content = strs[i];

					setTimeout(
						(msgArgs) => self.sendMessage.__originalFunction.apply(self, msgArgs),
						50 * i,
						[...msgArgs]
					);
				}
			});
		}

		// Update the text on language change
		patchSetLocale()
		{
			Patcher.after(LocaleManager, "setLocale", (self, [locale]) => {
				this.labels = this.loadLabels();
				Object.defineProperty(EmojiUtils, "categories", {writable: true, value: [this.labels.category, ...EmojiUtils.originalCategories]});
			});
		}

		async createCustomEmoji(emoji)
		{
			var url = emoji.url;
			var ext = url.substring(url.lastIndexOf(".") + 1);
			ext = ext.substr(0, ext.indexOf("?"));

			if (ext == "gif")
			{
				if (this.gifsicle == null)
				{
					this.warnMissingGifsicle();
					return;
				}

				var image = await fetch(url);
				var buffer = Buffer.from(await image.arrayBuffer());

				const args = ["--no-warnings", "--no-app-extensions", "--resize-method=lanczos3", "--resize-touch=48x48"];
				
				const out = await this.execa(this.gifsicle, args, { input: buffer, encoding: null });

				this.saveByteArray(emoji.name + ".gif", "image/gif", out.stdout);
			}
			else
			{
				var img = new Image();
				img.onload = () => {
					var canvas = document.createElement('canvas');
					canvas.width = 48;
					canvas.height = 48;

					var ctx = canvas.getContext('2d');

   					var hRatio = canvas.width / img.width;
   					var vRatio = canvas.height / img.height;
   					var ratio = Math.min(hRatio, vRatio);
   					var centerShift_x = (canvas.width - img.width * ratio) / 2;
   					var centerShift_y = (canvas.height - img.height * ratio) / 2;
   					ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
					
					var link = document.createElement("a");
					link.download = emoji.name + ".png";
					link.href = canvas.toDataURL("image/png");
					link.click();
				}
				img.crossOrigin = "anonymous";
				img.src = emoji.url;
			}
		}
	
		linkCustomEmoji(url)
		{
			this.customEmojiData.push(url);
			var emoji = this.createCustomEmojiFromURL(url);
			this.customEmojis.push(emoji);
			this.saveCustomEmojiData();
		}

		unlinkCustomEmoji(emoji)
		{
			var index = this.customEmojiData.indexOf(emoji.url);
			this.customEmojiData.splice(index, 1);
			this.customEmojis.splice(index, 1);
			this.saveCustomEmojiData();
		}

		saveCustomEmojiData()
		{
			PluginUtilities.saveData(this.getName(), "customEmojis", this.customEmojiData);
		}

		saveByteArray(name, type, byte)
		{
			var blob = new Blob([byte], { type: type });
			var link = document.createElement('a');
			link.href = window.URL.createObjectURL(blob);
			link.download = name;
			link.click();
		};

		isEmojiCustom(emoji)
		{
			if (!emoji.id)
				return false;
			return emoji.id[0] == "T";
		}

		createCustomEmojiFromURL(url)
		{
			var emoteName = url.toString().match(/.*\/(.+?)\./)[1];
			var emoji = new CustomEmoji(emoteName, url);
			return emoji;
		}

		loadLabels()
		{
			switch (UserSettings.locale)
			{
				default: return {
					category: "Custom emojis",
					link: "Add emoji",
					unlink: "Remove emoji",
					steal: "Steal emoji"
				}
				case "de": return {
					category: "Benutzerdefinierte emojis",
					link: "Emoji hinzufügen",
					unlink: "Emoji entfernen",
					steal: "Emoji stehlen"
				}
				case "es-ES": return {
					category: "Emojis personalizados",
					link: "Agregar emoji",
					unlink: "Eliminar emoji",
					steal: "Robar emoji"
				}
				case "it": return {
					category: "Emoji personalizzate",
					link: "Aggiungi emoji",
					unlink: "Rimuovi emoji",
					steal: "Ruba emoji"
				}
				case "nl": return {
					category: "Aangepaste emoji's",
					link: "Emoji toevoegen",
					unlink: "Verwijder Emoji",
					steal: "Steel Emoji"
				}
				case "pt-BR": return {
					category: "Emojis personalizados",
					link: "Adicionar emoji",
					unlink: "Remover emoji",
					steal: "Roubar emoji"
				}
			}
		}

		warnMissingGifsicle()
		{
			Modals.showAlertModal("Gifsicle module missing!",
			"Please install 'gifsicle' for Node.js to be able to steal animated emotes.\n\nhttps://www.npmjs.com/package/gifsicle");
		}
	};
	};
	
	return plugin(Plugin, Api);
	})(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/