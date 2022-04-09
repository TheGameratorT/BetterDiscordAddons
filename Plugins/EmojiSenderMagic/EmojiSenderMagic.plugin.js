/**
 * @name EmojiSenderMagic
 * @version 2.0.2
 * @description Allows you to send any emoji or sticker anywhere as an image link.
 * @author TheGameratorT
 * @authorLink https://github.com/TheGameratorT
 * @website https://github.com/TheGameratorT/BetterDiscordAddons/tree/master/Plugins/EmojiSenderMagic
 * @source https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/EmojiSenderMagic/EmojiSenderMagic.plugin.js
 * @updateUrl https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/EmojiSenderMagic/EmojiSenderMagic.plugin.js
 */

/*
	Based on EmojiUtilities by Zerebos
	https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/EmojiUtilities
*/

/*@cc_on
@if (@_jscript)

	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pluginsDir = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
	var selfPath = WScript.ScriptFullName;
	var selfName = WScript.ScriptName;
	var selfDestPath = fs.BuildPath(pluginsDir, selfName);

	var pluginName = selfName.substr(0, selfName.indexOf("."));
	var popupTitle = pluginName + " Plugin";

	if (selfPath === selfDestPath) {
		shell.Popup("I am already installed.", 0, popupTitle, 64);
		WScript.Quit();
	}
	if (!fs.FolderExists(pluginsDir)) {
		shell.Popup("Could not find Better Discord plugins folder.\nMake sure it is installed.", 0, popupTitle, 16);
		WScript.Quit();
	}

	var doInstall = false;
	if (fs.FileExists(selfDestPath)) {
		doInstall = (shell.Popup("This plugin is already installed.\nDo you want to replace the current version of " + pluginName + " with this one?", 0, popupTitle, 36) === 6);
	} else {
		doInstall = (shell.Popup("Do you want to install the " + pluginName + " plugin?", 0, popupTitle, 36) === 6);
	}
	if (doInstall) {
		fs.CopyFile(selfPath, selfDestPath, true);
		shell.Popup("The plugin was installed!", 0, popupTitle, 64);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
	const config = {
		info: {
			name: "EmojiSenderMagic",
			authors: [{
				name: "TheGameratorT",
				discord_id: "355434532893360138",
				github_username: "TheGameratorT"
			}],
			version: "2.0.2",
			description: "Allows you to send any emoji or sticker anywhere as an image link.",
			github: "https://github.com/TheGameratorT/BetterDiscordAddons/tree/master/Plugins/EmojiSenderMagic",
			github_raw: "https://raw.githubusercontent.com/TheGameratorT/BetterDiscordAddons/master/Plugins/EmojiSenderMagic/EmojiSenderMagic.plugin.js"
		},
		defaultConfig: [{
			type: "textbox",
			id: "ffmpegPath",
			name: "FFmpeg Executable Location",
			note: "The location of the FFmpeg executable.",
			value: ""
		}, {
			type: "textbox",
			id: "chromiumPath",
			name: "Chromium Executable Location",
			note: "The location of the Chromium executable, may be any Chromium based browser.",
			value: ""
		}, {
			type: "textbox",
			id: "emojiStoreChannelID",
			name: "Emoji Store Channel ID",
			note: "Where to save the emoji images so they can be cached.",
			value: ""
		}, {
			type: "textbox",
			id: "stickerStoreChannelID",
			name: "Sticker Store Channel ID",
			note: "Where to save the sticker images so they can be cached.",
			value: ""
		}, {
			type: "switch",
			id: "sendEmojiLink",
			name: "Send emoji as sized URL",
			note: "Sends the emoji as a url without uploading it anywhere, the only drawback of this option is that emojis that were originally uploaded with a size smaller than 48x48 will display smaller than a regular emoji.",
			value: false
		}, {
			type: "switch",
			id: "prioritizeCustoms",
			name: "Prioritize Custom Emojis",
			note: "When searching for an emoji or autocompleting, show the custom emojis first.",
			value: false
		}, {
			type: "switch",
			id: "enableToasts",
			name: "Show Toasts",
			note: "Shows a small notification with the current conversion and upload status. (Errors bypass this setting)",
			value: false
		}],
		changelog: [{
			title: "Fixed",
			type: "fixed",
			items: ["Fixed image uploading not working."]
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

	const plugin = (Plugin, Api) => {

	/* ================ MAIN CODE START ================ */

	const {Buffer} = require("buffer");

	const {
		Patcher,
		WebpackModules,
		PluginUtilities,
		DiscordModules,
		ReactComponents,
		Modals,
		Toasts,
		DCM
	} = Api;

	const {
		EmojiInfo,
		EmojiUtils,
		EmojiStore,
		MessageActions,
		DiscordConstants,
		Dispatcher,
		MessageStore,
		ChannelStore,
		UserStore,
		UserSettingsStore,
		LocaleManager,
		ImageResolver,
		ContextMenuActions
	} = DiscordModules;

	const {
		ActionTypes
	} = DiscordConstants;

	const defaultSettings = {
		picaWarnShown: false,
		lottieWarnShown: false,
		ffmpegPath: "",
		chromiumPath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
		emojiStoreChannelID: "",
		stickerStoreChannelID: "",
		sendEmojiLink: false,
		prioritizeCustoms: false,
		enableToasts: true
	};

	const EMOJI_RE = /<(a?):([^(:| )]*):(\d*)>/g;

	const fs = require('fs');
	const { exec } = require("child_process");

	const CustomEmojiCategoryIcon = (({DiscordModules}) => {
		const ce = DiscordModules.React.createElement;
		return class CustomEmojiCategoryIcon extends DiscordModules.React.Component {
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
		constructor(name, url, id) {
			this.allNamesString = `:.${name}:`;
			this.animated = false;
			this.available = true;
			this.guildId = "-1";
			this.id = `${id}`;
			this.managed = false;
			this.name = `.${name}`;
			this.require_colons = true;
			this.roles = [];
			this.url = url;
		}
	};

	return class EmojiSenderMagic extends Plugin {
		onStart() {
			this.labels = this.loadLabels();
			this.settings = PluginUtilities.loadSettings(this.getName(), defaultSettings);

			this.uploader = WebpackModules.getByProps(["instantBatchUpload"]);
			this.stickerStore = WebpackModules.getByProps(["getStickerById"]);
			this.stickerInfo = WebpackModules.getByProps(["getStickerAssetUrl"]);
			this.stickerPerms = WebpackModules.getByProps(["getStickerSendability"]);
			this.stickerUse = WebpackModules.getByProps(["useStickerPackCategories"]);
			this.expressionPicker = WebpackModules.getByProps(["closeExpressionPicker"]);
			this.useFakeIsSendableSticker = true;
			this.stickerSenderBusy = false;
			this.queuedStickers = [];
			this.waitingForUpload = false;
			Dispatcher.subscribe(ActionTypes.UPLOAD_COMPLETE, this.onUploadComplete);
			Dispatcher.subscribe(ActionTypes.UPLOAD_FAIL, this.onUploadFail);

			this.loadPica();
			this.loadPuppeteerLottie();
			this.setupTempFolder();
			this.loadData();
			this.patchEmojiInfo();
			this.patchEmojiSearch();
			this.patchEmojiPicker();
			this.patchEmojiPickerCategories();
			this.patchEmojiComponent();
			this.patchMessageContextMenu();
			this.patchStickers();
			this.patchSendMessage();
			this.patchSetLocale();
		}

		onStop() {
			Dispatcher.unsubscribe(ActionTypes.CONNECTION_OPEN, this.onUploadComplete);
			Dispatcher.unsubscribe(ActionTypes.UPLOAD_FAIL, this.onUploadFail);
			MessageActions.sendStickers = this.ogSendStickers;
			this.stickerUse.useFilteredStickerPackCategories = this.ogUseFilteredStickerPackCategories;
			EmojiUtils.categories = EmojiUtils.originalCategories;
			Patcher.unpatchAll();
		}

		getSettingsPanel() {
			const panel = this.buildSettingsPanel();
			panel.addListener(void(0));
			return panel.getElement();
		}

		loadData() {
			this.urlForEmojiID = new Map(Object.entries(PluginUtilities.loadData(this.getName(), "urlForEmojiID", Object.fromEntries(new Map()))));
			this.urlForStickerID = new Map(Object.entries(PluginUtilities.loadData(this.getName(), "urlForStickerID", Object.fromEntries(new Map()))));
			this.customEmojiData = PluginUtilities.loadData(this.getName(), "customEmojis", []);
			this.customEmojis = [];
			for (let i in this.customEmojiData) {
				this.customEmojis.push(this.createCustomEmojiFromURL(this.customEmojiData[i]));
			}
		}

		// Patch the emojis to display
		patchEmojiInfo() {
			Patcher.after(EmojiInfo, "getEmojiUnavailableReason", (self, [context]) => {
				if (context.intention == 3) {
					return null;
				}
			});
			Patcher.after(EmojiInfo, "isEmojiDisabled", (self, [emoji, channel, intention, custom]) => {
				if (intention == 3 && (custom == null || this.isEmojiCustom(emoji.id))) {
					return false;
				}
			});
			Patcher.after(ImageResolver, "getEmojiURL", (self, [emoji]) => {
				if (this.isEmojiCustom(emoji.id)) {
					return this.getCustomEmojiByID(emoji.id).url;
				}
			});
		}

		// Patch the the emoji search
		patchEmojiSearch() {
			const EmojiAutocomplete = WebpackModules.getModule(m => m.onSelect && m.sentinel == ":");
			Patcher.before(EmojiAutocomplete, "onSelect", (self, [e, t, n, r], retval) => {
				var o = e.emojis
				if (t < o.length) {
					var emoji = o[t];
					var name = emoji.name;
					if (name[0] == '.') {
						emoji = {...emoji};
						emoji.name = "CEMJ_" + name.substr(1);
						o[t] = emoji;
					}
				}
			});
			
			const ChannelEditorContainer = WebpackModules.getModule(m => m.displayName && m.displayName == "ChannelEditorContainer").prototype;
			Patcher.before(ChannelEditorContainer, "insertEmoji", (self, args, retval) => {
				var emoji = args[0];
				var name = emoji.name;
				if (name[0] == '.') {
					var emojiCopy = {...emoji};
					emojiCopy.name = "CEMJ_" + name.substr(1);
					args[0] = emojiCopy;
				}
			});

			Patcher.after(EmojiUtils, "searchWithoutFetchingLatest", (self, [e, name, n, r, i], retval) => {
				var customs = this.customEmojis.filter(e => {
					var lname = e.name.toLowerCase();
					return lname.startsWith(name) || lname.startsWith("." + name);
				});
	
				if (this.settings.prioritizeCustoms)
					retval.unlocked = [...customs, ...retval.unlocked];
				else
					retval.unlocked = [...retval.unlocked, ...customs];
			});
		}

		// Add context menu to emojis in emoji picker
		patchEmojiPicker() {
			const EmojiPickerListRow = WebpackModules.getModule(m => m.default && m.default.displayName == "EmojiPickerListRow");
			Patcher.after(EmojiPickerListRow, "default", (self, args, retval) => {
				let emojiComponents = retval.props.children;
				for (let i = 0; i < emojiComponents.length; i++) {
					let props = emojiComponents[i].props;
					let child_props = props.children.props;
					if (!child_props)
						return;
					
					let emoji = child_props.emoji;
					if (!emoji)
						return;
						
					let isCustom = this.isEmojiCustom(emoji.id);
					if (isCustom) {
						child_props.onContextMenu = (event) => {
							let menu = DCM.buildMenu([{
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
				}
			});
		}

		// Patch emoji picker categories
		patchEmojiPickerCategories() {
			EmojiUtils.originalCategories = EmojiUtils.categories;
			Object.defineProperty(EmojiUtils, "categories", {writable: true, value: [this.labels.category, ...EmojiUtils.originalCategories]});

			// Add custom category
			Patcher.after(EmojiStore, "getByCategory", (self, args) => {
				if (args[0] == this.labels.category) {
					return this.customEmojis;
				}
			});

			// Give the fake categories an icon
			const EmojiCategoryIcon = WebpackModules.getModule(m => m.default && m.default.type && m.default.type.toString().includes("FOOD"));
			Patcher.after(EmojiCategoryIcon.default, "type", (self, [props]) => {
				if (props.categoryId == this.labels.category) {
					return DiscordModules.React.createElement(CustomEmojiCategoryIcon, props);
				}
			});
		}

		// Patch the stickers
		patchStickers() {
			Patcher.after(this.stickerPerms, "isSendableSticker", (self, args, retval) => {
				if (this.useFakeIsSendableSticker) {
					return true;
				}
			});

			const B = WebpackModules.getByProps(["isPremium"]);
			this.ogUseFilteredStickerPackCategories = this.stickerUse.useFilteredStickerPackCategories;
			this.stickerUse.useFilteredStickerPackCategories = (e) => {
				let ogIsPremium = B.isPremium;
				B.isPremium = () => true;
				let ret = this.ogUseFilteredStickerPackCategories(e);
				B.isPremium = ogIsPremium;
				return ret;
			}

			this.ogSendStickers = MessageActions.sendStickers;
			MessageActions.sendStickers = (channelID, stickerIDs, c, d, e) => {
				let args = [c, d, e];
				let remRef = true;
				for (let i in stickerIDs) {
					if (remRef && i != 0) {
						args[1] = {};
						remRef = false;
					}
					this.sendSticker(stickerIDs[i], channelID, [...args]);
				}
			};

			const C = WebpackModules.getByProps(["shouldAttachSticker"]);
			Patcher.after(C, "shouldAttachSticker", (self, args, retval) => {
				return false;
			});
		}

		// Send a sticker
		sendSticker(stickerID, channelID, args) {
			if (this.stickerSenderBusy) {
				this.queuedStickers.push({stickerID: stickerID, channelID: channelID, args: args});
				return;
			}
			this.stickerSenderBusy = true;
			let sticker = this.stickerStore.getStickerById(stickerID);
			let refInfo = args[1];
			if (this.hasPermToSendSticker(sticker, channelID)) {
				this.ogSendStickers(channelID, [stickerID], args[0], refInfo, args[2]);
				this.sendNextStickerInQueue();
				return;
			}
			let url = this.getUrlForSticker(stickerID);
			if (url == undefined) {
				this.fetchAndSaveSticker(sticker, (resUrl) => {
					if (resUrl != null) {
						this.onStickerUrlReady(resUrl, channelID, stickerID, refInfo);
					} else {
						Toasts.error("Sticker upload failed.");
					}
				});
			} else {
				this.onStickerUrlReady(url, channelID, stickerID, refInfo);
			}
		}

		hasPermToSendSticker(sticker, channelID) {
			this.useFakeIsSendableSticker = false;
			let ret = this.stickerPerms.isSendableSticker(sticker, UserStore.getCurrentUser(), ChannelStore.getChannel(channelID));
			this.useFakeIsSendableSticker = true;
			return ret;
		}

		onStickerUrlReady(url, channelID, stickerID, refInfo) {
			this.sendStickerUrl(url, channelID, refInfo);
			Dispatcher.dispatch({type: ActionTypes.STICKER_TRACK_USAGE, stickerIds: [stickerID]});
			this.sendNextStickerInQueue();
		}

		sendStickerUrl(stickerUrl, channelID, refInfo) {
			let body = {
				content: stickerUrl,
				invalidEmojis: [],
				tts: false,
				validNonShortcutEmojis: []
			};
			MessageActions.sendMessage(channelID, body, undefined, refInfo);
		}

		sendNextStickerInQueue() {
			this.stickerSenderBusy = false;
			if (this.queuedStickers.length == 0) {
				return;
			}
			let f = this.queuedStickers[0];
			this.queuedStickers.splice(0, 1);
			this.sendSticker(f.stickerID, f.channelID, f.args);
		}

		// Patch the emoji context to allow stealing emojis from messages
		async patchEmojiComponent() {
			const Emoji = await ReactComponents.getComponentByName("Emoji", ".emoji");
			
			Patcher.after(Emoji.component.prototype, "render", (self, args, retval) => {
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
		patchMessageContextMenu() {
			const doPatchMessageContextMenu = () => {
				const MessageContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "MessageContextMenu");
				Patcher.after(MessageContextMenu, "default", (self, [props], retval) => {
					// If right clicking an emote.
					let target = props.target;
					if (target && target.classList && target.classList.contains("emoji")) {
						let newEntry = DCM.buildMenuChildren([{
							type: "group",
							items: [{
								label: this.labels.steal,
								closeOnClick: true,
								action: () => this.createCustomEmoji(this.currentEmojiContext)
							}]
						}]);
					
						let menu = retval.props.children;
						menu.splice(5, 0, newEntry);
						return;
					}
			
					// If right clicking an image.
					let image = props.attachment;
					if (image && image.content_type && image.content_type.startsWith("image")) {
						let newEntry = DCM.buildMenuChildren([{
								type: "group",
								items: [{
									label: this.labels.link,
									closeOnClick: true,
									action: () => this.linkCustomEmoji(image.url)
								}]
							}
						]);
						let menu = retval.props.children;
						menu.splice(5, 0, newEntry);
					}
				});
			}

			/* TODO: This is a temporary fix, opening the context menu at least
			   more than once is required to be able to use the extra options */
			this.hasPatchedMsgContext = false;
			Patcher.before(ContextMenuActions, "openContextMenuLazy", (self, args) => {
				args[1] = ((original) => {
					return (args) => {
						return original(args).then((render) => {
							return (props) => {
								var ret = render(props);
								console.log([ret, props]);
								if (!this.hasPatchedMsgContext) {
									doPatchMessageContextMenu();
									this.hasPatchedMsgContext = true;
								}
								return ret;
							};
						});
					};
				})(args[1]);
			});
		}

		// Patch the message sender
		patchSendMessage() {
			Patcher.instead(MessageActions, "sendMessage", (self, [channel, message, c, info], sendMessage) => {
				message.invalidEmojis = [];
				var txt = message.content;
				var matches = this.findEmojisInText(txt, channel);
				var ref = { info: info };
				this.sendNextMessage(txt, matches, 0, 0, channel, message, c, ref, sendMessage);
			});
		}

		// Update the text on language change
		patchSetLocale() {
			Patcher.after(LocaleManager, "setLocale", (self, [locale]) => {
				this.labels = this.loadLabels();
				Object.defineProperty(EmojiUtils, "categories", {writable: true, value: [this.labels.category, ...EmojiUtils.originalCategories]});
			});
		}

		sendNextMessage(txt, matches, matchIndex, lastIndex, channel, message, c, ref, sendMessage) {
			const sendTextMessage = (txt, wait, onSent) => {
				txt = txt.trim();
				if (txt.length != 0) {
					var message2 = {...message};
					message2.content = txt;
					sendMessage(channel, message2, c, ref.info);
					ref.info = undefined; // we do not want to reply to messages anymore
					if (onSent != null) {
						if (wait) {
							setTimeout(onSent(), 50);
						} else {
							onSent();
						}
						return;
					}
				}
				if (onSent != null) {
					onSent();
				}
			}

			const onEmojiReady = (emoji, url, wait, onSent) => {
				sendTextMessage(url, wait, onSent);
				Dispatcher.dispatch({
					type: ActionTypes.EMOJI_TRACK_USAGE,
					emojiUsed: [emoji]
				});
			}

			const sendEmojiMessage = (emoji, custom, onSent) => {
				if (custom) {
					sendTextMessage(emoji.url, true, onSent);
					return;
				}
				if (this.settings.sendEmojiLink) {
					var resUrl = this.optimizeContentUrl(emoji.url, 48);
					onEmojiReady(emoji, resUrl, true, onSent);
					return;
				}
				var url = this.getUrlForEmoji(emoji.id);
				if (url == undefined) {
					this.fetchAndSaveEmoji(emoji, (resUrl) => {
						if (resUrl != null) {
							this.setUrlForEmoji(emoji.id, resUrl);
							onEmojiReady(emoji, resUrl, false, onSent);
						} else { // failed, just ignore emoji
							Toasts.error("Emoji upload failed.");
							if (onSent != null) {
								onSent();
							}
						}
					});
				} else {
					onEmojiReady(emoji, url, true, onSent);
				}
			}

			if (matchIndex == matches.length) {
				sendTextMessage(txt.substr(lastIndex, txt.length - lastIndex), false, null);
				return;
			}
			var match = matches[matchIndex];
			var index = match.index;
			sendTextMessage(txt.substr(lastIndex, index - lastIndex), true, () => {
				sendEmojiMessage(match.emoji, match.custom, () => {
					this.sendNextMessage(txt, matches, matchIndex + 1, index + match.length, channel, message, c, ref, sendMessage);
				});
			});
		}

		findEmojisInText(txt, channelID) {
			let channel = ChannelStore.getChannel(channelID);
			let matches = [];
			EMOJI_RE.lastIndex = 0;
			let m;
			while ((m = EMOJI_RE.exec(txt)) != null) {
				let id = m[3];
				let custom = this.isEmojiCustom(id);
				let emoji = custom ? this.getCustomEmojiByID(id) : EmojiUtils.getCustomEmojiById(id);
				if ((emoji != null && EmojiInfo.isEmojiDisabled(emoji, channel, 3, 0)) || custom) {
					let match = {
						index: m.index,
						length: m[0].length,
						emoji: emoji,
						custom: custom
					}
					matches.push(match);
				}
			}
			return matches;
		}

		getUrlForEmoji(emojiID) {
			return this.urlForEmojiID.get(emojiID);
		}

		setUrlForEmoji(emojiID, url) {
			this.urlForEmojiID.set(emojiID, url);
			PluginUtilities.saveData(this.getName(), "urlForEmojiID", Object.fromEntries(this.urlForEmojiID));
		}

		fetchAndSaveEmoji(emoji, onSaved) {
			var onImageMade = (data) => {
				this.showToast(1);
				var ext = emoji.animated ? "gif" : "png";
				var channel = this.settings.emojiStoreChannelID;
				this.uploadImageData(emoji.name, data, ext, channel, (success) => {
					if (!success) {
						onSaved(null);
						return;
					}
					this.getUploadedUrl(channel, (emojiUrl) => {
						if (emojiUrl == null) {
							onSaved(null);
							return;
						}
						onSaved(emojiUrl);
					});
				});
			}

			this.showToast(0);
			if (emoji.animated) {
				this.makeGifImg(emoji.url, "gif", 48, 48, onImageMade);
			} else {
				var url = this.optimizeContentUrl(emoji.url, this.pica == null ? 48 : 4096);
				this.makePngImg(url, 48, 48, onImageMade);
			}
		}

		getFreeCustomEmojiID() {
			let id = 0;
			let i = 0;
			while (i < this.customEmojis.length) {
				if (parseInt(this.customEmojis[i].id) == id) {
					id++;
					i = 0;
					continue;
				}
				i++;
			}
			return id;
		}

		getCustomEmojiByID(id) {
			for (let i in this.customEmojis) {
				let customEmoji = this.customEmojis[i];
				if (customEmoji.id == id) {
					return customEmoji;
				}
			}
			return null;
		}

		isEmojiCustom(id) {
			return parseInt(id) < 4095;
		}

		getCustomEmojiByName(name) {
			return this.customEmojis.find(emoji => emoji.name == name);
		}

		createCustomEmojiFromURL(url) {
			let emoteName = url.toString().match(/.*\/(.+?)\./)[1];
			let id = this.getFreeCustomEmojiID();
			return new CustomEmoji(emoteName, url, id);
		}

		createCustomEmoji(emoji) {
			this.fetchAndSaveEmoji(emoji, (resUrl) => {
				if (resUrl != null) {
					this.linkCustomEmoji(resUrl);
				} else {
					Toasts.error("Emoji steal failed during upload.");
				}
			});
		}

		linkCustomEmoji(url) {
			this.customEmojiData.push(url);
			let emoji = this.createCustomEmojiFromURL(url);
			this.customEmojis.push(emoji);
			this.saveCustomEmojiData();
		}

		unlinkCustomEmoji(emoji) {
			let index = this.customEmojiData.indexOf(emoji.url);
			this.customEmojiData.splice(index, 1);
			this.customEmojis.splice(index, 1);
			this.saveCustomEmojiData();
		}

		saveCustomEmojiData() {
			PluginUtilities.saveData(this.getName(), "customEmojis", this.customEmojiData);
		}

		getUrlForSticker(stickerID) {
			return this.urlForStickerID.get(stickerID);
		}

		setUrlForSticker(stickerID, url) {
			this.urlForStickerID.set(stickerID, url);
			PluginUtilities.saveData(this.getName(), "urlForStickerID", Object.fromEntries(this.urlForStickerID));
		}

		fetchAndSaveSticker(sticker, onSaved) {
			var onImageMade = (data, ext) => {
				var channel = this.settings.stickerStoreChannelID;
				this.showToast(3);
				this.uploadImageData(sticker.name, data, ext, channel, (success) => {
					if (!success) {
						onSaved(null);
						return;
					}
					this.getUploadedUrl(channel, (stickerUrl) => {
						if (stickerUrl == null) {
							onSaved(null);
							return;
						}
						this.setUrlForSticker(sticker.id, stickerUrl);
						onSaved(stickerUrl);
					});
				});
			}

			var url = this.optimizeContentUrl(this.stickerInfo.getStickerAssetUrl(sticker), this.pica == null ? 160 : 4096);
			var format = sticker.format_type;
			if (format != 3) {
				this.showToast(2);
				if (format == 1) {
					this.makePngImg(url, 160, 160, (data) => onImageMade(data, "png"));
				} else if (format == 2) {
					this.makeGifImg(url, "apng", 160, 160, (data) => onImageMade(data, "gif"));
				}
			}
			else {
				this.showToast(4);
				this.makeGifImgFromLottie(url, 160, 160, (data) => onImageMade(data, "gif"));
			}
		}

		optimizeContentUrl(url, size) {
			var extBeg = url.lastIndexOf(".") + 1;
			var extEnd = url.indexOf("?", extBeg);
			if (extEnd == -1) { extEnd = url.length; }
			var ext = url.substring(extBeg, extEnd);
			if (ext == "webp") { ext = "png"; }
			var resUrl = url.substr(0, extBeg) + ext + "?size=" + size;
			return resUrl;
		}

		uploadImageData(name, data, ext, channelID, onUploaded) {
			const file = new File([data], "image." + ext, {type: "image/" + ext});
			const fileName = name + "." + ext;

			this.waitingForUpload = true;
			this.uploadFinishedCallback = onUploaded;

			var textInfo = {content: "", invalidEmojis: [], tts: false, validNonShortcutEmojis: []};
			var uploadInfo = {
				channelId: channelID,
				file: file,
				draftType: 0,
				message: textInfo,
				hasSpoiler: false,
				fileName: fileName
			};
			this.uploader.upload(uploadInfo);
		}

		handleUploadActionEvent(success) {
			if (this.waitingForUpload) {
				this.uploadFinishedCallback(success);
				this.uploadFinishedCallback = null;
				this.waitingForUpload = false;
			}
		}

		onUploadComplete = () => this.handleUploadActionEvent(true);
		onUploadFail = () => this.handleUploadActionEvent(false);

		getUploadedUrl(channel, onReceived) {
			var channelID = channel;
			var queryInfo = {
				channelId: channelID,
				limit: 1
			};
			MessageActions.fetchMessages(queryInfo).then((success) => {
				if (!success) {
					onReceived(null);
					return;
				}
				var messages = MessageStore.getMessages(channelID);
				var message = messages.last();
				var url = message.attachments[0].url;
				onReceived(url);
			});
		}

		makePngImg(srcUrl, destWidth, destHeight, onPngMade) {
			if (this.pica != null) {
				this.makePngImgPica(srcUrl, destWidth, destHeight, onPngMade);
				return;
			}
			var img = new Image();
			img.onload = () => {
				var canvas = document.createElement('canvas');
				canvas.width = destWidth;
				canvas.height = destHeight;

				var ctx = canvas.getContext('2d');

				var hRatio = canvas.width / img.width;
				var vRatio = canvas.height / img.height;
				var ratio = Math.min(hRatio, vRatio);
				var centerShift_x = (canvas.width - img.width * ratio) / 2;
				var centerShift_y = (canvas.height - img.height * ratio) / 2;
				ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

				var data = canvas.toDataURL("image/png").substring(22);
				var buffer = Uint8Array.from(window.atob(data), c => c.charCodeAt(0));
				onPngMade(buffer);
			}
			img.crossOrigin = "anonymous";
			img.src = srcUrl;
		}

		makePngImgPica(srcUrl, destWidth, destHeight, onPngMade) {
			var srcImg = new Image();
			srcImg.onload = () => {
				var rWidth = destWidth;
				var rHeight = destHeight;
				if (srcImg.width != srcImg.height) {
					if (srcImg.width > srcImg.height) {
						rHeight = srcImg.height / (srcImg.width / destWidth);
					} else {
						rWidth = srcImg.width / (srcImg.height / destHeight);
					}
				}
				var picaCanvas = document.createElement("canvas");
				picaCanvas.width = rWidth;
				picaCanvas.height = rHeight;
				this.pica.resize(srcImg, picaCanvas).then((rPicaCanvas) => {
					var finalCanvas = document.createElement("canvas");
					finalCanvas.width = destWidth;
					finalCanvas.height = destHeight;

					var centerShiftX = (destWidth - rWidth) / 2;
					var centerShiftY = (destHeight - rHeight) / 2;
					var ctx = finalCanvas.getContext('2d');
					ctx.drawImage(rPicaCanvas, centerShiftX, centerShiftY);

					var data = finalCanvas.toDataURL("image/png").substring(22);
					var buffer = Uint8Array.from(window.atob(data), c => c.charCodeAt(0));
					onPngMade(buffer);
				});
			}
			srcImg.crossOrigin = "anonymous";
			srcImg.src = srcUrl;
		}

		makeGifImg(srcUrl, srcFmt, destWidth, destHeight, onGifMade) {
			if (!this.hasValidFFmpeg()) {
				this.warnMissingFFmpeg();
				return;
			}

			fetch(srcUrl).then(image => {
				image.arrayBuffer().then(arrayBuffer => {
					var buffer = Buffer.from(arrayBuffer);
					var inputFile = this.getTempFile("input." + srcFmt);
					fs.writeFile(inputFile, buffer, (writeErr) => {
						if (writeErr) {
							onGifMade(null);
							return;
						}
						var outputFile = this.getTempFile("output.gif");
						exec("\"" + this.settings.ffmpegPath +
							"\" -y -i \"" + inputFile + "\" -filter_complex \"[0:v] scale=" + destWidth + ":" + destHeight +
							":force_original_aspect_ratio=decrease:flags=lanczos,pad=" + destWidth + ":" + destHeight +
							":-1:-1:color=0x00000000, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse\" \"" +
							outputFile + "\"",
							(error, stdout, stderr) => {
								if (error) {
									onGifMade(null);
									return;
								}
								fs.readFile(outputFile, (readErr, data) => {
									if (readErr) {
										onGifMade(null);
										return;
									}
									onGifMade(data);
									fs.unlink(inputFile, (err) => {});
									fs.unlink(outputFile, (err) => {});
								});
							}
						);
					});
				});
			});
		}

		makeGifImgFromLottie(srcUrl, destWidth, destHeight, onGifMade) {
			if (this.renderLottie == null) {
				this.warningMissingLottie();
				return;
			}
			if (!this.hasValidChromium()) {
				this.warnMissingChromium();
				return;
			}
			if (!this.hasValidFFmpeg()) {
				this.warnMissingFFmpeg();
				return;
			}

			fetch(srcUrl).then(lottieData => {
				lottieData.arrayBuffer().then(arrayBuffer => {
					var buffer = Buffer.from(arrayBuffer);
					var inputFile = this.getTempFile("lottie.json");
					var frameRate = this.getLottieInfo(buffer).fr;
					fs.writeFile(inputFile, buffer, (writeErr) => {
						if (writeErr) {
							onGifMade(null);
							return;
						}
						var lottieDir = this.getTempFile("lottie/");
						if (!fs.existsSync(lottieDir)) {
							fs.mkdirSync(lottieDir);
						}
						const puppeteerOptions = Object.create(null); // plain object moment
						puppeteerOptions.executablePath = this.settings.chromiumPath;
						this.renderLottie({
							path: inputFile,
							output: (lottieDir + "%d.png"),
							width: destWidth,
							height: destHeight,
							puppeteerOptions: puppeteerOptions
						}).then(() => {
							var inputFrames = this.getTempFile("lottie/%d.png");
							var outputFile = this.getTempFile("lottie.gif");
							exec("\"" + this.settings.ffmpegPath + "\" -y -framerate " + frameRate + " -i \"" + inputFrames + "\" -filter_complex \"[0:v] fps=50,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse\" \"" + outputFile + "\"",
								(error, stdout, stderr) => {
									if (error) {
										onGifMade(null);
										return;
									}
									fs.readFile(outputFile, (readErr, data) => {
										if (readErr) {
											onGifMade(null);
											return;
										}
										onGifMade(data);
										fs.unlink(inputFile, (err) => {});
										fs.unlink(outputFile, (err) => {});
										fs.rmSync(lottieDir, { recursive: true, force: true });
									});
								}
							);
						});
					});
				});
			});
		}

		getLottieInfo(buffer) {
			return JSON.parse(buffer.toString());
		}

		getTempFile(name) {
			return this.tempDir + name;
		}

		setupTempFolder() {
			this.tempDir = BdApi.Plugins.folder + "/EmojiSenderMagic/";
			if (!fs.existsSync(this.tempDir)) {
				fs.mkdir(this.tempDir, (err) => {});
			}
		}

		loadPica() {
			this.pica = null;
			try {
				this.pica = require("pica")();
			} catch (exception) {
				if (this.settings.picaWarnShown)
					return;
				this.warningMissingPica();
				this.settings.picaWarnShown = true;
				PluginUtilities.saveSettings(this.getName(), this.settings);
			}
		}

		loadPuppeteerLottie() {
			this.renderLottie = null;
			try {
				this.renderLottie = require("puppeteer-lottie");
			} catch (exception) {
				if (this.settings.lottieWarnShown)
					return;
				this.warningMissingLottie();
				this.settings.lottieWarnShown = true;
				PluginUtilities.saveSettings(this.getName(), this.settings);
			}
		}

		warningMissingPica() {
			Modals.showAlertModal("Pica module missing!",
			"Please install 'pica' for Node.js to be able to send higher quality PNGs.\n\nhttps://www.npmjs.com/package/pica");
		}

		warningMissingLottie() {
			Modals.showAlertModal("Puppeteer Lottie module missing!",
			"Please install 'puppeteer-lottie' for Node.js to be able to send native stickers.\n\nhttps://www.npmjs.com/package/puppeteer-lottie");
		}

		warnMissingChromium() {
			Modals.showAlertModal("Chromium executable not found!",
			"Please specify a valid path to the Chromium executable in the plugin settings.");
		}

		hasValidChromium() {
			return fs.existsSync(this.settings.chromiumPath);
		}

		warnMissingFFmpeg() {
			Modals.showAlertModal("FFmpeg executable not found!",
			"Please specify a valid path to the FFmpeg executable in the plugin settings.");
		}

		hasValidFFmpeg() {
			return fs.existsSync(this.settings.ffmpegPath);
		}

		showToast(id) {
			if (!this.settings.enableToasts) { return; }
			if (id == 4) {
				Toasts.info("Converting native sticker...");
				Toasts.info("This will take around 15 seconds.");
				return;
			}
			var msg;
			switch (id) {
				case 0: { msg = "Converting emoji..."; break; }
				case 1: { msg = "Uploading emoji..."; break; }
				case 2: { msg = "Converting sticker..."; break; }
				case 3: { msg = "Uploading sticker..."; break; }
			}
			Toasts.info(msg);
		}

		loadLabels() {
			switch (UserSettingsStore.locale) {
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
	};
	};

	return plugin(Plugin, Api);
	})(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/
