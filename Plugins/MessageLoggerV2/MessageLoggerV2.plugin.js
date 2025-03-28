/**
 * @name MessageLoggerV2
 * @version 2.6.6.2.99
 * @invite NYvWdN5
 * @source https://github.com/Davilarek/MessageLoggerV2-fixed/blob/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js
 * @updateUrl https://gitea.slowb.ro/Davilarek/MessageLoggerV2-fixed/raw/branch/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js
 */
/*@cc_on
@if (@_jscript)
  // Offer to self-install for clueless users that try to run this directly.
  var shell = WScript.CreateObject('WScript.Shell');
  var fs = new ActiveXObject('Scripting.FileSystemObject');
  var pathPlugins = shell.ExpandEnvironmentStrings('%APPDATA%\\BetterDiscord\\plugins');
  var pathSelf = WScript.ScriptFullName;
  // Put the user at ease by addressing them in the first person
  shell.Popup('It looks like you\'ve mistakenly tried to run me directly. \n(Don\'t do that!)', 0, 'I\'m a plugin for BetterDiscord', 0x30);
  if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
    shell.Popup('I\'m in the correct folder already.\nJust go to settings, plugins and enable me.', 0, 'I\'m already installed', 0x40);
  } else if (!fs.FolderExists(pathPlugins)) {
    shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
  } else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
    fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
    // Show the user where to put plugins in the future
    shell.Exec('explorer ' + pathPlugins);
    shell.Popup('I\'m installed!\nJust go to settings, plugins and enable me!', 0, 'Successfully installed', 0x40);
  }
  WScript.Quit();
@else @*/
// extra TODOs:
// special edited message https://i.clouds.tf/guli/mric.png
// modal for checking which servers/channels/users are blacklisted/whitelisted
// option to show all hidden

const customUpdate = false;

const MLV2_TYPE_L1 = Symbol('MLV2_TYPE_L1');
const MLV2_TYPE_L2 = Symbol('MLV2_TYPE_L2');
const MLV2_TYPE_L3 = Symbol('MLV2_TYPE_L3');

const REPO_MAIN_URL = "https://gitea.slowb.ro/Davilarek/MessageLoggerV2-fixed/raw/branch";

module.exports = class MessageLoggerV2 {
  getName() {
    return 'MessageLoggerV2';
  }
  getVersion() {
	// this.alreadyTestedForUpdate = false;
    return '2.6.6.2.99';
  }
  getAuthor() {
    return 'Lighty, Davilarek';
  }
  getDescription() {
    return 'Saves all deleted and purged messages, as well as all edit history and ghost pings. With highly configurable ignore options, and even restoring deleted messages after restarting Discord.';
  }
  load() { }
  start() {
	if (this.updateTimeout)
		clearTimeout(this.updateTimeout);
    let onLoaded = () => {
      try {
        if (global.ZeresPluginLibrary && !this.UserStore) this.UserStore = ZeresPluginLibrary.WebpackModules.getByProps('getCurrentUser', 'getUser');
        if (!global.ZeresPluginLibrary || !this.UserStore || !(this.localUser = this.UserStore.getCurrentUser())) setTimeout(onLoaded, 1000);
        else this.initialize();
      } catch (err) {
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Failed to start!', err);
        ZeresPluginLibrary.Logger.err(this.getName(), `If you cannot solve this yourself, contact ${this.getAuthor()} and provide the errors shown here.`);
        this.stop();
        XenoLib.Notifications.error(`[**${this.getName()}**] Failed to start! Try to CTRL + R, or update the plugin, like so\n![image](https://i.imgur.com/tsv6aW8.png)`, { timeout: 0 });
      }
    };
    this.pluginDir = (BdApi.Plugins && BdApi.Plugins.folder) || window.ContentManager.pluginsFolder;
    this.__isPowerCord = !!window.powercord && typeof BdApi.__getPluginConfigPath === 'function' || typeof global.isTab !== 'undefined';
    let XenoLibOutdated = false;
    let ZeresPluginLibraryOutdated = false;
    if (global.BdApi && BdApi.Plugins && typeof BdApi.Plugins.get === 'function' /* you never know with those retarded client mods */) {
      const versionChecker = (a, b) => ((a = a.split('.').map(a => parseInt(a))), (b = b.split('.').map(a => parseInt(a))), !!(b[0] > a[0])) || !!(b[0] == a[0] && b[1] > a[1]) || !!(b[0] == a[0] && b[1] == a[1] && b[2] > a[2]);
      const isOutOfDate = (lib, minVersion) => lib && lib._config && lib._config.info && lib._config.info.version && versionChecker(lib._config.info.version, minVersion) || typeof global.isTab !== 'undefined';
      let iXenoLib = BdApi.Plugins.get('XenoLib');
      let iZeresPluginLibrary = BdApi.Plugins.get('ZeresPluginLibrary');
      if (iXenoLib && iXenoLib.instance) iXenoLib = iXenoLib.instance;
      if (iZeresPluginLibrary && iZeresPluginLibrary.instance) iZeresPluginLibrary = iZeresPluginLibrary.instance;
      if (isOutOfDate(iXenoLib, '1.4.11')) XenoLibOutdated = true;
      if (isOutOfDate(iZeresPluginLibrary, '2.0.3')) ZeresPluginLibraryOutdated = true;
    }
    if (!global.XenoLib || !global.ZeresPluginLibrary || XenoLibOutdated || ZeresPluginLibraryOutdated) {
      this._XL_PLUGIN = true;
      const a = !!window.powercord && "function" == typeof BdApi.__getPluginConfigPath,
        b = BdApi.findModuleByProps("openModal", "hasModalOpen");
      if (b && b.hasModalOpen(`${this.getName()}_DEP_MODAL`)) return;
      const c = !global.XenoLib,
        d = !global.ZeresPluginLibrary,
        e = c && d || (c || d) && (XenoLibOutdated || ZeresPluginLibraryOutdated),
        f = (() => {
          let a = "";
          return c || d ? a += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? " and outdated" : ""} ` : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (a += `Outdated `), a += `${e ? "Libraries" : "Library"} `, a
        })(),
        g = (() => {
          let a = `The ${e ? "libraries" : "library"} `;
          return c || XenoLibOutdated ? (a += "XenoLib ", (d || ZeresPluginLibraryOutdated) && (a += "and ZeresPluginLibrary ")) : (d || ZeresPluginLibraryOutdated) && (a += "ZeresPluginLibrary "), a += `required for ${this.getName()} ${e ? "are" : "is"} ${c || d ? "missing" : ""}${XenoLibOutdated || ZeresPluginLibraryOutdated ? c || d ? " and/or outdated" : "outdated" : ""}.`, a
        })(),
        h = BdApi.findModuleByDisplayName("Text") || BdApi.findModule(e => e.Text?.displayName === 'Text')?.Text,
        i = BdApi.findModuleByDisplayName("ConfirmModal"),
        j = () => BdApi.alert(f, BdApi.React.createElement("span", {
          style: {
            color: "white"
          }
        }, BdApi.React.createElement("div", {}, g), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`, d || ZeresPluginLibraryOutdated ? BdApi.React.createElement("div", {}, BdApi.React.createElement("a", {
          href: "https://betterdiscord.app/Download?id=9",
          target: "_blank"
        }, "Click here to download ZeresPluginLibrary")) : null, c || XenoLibOutdated ? BdApi.React.createElement("div", {}, BdApi.React.createElement("a", {
          href: "https://astranika.com/bd/xenolib",
          target: "_blank"
        }, "Click here to download XenoLib")) : null));
      if (!b || !i || !h) return console.error(`Missing components:${(b ? "" : " ModalStack") + (i ? "" : " ConfirmationModalComponent") + (h ? "" : "TextElement")}`), j();
      class k extends BdApi.React.PureComponent {
        constructor(a) {
          super(a), this.state = {
            hasError: !1
          }, this.componentDidCatch = a => (console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({
            hasError: !0
          }), "function" == typeof this.props.onError && this.props.onError(a)), this.render = () => this.state.hasError ? null : this.props.children
        }
      }
      let l = false,
        m = !1;
      const n = b.openModal(c => {
        if (m) return null;
        try {
          return BdApi.React.createElement(k, {
            label: "missing dependency modal",
            onError: () => (b.closeModal(n), j())
          }, BdApi.React.createElement(i, Object.assign({
            header: f,
            children: BdApi.React.createElement(h, {
              size: h.Sizes?.SIZE_16,
              variant: 'text-md/normal',
              children: [`${g} Please click Download Now to download ${e ? "them" : "it"}.`]
            }),
            red: !1,
            confirmText: "Download Now",
            cancelText: "Cancel",
            onCancel: c.onClose,
            onConfirm: () => {
              if (l) return;
              l = !0;
              const c = require("request"),
                d = require("fs"),
                e = require("path"),
                f = BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder,
                g = () => global.XenoLib && !XenoLibOutdated ? (BdApi.isSettingEnabled("fork-ps-5") || BdApi.isSettingEnabled("autoReload")) && !a ? void 0 : void BdApi.showToast("Reload to load the libraries and plugin!") : void c(REPO_MAIN_URL + "/master/Plugins/1XenoLib.plugin.js", (c, g, h) => {
                  try {
                    if (c || 200 !== g.statusCode) return b.closeModal(n), j();
                    d.writeFile(e.join(f, "1XenoLib.plugin.js"), h, () => {
                      (BdApi.isSettingEnabled("fork-ps-5") || BdApi.isSettingEnabled("autoReload")) && !a || BdApi.showToast("Reload to load the libraries and plugin!")
                    })
                  } catch (a) {
                    console.error("Fatal error downloading XenoLib", a), b.closeModal(n), j()
                  }
                });
              !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? c("https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js", (a, c, h) => {
                try {
                  if (a || 200 !== c.statusCode) return b.closeModal(n), j();
                  d.writeFile(e.join(f, "0PluginLibrary.plugin.js"), h, () => { }), g()
                } catch (a) {
                  console.error("Fatal error downloading ZeresPluginLibrary", a), b.closeModal(n), j()
                }
              }) : g()
            }
          }, c, {
            onClose: () => { }
          })))
        } catch (a) {
          return console.error("There has been an error constructing the modal", a), m = !0, b.closeModal(n), j(), null
        }
      }, {
        modalKey: `${this.getName()}_DEP_MODAL`
      });
    } else onLoaded();
  }
  stop() {
	clearTimeout(this.updateTimeout);
    try {
      this.shutdown();
    } catch (err) {
      // ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Failed to stop!', err);
    }
  }
  getChanges() {
    return [
      {
        title: 'Fixed',
        type: 'fixed',
        items: ['Fixed incompatibility with another plugin by Tharki.']
      }
    ];
  }
  
  checkNewUpdate() {
	this.updateTimeout = setTimeout(() => {
		if (customUpdate && !this.alreadyTestedForUpdate)
		{
			this.alreadyTestedForUpdate = true;
			const fs = require('fs');
			const https = require('https');

			const currentFile = __filename;

			const currentVersion = this.getVersion();
			const downloadUrl = "http" + fs.readFileSync(currentFile).split("\n").filter(x => x.startsWith(" * @updateUrl"))[0].split("http")[1];

			https.get(downloadUrl, { headers: { 'origin': 'discord.com' } }, (res) => {
			  // let newVersion = '';
			  let chunks = [];
			  res.on('data', (chunk) => {
				// newVersion += chunk;
				chunks.push(chunk);
			  });
			  res.on('end', (r) => {
				if (r.statusCode > 399)
				{
					XenoLib.Notifications.error("[" + this.getName() + "] Bad response from Github, code: " + r.statusCode);
					return;
				}
			  
				const buffer = Buffer.concat(chunks);
				const uint8Array = Uint8Array.from(buffer);
				const textDecoder = new TextDecoder();
				const newVersion = textDecoder.decode(uint8Array);
				
				const newVersionNumber = newVersion.split("\n").filter(x => x.startsWith(" * @version"))[0].split(" * @version")[1].split(" ")[1];

				if (newVersionNumber == currentVersion) {
				  // console.log('Current version is up to date');
				  ZeresPluginLibrary.Logger.info(this.getName(), 'Current version is up to date');
				  XenoLib.Notifications.info("[" + this.getName() + "] Current version is up to date");
				  return;
				}
				ZeresPluginLibrary.Logger.info(this.getName(), 'Update found');
				XenoLib.Notifications.info("[" + this.getName() + "] Update found");
				BdApi.UI.showConfirmationModal(this.getName() + " update available", "Do you want to install latest update?\n\nCurrent version: " + this.getVersion() + "\n\nNew version: " + newVersionNumber, { cancelText: "No", confirmText: "Yes", onConfirm: () => {
					// const tmpFile = `${currentFile}.tmp`;
					fs.writeFileSync(currentFile, newVersion);

					// fs.renameSync(tmpFile, currentFile);
					XenoLib.Notifications.success(`[${this.getName()}] Successfully updated!`);
					BdApi.Plugins.reload(this.getName());
				} });
			  });
			});
		}
	}, 10 * 1000);
  }
  
  setupUpdate() {
	this.checkNewUpdate();
	if (!document.mouseMoveListenerAdded) {
		let timeoutId;
		let thisThis = this;
		function resetTimer() {
		  clearTimeout(timeoutId);
		  timeoutId = setTimeout(function() {
			  XenoLib.Notifications.info("[" + thisThis.getName() + "] Checking for update");
			  thisThis.alreadyTestedForUpdate = false;
			  thisThis.checkNewUpdate();
		  }, 10 * 60 * 1000);
		}
		document.addEventListener("mousemove", resetTimer);
		document.mouseMoveListenerAdded = true;
	}
  }
  
  initialize() {
    if (this.__started) return XenoLib.Notifications.warning(`[**${this.getName()}**] Tried to start twice..`, { timeout: 0 });
    this.__started = true;
    /*
     * why are we letting Zere, the braindead American let control BD when he can't even
     * fucking read clearly documented and well known standards, such as __filename being
     * the files full fucking path and not just the filename itself, IS IT REALLY SO HARD
     * TO FUCKING READ?! https://nodejs.org/api/modules.html#modules_filename
     */
    const _zerecantcode_path = require('path');
    const theActualFileNameZere = _zerecantcode_path.join(__dirname, _zerecantcode_path.basename(__filename));
    XenoLib.changeName(theActualFileNameZere, 'MessageLoggerV2'); /* To everyone who renames plugins: FUCK YOU! */
    try {
      ZeresPluginLibrary.WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.getName()}_DEP_MODAL`);
    } catch (e) { }
    // force update
    try {
      ZeresPluginLibrary.PluginUpdater.checkForUpdate(this.getName(), this.getVersion(), REPO_MAIN_URL + '/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js');
    } catch (err) {}
    if (window.PluginUpdates && window.PluginUpdates.plugins) delete PluginUpdates.plugins['https://gitlab.com/_Lighty_/bdstuff/raw/master/public/plugins/MessageLoggerV2.plugin.js'];
    if (BdApi.Plugins && BdApi.Plugins.get('NoDeleteMessages') && BdApi.Plugins.isEnabled('NoDeleteMessages')) XenoLib.Notifications.warning(`[**${this.getName()}**] Using **NoDeleteMessages** with **${this.getName()}** is completely unsupported and will cause issues. Please either disable **NoDeleteMessages** or delete it to avoid issues.`, { timeout: 0 });
    if (BdApi.Plugins && BdApi.Plugins.get('SuppressUserMentions') && BdApi.Plugins.isEnabled('SuppressUserMentions')) XenoLib.Notifications.warning(`[**${this.getName()}**] Using **SuppressUserMentions** with **${this.getName()}** is completely unsupported and will cause issues. Please either disable **SuppressUserMentions** or delete it to avoid issues.`, { timeout: 0 });
    const shouldPass = e => e && e.constructor && typeof e.constructor.name === 'string' && e.constructor.name.indexOf('HTML');
    let defaultSettings = {
      obfuscateCSSClasses: true,
      autoBackup: false,
      dontSaveData: false,
      displayUpdateNotes: true,
      ignoreMutedGuilds: true,
      ignoreMutedChannels: true,
      ignoreBots: true,
      ignoreSelf: false,
      ignoreBlockedUsers: true,
      ignoreNSFW: false,
      ignoreLocalEdits: false,
      ignoreLocalDeletes: false,
      alwaysLogGhostPings: false,
      showOpenLogsButton: true,
      messageCacheCap: 1000,
      savedMessagesCap: 1000,
      reverseOrder: true,
      onlyLogWhitelist: true,
      whitelist: [],
      blacklist: [],
      notificationBlacklist: [],
      toastToggles: {
        sent: false,
        edited: true,
        deleted: true,
        ghostPings: true
      },
      toastTogglesDMs: {
        sent: false,
        edited: true,
        deleted: true,
        ghostPings: true,
        disableToastsForLocal: false
      },
      useNotificationsInstead: true,
      blockSpamEdit: false,
      disableKeybind: false,
      cacheAllImages: true,
      dontDeleteCachedImages: false,
	  newCacheAllImagesPath: '',
	  newCacheAllImages: false,
	  alwaysNotifChannel: false,
	  alwaysNotifGuild: false,
	  notifOnlyWhitelist: false,
	  notificationWhitelist: [],
      aggresiveMessageCaching: true,
      // openLogKeybind: [
      //   /* 162, 77 */
      // ], // ctrl + m on windows
      // openLogFilteredKeybind: [
      //   /* 162, 78 */
      // ], // ctrl + n on windows
      renderCap: 50,
      maxShownEdits: 0,
      hideNewerEditsFirst: true,
      displayDates: true,
      deletedMessageColor: '',
      editedMessageColor: '',
      useAlternativeDeletedStyle: false,
      showEditedMessages: true,
      showDeletedMessages: true,
      showPurgedMessages: true,
      showDeletedCount: true,
      showEditedCount: true,
      alwaysLogSelected: true,
      alwaysLogDM: true,
      restoreDeletedMessages: true,
      contextmenuSubmenuName: 'Message Logger',
      streamSafety: {
        showEdits: false,
        showDeletes: false,
        showButton: false,
        showNotifications: false,
        showContextMenu: false
      },
      imageCacheDir: this.pluginDir + '/MLV2_IMAGE_CACHE',
      flags: 0,
      autoUpdate: true,
      versionInfo: ''
    };
    const Flags = {
      STOLEN: 1 << 0,
      STARTUP_HELP: 1 << 1
    };

    this.settings = ZeresPluginLibrary.PluginUtilities.loadSettings(this.getName(), defaultSettings);
    let settingsChanged = false;

    if (!this.settings || !Object.keys(this.settings).length) {
      XenoLib.Notifications.error(`[${this.getName()}] Settings file corrupted! All settings restored to default.`, { timeout: 0 });
      this.settings = defaultSettings; // todo: does defaultSettings get changed?
      settingsChanged = true;
    }
    if (this.settings.versionInfo === '1.7.55') {
      this.settings = defaultSettings; // bad default settings
      settingsChanged = true;
    }
    // if (!this.settings.openLogKeybind.length) {
    //   this.settings.openLogKeybind = [162, 77];
    //   settingsChanged = true;
    // }
    // if (!this.settings.openLogFilteredKeybind.length) {
    //   this.settings.openLogFilteredKeybind = [162, 78];
    //   settingsChanged = true;
    // }

    if (this.settings.autoUpdate) {
      if (this._autoUpdateInterval) clearInterval(this._autoUpdateInterval);
      this._autoUpdateInterval = setInterval(_ => this.automaticallyUpdate(), 1000 * 60 * 60); // 1 hour
      this.automaticallyUpdate();
    }
    if (this.settings.versionInfo !== this.getVersion() && this.settings.displayUpdateNotes) {
      XenoLib.showChangelog(`${this.getName()} has been updated!`, this.getVersion(), this.getChanges());
      this.settings.versionInfo = this.getVersion();
      this.saveSettings();
      settingsChanged = false;
    }

    if (settingsChanged) this.saveSettings();

	this.translatedEdited = ZLibrary.WebpackModules.find(m => m.Messages && m._languages).Messages.MESSAGE_EDITED;
	this.imageRegex = /https:\/\/(?:cdn|media)\.discordapp\.(?:net|com)\/attachments\/\d+\/\d+\/[\w\-]+\.\w+/g
	this.errorImage = `<svg height="104" width="200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><mask id="a" fill="#fff"><path d="m0 86v-85.66h186.092v85.66z" fill="#fff" fill-rule="evenodd"/></mask><mask id="b" fill="#fff"><path d="m.8.998h47.02v48.524h-47.02z" fill="#fff" fill-rule="evenodd"/></mask><g fill="none" fill-rule="evenodd"><path d="m92.824 75.14c4.414-3.337 10.597-3.36 15.037-.06.45.33.58.983.25 1.425-.33.445-.91.566-1.36.24l-.07-.056c-3.73-2.78-8.93-2.76-12.64.04-.18.13-.39.2-.6.2-.3 0-.6-.14-.8-.4-.33-.44-.24-1.07.2-1.4m-15.671-17.729c2.882 0 5.218 2.335 5.218 5.217 0 2.88-2.336 5.215-5.217 5.215-2.88 0-5.21-2.336-5.21-5.216 0-2.883 2.34-5.22 5.22-5.22m46.96 0c2.88 0 5.22 2.337 5.22 5.22 0 2.88-2.33 5.215-5.21 5.215s-5.21-2.33-5.21-5.21 2.34-5.22 5.22-5.22m8.06 17.53c.49-.06.98-.16 1.46-.28.54-.14 1.09.17 1.23.71.15.53-.17 1.08-.7 1.23-.56.15-1.15.27-1.73.34-.04.01-.08.01-.12.01-.49 0-.93-.37-.99-.87-.07-.54.32-1.04.87-1.11m-49.181-55.641c-2.836.682-4.57 1.29-4.963 1.43l-.063.03c-3.54 1.43-5.83 4.822-5.83 8.636 0 2.096.72 4.1 2.08 5.797.01.01.014.023.02.03.004.007.01.01.014.014.028.038 2.78 3.767 7.73 4.16.55.042.96.524.917 1.075-.04.523-.477.92-.994.92-.02 0-.05 0-.08-.002-4.65-.37-7.59-3.135-8.7-4.382l-1.13.423c-.04.02-.08.04-.12.05-6.31 2.36-10.39 7.92-10.39 14.17 0 2.61.74 5.2 2.13 7.48.15.25.19.55.11.82-.08.28-.28.5-.54.62-7.74 3.47-12.74 11-12.74 19.2 0 11.71 9.83 21.23 21.9 21.23 7.97 0 16.76-1.53 26.13-4.56.74-.32 9.7-4.12 22.44-3.55.55.03.98.49.96 1.05s-.47 1.01-1.04.96c-8.77-.39-15.78 1.41-19.24 2.55 6.46 2.37 15.69 3.58 27.5 3.58 10.68 0 19.37-8.68 19.37-19.37 0-4.99-1.97-9.78-5.43-13.38-.79 1.86-2.52 4.96-5.73 6.95-.16.1-.34.15-.52.15-.33 0-.66-.17-.85-.47-.29-.47-.14-1.08.33-1.37 3.99-2.46 5.35-7.07 5.42-7.29 1-4.35.59-8.76-1.22-13.11-1.02-2.46-2.5-4.68-4.37-6.6-.37-.39-.37-1 0-1.382-.91-.85-1.89-1.62-2.92-2.31-.43 1.16-2.4 5.34-8.68 6.71-.07.013-.14.02-.21.02-.46 0-.87-.32-.97-.786-.12-.54.228-1.077.768-1.19 5.89-1.28 7.2-5.34 7.28-5.59.856-3.22.57-6.5-.854-9.755-2.04-4.65-6.38-8.04-11.68-9.17-.86 1.27-3.14 3.95-7.79 5.02-.07.02-.15.025-.22.025-.457 0-.87-.318-.976-.78-.126-.54.21-1.07.75-1.2 4.96-1.14 6.693-4.335 6.832-4.61.68-1.58.702-3.36.06-5.28-1.156-3.47-3.94-4.165-7.8-5.12-4.15-1.03-9.27-2.3-13.7-7.75-3.86 2.694-7.59 8.2-7.137 12.49.25 2.43 1.83 4.155 4.68 5.135.52.18.8.74.62 1.27-.18.52-.75.8-1.27.62-3.66-1.26-5.175-3.45-5.75-5.42-1.22.22-2.33.45-3.33.68.123.53-.205 1.07-.74 1.2" fill="#4f545c"/><g fill="#202225"><path d="m198 94.104h-6c-.552 0-1 .447-1 1s.448 1 1 1h6c.552 0 1-.447 1-1s-.448-1-1-1"/><path d="m185.092 77.102h-29.38c-3.894 0-6.745-3.65-5.818-7.433.396-1.62.606-3.31.606-5.04 0-5.14-1.873-10.09-5.212-13.96-.9-1.04-1.33-2.39-1.188-3.75.4-3.87-.202-7.83-1.78-11.61-1.124-2.7-2.736-5.13-4.79-7.23-.386-.4-1.02-.41-1.414-.02-.01.01-.012.02-.02.03-.37.38-.373.99.004 1.38 1.876 1.92 3.348 4.14 4.375 6.6 1.813 4.35 2.224 8.75 1.224 13.11-.07.21-1.43 4.83-5.42 7.29-.47.29-.62.9-.33 1.37.19.31.51.47.85.47.18 0 .36-.05.52-.15 1.11-.69 2.05-1.51 2.83-2.37 1.96-2.17 5.48-1.66 6.67 1.02 1.08 2.43 1.66 5.08 1.66 7.79 0 10.68-8.69 19.37-19.37 19.37-3.54 0-6.85-.11-9.92-.33-3.77-.26-3.57-5.91.21-5.84.48.01.96.02 1.45.05.56.05 1.02-.4 1.04-.96.02-.55-.4-1.02-.95-1.05-12.74-.58-21.7 3.23-22.44 3.55-9.34 3.06-18.13 4.6-26.1 4.6-12.08 0-21.9-9.52-21.9-21.23 0-8.2 4.99-15.73 12.73-19.2.26-.12.46-.34.54-.62s.04-.58-.11-.82c-1.4-2.28-2.13-4.87-2.13-7.48 0-.32.01-.63.03-.93.52-7.99 8.85-12.91 16.4-10.24 1.27.45 2.61.8 3.91.9h.08c.52 0 .95-.4 1-.92.05-.55-.36-1.04-.91-1.08-4.95-.39-7.7-4.12-7.73-4.16 0-.01-.01-.01-.01-.01 0-.01-.01-.02-.02-.03-1.36-1.7-2.08-3.7-2.08-5.8 0-3.82 2.29-7.21 5.83-8.64l.07-.03c.39-.15 2.13-.75 4.96-1.44.54-.13.87-.67.74-1.2s-.67-.86-1.2-.73c-3.36.81-5.21 1.51-5.29 1.54-.04.01-.07.03-.11.05-4.24 1.77-6.98 5.86-6.98 10.46 0 2.11.6 4.14 1.73 5.94l-.7.26c-.04.01-.08.03-.12.05-7.03 2.68-11.57 8.95-11.57 16 0 1.48.21 2.95.62 4.38.54 1.89-.21 3.89-1.81 5.03-6.09 4.32-9.84 11.26-9.84 18.7 0 2.32.35 4.55 1 6.66 1.18 3.82-1.8 7.66-5.8 7.66h-42.729c-.552 0-1 .45-1 1 0 .552.448 1 1 1h52.866c.95 0 1.873.33 2.588.96 4.233 3.731 9.824 5.981 15.946 5.981 8.084 0 16.968-1.532 26.413-4.554 6.837 3.064 16.76 4.554 30.317 4.554 5.654 0 10.786-2.22 14.61-5.818.737-.694 1.71-1.08 2.724-1.08h38.628c.552 0 1-.447 1-1s-.448-1-1-1" mask="url(#a)" transform="translate(0 17.002)"/><path d="m1.123 17.434c.577 1.977 2.092 4.162 5.748 5.42.53.177 1.1-.1 1.28-.62.18-.524-.1-1.093-.62-1.272-2.85-.98-4.43-2.708-4.68-5.132-.3-2.923 1.32-6.403 3.61-9.177 1.57-1.903 4.4-2.09 6.29-.498 3.71 3.132 7.64 4.107 10.95 4.93 3.86.956 6.64 1.648 7.8 5.12.64 1.924.62 3.702-.06 5.284-.14.27-1.87 3.46-6.83 4.6-.53.12-.87.66-.75 1.2.11.46.52.77.98.77.08 0 .15-.01.23-.03 1.41-.33 2.6-.8 3.6-1.34 5.78-3.1 13.11-.63 15.81 5.35l.06.14c1.43 3.25 1.71 6.53.85 9.75-.07.25-1.39 4.31-7.27 5.59-.54.12-.88.65-.76 1.19.1.47.52.79.98.79.07 0 .14-.01.22-.02 6.28-1.37 8.25-5.55 8.68-6.72.06-.17.09-.27.1-.3v-.02c.97-3.62.64-7.45-.95-11.08-2.24-5.12-6.93-8.88-12.68-10.24.48-1.74.39-3.61-.27-5.59-1.51-4.52-5.25-5.45-9.22-6.43-4.23-1.05-9.03-2.24-13.15-7.75-.31-.41-.87-.52-1.31-.26-4.801 2.881-9.481 9.551-8.911 14.941.046.446.133.917.275 1.4" mask="url(#b)" transform="translate(86 .002)"/><path d="m132.188 74.923c-.548.07-.936.57-.867 1.117.07.506.5.875 1 .875.04 0 .09-.003.13-.008.59-.073 1.17-.188 1.73-.34.54-.145.85-.695.71-1.228-.14-.54-.69-.85-1.22-.71-.47.13-.96.22-1.46.28m-55.041-17.509c-2.88 0-5.217 2.336-5.217 5.218 0 2.88 2.336 5.217 5.217 5.217 2.88 0 5.217-2.336 5.217-5.217 0-2.882-2.336-5.218-5.217-5.218m41.743 5.218c0 2.88 2.336 5.217 5.218 5.217s5.22-2.336 5.22-5.217c0-2.882-2.33-5.218-5.21-5.218s-5.21 2.336-5.21 5.218m-26.101 12.522c-.44.334-.526.962-.193 1.402.195.26.495.397.797.397.21 0 .42-.07.603-.21 3.71-2.81 8.91-2.83 12.645-.05l.077.05c.44.32 1.03.2 1.36-.24s.2-1.1-.25-1.43c-4.44-3.3-10.62-3.28-15.04.06m68.33-24.76h.51c.55 0 1 .44 1 1v.51c0 .55.45 1 1 1s1-.45 1-1v-.51c0-.56.45-1 1-1h.51c.55 0 1-.45 1-1 0-.56-.45-1-1-1h-.51c-.55 0-1-.45-1-1v-.51c0-.55-.45-1-1-1s-1 .45-1 1v.51c0 .55-.45 1-1 1h-.51c-.55 0-1 .44-1 1 0 .55.45 1 1 1m-139.469-6.609c.834 0 1.51.676 1.51 1.51 0 .553.448 1 1 1 .553 0 1-.447 1-1 0-.834.676-1.51 1.51-1.51.553 0 1-.447 1-1s-.447-1-1-1c-.834 0-1.51-.676-1.51-1.51 0-.552-.447-1-1-1-.552 0-1 .448-1 1 0 .834-.676 1.51-1.51 1.51-.552 0-1 .447-1 1s.448 1 1 1m135.61-25.23c.256 0 .512-.1.707-.294l1.184-1.184c.39-.39.39-1.023 0-1.414-.39-.39-1.02-.39-1.41 0l-1.18 1.184c-.39.39-.39 1.023 0 1.414.2.195.45.293.71.293m-5.91 5.91c.26 0 .51-.1.71-.3l1.19-1.19c.39-.39.39-1.03 0-1.42s-1.02-.39-1.41 0l-1.18 1.18c-.39.39-.39 1.02 0 1.41.2.19.45.29.71.29m6.39-.3c.2.19.45.29.71.29s.51-.1.71-.3c.39-.39.39-1.02 0-1.41l-1.18-1.19c-.39-.39-1.02-.39-1.41 0s-.39 1.03 0 1.42l1.19 1.18zm-5.91-5.92c.2.2.45.29.71.29s.51-.1.71-.3c.39-.39.39-1.02 0-1.42l-1.18-1.19c-.39-.39-1.02-.39-1.41 0s-.39 1.023 0 1.413l1.19 1.18zm-106.301 2.661c.83 0 1.51.68 1.51 1.51 0 .837-.68 1.51-1.51 1.51-.832 0-1.51-.673-1.51-1.51 0-.83.678-1.51 1.51-1.51m0 5.02c1.937 0 3.51-1.57 3.51-3.51 0-1.932-1.573-3.51-3.51-3.51-1.934 0-3.51 1.578-3.51 3.51 0 1.94 1.576 3.51 3.51 3.51"/></g><path d="m0 0h200v104h-200z"/></g></svg>`;

    this.nodeModules = {
      electron: require('electron'),
      request: require('request'),
      fs: require('fs'),
      path: require('path')
    };
	
	this.imageCacheServerSimulator = {
		"cached": {},
		"get": function (path) {
			if (!this.cached[path])
			{
				try {
					const parsedUrl = new URL(path);
					const parsedFile = require('path').parse(parsedUrl.pathname);
					
					let pathname = require('path').join(this.getSettings().imageCacheDir, parsedFile.base);
					
					const messageId = parsedUrl.hash.split(",")[2];
					const attachmentId = parsedUrl.hash.split(",")[1];
					
					if (!require("fs").existsSync(pathname))
						pathname = require('path').join(this.resolveNewCachePath({ channelId: parsedUrl.hash.split(",")[0].split("#")[1] }) + "/", attachmentId + ` (${messageId})` + parsedFile.ext);
					const image = require('fs').readFileSync(pathname, "");
					// const base64Image = Buffer.from(image).toString('base64');
					// const dataUri = `data:image/jpeg;base64,${base64Image}`;
					const arrayBuffer = image.buffer.slice(
					  image.byteOffset,
					  image.byteOffset + image.byteLength
					);
					const blob = new Blob([arrayBuffer], { type: 'image/' + parsedFile.ext.split(".")[1] });
					const dataUri = URL.createObjectURL(blob);
					this.cached[path] = dataUri;
				}
				catch (e)
				{
					console.log(e);
					return path;
				}
			}
			return this.cached[path];
		},
		"getSettings": () => { return this.settings; },
		"resolveNewCachePath": (options) => {
			let savePath = this.settings.newCacheAllImagesPath && this.settings.newCacheAllImagesPath != '' && require("fs").existsSync(this.settings.newCacheAllImagesPath) ? this.settings.newCacheAllImagesPath : this.settings.imageCacheDir;

			// const { serverId }
			let { channelId, serverId } = options;
			const channelData = ZLibrary.DiscordModules.ChannelStore.getChannel(channelId);
			if (!serverId)
				serverId = channelData.guild_id;
			let serverNameRaw = serverId != null ? ZLibrary.DiscordModules.GuildStore.getGuild(serverId).name : "DMs";
			let channelNameRaw = serverId != null ? channelData.name : channelData.recipients.length == 1 ? channelData.rawRecipients[0].username : "Unknown DM";
					
			let serverName = serverNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_. -]/g, "");
			let channelName = channelNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_. -]/g, "");
					
			let filePath = savePath + "/" + ( serverId != null ? serverId + " (" + serverName + ")" : serverName ) + "/" + channelId + " (" + channelName + ")";
			return filePath;
		},
	};

	this.nodeModules.electron.clipboard = {};
	this.nodeModules.electron.clipboard.write = DiscordNative.clipboard.copy;
	this.nodeModules.electron.clipboard.writeText = DiscordNative.clipboard.copy;

    let defaultConstruct = () => {
      return Object.assign(
        {},
        {
          messageRecord: {},
          deletedMessageRecord: {},
          editedMessageRecord: {},
          purgedMessageRecord: {}
        }
      );
    };
    let data;
    if (this.settings.dontSaveData) {
      data = defaultConstruct();
    } else {
      data = XenoLib.loadData(this.getName() + 'Data', 'data', defaultConstruct(), true);
      const isBad = map => !(map && map.messageRecord && map.editedMessageRecord && map.deletedMessageRecord && map.purgedMessageRecord && typeof map.messageRecord == 'object' && typeof map.editedMessageRecord == 'object' && typeof map.deletedMessageRecord == 'object' && typeof map.purgedMessageRecord == 'object');
      if (isBad(data)) {
        if (this.settings.autoBackup) {
          data = XenoLib.loadData(this.getName() + 'DataBackup', 'data', defaultConstruct(), true);
          if (isBad(data)) {
            XenoLib.Notifications.error(`[${this.getName()}] Data and backup files were corrupted. All deleted/edited/purged messages have been erased.`, { timeout: 0 });
            data = defaultConstruct();
          } else {
            XenoLib.Notifications.warning(`[${this.getName()}] Data was corrupted, loaded backup!`, { timeout: 5000 });
          }
        } else {
          XenoLib.Notifications.error(`[${this.getName()}] Data was corrupted! Recommended to turn on auto backup in settings! All deleted/edited/purged messages have been erased.`, { timeout: 0 });
          data = defaultConstruct();
        }
      }
    }
    /*
    const dataFileSize = this.nodeModules.fs.statSync(this.pluginDir + '/MessageLoggerV2Data.config.json').size / 1024 / 1024;
    // SEVERITY
    // 0 OK < 5MiB
    // 1 MILD < 10MiB
    // 2 DANGER < 20MiB
    // 3 EXTREME > 20MiB
    this.slowSaveModeStep = dataFileSize > 20 ? 3 : dataFileSize > 10 ? 2 : dataFileSize > 5 ? 1 : 0;
    ZeresPluginLibrary.Logger.info(this.getName(), `Data file size is ${dataFileSize.toFixed(2)}MB`);
    if (this.slowSaveModeStep) ZeresPluginLibrary.Logger.warn(this.getName(), 'Data file is too large, severity level', this.slowSaveModeStep);
*/

    this.messageStore = ZeresPluginLibrary.WebpackModules.getByProps('getMessages', 'getMessage');

    this.ChannelStore = ZeresPluginLibrary.WebpackModules.getByProps('getChannel', 'getDMFromUserId');
    if (!this.settings.dontSaveData) {
      const records = data.messageRecord;
      // data structure changed a wee bit, compensate instead of deleting user data or worse, erroring out
      for (let a in records) {
        const record = records[a];
        if (record.deletedata) {
          if (record.deletedata.deletetime) {
            record.delete_data = {};
            record.delete_data.time = record.deletedata.deletetime;
          }
          delete record.deletedata;
        } else if (record.delete_data && typeof record.delete_data.rel_ids !== 'undefined') delete record.delete_data.rel_ids;
        if (record.editHistory) {
          record.edit_history = [];
          for (let b in record.editHistory) {
            record.edit_history.push({ content: record.editHistory[b].content, time: record.editHistory[b].editedAt });
          }
          delete record.editHistory;
        }
        record.message = this.cleanupMessageObject(record.message); // fix up our past mistakes by sweeping it under the rug!
      }
    }

    this.cachedMessageRecord = [];
    this.messageRecord = data.messageRecord;
    this.deletedMessageRecord = data.deletedMessageRecord;
    this.editedMessageRecord = data.editedMessageRecord;
    this.purgedMessageRecord = data.purgedMessageRecord;
    this.tempEditedMessageRecord = {};
    this.editHistoryAntiSpam = {};
    this.localDeletes = [];

    this.settings.imageCacheDir = this.pluginDir + '/MLV2_IMAGE_CACHE';

    const imageCacheDirFailure = () => {
      this.settings.imageCacheDir = this.pluginDir + '/MLV2_IMAGE_CACHE';
      XenoLib.Notifications.error(`[**${this.getName()}**] Failed to access custom image cache dir. It has been reset to plugins folder!`);
    };

    if (this.settings.cacheAllImages && !this.nodeModules.fs.existsSync(this.settings.imageCacheDir)) {
      try {
        this.nodeModules.fs.mkdirSync(this.settings.imageCacheDir);
      } catch (e) {
        imageCacheDirFailure();
      }
    }
	/*
    if (!this._imageCacheServer) {
      class ImageCacheServer {
        constructor(imagePath, name) {
          try {
            ZeresPluginLibrary.WebpackModules.getByProps('bindAll', 'debounce').bindAll(this, ['_requestHandler', '_errorHandler']);
            this._server = require('http').createServer(this._requestHandler);
            this._getMimetype = require('mime-types').lookup;
            this._parseURL = require('url').parse;
            this._fs = require('fs');
            this._path = require('path');
            this._imagePath = imagePath;
            this._name = name;
          } catch (err) {}
        }
        start() {
          try {
            this._server.listen(7474, 'localhost', this._errorHandler);
          } catch (err) {}
        }
        stop() {
          try {
            this._server.close();
          } catch (err) {}
        }
        _errorHandler(err) {
          if (err) return ZeresPluginLibrary.Logger.err(this._name, 'Error in ImageCacheServer', err);
          ZeresPluginLibrary.Logger.info(this._name, 'ImageCacheServer: OK');
        }
        _requestHandler(req, res) {
          // parse URL
          const parsedUrl = this._parseURL(req.url);
          const parsedFile = this._path.parse(parsedUrl.pathname);
          // extract URL path
          let pathname = this._path.join(this._imagePath, parsedFile.base);
          this._fs.readFile(pathname, (err, data) => {
            if (err) {
              res.statusCode = 404;
              res.end(`No such file file: ${err}.`);
            } else {
              // if the file is found, set Content-type and send data
              res.setHeader('Content-type', this._getMimetype(parsedFile.ext));
              res.end(data);
            }
          });
        }
      }
      this._imageCacheServer = new ImageCacheServer(this.settings.imageCacheDir, this.getName());
    }
    this._imageCacheServer.start();
	*/
	this._imageCacheServer = {
		// "start": () => {},
		"stop": () => {},
	};

    defaultConstruct = undefined;

    /* backport from MLV3/rewrite */
    const CUser = ZeresPluginLibrary.WebpackModules.getByPrototypes('getAvatarSource', 'isLocalBot');
    const userRecord = {};
    const lastSeenUser = {};
    for (const messageId in this.messageRecord) {
      const record = this.messageRecord[messageId];
      const userObj = record.message.author;
      if (!userObj || typeof userObj === 'string') continue;
      const date = new Date(record.message.timestamp);
      if (!(userRecord[userObj.id] && lastSeenUser[userObj.id] && lastSeenUser[userObj.id] > date)) {
        userRecord[userObj.id] = userObj;
        lastSeenUser[userObj.id] = date;
      }
    }

    this.Patcher = XenoLib.createSmartPatcher({ before: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.before(this.getName(), moduleToPatch, functionName, callback, options), instead: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.instead(this.getName(), moduleToPatch, functionName, callback, options), after: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.after(this.getName(), moduleToPatch, functionName, callback, options) });

    this.unpatches = [];

    this.unpatches.push(
      this.Patcher.after(this.UserStore, 'getUser', (_this, args, ret) => {
        if (!ret && !args[1]) {
          const userId = args[0];
          const users = this.UserStore.getUsers();
          if (userRecord[userId]) return (users[userId] = new CUser(userRecord[userId]));
        }
      })
    );

    const isMentioned = ZeresPluginLibrary.WebpackModules.getModule(e => typeof e === 'function' && e?.toString()?.includes('mentionEveryone') &&  e?.toString()?.includes('roles.includes'), { searchExports: true });

    this.tools = {
      openUserContextMenu: null /* NeatoLib.Modules.get('openUserContextMenu').openUserContextMenu */, // TODO: move here
      getMessage: this.messageStore.getMessage,
      fetchMessages: ZeresPluginLibrary.DiscordModules.MessageActions.fetchMessages,
      transitionTo: null /* NeatoLib.Modules.get('transitionTo').transitionTo */,
      getChannel: this.ChannelStore.getChannel,
      copyToClipboard: global.copy,
      getServer: ZeresPluginLibrary.WebpackModules.getByProps('getGuild', 'getGuildCount').getGuild,
      getUser: this.UserStore.getUser,
      parse: ZeresPluginLibrary.WebpackModules.getByProps('parse', 'astParserFor').parse,
      getUserAsync: /* ZeresPluginLibrary.WebpackModules.getByProps('getUser', 'acceptAgreements').getUser */ () => Promise.resolve(),
      isBlocked: ZeresPluginLibrary.WebpackModules.getByProps('isBlocked').isBlocked,
      createMomentObject: ZeresPluginLibrary.WebpackModules.getByProps('createFromInputFallback'),
      isMentioned: (e, id) => isMentioned({ userId: id, channelId: e.channel_id, mentionEveryone: e.mentionEveryone || e.mention_everyone, mentionUsers: e.mentions.map(e => e.id || e), mentionRoles: e.mentionRoles || e.mention_roles }),
      DiscordUtils: ZeresPluginLibrary.WebpackModules.getByProps('bindAll', 'debounce'),
	  SimpleMarkdown: ZeresPluginLibrary.DiscordModules.SimpleMarkdown,
	  parserNew: ZeresPluginLibrary.WebpackModules.getByProps("defaultRules", "parse").parse,
    };

    this.createButton.classes = {
      button: (function () {
        let buttonData = ZeresPluginLibrary.WebpackModules.getByProps('button', 'colorBrand');
        return `${buttonData.button} ${buttonData.lookFilled} ${buttonData.colorBrand} ${buttonData.sizeSmall} ${buttonData.grow}`;
      })(),
      buttonContents: ZeresPluginLibrary.WebpackModules.getByProps('button', 'colorBrand').contents
    };

    this.safeGetClass = (func, fail, heckoff) => {
      try {
        return func();
      } catch (e) {
        if (heckoff) return fail;
        return fail + '-MLV2';
      }
    };

    this.createMessageGroup.classes = {
      containerBounded: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').containerCozyBounded, 'containerCozyBounded'),
      message: this.safeGetClass(() => `.${ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').containerCozyBounded.split(/ /g)[0]} > div`, '.containerCozyBounded-MLV2 > div', true),
      header: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').headerCozy, 'headerCozy'),
      avatar: this.safeGetClass(() => XenoLib.getClass('header avatar', true), 'avatar'),
      headerMeta: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').headerCozyMeta, 'headerCozyMeta'),
      username: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').username, 'username'),
      timestamp: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').timestampCozy, 'timestampCozy'),
      timestampSingle: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').timestampCozy.split(/ /g)[0], 'timestampCozy'),
      content: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').contentCozy, 'contentCozy'),
      avatarSingle: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').avatar.split(/ /g)[0], 'avatar'),
      avatarImg: XenoLib.getClass('clickable avatar'),
      avatarImgSingle: XenoLib.getSingleClass('edited clickable avatar'),
      botTag: ZeresPluginLibrary.WebpackModules.getByProps('botTagRegular').botTagRegular + ' ' + ZeresPluginLibrary.WebpackModules.getByProps('botTagCozy').botTagCozy,
      markupSingle: ZeresPluginLibrary.WebpackModules.getByProps('markup').markup.split(/ /g)[0]
    };

    this.multiClasses = {
      defaultColor: ZeresPluginLibrary.WebpackModules.getByProps('defaultColor').defaultColor,
      item: ZeresPluginLibrary.WebpackModules.find(m => m.item && m.selected && m.topPill).item,
      /* tabBarItem: ZeresPluginLibrary.DiscordClassModules.UserModal.tabBarItem, */
      tabBarContainer: ZeresPluginLibrary.DiscordClassModules.UserModal.tabBarContainer,
      tabBar: ZeresPluginLibrary.DiscordClassModules.UserModal.tabBar,
      edited: XenoLib.joinClassNames(XenoLib.getClass('separator timestamp'), XenoLib.getClass('separator timestampInline')),
      markup: ZeresPluginLibrary.WebpackModules.getByProps('markup')['markup'],
      message: {
        cozy: {
          containerBounded: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').containerCozyBounded, 'containerCozyBounded'),
          header: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').headerCozy, 'headerCozy'),
          avatar: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').avatar, 'avatar'),
          headerMeta: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').headerCozyMeta, 'headerCozyMeta'),
          username: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').username, 'username'),
          timestamp: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').timestampCozy, 'timestampCozy'),
          content: this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').contentCozy, 'contentCozy')
        }
      }
    };
    let hiddenModule = ZeresPluginLibrary.WebpackModules.getByProps('spoilerText', 'hidden') ?? ZeresPluginLibrary.WebpackModules.getByProps('spoilerContent', 'hidden')
    this.classes = {
      markup: ZeresPluginLibrary.WebpackModules.getByProps('markup')['markup'].split(/ /g)[0],
      hidden: hiddenModule.hidden.split(/ /g)[0],
      messages: this.safeGetClass(
        () => `.${ZeresPluginLibrary.WebpackModules.getByProps('container', 'containerCompactBounded').container.split(/ /g)[0]} > div:not(.${ZeresPluginLibrary.WebpackModules.getByProps('content', 'marginCompactIndent').content.split(/ /g)[0]})`,
        this.safeGetClass(() => `.${XenoLib.getSingleClass('scroller messages')} > .${XenoLib.getSingleClass('channelTextArea message')}`, 'Lighty-youre-a-failure-my-fucking-god'),
        true
      ),
      avatar: this.safeGetClass(() => XenoLib.getSingleClass('header avatar', true), 'avatar-MLV2')
    };

    this.muteModule = ZeresPluginLibrary.WebpackModules.find(m => m.isChannelMuted);

    this.menu = {};
    this.menu.classes = {};
    this.menu.filter = '';
    this.menu.open = false;;

    const Modals = ZeresPluginLibrary.WebpackModules.getByProps('ModalRoot');
    const ImageModalClasses = ZeresPluginLibrary.WebpackModules.getByProps('modal', 'image');

    // const ImageModal = ZeresPluginLibrary.WebpackModules.getByDisplayName('ImageModal');
	const ImageModalFilterFunc1 = m2=>m2?.toString?.().includes(".MEDIA_MODAL_CLOSE,");
	const ImageModalFilterFunc2 = m => Object.values(m).some(ImageModalFilterFunc1);
    const ImageModal = Object.values(BdApi.Webpack.getModule(ImageModalFilterFunc2)).filter(ImageModalFilterFunc1)[0];

    // const { default: MaskedLink } = ZeresPluginLibrary.WebpackModules.find(e => e?.default?.type?.toString()?.includes('default.MASKED_LINK')) || {};
	const MaskedLink = ZeresPluginLibrary.WebpackModules.find(e => e?.type?.toString()?.includes('.MASKED_LINK')) || {};
    const renderLinkComponent = props => ZeresPluginLibrary.DiscordModules.React.createElement(MaskedLink, props);

    const MLV2ImageModal = props =>
      ZeresPluginLibrary.DiscordModules.React.createElement(
        Modals.ModalRoot,
        // { className: ImageModalClasses.modal, ...props, size: Modals.ModalSize.DYNAMIC },
        // { className: ImageModalClasses.modal, ...props, size: ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes.LARGE },
        { className: ImageModalClasses.modal, ...props, size: "dynamic" },
        ZeresPluginLibrary.DiscordModules.React.createElement(
          ImageModal,
          Object.assign(
            {
              renderLinkComponent,
              className: ImageModalClasses.image,
              shouldAnimate: true
            },
            props
          )
        )
      );

    this.createModal.imageModal = MLV2ImageModal;

    const chatContent = ZeresPluginLibrary.WebpackModules.getByProps('chatContent');
    this.observer.chatContentClass = ((chatContent && chatContent.chatContent) || 'chat-3bRxxu').split(/ /g)[0];
    this.observer.chatClass = 'chat-3bRxxu';
    this.observer.titleClass = !chatContent ? 'ERROR-CLASSWTF' : ZeresPluginLibrary.WebpackModules.getByProps('title', 'chatContent').title.split(/ /g)[0];
    this.observer.containerCozyClass = this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozyBounded').containerCozyBounded.split(/ /g)[0], 'containerCozyBounded');

    this.localUser = this.UserStore.getCurrentUser();

    this.deletedChatMessagesCount = {};
    this.editedChatMessagesCount = {};

    this.channelMessages = ZeresPluginLibrary.WebpackModules.find(m => m._channelMessages)._channelMessages;

    this.autoBackupSaveInterupts = 0;

    this.dispatcher = ZeresPluginLibrary.WebpackModules.find(e => e.dispatch && !e.emitter && !e.commands);
	// this.dispatcher.subscribe = this.dispatcher.addSubscription;
	// this.dispatcher.unsubscribe = this.dispatcher.removeSubscription;

    this.unpatches.push(
      this.Patcher.instead(
        this.dispatcher,
        'dispatch',
        (_, args, original) => this.onDispatchEvent(args, original)
      )
    );
    this.unpatches.push(
      this.Patcher.instead(ZeresPluginLibrary.DiscordModules.MessageActions, 'startEditMessage', (_, args, original) => {
        const channelId = args[0];
        const messageId = args[1];
        if (this.deletedMessageRecord[channelId] && this.deletedMessageRecord[channelId].indexOf(messageId) !== -1) return;
        return original(...args);
      })
    );

    this.noTintIds = [];
    this.editModifiers = {};

    this.style = {};

    this.style.deleted = this.obfuscatedClass('ml2-deleted');
    this.style.deletedAlt = this.obfuscatedClass('ml2-deleted-alt');
    this.style.edited = this.obfuscatedClass('ml2-edited');
    this.style.editedCompact = this.obfuscatedClass('ml2-edited-compact');
    this.style.tab = this.obfuscatedClass('ml2-tab');
    this.style.tabSelected = this.obfuscatedClass('ml2-tab-selected');
    this.style.textIndent = this.obfuscatedClass('ml2-help-text-indent');
    this.style.menu = this.obfuscatedClass('ML2-MENU');
    this.style.openLogs = this.obfuscatedClass('ML2-OL');
    this.style.filter = this.obfuscatedClass('ML2-FILTER');
    this.style.menuMessages = this.obfuscatedClass('ML2-MENU-MESSAGES');
    this.style.menuTabBar = this.obfuscatedClass('ML2-MENU-TABBAR');
    this.style.menuRoot = this.obfuscatedClass('MLv2-menu-root');
    this.style.imageRoot = this.obfuscatedClass('MLv2-image-root');
    this.style.inputWrapper = this.obfuscatedClass('MLv2-input-wrapper');
    this.style.multiInput = this.obfuscatedClass('MLv2-input');
    this.style.multiInputFirst = this.obfuscatedClass('MLv2-input-first');
    this.style.input = this.obfuscatedClass('MLv2-input-input');
    this.style.questionMark = this.obfuscatedClass('MLv2-question-mark');
    this.style.tabBarContainer = this.obfuscatedClass('MLv2-tab-bar-container');
    this.style.tabBar = this.obfuscatedClass('MLv2-tab-bar');
    this.style.tabBarItem = this.obfuscatedClass('MLv2-tab-bar-item');

    this.invalidateAllChannelCache();
    this.selectedChannel = this.getSelectedTextChannel();
    if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);

    // todo: custom deleted message text color
    ZeresPluginLibrary.PluginUtilities.addStyle(
      (this.style.css = !this.settings.obfuscateCSSClasses ? 'ML2-CSS' : this.randomString()),
      `
                .${this.style.deleted} .${this.classes.markup}, .${this.style.deleted} .${this.classes.markup} .hljs, .${this.style.deleted} .container-1ov-mD *{
                    color: #f04747 !important;
                }
                html #app-mount .${this.style.deletedAlt} {
                  background-color: rgba(240, 71, 71, 0.15) !important;
                }
                html #app-mount .${this.style.deletedAlt}:hover, html #app-mount .${this.style.deletedAlt}.selected-2P5D_Z {
                  background-color: rgba(240, 71, 71, 0.10) !important;
                }
                .theme-dark .${this.classes.markup}.${this.style.edited} .${this.style.edited} {
                    filter: brightness(70%);
                }
                .theme-light .${this.classes.markup}.${this.style.edited} .${this.style.edited} {
                    opacity: 0.5;
                }

                .${this.style.editedCompact} {
                    text-indent: 0;
                }

                .theme-dark .${this.style.deleted}:not(:hover) img:not(.${this.classes.avatar}), .${this.style.deleted}:not(:hover) .mention, .${this.style.deleted}:not(:hover) .reactions, .${this.style.deleted}:not(:hover) a {
                    filter: grayscale(100%) !important;
                }

                .${this.style.deleted} img:not(.${this.classes.avatar}), .${this.style.deleted} .mention, .${this.style.deleted} .reactions, .${this.style.deleted} a {
                    transition: filter 0.3s !important;
                }

                .theme-dark .${this.style.tab} {
                    border-color: transparent;
                    color: rgba(255, 255, 255, 0.4);
                    padding: 0px 24px;
                }
                .theme-light .${this.style.tab} {
                    border-color: transparent;
                    color: rgba(0, 0, 0, 0.4);
                    padding: 0px 24px;
                }

                #sent.${this.style.tab} {
                  display: none;
                }

                .theme-dark  .${this.style.tabSelected} {
                    border-color: rgb(255, 255, 255);
                    color: rgb(255, 255, 255);
                }
                .theme-light  .${this.style.tabSelected} {
                    border-color: rgb(0, 0, 0);
                    color: rgb(0, 0, 0);
                }

                #${this.style.menuTabBar} {
                  justify-content: space-around;
                }

                .${this.style.textIndent} {
                    margin-left: 40px;
                }

                .${this.style.imageRoot} {
                  pointer-events: all;
                }

                #${this.style.menuMessages} {
                  max-height: 0px;
                }
                .${this.style.menuRoot} .${XenoLib.getSingleClass('base wrapper')} {
                  width: 100%;
                }
                .${this.style.menuRoot} .${this.style.questionMark} {
                  margin-left: 5px;
                }
                .${this.style.menuRoot} {
                  width: 960px;
                }
                #${this.style.filter} {
                  opacity: 1;
                }
                .${this.style.inputWrapper} {
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-orient: vertical;
                  -webkit-box-direction: normal;
                  -ms-flex-direction: column;
                  flex-direction: column;
                }
                .${this.style.multiInput} {
                  font-size: 16px;
                  -webkit-box-sizing: border-box;
                  box-sizing: border-box;
                  width: 100%;
                  border-radius: 3px;
                  color: var(--text-normal);
                  background-color: var(--deprecated-text-input-bg);
                  border: 1px solid var(--deprecated-text-input-border);
                  -webkit-transition: border-color .2s ease-in-out;
                  transition: border-color .2s ease-in-out;
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-align: center;
                  -ms-flex-align: center;
                  align-items: center;
                }
                .${this.style.multiInputFirst} {
                  -webkit-box-flex: 1;
                  -ms-flex-positive: 1;
                  flex-grow: 1;
                }
                .${this.style.input} {
                  font-size: 16px;
                  -webkit-box-sizing: border-box;
                  box-sizing: border-box;
                  width: 100%;
                  border-radius: 3px;
                  color: var(--text-normal);
                  background-color: var(--deprecated-text-input-bg);
                  border: 1px solid var(--deprecated-text-input-border);
                  -webkit-transition: border-color .2s ease-in-out;
                  transition: border-color .2s ease-in-out;
                  padding: 10px;
                  height: 40px;
                  border: none;
                  background-color: transparent;
                }
                .${this.style.questionMark} {
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-align: center;
                  -ms-flex-align: center;
                  align-items: center;
                  -webkit-box-pack: center;
                  -ms-flex-pack: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  border-radius: 2px;
                  margin-right: 4px;
                  padding: 0;
                  min-width: 0;
                  min-height: 0;
                  background-color: var(--brand-experiment);
                }
                .${this.style.tabBarContainer} {
                  border-bottom: 1px solid var(--background-modifier-accent);
                  padding-left: 20px;
                }
                .${this.style.tabBar} {
                  display: flex;
                  height: 55px;
                  align-items: stretch;
                  -ms-flex-align: stretch;
                  -webkit-box-align: stretch;
                }
                .${this.style.tabBarItem} {
                  display: flex;
                  font-size: 14px;
                  margin-right: 40px;
                  border-bottom: 2px solid transparent;
                  align-items: center;
                  -ms-flex-align: center;
                  -webkit-box-align: center;
                  cursor: pointer;
                  line-height: 20px;
                  font-size: 16px;
                  position: relative;
                  font-weight: 500;
                  flex-shrink: 0;
                  -ms-flex-negative: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
            `
    );
    this.patchMessages();
    this.patchModal();
	// this.setupUpdate();
    // const createKeybindListener = () => {
    //   this.keybindListener = new (ZeresPluginLibrary.WebpackModules.getModule(m => typeof m === 'function' && m.toString().includes('.default.setOnInputEventCallback')))();
    //   this.keybindListener.on('change', e => {
    //     if (this.settings.disableKeybind) return; // todo: destroy if disableKeybind is set to true and don't make one if it was true from the start
    //     // this is the hackiest thing ever but it works xdd
    //     if (!ZeresPluginLibrary.WebpackModules.getByProps('isFocused').isFocused() || document.getElementsByClassName('bda-slist').length) return;
    //     const isKeyBind = keybind => {
    //       if (e.combo.length != keybind.length) return false;
    //       // console.log(e.combo);
    //       for (let i = 0; i < e.combo.length; i++) {
    //         if (e.combo[i][1] != keybind[i]) {
    //           return false;
    //         }
    //       }
    //       return true;
    //     };
    //     const close = () => {
    //       this.menu.filter = '';
    //       this.menu.open = false;
    //       this.ModalStack.closeModal(this.style.menu);
    //     };
    //     if (isKeyBind(this.settings.openLogKeybind)) {
    //       if (this.menu.open) return close();
    //       return this.openWindow();
    //     }
    //     if (isKeyBind(this.settings.openLogFilteredKeybind)) {
    //       if (this.menu.open) return close();
    //       if (!this.selectedChannel) {
    //         this.showToast('No channel selected', { type: 'error' });
    //         return this.openWindow();
    //       }
    //       this.menu.filter = `channel:${this.selectedChannel.id}`;
    //       this.openWindow();
    //     }
    //   });
    // };

    //this.powerMonitor = ZeresPluginLibrary.WebpackModules.getByProps('remotePowerMonitor').remotePowerMonitor;

    // const refreshKeykindListener = () => {
    //   this.keybindListener.destroy();
    //   createKeybindListener();
    // };

    //this.keybindListenerInterval = setInterval(refreshKeykindListener, 30 * 1000 * 60); // 10 minutes

    //createKeybindListener();

    // this.powerMonitor.on(
    //   'resume',
    //   (this.powerMonitorResumeListener = () => {
    //     setTimeout(refreshKeykindListener, 1000);
    //   })
    // );
/*
    this.unpatches.push(
      this.Patcher.instead(ZeresPluginLibrary.WebpackModules.getByDisplayName('TextAreaAutosize').prototype, 'focus', (thisObj, args, original) => {
        if (this.menu.open) return;
        return original(...args);
      })
    );

    this.unpatches.push(
      this.Patcher.instead(ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyImage').prototype, 'getSrc', (thisObj, args, original) => {
        let indx;
        if (thisObj && thisObj.props && thisObj.props.src && ((indx = thisObj.props.src.indexOf('?ML2=true')), indx !== -1)) return thisObj.props.src.substr(0, indx);
        return original(...args);
      })
    ); */

    this.dataManagerInterval = setInterval(() => {
      this.handleMessagesCap();
    }, 60 * 1000 * 5); // every 5 minutes, no need to spam it, could be intensive

    this.ContextMenuActions = ZeresPluginLibrary.DiscordModules.ContextMenuActions;

    this.menu.randomValidChannel = (() => {
      const channels = this.ChannelStore.getChannels ? this.ChannelStore.getChannels() : ZeresPluginLibrary.WebpackModules.getByProps('getChannels').getChannels();
      var keys = Object.keys(channels);
      return channels[keys[(keys.length * Math.random()) << 0]];
    })();

    this.menu.userRequestQueue = [];

    this.menu.deleteKeyDown = false;
    document.addEventListener(
      'keydown',
      (this.keydownListener = e => {
        if (e.repeat) return;
        if (e.keyCode === 46) this.menu.deleteKeyDown = true;
      })
    );
    document.addEventListener(
      'keyup',
      (this.keyupListener = e => {
        if (e.repeat) return;
        if (e.keyCode === 46) this.menu.deleteKeyDown = false;
      })
    );

    this.menu.shownMessages = -1;
    const iconShit = ZeresPluginLibrary.WebpackModules.getByProps('container', 'children', 'toolbar', 'iconWrapper');
    // Icon by font awesome
    // https://fontawesome.com/license
    this.channelLogButton = this.parseHTML(`<div tabindex="0" class="${iconShit.iconWrapper} ${iconShit.clickable}" role="button">
                                                        <svg aria-hidden="true" class="${iconShit.icon}" name="Open Logs" viewBox="0 0 576 512">
                                                            <path fill="currentColor" d="M218.17 424.14c-2.95-5.92-8.09-6.52-10.17-6.52s-7.22.59-10.02 6.19l-7.67 15.34c-6.37 12.78-25.03 11.37-29.48-2.09L144 386.59l-10.61 31.88c-5.89 17.66-22.38 29.53-41 29.53H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h12.39c4.83 0 9.11-3.08 10.64-7.66l18.19-54.64c3.3-9.81 12.44-16.41 22.78-16.41s19.48 6.59 22.77 16.41l13.88 41.64c19.75-16.19 54.06-9.7 66 14.16 1.89 3.78 5.49 5.95 9.36 6.26v-82.12l128-127.09V160H248c-13.2 0-24-10.8-24-24V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24v-40l-128-.11c-16.12-.31-30.58-9.28-37.83-23.75zM384 121.9c0-6.3-2.5-12.4-7-16.9L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1zm-96 225.06V416h68.99l161.68-162.78-67.88-67.88L288 346.96zm280.54-179.63l-31.87-31.87c-9.94-9.94-26.07-9.94-36.01 0l-27.25 27.25 67.88 67.88 27.25-27.25c9.95-9.94 9.95-26.07 0-36.01z"/>
                                                        </svg>
                                                    </div>`);
    this.channelLogButton.addEventListener('click', () => {
      this.openWindow();
    });
    this.channelLogButton.addEventListener('contextmenu', () => {
      if (!this.selectedChannel) return;
      this.menu.filter = `channel:${this.selectedChannel.id}`;
      this.openWindow();
    });
    new ZeresPluginLibrary.Tooltip(this.channelLogButton, 'Open Logs', { side: 'bottom' });

    if (this.settings.showOpenLogsButton) this.addOpenLogsButton();

    this.unpatches.push(
      this.Patcher.instead(ZeresPluginLibrary.DiscordModules.MessageActions, 'deleteMessage', (_, args, original) => {
        const messageId = args[1];
        if (this.messageRecord[messageId] && this.messageRecord[messageId].delete_data) return;
        this.localDeletes.push(messageId);
        if (this.localDeletes.length > 10) this.localDeletes.shift();
        return original(...args);
      })
    );

    this.unpatches.push(
      this.Patcher.instead(this.messageStore, 'getLastEditableMessage', (_this, [channelId]) => {
        const me = XenoLib.DiscordAPI.userId;
        return _this
          .getMessages(channelId)
          .toArray()
          .reverse()
          .find(iMessage => iMessage.author.id === me && iMessage.state === 'SENT' && (!this.messageRecord[iMessage.id] || !this.messageRecord[iMessage.id].delete_data));
      })
    );
    this.patchContextMenus();

    if (!(this.settings.flags & Flags.STARTUP_HELP)) {
      this.settings.flags |= Flags.STARTUP_HELP;
      this.showLoggerHelpModal(true);
      this.saveSettings();
    }

    this.selfTestInterval = setInterval(() => {
      this.selfTestTimeout = setTimeout(() => {
        if (this.selfTestFailures > 4) {
          clearInterval(this.selfTestInterval);
          this.selfTestInterval = 0;
          return BdApi.alert(`${this.getName()}: internal error.`, `Self test failure: Failed to hook dispatch. Recommended to reload your discord (CTRL + R) as the plugin may be in a broken state! If you still see this error, open up the devtools console (CTRL + SHIFT + I, click console tab) and report the errors to ${this.getAuthor()} for further assistance.`);
        }
        ZeresPluginLibrary.Logger.warn(this.getName(), 'Dispatch is not hooked, all our hooks may be invalid, attempting to reload self');
        this.selfTestFailures++;
        this.stop();
        this.start();
      }, 3000);
      this.dispatcher.dispatch({
        type: 'MESSAGE_LOGGER_V2_SELF_TEST'
      });
    }, 10000);

    if (this.selfTestInited) return;
    this.selfTestFailures = 0;
    this.selfTestInited = true;
  }
  shutdown() {
    if (!global.ZeresPluginLibrary) return;
    this.__started = false;
    const tryUnpatch = fn => {
      if (typeof fn !== 'function') return;
      try {
        // things can bug out, best to reload tbh, should maybe warn the user?
        fn();
      } catch (e) {
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Error unpatching', e);
      }
    };
    if (Array.isArray(this.unpatches)) for (let unpatch of this.unpatches) tryUnpatch(unpatch);
    ZeresPluginLibrary.Patcher.unpatchAll(this.getName());
    if (this.MessageContextMenuPatch) tryUnpatch(this.MessageContextMenuPatch);
    if (this.ChannelContextMenuPatch) tryUnpatch(this.ChannelContextMenuPatch);
    if (this.GuildContextMenuPatch) tryUnpatch(this.GuildContextMenuPatch);
    try {
      this.Patcher.unpatchAll();
    } catch (e) { }
    this.forceReloadMessages();
    // if (this.keybindListener) this.keybindListener.destroy();
    if (this.style && this.style.css) ZeresPluginLibrary.PluginUtilities.removeStyle(this.style.css);
    if (this.dataManagerInterval) clearInterval(this.dataManagerInterval);
    // if (this.keybindListenerInterval) clearInterval(this.keybindListenerInterval);
    if (this.selfTestInterval) clearInterval(this.selfTestInterval);
    if (this.selfTestTimeout) clearTimeout(this.selfTestTimeout);
    if (this._autoUpdateInterval) clearInterval(this._autoUpdateInterval);
    if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);
    if (this.keyupListener) document.removeEventListener('keyup', this.keyupListener);
    // if (this.powerMonitor) this.powerMonitor.removeListener('resume', this.powerMonitorResumeListener);
    if (this.channelLogButton) this.channelLogButton.remove();
    if (this._imageCacheServer) this._imageCacheServer.stop();
    if (typeof this._modalsApiUnsubcribe === 'function')
      try {
        this._modalsApiUnsubcribe();
      } catch { }
    // console.log('invalidating cache');
    this.invalidateAllChannelCache();
    //  if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id); // bad idea?
  }
  automaticallyUpdate(tryProxy) {
    const updateFail = () => XenoLib.Notifications.warning(`[${this.getName()}] Unable to check for updates!`, { timeout: 7500 });
    new Promise(resolve => {
      const https = require('https');
      const req = https.get(REPO_MAIN_URL + '/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js', { headers: { 'origin': 'discord.com' } }, res => {
        let body = '';
        res.on('data', chunk => ((body += new TextDecoder("utf-8").decode(chunk)), void 0));
        res.on('end', (rez) => {
          if (rez.statusCode !== 200) {
            if (!tryProxy) return this.automaticallyUpdate(true);
            updateFail();
            return;
          }
          if (!XenoLib.versionComparator(this.getVersion(), XenoLib.extractVersion(body))) return;
          const fs = require('fs');
          /*
           * why are we letting Zere, the braindead American let control BD when he can't even
           * fucking read clearly documented and well known standards, such as __filename being
           * the files full fucking path and not just the filename itself, IS IT REALLY SO HARD
           * TO FUCKING READ?! https://nodejs.org/api/modules.html#modules_filename
           */
          const _zerecantcode_path = require('path');
          const theActualFileNameZere = _zerecantcode_path.join(__dirname, _zerecantcode_path.basename(__filename));
          fs.writeFileSync(theActualFileNameZere, body);
          XenoLib.Notifications.success(`[${this.getName()}] Successfully updated!`, { timeout: 0 });
          if (BdApi.isSettingEnabled('fork-ps-5') && !this.__isPowerCord) return;
          BdApi.Plugins.reload(this.getName());
        });
      });
      req.on('error', _ => {
        if (!tryProxy) return this.automaticallyUpdate(true);
        updateFail();
      });
      //req.end();
    });
  }
  // title-3qD0b- da-title container-1r6BKw da-container themed-ANHk51 da-themed
  // chatContent-a9vAAp da-chatContent
  observer({ addedNodes }) {
    let isChat = false;
    let isTitle = false;
    for (const change of addedNodes) {
      if ((isTitle = isChat = typeof change.className === 'string' && change.className.indexOf(this.observer.chatClass) !== -1) || (isChat = typeof change.className === 'string' && change.className.indexOf(this.observer.chatContentClass) !== -1) || (isTitle = typeof change.className === 'string' && change.className.indexOf(this.observer.titleClass) !== -1) || (change.style && change.style.cssText === 'border-radius: 2px; background-color: rgba(114, 137, 218, 0);') || (typeof change.className === 'string' && change.className.indexOf(this.observer.containerCozyClass) !== -1)) {
        try {
          if (isChat) {
            this.selectedChannel = this.getSelectedTextChannel();
            this.noTintIds = [];
            this.editModifiers = {};
          }
          if (!this.selectedChannel) return ZeresPluginLibrary.Logger.warn(this.getName(), 'Chat was loaded but no text channel is selected');
          if (isTitle && this.settings.showOpenLogsButton) {
            let srch = change.querySelector('div[class*="search-"]');
            if (!srch) return ZeresPluginLibrary.Logger.warn(this.getName(), 'Observer caught title loading, but no search bar was found! Open Logs button will not show!');
            if (this.channelLogButton && srch.parentElement) {
              srch.parentElement.insertBefore(this.channelLogButton, srch); // memory leak..?
            }
            srch = null;
            if (!isChat) return;
          }
          const showStuff = (map, name) => {
            if (map[this.selectedChannel.id] && map[this.selectedChannel.id]) {
              if (this.settings.useNotificationsInstead) {
                XenoLib.Notifications.info(`There are ${map[this.selectedChannel.id]} new ${name} messages in ${this.selectedChannel.name && this.selectedChannel.type !== 3 ? '<#' + this.selectedChannel.id + '>' : 'DMs'}`, { timeout: 3000 });
              } else {
                this.showToast(`There are ${map[this.selectedChannel.id]} new ${name} messages in ${this.selectedChannel.name ? '#' + this.selectedChannel.name : 'DMs'}`, {
                  type: 'info',
                  onClick: () => this.openWindow(name),
                  timeout: 3000
                });
              }
              map[this.selectedChannel.id] = 0;
            }
          };
          if (this.settings.showDeletedCount) showStuff(this.deletedChatMessagesCount, 'deleted');
          if (this.settings.showEditedCount) showStuff(this.editedChatMessagesCount, 'edited');
        } catch (e) {
          ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Error in observer', e);
        }
        break;
      }
    }
  }
  buildSetting(data) {
    const { id } = data;
    const setting = XenoLib.buildSetting(data);
    if (id) setting.getElement().id = this.obfuscatedClass(id);
    return setting;
  }
  createSetting(data) {
    const current = Object.assign({}, data);
    if (!current.onChange) {
      current.onChange = value => {
        this.settings[current.id] = value;
        if (current.callback) current.callback(value);
      };
    }
    if (typeof current.value === 'undefined') current.value = this.settings[current.id];
    return this.buildSetting(current);
  }
  createGroup(group) {
    const { name, id, collapsible, shown, settings } = group;

    const list = [];
    for (let s = 0; s < settings.length; s++) list.push(this.createSetting(settings[s]));

    const settingGroup = new ZeresPluginLibrary.Settings.SettingGroup(name, { shown, collapsible }).append(...list);
    settingGroup.group.id = id; // should generate the id in here instead?
    return settingGroup;
  }
  getSettingsPanel() {
    // todo, sort out the menu
    const list = [];
    // list.push(
    //   this.createGroup({
    //     name: 'Keybinds',
    //     id: this.obfuscatedClass('ml2-settings-keybinds'),
    //     collapsible: true,
    //     shown: false,
    //     settings: [
    //       {
    //         name: 'Open menu keybind',
    //         id: 'openLogKeybind',
    //         type: 'keybind'
    //       },
    //       {
    //         name: 'Open log filtered by selected channel',
    //         id: 'openLogFilteredKeybind',
    //         type: 'keybind'
    //       },
    //       {
    //         name: 'Disable keybinds',
    //         id: 'disableKeybind',
    //         type: 'switch'
    //       }
    //     ]
    //   })
    // );
    list.push(
      this.createGroup({
        name: 'Ignores and overrides',
        id: this.obfuscatedClass('ml2-settings-ignores-overrides'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Ignore muted servers',
            id: 'ignoreMutedGuilds',
            type: 'switch'
          },
          {
            name: 'Ignore muted channels',
            id: 'ignoreMutedChannels',
            type: 'switch'
          },
          {
            name: 'Ignore bots',
            id: 'ignoreBots',
            type: 'switch'
          },
          {
            name: 'Ignore messages posted by you',
            id: 'ignoreSelf',
            type: 'switch'
          },
          {
            name: 'Ignore message edits from you',
            id: 'ignoreLocalEdits',
            type: 'switch'
          },
          {
            name: 'Ignore message deletes from you',
            note: 'Only ignores if you delete your own message.',
            id: 'ignoreLocalDeletes',
            type: 'switch'
          },
          {
            name: 'Ignore blocked users',
            id: 'ignoreBlockedUsers',
            type: 'switch'
          },
          {
            name: 'Ignore NSFW channels',
            id: 'ignoreNSFW',
            type: 'switch'
          },
          {
            name: 'Only log whitelist',
            id: 'onlyLogWhitelist',
            type: 'switch'
          },
          {
            name: 'Always log selected channel, regardless of whitelist/blacklist',
            id: 'alwaysLogSelected',
            type: 'switch'
          },
          {
            name: 'Always log DMs, regardless of whitelist/blacklist',
            id: 'alwaysLogDM',
            type: 'switch'
          },
          {
            name: 'Always log ghost pings, regardless of whitelist/blacklist',
            note: 'Messages sent in ignored/muted/blacklisted servers and channels will be logged and shown in sent, but only gets saved if a ghost ping occurs.',
            id: 'alwaysLogGhostPings',
            type: 'switch'
          }
        ]
      })
    );
    list.push(
      this.createGroup({
        name: 'Display settings',
        id: this.obfuscatedClass('ml2-settings-display'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Display dates with timestamps',
            id: 'displayDates',
            type: 'switch',
            callback: () => {
              if (this.selectedChannel) {
                // change NOW
                this.invalidateAllChannelCache();
                this.cacheChannelMessages(this.selectedChannel.id);
              }
            }
          },
          {
            name: 'Display deleted messages in chat',
            id: 'showDeletedMessages',
            type: 'switch',
            callback: () => {
              this.invalidateAllChannelCache();
              if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
            }
          },
          {
            name: 'Display edited messages in chat',
            id: 'showEditedMessages',
            type: 'switch',
            callback: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' })
          },
          {
            name: 'Max number of shown edits',
            id: 'maxShownEdits',
            type: 'textbox',
            onChange: val => {
              if (isNaN(val)) return this.showToast('Value must be a number!', { type: 'error' });
              this.settings.maxShownEdits = parseInt(val);
              this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' });
            }
          },
          {
            name: 'Show oldest edit instead of newest if over the shown edits limit',
            id: 'hideNewerEditsFirst',
            type: 'switch',
            callback: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' })
          },
          {
            name: 'Use red background instead of red text for deleted messages',
            id: 'useAlternativeDeletedStyle',
            type: 'switch',
            callback: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE' })
          },
          {
            name: 'Display purged messages in chat',
            id: 'showPurgedMessages',
            type: 'switch',
            callback: () => {
              this.invalidateAllChannelCache();
              if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
            }
          },
          {
            name: 'Restore deleted messages after reload',
            id: 'restoreDeletedMessages',
            type: 'switch',
            callback: val => {
              if (val) {
                this.invalidateAllChannelCache();
                if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
              }
            }
          },
          {
            name: 'Show amount of new deleted messages when entering a channel',
            id: 'showDeletedCount',
            type: 'switch'
          },
          {
            name: 'Show amount of new edited messages when entering a channel',
            id: 'showEditedCount',
            type: 'switch'
          },
          {
            name: 'Display update notes',
            id: 'displayUpdateNotes',
            type: 'switch'
          },
          {
            name: 'Menu sort direction',
            id: 'reverseOrder',
            type: 'radio',
            options: [
              {
                name: 'New - old',
                value: false
              },
              {
                name: 'Old - new',
                value: true
              }
            ]
          },
          {
            name: 'Use XenoLib notifications instead of toasts',
            note: "This works for edit, send, delete and purge toasts, as well as delete and edit count toasts. Toggle it if you don't know what this does.",
            id: 'useNotificationsInstead',
            type: 'switch',
            callback: e => (e ? XenoLib.Notifications.success('Using Xenolib notifications', { timeout: 5000 }) : this.showToast('Using toasts', { type: 'success', timeout: 5000 }))
          }
        ]
      })
    );
    list.push(
      this.createGroup({
        name: 'Misc settings',
        id: this.obfuscatedClass('ml2-settings-misc'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Disable saving data. Logged messages are erased after reload/restart. Disables auto backup.',
            id: 'dontSaveData',
            type: 'switch',
            callback: val => {
              if (!val) this.saveData();
              if (!val && this.settings.autoBackup) this.saveBackup();
            }
          },
          {
            name: "Auto backup data (won't fully prevent losing data, just prevent total data loss)",
            id: 'autoBackup',
            type: 'switch',
            callback: val => {
              if (val && !this.settings.dontSaveData) this.saveBackup();
            }
          } /*
                        {
                            // no time, TODO!
                            name: 'Deleted messages color',
                            id: 'deletedMessageColor',
                            type: 'color'
                        }, */,
          {
            name: 'Aggresive message caching (makes sure we have the data of any deleted or edited messages)',
            id: 'aggresiveMessageCaching',
            type: 'switch'
          },
          {
            name: 'Cache all images by storing them locally in the MLV2_IMAGE_CACHE folder inside the plugins folder',
            id: 'cacheAllImages',
            type: 'switch'
          },
          {
            name: "Don't delete cached images",
            note: "If the message the image is from is erased from data, the cached image will be kept. You'll have to monitor disk usage on your own!",
            id: 'dontDeleteCachedImages',
            type: 'switch'
          },
		  {
            name: "Use new cached images system",
            note: "Makes image cache in a hierarchy",
            id: 'newCacheAllImages',
            type: 'switch'
          },
		  {
            name: "Always show notifications for selected channel",
            id: 'alwaysNotifChannel',
            type: 'switch'
          },
		  {
            name: "Always show notifications for selected guild",
            id: 'alwaysNotifGuild',
            type: 'switch'
          },
		  {
            name: "Show notifications to whitelisted only",
            id: 'notifOnlyWhitelist',
            type: 'switch'
          },
		  {
            name: 'Path to new cached images system (optional)',
            note: "",
            id: 'newCacheAllImagesPath',
            type: 'textbox'
          },
          {
            name: 'Display open logs button next to the search box top right in channels',
            id: 'showOpenLogsButton',
            type: 'switch',
            callback: val => {
              if (val) return this.addOpenLogsButton();
              this.removeOpenLogsButton();
            }
          },
          {
            name: 'Block spam edit notifications (if enabled)',
            id: 'blockSpamEdit',
            type: 'switch'
          }
        ]
      })
    );
    list.push(
      this.createGroup({
        name: 'Toast notifications for guilds',
        id: this.obfuscatedClass('ml2-settings-toast-guilds'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Message sent',
            id: 'sent',
            type: 'switch',
            value: this.settings.toastToggles.sent,
            onChange: val => {
              this.settings.toastToggles.sent = val;
            }
          },
          {
            name: 'Message edited',
            id: 'edited',
            type: 'switch',
            value: this.settings.toastToggles.edited,
            onChange: val => {
              this.settings.toastToggles.edited = val;
            }
          },
          {
            name: 'Message deleted',
            id: 'deleted',
            type: 'switch',
            value: this.settings.toastToggles.deleted,
            onChange: val => {
              this.settings.toastToggles.deleted = val;
            }
          },
          {
            name: 'Ghost pings',
            id: 'ghostPings',
            type: 'switch',
            value: this.settings.toastToggles.ghostPings,
            onChange: val => {
              this.settings.toastToggles.ghostPings = val;
            }
          },
          {
            name: 'Disable toasts for local user (yourself)',
            id: 'disableToastsForLocal',
            type: 'switch',
            value: this.settings.toastToggles.disableToastsForLocal,
            onChange: val => {
              this.settings.toastToggles.disableToastsForLocal = val;
            }
          }
        ]
      })
    );

    list.push(
      this.createGroup({
        name: 'Toast notifications for DMs',
        id: this.obfuscatedClass('ml2-settings-toast-dms'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Message sent',
            id: 'sent',
            type: 'switch',
            value: this.settings.toastTogglesDMs.sent,
            onChange: val => {
              this.settings.toastTogglesDMs.sent = val;
            }
          },
          {
            name: 'Message edited',
            id: 'edited',
            type: 'switch',
            value: this.settings.toastTogglesDMs.edited,
            onChange: val => {
              this.settings.toastTogglesDMs.edited = val;
            }
          },
          {
            name: 'Message deleted',
            id: 'deleted',
            type: 'switch',
            value: this.settings.toastTogglesDMs.deleted,
            onChange: val => {
              this.settings.toastTogglesDMs.deleted = val;
            }
          },
          {
            name: 'Ghost pings',
            id: 'ghostPings',
            type: 'switch',
            value: this.settings.toastTogglesDMs.ghostPings,
            onChange: val => {
              this.settings.toastTogglesDMs.ghostPings = val;
            }
          }
        ]
      })
    );

    list.push(
      this.createGroup({
        name: 'Message caps',
        id: this.obfuscatedClass('ml2-settings-caps'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Cached messages cap',
            note: 'Max number of sent messages logger should keep track of',
            id: 'messageCacheCap',
            type: 'textbox',
            onChange: val => {
              if (isNaN(val)) return this.showToast('Value must be a number!', { type: 'error' });
              this.settings.messageCacheCap = parseInt(val);
              clearInterval(this.dataManagerInterval);
              this.dataManagerInterval = setInterval(() => {
                this.handleMessagesCap();
              }, 60 * 1000 * 5);
            }
          },
          {
            name: 'Saved messages cap',
            note: "Max number of messages saved to disk, this limit is for deleted, edited and purged INDIVIDUALLY. So if you have it set to 1000, it'll be 1000 edits, 1000 deletes and 1000 purged messages max",
            id: 'savedMessagesCap',
            type: 'textbox',
            onChange: val => {
              if (isNaN(val)) return this.showToast('Value must be a number!', { type: 'error' });
              this.settings.savedMessagesCap = parseInt(val);
              clearInterval(this.dataManagerInterval);
              this.dataManagerInterval = setInterval(() => {
                this.handleMessagesCap();
              }, 60 * 1000 * 5);
            }
          },
          {
            name: 'Menu message render cap',
            note: 'How many messages will show before the LOAD MORE button will show',
            id: 'renderCap',
            type: 'textbox',
            onChange: val => {
              if (isNaN(val)) return this.showToast('Value must be a number!', { type: 'error' });
              this.settings.renderCap = parseInt(val);
              clearInterval(this.dataManagerInterval);
            }
          }
        ]
      })
    );

    list.push(
      this.createGroup({
        name: 'Advanced',
        id: this.obfuscatedClass('ml2-settings-advanced'),
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Obfuscate CSS classes',
            note: 'Enable this if some plugin, library or theme is blocking you from using the plugin',
            id: 'obfuscateCSSClasses',
            type: 'switch'
          },
          {
            name: 'Automatic updates',
            note: "Do NOT disable unless you really don't want automatic updates",
            id: 'autoUpdate',
            type: 'switch',
            callback: val => {
              if (val) {
                this._autoUpdateInterval = setInterval(_ => this.automaticallyUpdate(), 1000 * 60 * 15); // 15 minutes
                this.automaticallyUpdate();
              } else {
                clearInterval(this._autoUpdateInterval);
                try {
                  ZeresPluginLibrary.PluginUpdater.checkForUpdate(this.getName(), this.getVersion(), REPO_MAIN_URL + '/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js');
                } catch (err) {}
              }
            }
          },
          {
            name: 'Contextmenu submenu name',
            note: "Instead of saying Message Logger, make it say something else, so it's screenshot friendly",
            id: 'contextmenuSubmenuName',
            type: 'textbox'
          } /* ,
          {
            name: 'Image cache directory',
            note: 'Press enter to save the path',
            id: 'imageCacheDir',
            type: 'path',
            onChange: val => {
              console.log(this.settings.imageCacheDir, val, 'what?');
              if (this.settings.imageCacheDir === val) return;
              const savedImages = this.nodeModules.fs.readdirSync(this.settings.imageCacheDir);
              console.log(savedImages);
              if (!savedImages.length) return;
              https://stackoverflow.com/questions/10420352/
              function humanFileSize(bytes, si) {
                const thresh = si ? 1000 : 1024;
                if (Math.abs(bytes) < thresh) return `${bytes} B`;
                const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
                let u = -1;
                do {
                  bytes /= thresh;
                  ++u;
                } while (Math.abs(bytes) >= thresh && u < units.length - 1);
                return `${bytes.toFixed(1)}${units[u]}`;
              }
              let sz = 0;
              for (let image of savedImages) ;
              const size = humanFileSize(this.nodeModules.fs.statSync(this.settings.imageCacheDir).size);
              ZeresPluginLibrary.Modals.showModal('Move images', ZeresPluginLibrary.DiscordModules.React.createElement(ZeresPluginLibrary.DiscordModules.TextElement.default, { color: ZeresPluginLibrary.DiscordModules.TextElement.Colors.PRIMARY, children: [`Would you like to move ${savedImages.length} images from the old folder to the new? Size of all images is ${size}.`] }), {
                confirmText: 'Yes',
                onConfirm: () => {}
              });
              //this.settings.imageCacheDir = val;
            }
          } */
        ]
      })
    );

    const div = document.createElement('div');
    div.id = this.obfuscatedClass('ml2-settings-buttonbox');
    div.style.display = 'inline-flex';
    div.appendChild(this.createButton('Changelog', () => XenoLib.showChangelog(`${this.getName()} has been updated!`, this.getVersion(), this.getChanges())));
    div.appendChild(this.createButton('Stats', () => this.showStatsModal()));
    // div.appendChild(this.createButton('Donate', () => this.nodeModules.electron.shell.openExternal('https://paypal.me/lighty13')));
    div.appendChild(
      this.createButton('Support server', () => {
        // ZeresPluginLibrary.DiscordModules.LayerManager.popLayer();
        // if (this.tools.getServer('389049952732446731')) {
          // ZeresPluginLibrary.DiscordModules.GuildActions.transitionToGuildSync('389049952732446731');
        // } else {
          // ZeresPluginLibrary.DiscordModules.InviteActions.openNativeAppModal('NYvWdN5');
        // }
		BdApi.UI.showToast("This doesn't work on purpose.");
      })
    );
    div.appendChild(this.createButton('Help', () => this.showLoggerHelpModal()));
    let button = div.firstElementChild;
    while (button) {
      button.style.marginRight = button.style.marginLeft = `5px`;
      button = button.nextElementSibling;
    }

    list.push(div);

    return ZeresPluginLibrary.Settings.SettingPanel.build(_ => this.saveSettings(), ...list);
  }
  /* ==================================================-|| START HELPERS ||-================================================== */
  saveSettings() {
    ZeresPluginLibrary.PluginUtilities.saveSettings(this.getName(), this.settings);
  }
  handleDataSaving() {
    // saveData/setPluginData is synchronous, can get slow with bigger files
    if (!this.handleDataSaving.errorPageClass) this.handleDataSaving.errorPageClass = '.' + XenoLib.getClass('errorPage');
    /* refuse saving on error page */
    if (!this.messageRecord || document.querySelector(this.handleDataSaving.errorPageClass)) return; /* did we crash? */
    if (!Object.keys(this.messageRecord).length) return BdApi.deleteData(this.getName() + 'Data', 'data');
    const callback = err => {
      if (err) {
        XenoLib.Notifications.error('There has been an error saving the data file');
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'There has been an error saving the data file', err);
      }
      if (this.settings.autoBackup) {
        if (this.saveBackupTimeout) this.autoBackupSaveInterupts++;
        if (this.autoBackupSaveInterupts < 4) {
          if (this.saveBackupTimeout) clearTimeout(this.saveBackupTimeout);
          // 20 seconds after, in case shits going down y'know, better not to spam save and corrupt it, don't become the thing you're trying to eliminate
          this.saveBackupTimeout = setTimeout(() => this.saveBackup(), 20 * 1000);
        }
      }
      this.requestedDataSave = 0;
    };
    const useEfficient = !window.ED;
    if (useEfficient) {
      this.efficientlySaveData(
        this.getName() + 'Data',
        'data',
        {
          messageRecord: this.messageRecord,
          deletedMessageRecord: this.deletedMessageRecord,
          editedMessageRecord: this.editedMessageRecord,
          purgedMessageRecord: this.purgedMessageRecord
        },
        callback
      );
    } else {
      ZeresPluginLibrary.PluginUtilities.saveData(this.getName() + 'Data', 'data', {
        messageRecord: this.messageRecord,
        deletedMessageRecord: this.deletedMessageRecord,
        editedMessageRecord: this.editedMessageRecord,
        purgedMessageRecord: this.purgedMessageRecord
      });
      callback();
    }
  }
  saveData() {
    if (!this.settings.dontSaveData && !this.requestedDataSave) this.requestedDataSave = setTimeout(() => this.handleDataSaving(), 1000); // needs to be async
  }
  efficientlySaveData(name, key, data, callback) {
    try {
      let loadedData;
      try {
        /* bd gay bruh */
        loadedData = BdApi.loadData(name, key);
      } catch (err) { }
      if (loadedData) for (const key in data) loadedData[key] = data[key];
      this.nodeModules.fs.writeFile(this.__isPowerCord ? BdApi.__getPluginConfigPath(name) : this.nodeModules.path.join(this.pluginDir, `${name}.config.json`), JSON.stringify({ [key]: data }), callback);
    } catch (e) {
      XenoLib.Notifications.error('There has been an error saving the data file');
      ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'There has been an error saving the data file', e);
    }
  }
  saveBackup() {
    const callback = err => {
      if (err) {
        XenoLib.Notifications.error('There has been an error saving the data file');
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'There has been an error saving the data file', err);
      }
      this.saveBackupTimeout = 0;
      this.autoBackupSaveInterupts = 0;
      if (!XenoLib.loadData(this.getName() + 'DataBackup', 'data').messageRecord) this.saveBackupTimeout = setTimeout(() => this.saveBackup, 300); // don't be taxing
    };
    const useEfficient = !window.ED;
    if (useEfficient) {
      this.efficientlySaveData(
        this.getName() + 'DataBackup',
        'data',
        {
          messageRecord: this.messageRecord,
          deletedMessageRecord: this.deletedMessageRecord,
          editedMessageRecord: this.editedMessageRecord,
          purgedMessageRecord: this.purgedMessageRecord
        },
        callback
      );
    } else {
      ZeresPluginLibrary.PluginUtilities.saveData(this.getName() + 'DataBackup', 'data', {
        messageRecord: this.messageRecord,
        deletedMessageRecord: this.deletedMessageRecord,
        editedMessageRecord: this.editedMessageRecord,
        purgedMessageRecord: this.purgedMessageRecord
      });
      callback();
    }
  }
  parseHTML(html) {
    // TODO: drop this func, it's 75% slower than just making the elements manually
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }
  randomString() {
    let start = rand();
    while (start[0].toUpperCase() == start[0].toLowerCase()) start = rand();
    return start + '-' + rand();
    function rand() {
      return Math.random().toString(36).substr(2, 7);
    }
  }
  obfuscatedClass(selector) {
    if (!this.obfuscatedClass.obfuscations) this.obfuscatedClass.obfuscations = {};
    if (this.settings.obfuscateCSSClasses) {
      const { obfuscations } = this.obfuscatedClass;
      return obfuscations[selector] || (obfuscations[selector] = this.randomString());
    }
    return selector;
  }
  createTimeStamp(from = undefined, forcedDate = false) {
    // todo: timestamp for edited tooltip
    let date;
    if (from) date = new Date(from);
    else date = new Date();
    return (this.settings.displayDates || forcedDate) && forcedDate !== -1 ? `${date.toLocaleTimeString()}, ${date.toLocaleDateString()}` : forcedDate !== -1 ? date.toLocaleTimeString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  getCachedMessage(id, channelId = 0) {
    let cached = this.cachedMessageRecord.find(m => m.id == id);
    if (cached) return cached;
    if (channelId) return this.tools.getMessage(channelId, id); // if the message isn't cached, it returns undefined
    return null;
  }
  getEditedMessage(messageId, channelId) {
    if (this.editedMessageRecord[channelId] && this.editedMessageRecord[channelId].findIndex(m => m === messageId) != -1) {
      return this.messageRecord[messageId];
    }
    return null;
  }
  getSavedMessage(id) {
    /* DEPRECATED */
    return this.messageRecord[id];
  }
  cleanupUserObject(user) {
    /* backported from MLV2 rewrite */
    return {
      discriminator: user.discriminator,
      username: user.username,
      avatar: user.avatar,
      id: user.id,
      bot: user.bot,
      public_flags: typeof user.publicFlags !== 'undefined' ? user.publicFlags : user.public_flags
    };
  }
  cleanupMessageObject(message) {
    const ret = {
      mention_everyone: typeof message.mention_everyone !== 'boolean' ? typeof message.mentionEveryone !== 'boolean' ? false : message.mentionEveryone : message.mention_everyone,
      edited_timestamp: message.edited_timestamp || message.editedTimestamp && new Date(message.editedTimestamp).getTime() || null,
      attachments: message.attachments || [],
      channel_id: message.channel_id,
      reactions: (message.reactions || []).map(e => (!e.emoji.animated && delete e.emoji.animated, !e.me && delete e.me, e)),
      guild_id: message.guild_id || (this.ChannelStore.getChannel(message.channel_id) ? this.ChannelStore.getChannel(message.channel_id).guild_id : undefined),
      content: message.content,
      type: message.type,
      embeds: message.embeds || [],
      author: this.cleanupUserObject(message.author),
      mentions: (message.mentions || []).map(e => (typeof e === 'string' ? this.UserStore.getUser(e) ? this.cleanupUserObject(this.UserStore.getUser(e)) : e : this.cleanupUserObject(e))),
      mention_roles: message.mention_roles || message.mentionRoles || [],
      id: message.id,
      flags: message.flags,
      timestamp: new Date(message.timestamp).getTime(),
      referenced_message: null
    };
    if (ret.type === 19) {
      ret.message_reference = message.message_reference || message.messageReference;
      if (ret.message_reference) {
        if (message.referenced_message) {
          ret.referenced_message = this.cleanupMessageObject(message.referenced_message);
        } else if (this.messageStore.getMessage(ret.message_reference.channel_id, ret.message_reference.message_id)) {
          ret.referenced_message = this.cleanupMessageObject(this.messageStore.getMessage(ret.message_reference.channel_id, ret.message_reference.message_id));
        }
      }
    }
    this.fixEmbeds(ret);
    return ret;
  }
  createMiniFormattedData(message) {
    message = XenoLib.DiscordUtils.cloneDeep(message);
    const obj = {
      message: this.cleanupMessageObject(message), // works!
      local_mentioned: this.tools.isMentioned(message, this.localUser.id),
      /* ghost_pinged: false, */
      delete_data: null /*  {
                    time: integer,
                    hidden: bool
                } */,
      edit_history: null /* [
                    {
                        content: string,
                        timestamp: string
                    }
                ],
                edits_hidden: bool */
    };
    return obj;
  }
  getSelectedTextChannel() {
    return this.ChannelStore.getChannel(ZeresPluginLibrary.DiscordModules.SelectedChannelStore.getChannelId());
  }
  invalidateAllChannelCache() {
    for (let channelId in this.channelMessages) this.invalidateChannelCache(channelId);
  }
  invalidateChannelCache(channelId) {
    if (!this.channelMessages[channelId]) return;
    this.channelMessages[channelId].ready = false;
  }
  cacheChannelMessages(id, relative) {
	  // try {
	// TODO figure out if I can use this to get messages at a certain point
	// this.tools.fetchMessages({ channelId: id, skipLocalFetch: true, limit: 50, jump: (relative && { messageId: relative, ML2: true }) || undefined });
	// this.tools.fetchMessages({ channelId: id, limit: 50, jump: (relative && { messageId: relative, ML2: true }) || undefined });
	ZeresPluginLibrary.DiscordModules.MessageActions.fetchMessages({ channelId: id, limit: 50, jump: (relative && { messageId: relative, ML2: true }) || undefined });
	  // }
	  // catch
	  // {
	  // }
	  }
  /* UNUSED */
  cachenChannelMessagesRelative(channelId, messageId) {
    ZeresPluginLibrary.DiscordModules.APIModule.get({
      url: ZeresPluginLibrary.DiscordModules.DiscordConstants.Endpoints.MESSAGES(channelId),
      query: {
        before: null,
        after: null,
        limit: 50,
        around: messageId
      }
    })
      .then(res => {
        if (res.status != 200) return;
        const results = res.body;
        const final = results.filter(x => this.cachedMessageRecord.findIndex(m => x.id === m.id) == -1);
        this.cachedMessageRecord.push(...final);
      })
      .catch(err => {
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), `Error caching messages from ${channelId} around ${messageId}`, err);
      });
  }
  formatMarkup(content, channelId) {
    const markup = document.createElement('div');

    const parsed = this.tools.parse(content, true, channelId ? { channelId: channelId } : {});
    // console.log(parsed);
    // error, this render doesn't work with tags
    //  TODO: this parser and renderer sucks
    // this may be causing a severe memory leak over the course of a few hours
    ZeresPluginLibrary.DiscordModules.ReactDOM.render(ZeresPluginLibrary.DiscordModules.React.createElement('div', { className: '' }, parsed), markup);

    const hiddenClass = this.classes.hidden;

    const hidden = markup.getElementsByClassName(hiddenClass);

    for (let i = 0; i < hidden.length; i++) {
      hidden[i].classList.remove(hiddenClass);
    }
    const child = markup.firstChild;
    let previousTab = this.menu.selectedTab;
    let previousOpen = this.menu.open;
    const callback = () => {
      if (this.menu.open === previousOpen && this.menu.selectedTab === previousTab) return; /* lol ez */
      try {
        markup.appendChild(child);
        ZeresPluginLibrary.DiscordModules.ReactDOM.unmountComponentAtNode(markup);
      } catch (e) { }
      ZeresPluginLibrary.DOMTools.observer.unsubscribe(callback);
    };
    ZeresPluginLibrary.DOMTools.observer.subscribe(callback, mutation => {
      const nodes = Array.from(mutation.removedNodes);
      const directMatch = nodes.indexOf(child) > -1;
      const parentMatch = nodes.some(parent => parent.contains(child));
      return directMatch || parentMatch;
    });
    return child;
  }
  async showToast(content, options = {}) {
    // credits to Zere, copied from Zeres Plugin Library
    const { type = '', icon = '', timeout = 3000, onClick = () => { }, onContext = () => { } } = options;
    ZeresPluginLibrary.Toasts.ensureContainer();
    const toast = ZeresPluginLibrary['DOMTools'].parseHTML(ZeresPluginLibrary.Toasts.buildToast(content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), ZeresPluginLibrary.Toasts.parseType(type), icon));
    toast.style.pointerEvents = 'auto';
    document.querySelector('.toasts').appendChild(toast);
    let sto2;
    const wait = () => {
      toast.classList.add('closing');
      sto2 = setTimeout(() => {
        toast.remove();
        if (!document.querySelectorAll('.toasts .toast').length) document.querySelector('.toasts').remove();
      }, 300);
    };
    const sto = setTimeout(wait, timeout);
    const toastClicked = () => {
      clearTimeout(sto);
      clearTimeout(sto2);
      wait();
    };
    toast.addEventListener('auxclick', toastClicked);
    toast.addEventListener('click', () => {
      toastClicked();
      onClick();
    });
    toast.addEventListener('contextmenu', () => {
      toastClicked();
      onContext();
    });
  }
  clamp(val, min, max) {
    // this is so sad, can we hit Metalloriff?
    // his message logger added the func to Math obj and I didn't realize
    return Math.max(min, Math.min(val, max));
  }
  deleteEditedMessageFromRecord(id, editNum) {
    const record = this.messageRecord[id];
    if (!record) return;

    record.edit_history.splice(editNum, 1);
    if (!record.edit_history.length) record.edit_history = null;
    else return this.saveData();

    const channelId = record.message.channel_id;
    const channelMessages = this.editedMessageRecord[channelId];
    channelMessages.splice(
      channelMessages.findIndex(m => m === id),
      1
    );
    if (this.deletedMessageRecord[channelId] && this.deletedMessageRecord[channelId].findIndex(m => m === id) != -1) return this.saveData();
    if (this.purgedMessageRecord[channelId] && this.purgedMessageRecord[channelId].findIndex(m => m === id) != -1) return this.saveData();
    delete this.messageRecord[id];
    this.saveData();
  }
  jumpToMessage(channelId, messageId, guildId) {
    if (this.menu.open) this.ModalStack.closeModal(this.style.menu);
    // if (this.menu.open) this.ModalStack.closeModal(this.menu.modalMain);
    ZeresPluginLibrary.DiscordModules.NavigationUtils.transitionTo(`/channels/${guildId || '@me'}/${channelId}${messageId ? '/' + messageId : ''}`);
  }
  isImage(url) {
    return /\.(jpe?g|png|gif|bmp)$/i.test(url);
  }
  cleanupEmbed(embed) {
    /* backported code from MLV2 rewrite */
    if (!embed.id) return embed; /* already cleaned */
    const retEmbed = {};
    if (typeof embed.rawTitle === 'string') retEmbed.title = embed.rawTitle;
    if (typeof embed.rawDescription === 'string') retEmbed.description = embed.rawDescription;
    if (typeof embed.referenceId !== 'undefined') retEmbed.reference_id = embed.referenceId;
    if (typeof embed.color === 'string') retEmbed.color = ZeresPluginLibrary.ColorConverter.hex2int(embed.color);
    if (typeof embed.type !== 'undefined') retEmbed.type = embed.type;
    if (typeof embed.url !== 'undefined') retEmbed.url = embed.url;
    if (typeof embed.provider === 'object') retEmbed.provider = { name: embed.provider.name, url: embed.provider.url };
    if (typeof embed.footer === 'object') retEmbed.footer = { text: embed.footer.text, icon_url: embed.footer.iconURL, proxy_icon_url: embed.footer.iconProxyURL };
    if (typeof embed.author === 'object') retEmbed.author = { name: embed.author.name, url: embed.author.url, icon_url: embed.author.iconURL, proxy_icon_url: embed.author.iconProxyURL };
    if (typeof embed.timestamp === 'object' && embed.timestamp._isAMomentObject) retEmbed.timestamp = embed.timestamp.milliseconds();
    if (typeof embed.thumbnail === 'object') {
      if (typeof embed.thumbnail.proxyURL === 'string' || (typeof embed.thumbnail.url === 'string' && !embed.thumbnail.url.endsWith('?format=jpeg'))) {
        retEmbed.thumbnail = {
          url: embed.thumbnail.url,
          proxy_url: typeof embed.thumbnail.proxyURL === 'string' ? embed.thumbnail.proxyURL.split('?format')[0] : undefined,
          width: embed.thumbnail.width,
          height: embed.thumbnail.height
        };
      }
    }
    if (typeof embed.image === 'object') {
      retEmbed.image = {
        url: embed.image.url,
        proxy_url: embed.image.proxyURL,
        width: embed.image.width,
        height: embed.image.height
      };
    }
    if (typeof embed.video === 'object') {
      retEmbed.video = {
        url: embed.video.url,
        proxy_url: embed.video.proxyURL,
        width: embed.video.width,
        height: embed.video.height
      };
    }
    if (Array.isArray(embed.fields) && embed.fields.length) {
      retEmbed.fields = embed.fields.map(e => ({ name: e.rawName, value: e.rawValue, inline: e.inline }));
    }
    return retEmbed;
  }
  fixEmbeds(message) {
    message.embeds = message.embeds.map(this.cleanupEmbed);
  }
  isCompact() {
    return false; // fix if someone complains, no one has so far so who cares
  }
  /* ==================================================-|| END HELPERS ||-================================================== */
  /* ==================================================-|| START MISC ||-================================================== */
  addOpenLogsButton() {
    if (!this.selectedChannel) return;
    const parent = document.querySelector('div[class*="chat-"] div[class*="toolbar-"]');
    if (!parent) return;
    const srch = parent.querySelector('div[class*="search-"]'); // you know who you are that think this is my issue
    if (!srch) return;
    parent.insertBefore(this.channelLogButton, srch);
  }
  removeOpenLogsButton() {
    this.channelLogButton.remove();
  }
  showLoggerHelpModal(initial = false) {
    return;
    this.createModal({
      confirmText: 'OK',
      header: 'Logger help',
      size: this.createModal.confirmationModal.Sizes.LARGE,
      children: [
        ZeresPluginLibrary.ReactTools.createWrappedElement([
          this.parseHTML(
            `<div class="${this.multiClasses.defaultColor}" style="max-height: 0; min-height: 60vh;">
                               ${initial ? '</br><span style="font-size: 40px;">As you are a <strong>first time user</strong>, you must know in order to have a server be logged, you must <strong>RIGHT CLICK</strong> a server or channel and add it to the whitelist.</br>Alternatively if this behavior is unwanted, you can always log all unmuted servers and channels by disabling <strong>Only log whitelist</strong> in logger settings under <strong>IGNORES AND OVERRIDES</strong>.</span></br></br>' : ''}
                               Hello! This is the ${this.getName()} help modal! You may at any time open this in plugin settings by clicking the help button, or in the menu by pressing the question mark button and then then Logger help button.</br>
                               <strong>Menu:</strong></br></br>
                                <div class="${this.style.textIndent}">
                                    DELETE + LEFT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Clicking on a message, deletes the message</br>
                                        Clicking on an edit deletes that specific edit</br>
                                        Clicking on the timestamp deletes all messages in that message group
                                    </div></br>
                                    RIGHT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Right-clicking the timestamp opens up options for the entire message group
                                    </div></br>
                                </div>
                                <strong>Toasts:</strong></br>
                                <div class="${this.style.textIndent}">
                                    Note: Little "notifications" in discord that tell you if a message was edited, deleted, purged etc are called Toasts!</br></br>
                                    LEFT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Opens menu with the relevant tab</br>
                                    </div></br>
                                    RIGHT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Jumps to relevant message in the relevant channel
                                    </div></br>
                                    MIDDLE-CLICK/SCROLLWHEEL-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Only dismisses/closes the Toast.
                                    </div></br>
                                </div>
                                <strong>Notifications:</strong></br>
                                <div class="${this.style.textIndent}">
                                    Note: They show in the top right corner and are called XenoLib notifications. Can be enabled in Settings > Display Settings, all the way at the bottom.</br></br>
                                    LEFT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Opens menu with the relevant tab</br>
                                    </div></br>
                                    RIGHT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Jumps to relevant message in the relevant channel
                                    </div></br>
                                </div>
                                <strong>Open Logs button (top right next to search):</strong></br>
                                <div class="${this.style.textIndent}">
                                    LEFT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Opens menu</br>
                                    </div></br>
                                    RIGHT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Opens filtered menu that only shows messages from selected channel</br>
                                    </div></br>
                                </div>
                                <strong>Whitelist/blacklist, ignores and overrides:</strong></br>
                                <div class="${this.style.textIndent}">
                                    WHITELIST-ONLY:</br>
                                    <div class="${this.style.textIndent}">
                                        All servers are ignored unless whitelisted</br>
                                        Muted channels in whitelisted servers are ignored unless whitelisted or "Ignore muted channels" is disabled</br>
                                        All channels in whitelisted servers are logged unless blacklisted, or muted and "Ignore muted channels" is enabled
                                    </div></br>
                                    DEFAULT:</br>
                                    <div class="${this.style.textIndent}">
                                        All servers are logged unless blacklisted or muted and "Ignore muted servers" is enabled</br>
                                        Muted channels are ignored unless whitelisted or "Ignore muted channels" is disabled</br>
                                        Muted servers are ignored unless whitelisted or "Ignore muted servers" is disabled</br>
                                        Whitelisted channels in muted or blacklisted servers are logged</br>
                                    </div></br>
                                    ALL:</br>
                                    <div class="${this.style.textIndent}">
                                        Whitelisted channels in blacklisted servers are logged</br>
                                        Blacklisted channels in whitelisted servers are ignored</br>
                                        "Always log selected channel" overrides blacklist, whitelist-only mode, NSFW channel ignore, mute</br>
                                        "Always log DMs" overrides blacklist as well as whitelist-only mode</br>
                                        Channels marked NSFW and not whitelisted are ignored unless "Ignore NSFW channels" is disabled
                                    </div></br>
                                </div>
                                <strong>Chat:</strong></br>
                                <div class="${this.style.textIndent}">
                                    RIGHT-CLICK:</br>
                                    <div class="${this.style.textIndent}">
                                        Right-clicking an edit (darkened text) allows you to delete that edit, or hide edits</br>
                                        Right-clicking on a edited or deleted message gives you the option to hide the deleted message or hide or unhide edits, remove the edited or deleted message from log and remove deleted tint which makes the message look like it isn't deleted.
                                    </div></br>
                                </div>
                            </div>`
          )
        ])
      ],
      red: false
    });
  }
  showStatsModal() {
    const elements = [];
    let totalMessages = Object.keys(this.messageRecord).length;
    let messageCounts = [];
    let spaceUsageMB = 0;
    let cachedImageCount = 0;
    let cachedImagesUsageMB = 0;

    let mostDeletesChannel = { num: 0, id: '' };
    let mostEditsChannel = { num: 0, id: '' };
    let deleteDataTemp = {};
    let editDataTemp = {};

    for (const map of [this.deletedMessageRecord, this.editedMessageRecord, this.cachedMessageRecord]) {
      let messageCount = 0;
      if (!Array.isArray(map)) {
        for (const channelId in map) {
          if (!deleteDataTemp[channelId]) deleteDataTemp[channelId] = [];
          if (!editDataTemp[channelId]) editDataTemp[channelId] = [];
          for (const messageId of map[channelId]) {
            messageCount++;
            const record = this.messageRecord[messageId];
            if (!record) continue; // wtf?
            if (record.delete_data && deleteDataTemp[channelId].findIndex(m => m === messageId)) deleteDataTemp[channelId].push(messageId);
            if (record.edit_history && editDataTemp[channelId].findIndex(m => m === messageId)) editDataTemp[channelId].push(messageId);
          }
        }
      }
      for (const channelId in deleteDataTemp) if (deleteDataTemp[channelId].length > mostDeletesChannel.num) mostDeletesChannel = { num: deleteDataTemp[channelId].length, id: channelId };
      for (const channelId in editDataTemp) if (editDataTemp[channelId].length > mostEditsChannel.num) mostEditsChannel = { num: editDataTemp[channelId].length, id: channelId };

      messageCounts.push(messageCount);
    }
    const addLine = (name, value) => {
      elements.push(this.parseHTML(`<div class="${this.multiClasses.defaultColor}"><strong>${name}</strong>: ${value}</div></br>`));
    };
    addLine('Total messages', totalMessages);
    addLine('Deleted message count', messageCounts[0]);
    addLine('Edited message count', messageCounts[1]);
    addLine('Sent message count', this.cachedMessageRecord.length);

    let channel = this.tools.getChannel(mostDeletesChannel.id);
    if (channel) addLine('Most deletes', mostDeletesChannel.num + ' ' + this.getLiteralName(channel.guild_id, channel.id));
    if (channel) addLine('Most edits', mostEditsChannel.num + ' ' + this.getLiteralName(channel.guild_id, channel.id));

    //    addLine('Data file size', (this.nodeModules.fs.statSync(this.pluginDir + '/MessageLoggerV2Data.config.json').size / 1024 / 1024).toFixed(2) + 'MB');
    //  addLine('Data file size severity', this.slowSaveModeStep == 0 ? 'OK' : this.slowSaveModeStep == 1 ? 'MILD' : this.slowSaveModeStep == 2 ? 'BAD' : 'EXTREME');
    this.createModal({
      confirmText: 'OK',
      header: 'Data stats',
      // size: ZeresPluginLibrary.Modals.ModalSizes.SMALL,
      size: ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes.SMALL,
      children: [ZeresPluginLibrary.ReactTools.createWrappedElement(elements)],
      red: false
    });
  }
  _findLastIndex(array, predicate) {
    let l = array.length;
    while (l--) {
      if (predicate(array[l], l, array))
        return l;
    }
    return -1;
  }
  /*
  how it works:
  messages, stripped into IDs and times into var IDs:
  [1, 2, 3, 4, 5, 6, 7]
   ^                 ^
   lowestTime      highestTime
   deletedMessages, stripped into IDs and times into var savedIDs:
   sorted by time, newest to oldest
   lowest IDX that is higher than lowestTime, unless channelEnd, then it's 0
   highest IDX that is lower than highestTime, unless channelStart, then it's savedIDs.length - 1

   savedIDs sliced start lowest IDX, end highest IDX + 1
   appended IDs
   sorted by time, oldest to newest
   iterated, checked if ID is in messages, if not, fetch from this.messageRecord and splice it in at
   specified index
  */
  reAddDeletedMessages(messages, deletedMessages, channelStart, channelEnd) {
    if (!messages.length || !deletedMessages.length) return;
    const DISCORD_EPOCH = 14200704e5;
    const IDs = [];
    const savedIDs = [];
    for (let i = 0, len = messages.length; i < len; i++) {
      const { id } = messages[i];
      IDs.push({ id: id, time: (id / 4194304) + DISCORD_EPOCH });
    }
    for (let i = 0, len = deletedMessages.length; i < len; i++) {
      const id = deletedMessages[i];
      const record = this.messageRecord[id];
      if (!record) continue;
      if (!record.delete_data) {
        /* SOME WIZARD BROKE THE LOGGER LIKE THIS, WTFFFF */
        this.deleteMessageFromRecords(id);
        continue;
      }
      if (record.delete_data.hidden) continue;
      savedIDs.push({ id: id, time: (id / 4194304) + DISCORD_EPOCH });
    }
    savedIDs.sort((a, b) => a.time - b.time);
    if (!savedIDs.length) return;
    const { time: lowestTime } = IDs[IDs.length - 1];
    const [{ time: highestTime }] = IDs;
    const lowestIDX = channelEnd ? 0 : savedIDs.findIndex(e => e.time > lowestTime);
    if (lowestIDX === -1) return;
    const highestIDX = channelStart ? savedIDs.length - 1 : this._findLastIndex(savedIDs, e => e.time < highestTime);
    if (highestIDX === -1) return;
    const reAddIDs = savedIDs.slice(lowestIDX, highestIDX + 1);
    reAddIDs.push(...IDs);
    reAddIDs.sort((a, b) => b.time - a.time);
    for (let i = 0, len = reAddIDs.length; i < len; i++) {
      const { id } = reAddIDs[i];
      if (messages.findIndex((e) => e.id === id) !== -1) continue;
      const { message } = this.messageRecord[id];
      messages.splice(i, 0, message);
    }
  }
  getLiteralName(guildId, channelId, useTags = false) {
    // TODO, custom channel server failure text
    const guild = this.tools.getServer(guildId);
    const channel = this.tools.getChannel(channelId); // todo
    /* if (typeof guildNameBackup !== 'number' && guild && guildNameBackup)  */ if (guildId) {
      const channelName = (channel ? channel.name : 'unknown-channel');
      const guildName = (guild ? guild.name : 'unknown-server');
      if (useTags && channel) return `${guildName}, <#${channel.id}>`;
      return `${guildName}, #${channelName}`;
    } else if (channel && channel.name.length) {
      return `group ${channel.name}`;
    } else if (channel && channel.type == 3) {
      let finalGroupName = '';
      for (let i of channel.recipients) {
        const user = this.tools.getUser(i);
        if (!user) continue;
        if (useTags) finalGroupName += ', <@' + user.id + '>';
        else finalGroupName += ',' + user.username;
      }
      if (!finalGroupName.length) {
        return 'unknown group';
      } else {
        finalGroupName = finalGroupName.substr(1);
        if (useTags) return `group ${finalGroupName}`;
        finalGroupName = finalGroupName.length > 10 ? finalGroupName.substr(0, 10 - 1) + '...' : finalGroupName;
        return `group ${finalGroupName}`;
      }
    } else if (channel && channel.recipients) {
      const user = this.tools.getUser(channel.recipients[0]);
      if (!user) return 'DMs';
      if (useTags) return `<@${user.id}> DMs`;
      return `${user.username} DMs`;
    } else {
      return 'DMs';
    }
  }
  saveDeletedMessage(message, targetMessageRecord) {
    let result = this.createMiniFormattedData(message);
    result.delete_data = {};
    const id = message.id;
    const channelId = message.channel_id;
    result.delete_data.time = new Date().getTime();
    result.ghost_pinged = result.local_mentioned; // it's simple bruh
    if (!Array.isArray(targetMessageRecord[channelId])) targetMessageRecord[channelId] = [];
    if (this.messageRecord[id]) {
      const record = this.messageRecord[id];
      record.delete_data = result.delete_data;
      record.ghost_pinged = result.ghost_pinged;
    } else {
      this.messageRecord[id] = result;
    }
    if (this.messageRecord[id].message.attachments) {
      const attachments = this.messageRecord[id].message.attachments;
      for (let i = 0; i < attachments.length; i++) {
        attachments[i].url = attachments[i].proxy_url; // proxy url lasts longer
      }
    }
	if (this.messageRecord[id].message.embeds) {
      const embeds = this.messageRecord[id].message.embeds;
      for (let i = 0; i < embeds.length; i++) {
		if (embeds[i].image)
			embeds[i].image.url = embeds[i].image.proxy_url; // proxy url lasts longer
      }
    }
    if (this.settings.cacheAllImages) this.cacheMessageImages(this.messageRecord[id].message);
    targetMessageRecord[channelId].push(id);
  }
  createButton(label, callback) {
    const classes = this.createButton.classes;
    const ret = this.parseHTML(`<button type="button" class="${classes.button}"><div class="${classes.buttonContents}">${label}</div></button>`);
    if (callback) ret.addEventListener('click', callback);
    return ret;
  }
  getKeyByValue(obj, value) {
	  for (const key in obj) {
		if (obj.hasOwnProperty(key) && obj[key] === value) {
		  return key;
		}
	  }
  }
  createModal(options, image, name) {
    // const modal = image ? this.createModal.imageModal : this.createModal.confirmationModal;
	const ConfirmationModal = ZLibrary.DiscordModules.ConfirmationModal;
	const ModalActions = ZLibrary.DiscordModules.ModalActions;
	const React = ZeresPluginLibrary.DiscordModules.React;
	const ErrorBoundary = ZLibrary.Components.ErrorBoundary;
	
	// const modal = image ? this.createModal.imageModal : "div";
	const modalType = image ? this.createModal.imageModal : ConfirmationModal;
	const modal = "div";
	if (options.size)
		options.size = this.getKeyByValue(this.createModal.confirmationModal.Sizes, options.size).toLowerCase();
	
	if (image)
	{
		ModalActions.openModal(props => 
			ZeresPluginLibrary.DiscordModules.React.createElement(modalType, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})), { modalKey: name }
		);
		return;
	}
	
	// options.size = Object.keys(ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes)[Object.values(ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes).indexOf(options.size)].toLowerCase();
	// this.ModalStack.openModal(props => ZeresPluginLibrary.DiscordModules.React.createElement(modal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})), { modalKey: name });
    // this.menu.modalMain = ZLibrary.DiscordModules.ModalActions.openModal(props => ZeresPluginLibrary.DiscordModules.React.createElement(modal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})), { modalKey: name });
    // this.menu.modalMain = BdApi.showConfirmationModal("sussy", ZeresPluginLibrary.DiscordModules.React.createElement(modal, Object.assign({}, options, options.onClose ? { onClose: options.onClose } : {})));
	// this.menu.modalMain = BdApi.showConfirmationModal("sussy", ZeresPluginLibrary.DiscordModules.React.createElement(modal, options), { onCancel: options.onClose });
	/*
	const Markdown = ZLibrary.WebpackModules.find(m => m?.prototype?.render && m.rules);
	const ConfirmationModal = ZLibrary.DiscordModules.ConfirmationModal;
	const ModalActions = ZLibrary.DiscordModules.ModalActions;
	const React = ZeresPluginLibrary.DiscordModules.React;
	const ErrorBoundary = ZLibrary.Components.ErrorBoundary;
	const emptyFunction = () => {};
	const {onConfirm = emptyFunction, onCancel = emptyFunction, confirmText = ZLibrary.DiscordModules.Strings.Modals.okay, cancelText = ZLibrary.DiscordModules.Strings.Modals.cancel, danger = false, key = undefined} = options;

	// if (!this.ModalActions || !this.ConfirmationModal || !this.Markdown) {
		// return this.default(title, content, [
			// confirmText && {label: confirmText, action: onConfirm},
			// cancelText && {label: cancelText, action: onCancel, danger}
		// ].filter(Boolean));
	// }

	if (!Array.isArray(content)) content = [content];
	content = content.map(c => typeof(c) === "string" ? React.createElement(Markdown, null, c) : c);

	const modalKey = ModalActions.openModal(props => {
		return React.createElement(ErrorBoundary, {
			onError: () => {
				setTimeout(() => {
					ModalActions.closeModal(modalKey);
					this.default(title, content, [
						confirmText && {label: confirmText, action: onConfirm},
						cancelText && {label: cancelText, action: onCancel, danger}
					].filter(Boolean));
				});
			}
		}, React.createElement(ConfirmationModal, Object.assign({
			header: title,
			confirmButtonColor: danger ? this.Buttons.Colors.RED : this.Buttons.Colors.BRAND,
			confirmText: confirmText,
			cancelText: cancelText,
			onConfirm: onConfirm,
			onCancel: onCancel
		}, props), React.createElement(ErrorBoundary, {}, content)));
	}, {modalKey: key});
	*/
	
	// const Markdown = ZLibrary.WebpackModules.find(m => m?.prototype?.render && m.rules);
	// const emptyFunction = () => {};
	// const {onConfirm = emptyFunction, onCancel = emptyFunction, confirmText = ZLibrary.DiscordModules.Strings.Modals.okay, cancelText = ZLibrary.DiscordModules.Strings.Modals.cancel, danger = false, key = undefined} = options;

	// if (!this.ModalActions || !this.ConfirmationModal || !this.Markdown) {
		// return this.default(title, content, [
			// confirmText && {label: confirmText, action: onConfirm},
			// cancelText && {label: cancelText, action: onCancel, danger}
		// ].filter(Boolean));
	// }

	// if (!Array.isArray(content)) content = [content];
	// content = content.map(c => typeof(c) === "string" ? React.createElement(Markdown, null, c) : c);

	// const modalKey = ModalActions.openModal(props => ZeresPluginLibrary.DiscordModules.React.createElement(modal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})));
	const modalKey = ModalActions.openModal(props => {
		return React.createElement(ErrorBoundary, {
			onError: () => {
				setTimeout(() => {
					ModalActions.closeModal(modalKey);
				});
			}
		// }, React.createElement(ConfirmationModal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {}), React.createElement(ErrorBoundary, {}, ZeresPluginLibrary.DiscordModules.React.createElement(modal, { className: options.className, header: options.header, size: options.size }, options.children))));
		}, React.createElement(modalType, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {}), 
				React.createElement(ErrorBoundary, {}, 
					ZeresPluginLibrary.DiscordModules.React.createElement(modal, { className: options.className, header: options.header, size: options.size }, options.children))));
	}, {modalKey: name});
	
	// this.ModalStack.openModal();
	
	// this.menu.modalMain = BdApi.showConfirmationModal("Logs", ZeresPluginLibrary.DiscordModules.React.createElement(modal, { className: options.className, header: options.header, size: options.size }, options.children), options);
	// this.menu.modalMain = modalKey;
	// this.menu.modalMain = ZLibrary.DiscordModules.ModalActions.openModal(props => ZeresPluginLibrary.DiscordModules.React.createElement(modal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})), { modalKey: name });
	
	// ; modalKey;
  }
  getMessageAny(id) {
    const record = this.messageRecord[id];
    if (!record) return this.cachedMessageRecord.find(m => m.id == id);
    return record.message;
  }
  cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts = 0, serverId) {
    // this.nodeModules.request({ url: url, encoding: null, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9002 Chrome/83.0.4103.122 Electron/9.3.5 Safari/537.36' } }, (err, res, buffer) => {
      // try {
        // if (err || res.statusCode != 200) {
          // if (res.statusCode == 404 || res.statusCode == 403) return;
          // attempts++;
          // if (attempts > 3) return ZeresPluginLibrary.Logger.warn(this.getName(), `Failed to get image ${attachmentId} for caching, error code ${res.statusCode}`);
          // return setTimeout(() => this.cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts), 1000);
        // }
        // const fileExtension = url.match(/\.[0-9a-z]+$/i)[0];
        // this.nodeModules.fs.writeFileSync(this.settings.imageCacheDir + `/${attachmentId}${fileExtension}`, buffer, { encoding: null });
      // } catch (err) {
        // console.error('Failed to save image cache', err.message);
      // }
    // });
		
	let chunks = [];
	require("https").get(url, {}, (eventListener) => {
			eventListener.on("data", (data) => {
				chunks.push(data);	
			});
			eventListener.on("end", (r) => {
				if (r.statusCode != 200)
				{
					if (r.statusCode == 404 || r.statusCode == 403) return;
					attempts++;
					if (attempts > 3) return ZeresPluginLibrary.Logger.warn(this.getName(), `Failed to get image ${attachmentId} for caching, error code ${res.statusCode}`);
					return setTimeout(() => this.cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts), 1000);
				}
				let finalData = Buffer.concat(chunks);

				// const uint8Array = Uint8Array.from(finalData);
				// const textDecoder = new TextDecoder();
				// const responseString = textDecoder.decode(uint8Array);
				
				const fileExtension = url.match(/\.[0-9a-z]+$/i)[0];
				if (!Number(attachmentId)) attachmentId = messageId;
				if (!(this.settings.newCacheAllImages === true))
					require("fs").writeFileSync(this.settings.imageCacheDir + `/${attachmentId}${fileExtension}`, finalData, { encoding: null });
				else
				{
					/*
					let savePath = this.settings.newCacheAllImagesPath && this.settings.newCacheAllImagesPath != '' && require("fs").existsSync(this.settings.newCacheAllImagesPath) ? this.settings.newCacheAllImagesPath : this.settings.imageCacheDir;
					// todo make it readable
					// let serverNameRaw = serverId != null ? ZLibrary.DiscordModules.GuildStore.getGuild(serverId).name : ZLibrary.DiscordModules.ChannelStore.getChannel(channelId).recipients.length == 1 ? ZLibrary.DiscordModules.ChannelStore.getChannel(channelId).rawRecipients[0].username : "Unknown DM";
					let serverNameRaw = serverId != null ? ZLibrary.DiscordModules.GuildStore.getGuild(serverId).name : "DMs";
					let channelNameRaw = serverId != null ? ZLibrary.DiscordModules.ChannelStore.getChannel(channelId).name : ZLibrary.DiscordModules.ChannelStore.getChannel(channelId).recipients.length == 1 ? ZLibrary.DiscordModules.ChannelStore.getChannel(channelId).rawRecipients[0].username : "Unknown DM";
					
					let serverName = serverNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_. -]/g, "");
					let channelName = channelNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_. -]/g, "");
					
					let filePath = savePath + "/" + ( serverId != null ? serverId + " (" + serverName + ")" : serverName ) + "/" + channelId + " (" + channelName + ")";
					*/
					let filePath = this.imageCacheServerSimulator.resolveNewCachePath({ channelId: channelId, serverId: serverId });
					require("fs").mkdirSync(filePath, { recursive: true });
					require("fs").writeFileSync(filePath + `/${attachmentId} (${messageId})${fileExtension}`, finalData, { encoding: null });
				}
			});
	});
	// {
      // try {
        // if (err || res.statusCode != 200) {
          // if (res.statusCode == 404 || res.statusCode == 403) return;
          // attempts++;
          // if (attempts > 3) return ZeresPluginLibrary.Logger.warn(this.getName(), `Failed to get image ${attachmentId} for caching, error code ${res.statusCode}`);
          // return setTimeout(() => this.cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts), 1000);
        // }
        // const fileExtension = url.match(/\.[0-9a-z]+$/i)[0];
        // this.nodeModules.fs.writeFileSync(this.settings.imageCacheDir + `/${attachmentId}${fileExtension}`, buffer, { encoding: null });
      // } catch (err) {
        // console.error('Failed to save image cache', err.message);
      // }
    // });
  }
  cacheMessageImages(message) {
    // don't block it, ugly but works, might rework later
    setTimeout(() => {
      for (let i = 0; i < message.attachments.length; i++) {
        const attachment = message.attachments[i];
        if (!this.isImage(attachment.url)) continue;
        this.cacheImage(attachment.url, i, attachment.id, message.id, message.channel_id, undefined, this.settings.newCacheAllImages === true ? message.guild_id : undefined);
      }
	  for (let i = 0; i < message.embeds.length; i++) {
		if (!message.embeds[i].image) continue;
        const embed = message.embeds[i].image;
        // if (!this.isImage(embed.url)) continue; // it's obviously image
        this.cacheImage(embed.url, i, embed.url.split("/")[embed.url.split("/").length - 2], message.id, message.channel_id, undefined, this.settings.newCacheAllImages === true ? message.guild_id : undefined);
      }
    }, 0);
  }
  /* ==================================================-|| END MISC ||-================================================== */
  /* ==================================================-|| START MESSAGE MANAGMENT ||-================================================== */
  deleteMessageFromRecords(id) {
    const record = this.messageRecord[id];
    if (!record) {
      for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) {
        for (let channelId in map) {
          const index = map[channelId].findIndex(m => m === id);
          if (index == -1) continue;
          map[channelId].splice(index, 1);
          if (!map[channelId].length) delete map[channelId];
        }
      }
      return;
    }
    // console.log('Deleting', record);
    const channelId = record.message.channel_id;
    for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) {
      if (!map[channelId]) continue;
      const index = map[channelId].findIndex(m => m === id);
      if (index == -1) continue;
      map[channelId].splice(index, 1);
      if (!map[channelId].length) delete map[channelId];
    }
    delete this.messageRecord[id];
  }
  handleMessagesCap() {
    try {
      // TODO: add empty record and infinite loop checking for speed improvements
      const extractAllMessageIds = map => {
        let ret = [];
        for (let channelId in map) {
          for (let messageId of map[channelId]) {
            ret.push(messageId);
          }
        }
        return ret;
      };
      if (this.cachedMessageRecord.length > this.settings.messageCacheCap) this.cachedMessageRecord.splice(0, this.cachedMessageRecord.length - this.settings.messageCacheCap);
      let changed = false;
      const deleteMessages = map => {
        this.sortMessagesByAge(map);
        const toDelete = map.length - this.settings.savedMessagesCap;
        for (let i = map.length - 1, deleted = 0; i >= 0 && deleted != toDelete; i--, deleted++) {
          this.deleteMessageFromRecords(map[i]);
        }
        changed = true;
      };
      const handleInvalidEntries = map => {
        for (let channelId in map) {
          for (let messageIdIdx = map[channelId].length - 1; messageIdIdx >= 0; messageIdIdx--) {
            if (!Array.isArray(map[channelId])) {
              delete map[channelId];
              changed = true;
              continue;
            }
            if (!this.messageRecord[map[channelId][messageIdIdx]]) {
              map[channelId].splice(messageIdIdx, 1);
              changed = true;
            }
          }
          if (!map[channelId].length) {
            delete map[channelId];
            changed = true;
          }
        }
      };
      for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) handleInvalidEntries(map);
      // I have no idea how to optimize this, HELP!
      //const checkIsInRecords = (channelId, messageId) => {
      //  // for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) if (map[channelId] && map[channelId].indexOf(messageId) !== -1) return true;
      //  let map = this.deletedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  map = this.editedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  map = this.purgedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  return false;
      //};

      //for (const messageId in this.messageRecord) {
      //  if (!checkIsInRecords(this.messageRecord[messageId].message.channel_id, messageId)) {/*  delete this.messageRecord[messageId]; */ }
      //}
      let deletedMessages = extractAllMessageIds(this.deletedMessageRecord);
      let editedMessages = extractAllMessageIds(this.editedMessageRecord);
      let purgedMessages = extractAllMessageIds(this.purgedMessageRecord);
      for (let map of [deletedMessages, editedMessages, purgedMessages]) if (map.length > this.settings.savedMessagesCap) deleteMessages(map);
      if (changed) this.saveData();
      if (!this.settings.cacheAllImages) return;
      if (!this.settings.dontDeleteCachedImages) {
        const savedImages = this.nodeModules.fs.readdirSync(this.settings.imageCacheDir);
        const msgs = Object.values(this.messageRecord)
          .filter(e => e.delete_data)
          .map(({ message: { attachments } }) => attachments)
          .filter(e => e.length);
        for (let img of savedImages) {
          const [attId] = img.split('.');
          if (isNaN(attId)) continue;
          let found = false;
          for (let i = 0, len = msgs.length; i < len; i++) {
            if (msgs[i].findIndex(({ id }) => id === attId) !== -1) {
              found = true;
              break;
            }
          }
          if (found) continue;
          this.nodeModules.fs.unlink(`${this.settings.imageCacheDir}/${img}`, e => e && ZeresPluginLibrary.Logger.err(this.getName(), 'Error deleting unreferenced image, what the shit', e.message));
        }
      }
      // 10 minutes
      for (let id in this.editHistoryAntiSpam) if (new Date().getTime() - this.editHistoryAntiSpam[id].times[0] < 10 * 60 * 1000) delete this.editHistoryAntiSpam[id];
    } catch (e) {
      ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Error clearing out data', e);
    }
  }
  /* ==================================================-|| END MESSAGE MANAGMENT ||-================================================== */
  onDispatchEvent(args, callDefault) {
    const dispatch = args[0];
    let ret = Promise.resolve();

    if (!dispatch) return callDefault(...args);

    try {
      if (dispatch.type === 'MESSAGE_LOGGER_V2_SELF_TEST') {
        clearTimeout(this.selfTestTimeout);
        //console.log('Self test OK');
        this.selfTestFailures = 0;
        return ret;
      }
      // if (dispatch.type == 'EXPERIMENT_TRIGGER') return callDefault(...args);
      // console.log('INFO: onDispatchEvent -> dispatch', dispatch);
      if (dispatch.type === 'CHANNEL_SELECT') {
        ret = callDefault(...args);
        this.selectedChannel = this.getSelectedTextChannel();
        return ret;
      }

      if (dispatch.ML2 && dispatch.type === 'MESSAGE_DELETE') return callDefault(...args);

      if (dispatch.type !== 'MESSAGE_CREATE' && dispatch.type !== 'MESSAGE_DELETE' && dispatch.type !== 'MESSAGE_DELETE_BULK' && dispatch.type !== 'MESSAGE_UPDATE' && dispatch.type !== 'LOAD_MESSAGES_SUCCESS') return callDefault(...args);

      // console.log('INFO: onDispatchEvent -> dispatch', dispatch);

      if (dispatch.message && (dispatch.message.type !== 0 && dispatch.message.type !== 19 && (dispatch.message.type !== 20 || (dispatch.message.flags & 64) === 64))) return callDefault(...args); // anti other shit 1

      const channel = this.tools.getChannel(dispatch.message ? dispatch.message.channel_id : dispatch.channelId);
      if (!channel) return callDefault(...args);
      const guild = channel.guild_id ? this.tools.getServer(channel.guild_id) : false;

      let author = dispatch.message && dispatch.message.author ? this.tools.getUser(dispatch.message.author.id) : false;
      if (!author) author = ((this.channelMessages[channel.id] || { _map: {} })._map[dispatch.message ? dispatch.message.id : dispatch.id] || {}).author;
      if (!author) {
        // last ditch attempt
        let message = this.getCachedMessage(dispatch.id);
        if (message) author = this.tools.getUser(message.author.id);
      }

      if (!author && !(dispatch.type == 'LOAD_MESSAGES_SUCCESS' || dispatch.type == 'MESSAGE_DELETE_BULK')) return callDefault(...args);

      const isLocalUser = author && author.id === this.localUser.id;

      if (author && author.bot && this.settings.ignoreBots) return callDefault(...args);
      if (author && isLocalUser && this.settings.ignoreSelf) return callDefault(...args);
      if (author && this.settings.ignoreBlockedUsers && this.tools.isBlocked(author.id) && !isLocalUser) return callDefault(...args);
      if (author && author.avatar === 'clyde') return callDefault(...args);

      if (this.settings.ignoreLocalEdits && dispatch.type === 'MESSAGE_UPDATE' && isLocalUser) return callDefault(...args);
      if (this.settings.ignoreLocalDeletes && dispatch.type === 'MESSAGE_DELETE' && isLocalUser && this.localDeletes.findIndex(m => m === dispatch.id) !== -1) return callDefault(...args);

      let guildIsMutedReturn = false;
      let channelIgnoreReturn = false;

      const isInWhitelist = id => this.settings.whitelist.findIndex(m => m === id) != -1;
      const isInBlacklist = id => this.settings.blacklist.findIndex(m => m === id) != -1;
      const guildWhitelisted = guild && isInWhitelist(guild.id);
      const channelWhitelisted = isInWhitelist(channel.id);

      const guildBlacklisted = guild && isInBlacklist(guild.id);
      const channelBlacklisted = isInBlacklist(channel.id);

      let doReturn = false;

      if (guild) {
        guildIsMutedReturn = this.settings.ignoreMutedGuilds && this.muteModule.isMuted(guild.id);
        channelIgnoreReturn = (this.settings.ignoreNSFW && channel.nsfw && !channelWhitelisted) || (this.settings.ignoreMutedChannels && (this.muteModule.isChannelMuted(guild.id, channel.id) || (channel.parent_id && this.muteModule.isChannelMuted(guild.id, channel.parent_id))));
      }

	  const editOrDel = dispatch.type == 'MESSAGE_DELETE' ? 1 : dispatch.type == 'MESSAGE_UPDATE' ? 2 : 0;
	  if (editOrDel != 0 && (this.settings.notificationBlacklist.indexOf(channel.id) !== -1 || (guild && this.settings.notificationBlacklist.indexOf(guild.id) !== -1)) && ((this.settings.alwaysNotifChannel && this.selectedChannel && this.selectedChannel.id == channel.id) || (this.settings.alwaysNotifGuild && guild && this.selectedChannel.guild_id == guild.id))) {
		 // TODO: use switch case
		 console.log("Triggered always notif selected condition: ");
		 const cond = (this.settings.alwaysNotifChannel && this.selectedChannel && this.selectedChannel.id == channel.id) ? "channel" : "guild";
		 console.log(cond);
		 if (editOrDel == 1) {
			 if (guild ? this.settings.toastToggles.deleted && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.deleted && !isLocalUser) {
				if (this.settings.useNotificationsInstead) {
				  XenoLib.Notifications.danger(`Message deleted from ${this.getLiteralName(channel.guild_id, channel.id, true)}`, {
					onClick: () => this.openWindow('deleted'),
					onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
					timeout: 4500
				  });
				} else {
				  this.showToast(`Message deleted from ${this.getLiteralName(channel.guild_id, channel.id)}`, {
					type: 'error',
					onClick: () => this.openWindow('deleted'),
					onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
					timeout: 4500
				  });
				}
			  }
		 }
		 else if (editOrDel == 2) {
			if (guild ? this.settings.toastToggles.edited && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.edited && !isLocalUser) {
			  if (this.settings.useNotificationsInstead) {
				XenoLib.Notifications.info(`Message edited in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, {
				  onClick: () => this.openWindow('edited'),
				  onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id),
				  timeout: 4500
				});
			  } else {
				this.showToast(`Message edited in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
				  type: 'info',
				  onClick: () => this.openWindow('edited'),
				  onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id),
				  timeout: 4500
				});
			  }
			}
		 }
	  }
			
      if (!((this.settings.alwaysLogSelected && this.selectedChannel && this.selectedChannel.id == channel.id) || (this.settings.alwaysLogDM && !guild))) {
        if (guildBlacklisted) {
          if (!channelWhitelisted) doReturn = true; // not whitelisted
        } else if (guildWhitelisted) {
          if (channelBlacklisted) doReturn = true; // channel blacklisted
          if (channelIgnoreReturn && !channelWhitelisted) doReturn = true;
        } else {
          if (this.settings.onlyLogWhitelist) {
            if (!channelWhitelisted) doReturn = true; // guild not in either list, channel not whitelisted
          } else {
            if (channelBlacklisted) doReturn = true; // channel blacklisted
            if (channelIgnoreReturn || guildIsMutedReturn) {
              if (!channelWhitelisted) doReturn = true;
            }
          }
        }
      }

      if (doReturn && this.settings.alwaysLogGhostPings) {
        if (dispatch.type === 'MESSAGE_DELETE') {
          const deleted = (this.tempEditedMessageRecord[dispatch.id] && this.tempEditedMessageRecord[dispatch.id].message) || this.getCachedMessage(dispatch.id, dispatch.channelId);
          if (!deleted || (deleted.type !== 0 && deleted.type !== 19 && deleted.type !== 20)) return callDefault(...args); // nothing we can do past this point..
		  if (deleted.flags == 64) return callDefault(...args);
          if (!this.tools.isMentioned(deleted, this.localUser.id)) return callDefault(...args);
          const record = this.messageRecord[dispatch.id];
          if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && (!record || !record.ghost_pinged)) {
            XenoLib.Notifications.warning(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, { timeout: 0, onClick: () => this.openWindow('ghostpings'), onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id), channelId: channel.id });
            if (!this.settings.useNotificationsInstead) {
              this.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'warning',
                onClick: () => this.openWindow('ghostpings'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
          this.saveDeletedMessage(deleted, this.deletedMessageRecord);
          this.saveData();
          if (XenoLib.DiscordAPI.channelId.id === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: dispatch.id });
        } else if (dispatch.type === 'MESSAGE_UPDATE') {
          if (!dispatch.message.edited_timestamp) {
            if (dispatch.message.embeds) {
              let last = this.getCachedMessage(dispatch.message.id);
              if (last) last.embeds = dispatch.message.embeds.map(this.cleanupEmbed);
            }
            return callDefault(...args);
          }
          let isSaved = this.getEditedMessage(dispatch.message.id, channel.id);
          const last = this.getCachedMessage(dispatch.message.id, channel.id);
          const lastEditedSaved = isSaved || this.tempEditedMessageRecord[dispatch.message.id];
          // if we have lastEdited then we can still continue as we have all the data we need to process it.
          if (!last && !lastEditedSaved) return callDefault(...args); // nothing we can do past this point..

          if (isSaved && !lastEditedSaved.local_mentioned) {
            lastEditedSaved.message.content = dispatch.message.content; // don't save history, just the value so we don't confuse the user
            return callDefault(...args);
          }

          let ghostPinged = false;
          if (lastEditedSaved) {
            // last is not needed, we have all the data already saved
            if (lastEditedSaved.message.content === dispatch.message.content) return callDefault(...args); // we don't care about that
            lastEditedSaved.edit_history.push({
              content: lastEditedSaved.message.content,
              time: new Date().getTime()
            });
            lastEditedSaved.message.content = dispatch.message.content;
            ghostPinged = !lastEditedSaved.ghost_pinged && lastEditedSaved.local_mentioned && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          } else {
            if (last.content === dispatch.message.content) return callDefault(...args); // we don't care about that
            let data = this.createMiniFormattedData(last);
            data.edit_history = [
              {
                content: last.content,
                time: new Date().getTime()
              }
            ];
            data.message.content = dispatch.message.content;
            this.tempEditedMessageRecord[data.message.id] = data;
            ghostPinged = this.tools.isMentioned(last, this.localUser.id) && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          }

          if (isSaved) this.saveData();

          if (!ghostPinged) return callDefault(...args);

          if (!isSaved) {
            const data = this.tempEditedMessageRecord[dispatch.message.id];
            data.ghost_pinged = true;
            this.messageRecord[dispatch.message.id] = data;
            if (!this.editedMessageRecord[channel.id]) this.editedMessageRecord[channel.id] = [];
            this.editedMessageRecord[channel.id].push(dispatch.message.id);
            this.saveData();
          } else {
            const lastEdited = this.getEditedMessage(dispatch.message.id, channel.id);
            if (!lastEdited) return callDefault(...args);
            lastEdited.ghost_pinged = true;
            this.saveData();
          }

          if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings)) {
            XenoLib.Notifications.warning(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, { timeout: 0, onClick: () => this.openWindow('ghostpings'), onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id), channelId: channel.id });
            if (!this.settings.useNotificationsInstead) {
              this.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'warning',
                onClick: () => this.openWindow('ghostpings'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
        } else if (dispatch.type == 'MESSAGE_CREATE' && dispatch.message && (dispatch.message.content.length || (dispatch.attachments && dispatch.attachments.length) || (dispatch.embeds && dispatch.embeds.length)) && dispatch.message.state != 'SENDING' && !dispatch.optimistic && (dispatch.message.type === 0 || dispatch.message.type === 19 || dispatch.message.type === 20) && this.tools.isMentioned(dispatch.message, this.localUser.id)) {
          if (this.cachedMessageRecord.findIndex(m => m.id === dispatch.message.id) != -1) return callDefault(...args);
          this.cachedMessageRecord.push(dispatch.message);
        }
      }
      if (doReturn) return callDefault(...args);

      if (dispatch.type == 'LOAD_MESSAGES_SUCCESS') {
        if (!this.settings.restoreDeletedMessages) return callDefault(...args);
        if (dispatch.jump && dispatch.jump.ML2) delete dispatch.jump;
        const deletedMessages = this.deletedMessageRecord[channel.id];
        const purgedMessages = this.purgedMessageRecord[channel.id];
        try {
          const recordIDs = [...(deletedMessages || []), ...(purgedMessages || [])];
          const fetchUser = id => this.tools.getUser(id) || dispatch.messages.find(e => e.author.id === id)
          for (let i = 0, len = recordIDs.length; i < len; i++) {
            const id = recordIDs[i];
            if (!this.messageRecord[id]) continue;
            const { message } = this.messageRecord[id];
            for (let j = 0, len2 = message.mentions.length; j < len2; j++) {
              const user = message.mentions[j];
              const cachedUser = fetchUser(user.id || user);
              if (cachedUser) message.mentions[j] = this.cleanupUserObject(cachedUser);
            }
            const author = fetchUser(message.author.id);
            if (!author) continue;
            message.author = this.cleanupUserObject(author);
          }
        } catch { }
        if ((!deletedMessages && !purgedMessages) || (!this.settings.showPurgedMessages && !this.settings.showDeletedMessages)) return callDefault(...args);
        if (this.settings.showDeletedMessages && deletedMessages) this.reAddDeletedMessages(dispatch.messages, deletedMessages, !dispatch.hasMoreAfter && !dispatch.isBefore, !dispatch.hasMoreBefore && !dispatch.isAfter);
        if (this.settings.showPurgedMessages && purgedMessages) this.reAddDeletedMessages(dispatch.messages, purgedMessages, !dispatch.hasMoreAfter && !dispatch.isBefore, !dispatch.hasMoreBefore && !dispatch.isAfter);
        return callDefault(...args);
      }

      const notificationsBlacklisted = this.settings.notificationBlacklist.indexOf(channel.id) !== -1 || (guild && this.settings.notificationBlacklist.indexOf(guild.id) !== -1);
	  let notificationsWhitelisted = true;
	  if (this.settings.notifOnlyWhitelist)
		notificationsWhitelisted = this.settings.notificationWhitelist.indexOf(channel.id) !== -1 || (guild && this.settings.notificationWhitelist.indexOf(guild.id) !== -1);

      if (dispatch.type == 'MESSAGE_DELETE') {
        const deleted = this.getCachedMessage(dispatch.id, dispatch.channelId);

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }

        if (!deleted) return callDefault(...args); // nothing we can do past this point..

        if (this.deletedMessageRecord[channel.id] && this.deletedMessageRecord[channel.id].findIndex(m => m === deleted.id) != -1) {
          if (!this.settings.showDeletedMessages) ret = callDefault(...args);
          return ret;
        }

        if (deleted.type !== 0 && deleted.type !== 19 && (deleted.type !== 20 || (deleted.flags & 64) === 64)) return callDefault(...args);
		if (deleted.flags == 64) return callDefault(...args); // here just in case

        if (this.settings.showDeletedCount) {
          if (!this.deletedChatMessagesCount[channel.id]) this.deletedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.deletedChatMessagesCount[channel.id]++;
        }
        if (!notificationsBlacklisted) {
          if (guild ? this.settings.toastToggles.deleted && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.deleted && !isLocalUser) {
            if (this.settings.useNotificationsInstead) {
              XenoLib.Notifications.danger(`Message deleted from ${this.getLiteralName(channel.guild_id, channel.id, true)}`, {
                onClick: () => this.openWindow('deleted'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            } else {
              this.showToast(`Message deleted from ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'error',
                onClick: () => this.openWindow('deleted'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
        }

        const record = this.messageRecord[dispatch.id];

        if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && (!record || !record.ghost_pinged) && this.tools.isMentioned(deleted, this.localUser.id)) {
          XenoLib.Notifications.warning(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, { timeout: 0, onClick: () => this.openWindow('ghostpings'), onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id), channelId: dispatch.channelId });
          if (!this.settings.useNotificationsInstead) {
            this.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
              type: 'warning',
              onClick: () => this.openWindow('ghostpings'),
              onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
              timeout: 4500
            });
          }
        }

        this.saveDeletedMessage(deleted, this.deletedMessageRecord);
        // if (this.settings.cacheAllImages) this.cacheImages(deleted);
        if (!this.settings.showDeletedMessages) ret = callDefault(...args);
        else if (XenoLib.DiscordAPI.channelId === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: dispatch.id });
        this.saveData();
      } else if (dispatch.type == 'MESSAGE_DELETE_BULK') {
        if (this.settings.showDeletedCount) {
          if (!this.deletedChatMessagesCount[channel.id]) this.deletedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.deletedChatMessagesCount[channel.id] += dispatch.ids.length;
        }

        let failedMessage = false;

        for (let i = 0; i < dispatch.ids.length; i++) {
          const purged = this.getCachedMessage(dispatch.ids[i], channel.id);
          if (!purged) {
            failedMessage = true;
            continue;
          }
          this.saveDeletedMessage(purged, this.purgedMessageRecord);
          if (XenoLib.DiscordAPI.channelId === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: purged.id });
        }

        if (failedMessage && this.aggresiveMessageCaching)
          // forcefully cache the channel in case there are active convos there
          this.cacheChannelMessages(channel.id);
        else if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }
        if (!notificationsBlacklisted && notificationsWhitelisted) {
          if (guild ? this.settings.toastToggles.deleted : this.settings.toastTogglesDMs.deleted) {
            if (this.settings.useNotificationsInstead) {
              XenoLib.Notifications.danger(`${dispatch.ids.length} messages bulk deleted from ${this.getLiteralName(channel.guild_id, channel.id, true)}`, {
                onClick: () => this.openWindow('purged'),
                onContext: () => this.jumpToMessage(channel.id, undefined, guild && guild.id),
                timeout: 4500
              });
            } else {
              this.showToast(`${dispatch.ids.length} messages bulk deleted from ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'error',
                onClick: () => this.openWindow('purged'),
                onContext: () => this.jumpToMessage(channel.id, undefined, guild && guild.id),
                timeout: 4500
              });
            }
          }
        }
        if (!this.settings.showPurgedMessages) ret = callDefault(...args);
        this.saveData();
      } else if (dispatch.type == 'MESSAGE_UPDATE') {
        if (!dispatch.message.edited_timestamp) {
          if (dispatch.message.embeds) {
            let last = this.getCachedMessage(dispatch.message.id);
            if (last) last.embeds = dispatch.message.embeds.map(this.cleanupEmbed);
          }
          return callDefault(...args);
        }

        if (this.settings.showEditedCount) {
          if (!this.editedChatMessagesCount[channel.id]) this.editedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.editedChatMessagesCount[channel.id]++;
        }

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }

        const last = this.getCachedMessage(dispatch.message.id, channel.id);
        const lastEditedSaved = this.getEditedMessage(dispatch.message.id, channel.id);

        // if we have lastEdited then we can still continue as we have all the data we need to process it.
        if (!last && !lastEditedSaved) return callDefault(...args); // nothing we can do past this point..
        let ghostPinged = false;
        if (lastEditedSaved) {
          // last is not needed, we have all the data already saved
          // console.log(lastEditedSaved.message);
          // console.log(dispatch.message);
          if (lastEditedSaved.message.content === dispatch.message.content) {
            return callDefault(...args); // we don't care about that
          }
          lastEditedSaved.edit_history.push({
            content: lastEditedSaved.message.content,
            time: new Date().getTime()
          });
          lastEditedSaved.message.content = dispatch.message.content;
          ghostPinged = !lastEditedSaved.ghost_pinged && lastEditedSaved.local_mentioned && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          if (ghostPinged) lastEditedSaved.ghost_pinged = true;
        } else {
          if (last.content === dispatch.message.content) {
            return callDefault(...args); // we don't care about that
          }
          let data = this.createMiniFormattedData(last);
          data.edit_history = [
            {
              content: last.content,
              time: new Date().getTime()
            }
          ];
          ghostPinged = this.tools.isMentioned(last, this.localUser.id) && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          data.message.content = dispatch.message.content;
          if (ghostPinged) data.ghost_pinged = true;
          this.messageRecord[data.message.id] = data;
          if (!this.editedMessageRecord[channel.id]) this.editedMessageRecord[channel.id] = [];
          this.editedMessageRecord[channel.id].push(data.message.id);
        }
        if (!notificationsBlacklisted && notificationsWhitelisted) {
          if (guild ? this.settings.toastToggles.edited && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.edited && !isLocalUser) {
            if (!this.settings.blockSpamEdit) {
              if (!this.editHistoryAntiSpam[author.id]) {
                this.editHistoryAntiSpam[author.id] = {
                  blocked: false,
                  times: [new Date().getTime()]
                };
              } else {
                this.editHistoryAntiSpam[author.id].times.push(new Date().getTime());
              }
              if (this.editHistoryAntiSpam[author.id].times.length > 10) this.editHistoryAntiSpam[author.id].times.shift();
              if (this.editHistoryAntiSpam[author.id].times.length === 10 && new Date().getTime() - this.editHistoryAntiSpam[author.id].times[0] < 60 * 1000) {
                if (!this.editHistoryAntiSpam[author.id].blocked) {
                  if (this.settings.useNotificationsInstead) {
                    XenoLib.Notifications.warning(`Edit notifications from <@${author.id}> have been temporarily blocked for 1 minute.`, {
                      timeout: 7500,
                      channelId: channel.id
                    });
                  } else {
                    this.showToast(`Edit notifications from ${author.username} have been temporarily blocked for 1 minute.`, {
                      type: 'warning',
                      timeout: 7500
                    });
                  }
                  this.editHistoryAntiSpam[author.id].blocked = true;
                }
              } else if (this.editHistoryAntiSpam[author.id].blocked) {
                this.editHistoryAntiSpam[author.id].blocked = false;
                this.editHistoryAntiSpam[author.id].times = [];
              }
            }
            if (this.settings.blockSpamEdit || !this.editHistoryAntiSpam[author.id].blocked) {
              if (this.settings.useNotificationsInstead) {
                XenoLib.Notifications.info(`Message edited in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, {
                  onClick: () => this.openWindow('edited'),
                  onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id),
                  timeout: 4500
                });
              } else {
                this.showToast(`Message edited in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                  type: 'info',
                  onClick: () => this.openWindow('edited'),
                  onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id),
                  timeout: 4500
                });
              }
            }
          }
        }
        if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && ghostPinged) {
          XenoLib.Notifications.warning(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, { timeout: 0, onClick: () => this.openWindow('ghostpings'), onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id), channelId: dispatch.channelId });
          if (!this.settings.useNotificationsInstead) {
            this.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
              type: 'warning',
              onClick: () => this.openWindow('ghostpings'),
              onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
              timeout: 4500
            });
          }
        }
        this.saveData();
        return callDefault(...args);
      } else if (dispatch.type == 'MESSAGE_CREATE' && dispatch.message && (dispatch.message.content.length || (dispatch.attachments && dispatch.attachments.length) || (dispatch.embeds && dispatch.embeds.length)) && dispatch.message.state != 'SENDING' && !dispatch.optimistic && (dispatch.message.type === 0 || dispatch.message.type === 19 || dispatch.message.type === 20)) {
        if (this.cachedMessageRecord.findIndex(m => m.id === dispatch.message.id) != -1) return callDefault(...args);
        this.cachedMessageRecord.push(dispatch.message);

        /* if (this.menu.open && this.menu.selectedTab == 'sent') this.refilterMessages(); */

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }
        if (!notificationsBlacklisted) {
          if ((guild ? this.settings.toastToggles.sent : this.settings.toastTogglesDMs.sent) && (!this.selectedChannel || this.selectedChannel.id != channel.id)) {
            if (this.settings.useNotificationsInstead) {
              XenoLib.Notifications.info(`Message sent in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, { onClick: () => this.openWindow('sent'), onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id), timeout: 4500 });
            } else {
              this.showToast(`Message sent in ${this.getLiteralName(channel.guild_id, channel.id)}`, { type: 'info', onClick: () => this.openWindow('sent'), onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id), timeout: 4500 });
            }
          }
        }
        return callDefault(...args);
      } else return callDefault(...args);
    } catch (err) {
      ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Error in onDispatchEvent', err);
    }
    return ret;
  }
  /* ==================================================-|| START MENU ||-================================================== */
  processUserRequestQueue() {
    return;
    if (!this.processUserRequestQueue.queueIntervalTime) this.processUserRequestQueue.queueIntervalTime = 500;
    if (this.menu.queueInterval) return;
    const messageDataManager = () => {
      return;
      if (!this.menu.userRequestQueue.length) {
        clearInterval(this.menu.queueInterval);
        this.menu.queueInterval = 0;
        return;
      }
      const data = this.menu.userRequestQueue.shift();
      this.tools
        .getUserAsync(data.id)
        .then(res => {
          for (let ss of data.success) ss(res);
        })
        .catch(reason => {
          if (reason.status == 429 && typeof reason.body.retry_after === 'number') {
            clearInterval(this.menu.queueInterval);
            this.menu.queueInterval = 0;
            this.processUserRequestQueue.queueIntervalTime += 50;
            setTimeout(messageDataManager, reason.body.retry_after);
            ZeresPluginLibrary.Logger.warn(this.getName(), 'Rate limited, retrying in', reason.body.retry_after, 'ms');
            this.menu.userRequestQueue.push(data);
            return;
          }
          ZeresPluginLibrary.Logger.warn(this.getName(), `Failed to get info for ${data.username}, reason:`, reason);
          for (let ff of data.fail) ff();
        });
    };
    this.menu.queueInterval = setInterval(messageDataManager, this.processUserRequestQueue.queueIntervalTime);
  }
  async patchMessages() {
    // const Tooltip = ZeresPluginLibrary.WebpackModules.getByString('shouldShowTooltip', 'handleMouseEnter');
    const Tooltip = BdApi.Components.Tooltip;
    const dateFormat = ZeresPluginLibrary.WebpackModules.getModule(e => typeof e === 'function' && e?.toString()?.includes('sameDay'), { searchExports: true });
    const i18n = ZeresPluginLibrary.WebpackModules.find(e => e.Messages && e.Messages.HOME);
    /* suck it you retarded asshole devilfuck */
    const SuffixEdited = ZeresPluginLibrary.DiscordModules.React.memo(e => ZeresPluginLibrary.DiscordModules.React.createElement(Tooltip, { text: e.timestamp ? dateFormat(e.timestamp, 'LLLL') : null }, tt => ZeresPluginLibrary.DiscordModules.React.createElement('time', Object.assign({ dateTime: e.timestamp.toISOString(), className: this.multiClasses.edited, role: 'note' }, tt), `(${i18n.Messages.MESSAGE_EDITED})`)));
    SuffixEdited.displayName = 'SuffixEdited';
    const parseContent = (() => {
      // const parse = ZeresPluginLibrary.WebpackModules.getModule(e => typeof e === 'function' && e?.toString()?.includes('customRenderedContent') &&  e?.toString()?.includes('renderMediaEmbeds'), { searchExports: true });
      const parse = ZeresPluginLibrary.WebpackModules.getModule(e => typeof e === 'function' && e?.toString()?.includes('customRenderedContent'), { searchExports: true });
      // const parse = ZeresPluginLibrary.WebpackModules.getModule(e => typeof e === 'function' && e?.toString()?.includes('customRenderedContent'), { searchExports: true });
      if (parse) {
        // return function parseContent() {
        return () => {
          const ReactDispatcher = ZeresPluginLibrary.DiscordModules.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
          const oUseMemo = ReactDispatcher.useMemo;
          ReactDispatcher.useMemo = memo => memo();
          try {
            return new parse(...arguments);
          } catch (e) {
			console.error(e);
		  } finally {
            ReactDispatcher.useMemo = oUseMemo;
          }
          return {};
        }
      }
      return null;
    })();
	// if ()
	// window.MLV2Func.parseContent = parseContent;
    const MessageContent = ZeresPluginLibrary.WebpackModules.getModule(e => e?.type?.toString()?.includes('Messages.MESSAGE_EDITED'));
    const MemoMessage = await (async () => {
      var el = document.querySelector('.messageListItem-ZZ7v6g') || (await new Promise(res => {
        var sub = ZeresPluginLibrary.DOMTools.observer.subscribeToQuerySelector(() => {
            ZeresPluginLibrary.DOMTools.observer.unsubscribe(sub);
            res(document.querySelector('.messageListItem-ZZ7v6g'));
        }, '.messageListItem-ZZ7v6g', null, true)
        }));
      return ZeresPluginLibrary.Utilities.findInTree(ZeresPluginLibrary.ReactTools.getReactInstance(el), e => ((typeof e?.memoizedProps?.isHighlight) === 'boolean'), { walkable: ['return'] })?.elementType
    })()
    if (!MessageContent || !MemoMessage) return XenoLib.Notifications.error('Failed to patch message components, edit history and deleted tint will not show!', { timeout: 0 });
    this.unpatches.push(
      this.Patcher.after(MessageContent, 'type', (_, [props], ret) => {
        const forceUpdate = ZeresPluginLibrary.DiscordModules.React.useState()[1];
        ZeresPluginLibrary.DiscordModules.React.useEffect(
          () => {
            function callback(e) {
              if (!e || !e.id || e.id === props.message.id) {
                forceUpdate({});
              }
            }
            this.dispatcher.subscribe('MLV2_FORCE_UPDATE_MESSAGE_CONTENT', callback);
            return () => {
              this.dispatcher.unsubscribe('MLV2_FORCE_UPDATE_MESSAGE_CONTENT', callback);
            };
          },
          [props.message.id, forceUpdate]
        );
        if (!this.settings.showEditedMessages || (typeof props.className === 'string' && ~props.className.indexOf('repliedTextContent'))) return;
        if (!this.editedMessageRecord[props.message.channel_id] || this.editedMessageRecord[props.message.channel_id].indexOf(props.message.id) === -1) return;
        const record = this.messageRecord[props.message.id];
        if (!record || record.edits_hidden || !Array.isArray(ret.props.children)) return;
		
		const createEditedMessage1 = (edit, editNum, isSingular, noSuffix) =>
		  ZeresPluginLibrary.DiscordModules.React.createElement(
			XenoLib.ReactComponents.ErrorBoundary,
			{ label: 'Edit history' },
			ZeresPluginLibrary.DiscordModules.React.createElement(
			  Tooltip,
			  {
				text: !!record.delete_data ? null : 'Edited: ' + this.createTimeStamp(edit.time),
				position: 'left',
				hideOnClick: true
			  },
			  _ => {
					// try {
						// ZeresPluginLibrary.DiscordModules.React.createElement(
						  // 'div',
						  // {
							// ..._,
							// className: XenoLib.joinClassNames({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
							// editNum
						  // },
						  // parseContent()({ id: 0, channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,
						  // /* window.MLV2Func.parseContent({ channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,*/
						  // noSuffix
							// ? null
							// : ZeresPluginLibrary.DiscordModules.React.createElement(SuffixEdited, {
							  // timestamp: this.tools.createMomentObject(edit.time)
							// })
						// ) 
						
						// ZLibrary.DiscordModules.MessageActions.receiveMessage(props.message.channel_id, props.message);
						let messageGroup = this.createMessageGroup(props.message, false);
						/*
						const markup = messageGroup.getElementsByClassName(this.classes.markup)[0];
						const contentDiv = messageGroup.getElementsByClassName(XenoLib.getSingleClass('embedWrapper container'))[0];
						if (record && record.edit_history) {
						  markup.classList.add(this.style.edited);
						  for (let ii = 0; ii < record.edit_history.length; ii++) {
							const hist = record.edit_history[ii];
							// const editedMarkup = this.formatMarkup(hist.content, props.message.channel_id);
							const editedMarkup = messageGroup.cloneNode(true);
							editedMarkup.insertAdjacentHTML('beforeend', `<time class="${this.multiClasses.edited}">(edited)</time>`); // TODO, change this
							new ZeresPluginLibrary.Tooltip(editedMarkup, 'Edited at ' + (typeof hist.time === 'string' ? hist.time : this.createTimeStamp(hist.time)), { side: 'left' });
							editedMarkup.classList.add(this.style.edited);
							editedMarkup.edit = ii;
							markup.appendChild(editedMarkup);
						  }
						}
						*/
						ZeresPluginLibrary.DiscordModules.React.createElement(
						  'div',
						  {
							..._,
							className: XenoLib.joinClassNames({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
							editNum
						  },
						  // this.createMessageGroup({ id: 0, channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, false).content,
						  // messageGroup.content,
						  // markup.content,
						  messageGroup,
						  // markup,
						  /* window.MLV2Func.parseContent({ channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,*/
						  noSuffix
							? null
							: ZeresPluginLibrary.DiscordModules.React.createElement(SuffixEdited, {
							  timestamp: this.tools.createMomentObject(edit.time)
							})
						) 
						ZeresPluginLibrary.DiscordModules.React.createElement(
						  'div',
						  {
							..._,
							className: XenoLib.joinClassNames({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
							editNum
						  },
						  // this.createMessageGroup({ id: 0, channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, false).content,
						  // messageGroup.content,
						  // markup.content,
						  ret.props.children,
						  // markup,
						  /* window.MLV2Func.parseContent({ channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,*/
						  noSuffix
							? null
							: ZeresPluginLibrary.DiscordModules.React.createElement(SuffixEdited, {
							  timestamp: this.tools.createMomentObject(edit.time)
							})
						) 
						;
						
					// }
					// catch (e)
					// {
						// console.log("MLV2: error");
						// console.log(e);
					// }
				}
			)
		  );
		  
		  const createEditedMessage2 = (edit, editNum, isSingular, noSuffix) =>
		  ZeresPluginLibrary.DiscordModules.React.createElement(
			XenoLib.ReactComponents.ErrorBoundary,
			{ label: 'Edit history' },
			ZeresPluginLibrary.DiscordModules.React.createElement(
			  Tooltip,
			  {
				text: !!record.delete_data ? null : 'Edited: ' + this.createTimeStamp(edit.time),
				position: 'left',
				hideOnClick: true
			  },
			  _ => {
					let messageGroup = this.createMessageGroup(props.message, false);
					const markup = messageGroup.getElementsByClassName(this.classes.markup)[0];
					markup.style.filter = "brightness(1.5)";
					const contentDiv = messageGroup.getElementsByClassName(XenoLib.getSingleClass('embedWrapper container'))[0];
					if (record && record.edit_history) {
					  markup.classList.add(this.style.edited);
					  // for (let ii = 0; ii < record.edit_history.length; ii++) {
						const hist = record.edit_history[editNum];
						// const editedMarkup = this.formatMarkup(hist.content, message.channel_id);
						// const editedMarkup = document.createElement("p");
						const editedMarkup = hist.content == '' ? document.createElement("p") : new DOMParser().parseFromString(this.tools.SimpleMarkdown.markdownToHtml(hist.content), 'text/html').documentElement.children[1].children[0];
						// editedMarkup.textContent = hist.content;
						editedMarkup.style.margin = "0";
						editedMarkup.style.filter = "brightness(70%)";
						editedMarkup.insertAdjacentHTML('beforeend', `<time class="${this.multiClasses.edited}">(` + this.translatedEdited + `)</time>`); // TODO, change this
						// editedMarkup.insertAdjacentHTML('beforeend', `<span class="${ZLibrary.WebpackModules.getByProps("cozy", "repliedMessage", "contents")["timestamp"]}"><time><span class="edited-1v5nT8">(edited)</span></time></span>`); // TODO, change this
						new ZeresPluginLibrary.Tooltip(editedMarkup, 'Edited at ' + (typeof hist.time === 'string' ? hist.time : this.createTimeStamp(hist.time)), { side: 'left' });
						editedMarkup.classList.add(this.style.edited);
						editedMarkup.edit = editNum;
						markup.appendChild(editedMarkup);
					  // }
					}
					// markup.append(this.formatMarkup(message.content, message.channel_id));
					// let t = document.createElement("p");
					// t.textContent = record.edit_history[0].content;
					// markup.append(t);
					
					return ZeresPluginLibrary.DiscordModules.React.createElement(
					  'div',
					  {
						..._,
						className: XenoLib.joinClassNames({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
						editNum,
						dangerouslySetInnerHTML: { __html: markup.outerHTML },
					  },
					  // this.createMessageGroup({ id: 0, channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, false).content,
					  // messageGroup.content,
					  // markup.content,
					  // markup,
					  /* window.MLV2Func.parseContent({ channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,*/
					  // noSuffix
						// ? null
						// : ZeresPluginLibrary.DiscordModules.React.createElement(SuffixEdited, {
						  // timestamp: this.tools.createMomentObject(edit.time)
						// })
					) 
				}
			)
		  );
		  
		  const createEditedMessage = (edit, editNum, isSingular, noSuffix) =>
          ZeresPluginLibrary.DiscordModules.React.createElement(
            XenoLib.ReactComponents.ErrorBoundary,
            { label: 'Edit history' },
            ZeresPluginLibrary.DiscordModules.React.createElement(
              Tooltip,
              {
                text: !!record.delete_data ? null : 'Edited: ' + this.createTimeStamp(edit.time),
                position: 'left',
                hideOnClick: true
              },
              _ =>
                ZeresPluginLibrary.DiscordModules.React.createElement(
                  'div',
                  {
                    ..._,
                    className: XenoLib.joinClassNames({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
                    editNum
                  },
				  this.tools.parserNew(edit.content),
                  noSuffix
                    ? null
                    : ZeresPluginLibrary.DiscordModules.React.createElement(SuffixEdited, {
                      timestamp: this.tools.createMomentObject(edit.time)
                    })
                )
            )
          );
		  
        ret.props.className = XenoLib.joinClassNames(ret.props.className, this.style.edited);
        const modifier = this.editModifiers[props.message.id];
        if (modifier) {
          ret.props.children = [createEditedMessage(record.edit_history[modifier.editNum], modifier.editNum, true, modifier.noSuffix)];
          return;
        }
        const oContent = Array.isArray(ret.props.children[0]) ? ret.props.children[0] : ret.props.children[1];
        const edits = [];
        let i = 0;
        let max = record.edit_history.length;
        if (this.settings.maxShownEdits) {
          if (record.edit_history.length > this.settings.maxShownEdits) {
            if (this.settings.hideNewerEditsFirst) {
              max = this.settings.maxShownEdits;
            } else {
              i = record.edit_history.length - this.settings.maxShownEdits;
            }
          }
        }
        for (; i < max; i++) {
          const edit = record.edit_history[i];
          if (!edit) continue;
          let editNum = i;
          edits.push(createEditedMessage(edit, editNum));
        }
        ret.props.children = [edits, oContent];
      })
    );

    const messageClass = XenoLib.getSingleClass('ephemeral message');
    const _self = this;
    function Message(props, ...whatever) {
      try {
        const ret = props.__MLV2_type(props, ...whatever);
        if (!props.__MLV2_deleteTime) return ret;
        const oRef = ret.props.children.ref;
        ret.props.children.ref = e => {
          if (e && !e.__tooltip) {
            // later
            new ZeresPluginLibrary.Tooltip(e, 'Deleted: ' + _self.tools.createMomentObject(props.__MLV2_deleteTime).format('LLLL'), { side: 'left' });
            e.__tooltip = true;
          }
          if (typeof oRef === 'function') return oRef(e);
          else if (XenoLib._.isObject(oRef)) oRef.current = e;
        };
        return ret;
      } catch (err) {}
      return null;
    }
    this.unpatches.push(
      this.Patcher.after(MemoMessage, 'type', (_, [props], ret) => {
        const forceUpdate = ZeresPluginLibrary.DiscordModules.React.useState()[1];
        ZeresPluginLibrary.DiscordModules.React.useEffect(
          () => {
            function callback(e) {
              if (!e || !e.id || e.id === props.message.id) forceUpdate({});
            }
            this.dispatcher.subscribe('MLV2_FORCE_UPDATE_MESSAGE', callback);
            return () => {
              this.dispatcher.unsubscribe('MLV2_FORCE_UPDATE_MESSAGE', callback);
            };
          },
          [props.message.id, forceUpdate]
        );
        const record = this.messageRecord[props.message.id];
        if (!record || !record.delete_data) return;
        if (this.noTintIds.indexOf(props.message.id) !== -1) return;
        const message = ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && typeof e?.props?.className === 'string' && ~e?.props?.className?.indexOf(messageClass));
        if (!message) return;
        message.props.className += ' ' + (this.settings.useAlternativeDeletedStyle ? this.style.deletedAlt : this.style.deleted);
        message.props.__MLV2_deleteTime = record.delete_data.time;
        message.props.__MLV2_type = message.type;
        message.type = Message;
      })
    );
    this.forceReloadMessages();
  }
  forceReloadMessages() {
    const instance = ZeresPluginLibrary.Utilities.findInTree(ZeresPluginLibrary.ReactTools.getReactInstance(document.querySelector('.chatContent-3KubbW')), e => ((typeof e?.memoizedProps?.showQuarantinedUserBanner) === 'boolean'), { walkable: ['return'] })?.stateNode;
    if (!instance) return;
    const unpatch = this.Patcher.after(instance, 'render', (_this, _, ret) => {
      unpatch();
      if (!ret) return;
      ret.key = Math.random().toString(36).substring(2, 10).toUpperCase();
      ret.ref = () => _this.forceUpdate();
    });
    instance.forceUpdate();
  }
  patchModal() {
	this.createModal.confirmationModal = {};
	this.createModal.confirmationModal.Sizes = ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes;
	this.ModalStack = ZLibrary.DiscordModules.ModalActions;
	let modalsApi = BdApi.Webpack.getModule(m => Object.values(m).some(m2=>m2?.toString?.().includes("onCloseCallback") && m2?.toString?.().includes("Layer") && !m?.Anchor));
    // this._modalsApiUnsubcribe = (this.ModalStack.modalsApi || this.ModalStack.useModalsStore).subscribe(_ => {
	this.isModalOpen = BdApi.findModuleByProps("openModal", "hasModalOpen").hasModalOpen;
    this._modalsApiUnsubcribe = Object.values(modalsApi).flat().find(obj => typeof obj.subscribe === 'function')?.subscribe(_ => {
      // if (this.menu.open && !this.ModalStack.hasModalOpen(this.style.menu)) {
	  // let modals = BdApi.Webpack.getModule(m => Object.values(m).some(m=>m?.toString().includes("onCloseCallback") && m?.toString().includes("Layer"))).s9.getState().default.map(x=>x.key);
	  // if (modals.length == 0)
		  // return;
	  // let modalOpen = modals.filter(x=>x.key == this.menu.modalMain).length != 0;
	  setTimeout(() => {
		  // let modals = BdApi.Webpack.getModule(m => Object.values(m).some(m=>m?.toString().includes("onCloseCallback") && m?.toString().includes("Layer"))).s9.getState().default;
		  // let modalsApi = BdApi.Webpack.getModule(m => Object.values(m).some(m2=>m2?.toString?.().includes("onCloseCallback") && m2?.toString?.().includes("Layer") && !m?.Anchor));
		  // let modals = Object.values(modalsApi).flat().find(obj => typeof obj.getState === 'function')?.getState().default;
		  // let modalOpen = modals.filter(x=>x.key == this.style.menu).length != 0;
		  let modalOpen = this.isModalOpen(this.style.menu);
		  if (this.menu.open && !modalOpen) {
			this.menu.filter = '';
			this.menu.open = false;
			this.menu.shownMessages = -1;
			if (this.menu.messages) this.menu.messages.length = 0;
			// this.menu.modalMain = null;
		  }
	  }, 500);
    });
    return;
    // REQUIRED not anymore I guess lol
    try {
      const confirmModal = ZeresPluginLibrary.WebpackModules.getByDisplayName('ConfirmModal');
      this.createModal.confirmationModal = props => {
        try {
          const ret = confirmModal(props);
          if (props.size) ret.props.size = props.size;

          if (props.onCancel) {
            const cancelButton = ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type === XenoLib.ReactComponents.Button && e.props && e.props.look);
            if (cancelButton) cancelButton.props.onClick = props.onCancel;
          }
          return ret;
        } catch (err) {
          if (props.onCancel) props.onCancel();
          else props.onClose();
          return null;
        }
      };
      // this.createModal.confirmationModal.Sizes = ZeresPluginLibrary.WebpackModules.getByProps('ModalSize').ModalSize;
      this.createModal.confirmationModal.Sizes = ZLibrary.WebpackModules.getByProps("Header", "Footer").Sizes;
    } catch { }
    // this.ModalStack = ZeresPluginLibrary.WebpackModules.getByProps('openModal', 'hasModalOpen');
    this.ModalStack = ZLibrary.DiscordModules.ModalActions;
    // this._modalsApiUnsubcribe = (this.ModalStack.modalsApi || this.ModalStack.useModalsStore).subscribe(_ => {
    this._modalsApiUnsubcribe = BdApi.Webpack.getModule(m => Object.values(m).some(m=>m?.toString?.().includes("onCloseCallback") && m?.toString?.().includes("Layer"))).s9.subscribe(_ => {
      // if (this.menu.open && !this.ModalStack.hasModalOpen(this.style.menu)) {
	  let modals = BdApi.Webpack.getModule(m => Object.values(m).some(m=>m?.toString?.().includes("onCloseCallback") && m?.toString?.().includes("Layer"))).s9.getState().map(x=>x.key);
	  if (modals.length == 0)
		  return;
	  let modalOpen = modals.filter(x=>x.key == this.menu.modalMain);
      if (this.menu.open && !modalOpen) {
        this.menu.filter = '';
        this.menu.open = false;
        this.menu.shownMessages = -1;
        if (this.menu.messages) this.menu.messages.length = 0;
      }
    });
    /*
    this.createModal.confirmationModal = class ConfirmationModal extends ZeresPluginLibrary.DiscordModules.ConfirmationModal {
      constructor(props) {
        super(props);
        this._handleSubmit = this.handleSubmit.bind(this);
        this._handleClose = this.handleClose.bind(this);
        this.handleSubmit = this.handleSubmitEx.bind(this);
        this.handleClose = this.handleCloseEx.bind(this);
      }
      handleSubmitEx(e) {
        if (this.props.ml2Data) onClearLog(e);
        else return this._handleSubmit(e);
      }
      handleCloseEx(e) {
        if (this.props.ml2Data) onChangeOrder(e);
        else return this._handleClose(e);
      }
      render() {
        const ret = super.render();
        if (!ret) return ret;
        delete ret.props['aria-label'];
        return ret;
      }
    };
    this.unpatches.push(
      ZeresPluginLibrary.Patcher.instead(this.getName(), ZeresPluginLibrary.DiscordModules.ConfirmationModal.prototype, 'componentDidMount', (thisObj, args, original) => {
        if (thisObj.props.ml2Data) {
          if (this.menu.refilterOnMount) {
            this.refilterMessages();
            this.menu.refilterOnMount = false;
          }
          document.getElementById(this.style.menuMessages).parentElement.parentElement.parentElement.scrollTop = this.scrollPosition;
        }
        return original(...args);
      })
    );
*/
  }
  buildMenu(setup) {
    const ret = ZeresPluginLibrary.DCM.buildMenu(setup);
    return props => ret({ ...props, onClose: _ => { } });
  }
  // >>-|| POPULATION ||-<<
  createMessageGroup(message, isStart) {
    let deleted = false;
    let edited = false;
    let details = 'Sent in';
    let channel = this.tools.getChannel(message.channel_id);
    let timestamp = message.timestamp;
    let author = this.tools.getUser(message.author.id);
    let noUserInfo = false;
    let userInfoBeingRequested = true;
    const isBot = message.author.bot;
    const record = this.messageRecord[message.id];
    if (record) {
      deleted = !!record.delete_data;
      edited = !!record.edit_history;

      if (deleted && edited) {
        details = 'Edited and deleted from';
        timestamp = record.delete_data.time;
      } else if (deleted) {
        details = 'Deleted from';
        timestamp = record.delete_data.time;
      } else if (edited) {
        details = 'Last edit in'; // todo: purged?
        if (typeof record.edit_history[record.edit_history.length - 1].time !== 'string') timestamp = record.edit_history[record.edit_history.length - 1].time;
      }
    }

    details += ` ${this.getLiteralName(message.guild_id || (channel && channel.guild_id), message.channel_id)} `;

    details += `at ${this.createTimeStamp(timestamp, true)}`;

    details = details.replace(/[<>"&]/g, c => ({ "<": "&lt;", ">": "&gt;", "\"": "&quot;", "&": "&amp;" })[c]);
    const classes = this.createMessageGroup.classes;
    const getAvatarOf = user => {
      if (!user.avatar) return '/assets/322c936a8c8be1b803cd94861bdfa868.png';
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    };
    if (!classes.extra)
      classes.extra = [
        /* 0 */ XenoLib.joinClassNames(XenoLib.getClass('groupStart message'), XenoLib.getClass('groupStart cozyMessage'), XenoLib.getClass('systemMessage groupStart'), XenoLib.getClass('zalgo wrapper'), XenoLib.getClass('zalgo cozy'), XenoLib.getClass('cozy zalgo')),
        /* 1 */ XenoLib.joinClassNames(XenoLib.getClass('groupStart message'), XenoLib.getClass('groupStart cozyMessage'), XenoLib.getClass('zalgo wrapper'), XenoLib.getClass('zalgo cozy'), XenoLib.getClass('cozy zalgo')),
        /* 2 */ XenoLib.getClass('username header'),
        /* 3 */ XenoLib.joinClassNames(XenoLib.getClass('edited avatar'), XenoLib.getClass('edited avatar clickable')),
        /* 4 */ XenoLib.joinClassNames(XenoLib.getClass('timestampTooltip username'), XenoLib.getClass('edited avatar clickable')),
        /* 5 */ XenoLib.joinClassNames(XenoLib.getClass('separator timestamp'), XenoLib.getClass('separator timestampInline')),
        /* 6 */ XenoLib.joinClassNames(this.multiClasses.markup, XenoLib.getClass('buttonContainer markupRtl')),
        /* 7 */ XenoLib.getClass('embedWrapper container'),
        /* 8 */ XenoLib.joinClassNames(XenoLib.getClass('zalgo latin24CompactTimeStamp'), XenoLib.getClass('separator timestamp'), XenoLib.getClass('alt timestampVisibleOnHover'), XenoLib.getClass('timestampVisibleOnHover alt')),
        /* 9 */ XenoLib.getClass('latin24CompactTimeStamp separator'),
        /* 10 */ XenoLib.getSingleClass('timestampTooltip username'),
        /* 11 */ XenoLib.getSingleClass('separator timestamp'),
        /* 12 */ XenoLib.getClass('zalgo contents')
      ];

    const element = isStart
      ? this.parseHTML(`<div class="${classes.extra[0]}">
                                      <div class="${classes.extra[12]}">
                                        <img src="${getAvatarOf(message.author)}" class="${classes.extra[3]}" alt=" "><h2 class="${classes.extra[2]}"><span class="${classes.extra[4]}" role="button">${message.author.username.replace(/[<>"]/g, c => ({ "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c])}</span>${(isBot && `<span class="${classes.botTag}">BOT</span>`) || ''}<span class="${classes.extra[5]}"><span >${details}</span></span></h2>
                                        <div class="${classes.extra[6]}"></div>
                                      </div>
                                      <div class="${classes.extra[7]}"></div>
                                    </div>`)
      : this.parseHTML(`<div class="${classes.extra[1]}">
                                    <div class="${classes.extra[12]}">
                                      <span class="${classes.extra[8]}">
                                        <span>
                                          <i class="${classes.extra[9]}">[</i>
                                          ${this.createTimeStamp(timestamp, -1)}
                                          <i class="${classes.extra[9]}">] </i>
                                        </span>
                                      </span>
                                      <div class="${classes.extra[6]}"></div>
                                    </div>
                                    <div class="${classes.extra[7]}"></div>
                                  </div>`);
    element.messageId = message.id;
    const profImg = element.getElementsByClassName(classes.avatarImgSingle)[0];
    if (profImg) {
      profImg.onerror = () => {
        profImg.src = '/assets/322c936a8c8be1b803cd94861bdfa868.png';
      };
      const verifyProfilePicture = () => {
        if (message.author.avatar != author.avatar && author.avatar) {
          profImg.src = getAvatarOf(author);
          if (record) {
            record.message.author.avatar = author.avatar;
          }
        } else {
          if (record) record.message.author.avatar = null;
        }
      };
      if (!isBot || true) {
        if (!author) {
          author = message.author;
          if (this.menu.userRequestQueue.findIndex(m => m.id === author.id) == -1) {
            this.menu.userRequestQueue.push({
              id: author.id,
              username: author.username,
              success: [
                res => {
                  author = $.extend(true, {}, res);
                  verifyProfilePicture();
                  userInfoBeingRequested = false;
                }
              ],
              fail: [
                () => {
                  noUserInfo = true;
                  userInfoBeingRequested = false;
                }
              ]
            });
          } else {
            const dt = this.menu.userRequestQueue.find(m => m.id === author.id);
            dt.success.push(res => {
              author = $.extend(true, {}, res);
              verifyProfilePicture();
              userInfoBeingRequested = false;
            });
            dt.fail.push(() => {
              noUserInfo = true;
              userInfoBeingRequested = false;
            });
          }
        } else {
          userInfoBeingRequested = false;
          verifyProfilePicture();
        }
      }
      const profIcon = element.getElementsByClassName(classes.avatarImgSingle)[0];
      profIcon.addEventListener('click', () => {
        //if (isBot) return this.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return this.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return this.showToast('Could not get user info!', { type: 'error' });
        ZeresPluginLibrary.Popouts.showUserPopout(profIcon, author);
      });
      profIcon.addEventListener('contextmenu', e => {
        //if (isBot) return this.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return this.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return this.showToast('Could not get user info! You can only delete or copy to clipboard!', { timeout: 5000 });
        // ZeresPluginLibrary.WebpackModules.getByProps('openUserContextMenu').openUserContextMenu(e, author, channel || this.menu.randomValidChannel);
		// BdApi.Webpack.getModule(x=>x&& Object.values(x).some(x2=>x2 && x2.toString?.().includes("isGroupDM") && x2.toString?.().includes("moderationAlertId"))).Pv(new MouseEvent("contextmenu"), ZLibrary.DiscordModules.UserStore.getCurrentUser(), ZLibrary.DiscordModules.ChannelStore.getChannel(ZLibrary.DiscordModules.SelectedChannelStore.getChannelId()))
		let filterFunc1 = x=>x&& Object.values(x).some(x2=>x2 && x2.toString?.().includes("isGroupDM") && x2.toString?.().includes("moderationAlertId"));
		let filterFunc2 = x2=>x2 && x2.toString?.().includes("isGroupDM") && x2.toString?.().includes("targetIsUser");
		let targetModule = BdApi.Webpack.getModule(filterFunc1);
		Object.values(targetModule).filter(filterFunc2)[0](e, author, channel || this.menu.randomValidChannel);
	  });
      const nameLink = element.getElementsByClassName(classes.extra[10])[0];
      nameLink.addEventListener('click', () => {
        //if (isBot) return this.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return this.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return this.showToast('Could not get user info!', { type: 'error' });
        ZeresPluginLibrary.Popouts.showUserPopout(nameLink, author);
      });
      nameLink.addEventListener('contextmenu', e => {
        //if (isBot) return this.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return this.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return this.showToast('Could not get user info! You can only delete or copy to clipboard!', { type: 'error', timeout: 5000 });
        // ZeresPluginLibrary.WebpackModules.getByProps('openUserContextMenu').openUserContextMenu(e, author, channel || this.menu.randomValidChannel);
		let filterFunc1 = x=>x&& Object.values(x).some(x2=>x2 && x2.toString?.().includes("isGroupDM") && x2.toString?.().includes("moderationAlertId"));
		let filterFunc2 = x2=>x2 && x2.toString?.().includes("isGroupDM") && x2.toString?.().includes("targetIsUser");
		let targetModule = BdApi.Webpack.getModule(filterFunc1);
		Object.values(targetModule).filter(filterFunc2)[0](e, author, channel || this.menu.randomValidChannel);
      });
      const timestampEl = element.getElementsByClassName(classes.extra[11])[0];
      timestampEl.addEventListener('contextmenu', e => {
        const messages = [element];
        let target = element.nextElementSibling;
        while (target && target.classList && !target.classList.contains(XenoLib.getSingleClass('systemMessage groupStart'))) {
          messages.push(target);
          target = target.nextElementSibling;
        }
        if (!messages.length) return;
        const messageIds = [];
        for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].messageId) messageIds.push(messages[i].messageId);
        if (!messageIds.length) return;
        ZeresPluginLibrary.DCM.openContextMenu(
          e,
          this.buildMenu([
            {
              type: 'group',
              items: [
                {
                  label: 'Copy Formatted Message',
                  action: () => {
                    // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
					BdApi.ContextMenu.close();
                    let result = '';
                    for (let msgid of messageIds) {
                      const record = this.messageRecord[msgid];
                      if (!record) continue;
                      if (!result.length) result += `> **${record.message.author.username}** | ${this.createTimeStamp(record.message.timestamp, true)}\n`;
                      result += `> ${record.message.content.replace(/\n/g, '\n> ')}\n`;
                    }
                    this.nodeModules.electron.clipboard.writeText(result);
                    this.showToast('Copied!', { type: 'success' });
                  }
                },
                {
                  type: 'item',
                  label: 'Remove Group From Log',
                  action: () => {
                    // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
					BdApi.ContextMenu.close();
                    let invalidatedChannelCache = false;
                    for (let msgid of messageIds) {
                      const record = this.messageRecord[msgid];
                      if (!record) continue; // the hell
                      if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
                      this.deleteMessageFromRecords(msgid);
                    }
                    if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
                    this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                    this.saveData();
                  }
                }
              ]
            }
          ])
        );
      });
      timestampEl.addEventListener('click', e => {
        if (!this.menu.deleteKeyDown) return;
        const messages = [element];
        let target = element.nextElementSibling;
        while (target && target.classList && !target.classList.contains(XenoLib.getSingleClass('systemMessage groupStart'))) {
          messages.push(target);
          target = target.nextElementSibling;
        }
        if (!messages.length) return;
        const messageIds = [];
        for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].messageId) messageIds.push(messages[i].messageId);
        if (!messageIds.length) return;
        let invalidatedChannelCache = false;
        for (let msgid of messageIds) {
          const record = this.messageRecord[msgid];
          if (!record) continue; // the hell
          if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
          this.deleteMessageFromRecords(msgid);
        }
        if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
        this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
        this.saveData();
      });
      new ZeresPluginLibrary.Tooltip(timestampEl, 'Sent at ' + this.tools.createMomentObject(message.timestamp).format('LLLL'), { side: 'top' });
    }
    const messageContext = e => {
      let target = e.target;
      if (!target.classList.contains('mention') || (target.tagName == 'DIV' && target.classList.contains(ZeresPluginLibrary.WebpackModules.getByProps('imageError').imageError.split(/ /g)[0]))) {
        let isMarkup = false;
        let isEdited = false;
        let isBadImage = target.tagName == 'DIV' && target.classList == ZeresPluginLibrary.WebpackModules.getByProps('imageError').imageError;
        if (!isBadImage) {
          while (target && (!target.classList || !(isMarkup = target.classList.contains(this.classes.markup)))) {
            if (target.classList && target.classList.contains(this.style.edited)) isEdited = target;
            target = target.parentElement;
          }
        }

        if (isMarkup || isBadImage) {
          const messageId = message.id;
          const record = this.getSavedMessage(messageId);
          if (!record) return;
          let editNum = -1;
          if (isEdited) editNum = isEdited.edit;
          const menuItems = [];
          if (channel) {
            menuItems.push({
              type: 'item',
              label: 'Jump to Message',
              action: () => {
                // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
                BdApi.ContextMenu.close();
                this.jumpToMessage(message.channel_id, messageId, message.guild_id);
              }
            });
          }
          if (!isBadImage || record.message.content.length) {
            menuItems.push(
              {
                type: 'item',
                label: 'Copy Text',
                action: () => {
                  // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				  BdApi.ContextMenu.close();
                  this.nodeModules.electron.clipboard.writeText(editNum != -1 ? record.edit_history[editNum].content : record.message.content);
                  this.showToast('Copied!', { type: 'success' });
                }
              },
              {
                type: 'item',
                label: 'Copy Formatted Message',
                action: () => {
                  // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				  BdApi.ContextMenu.close();
                  const content = editNum != -1 ? record.edit_history[editNum].content : record.message.content;
                  const result = `> **${record.message.author.username}** | ${this.createTimeStamp(record.message.timestamp, true)}\n> ${content.replace(/\n/g, '\n> ')}`;
                  this.nodeModules.electron.clipboard.writeText(result);
                  this.showToast('Copied!', { type: 'success' });
                }
              }
            );
          }
          if (record.delete_data && record.delete_data.hidden) {
            menuItems.push({
              type: 'item',
              label: 'Unhide Deleted Message',
              action: () => {
                // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				BdApi.ContextMenu.close();
                record.delete_data.hidden = false;
                this.invalidateChannelCache(record.message.channel_id); // good idea?
                this.cacheChannelMessages(record.message.channel_id);
                this.saveData();
                this.showToast('Unhidden!', { type: 'success' });
              }
            });
          }
          if (record.edit_history) {
            if (editNum != -1) {
              menuItems.push({
                type: 'item',
                label: 'Delete Edit',
                action: () => {
                  // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				  BdApi.ContextMenu.close();
                  this.deleteEditedMessageFromRecord(messageId, editNum);
                  this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                  this.showToast('Deleted!', { type: 'success' });
                }
              });
            }
            if (record.edits_hidden) {
              menuItems.push({
                type: 'item',
                label: 'Unhide Edits',
                action: () => {
                  // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				  BdApi.ContextMenu.close();
                  record.edits_hidden = false;
                  this.saveData();
                  this.showToast('Unhidden!', { type: 'success' });
                }
              });
            }
          }
          menuItems.push(
            {
              type: 'item',
              label: 'Remove From Log',
              action: () => {
                // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				BdApi.ContextMenu.close();
                let invalidatedChannelCache = false;
                if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
                this.deleteMessageFromRecords(messageId);
                this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
                this.saveData();
                if (record.message.channel_id !== this.selectedChannel.id) return;
                if (record.delete_data) {
                  this.dispatcher.dispatch({
                    type: 'MESSAGE_DELETE',
                    id: messageId,
                    channelId: record.message.channel_id,
                    ML2: true // ignore ourselves lol, it's already deleted
                    // on a side note, probably does nothing if we don't ignore
                  });
                } else {
                  this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                }
              }
            },
            {
              type: 'item',
              label: 'Copy Message ID',
              action: () => {
                // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				BdApi.ContextMenu.close();
                this.nodeModules.electron.clipboard.writeText(messageId); // todo: store electron or writeText somewhere?
                this.showToast('Copied!', { type: 'success' });
              }
            },
            {
              type: 'item',
              label: 'Copy Author ID',
              action: () => {
                // ZeresPluginLibrary.DiscordModules.ContextMenuActions.closeContextMenu();
				BdApi.ContextMenu.close();
                this.nodeModules.electron.clipboard.writeText(message.author.id);
                this.showToast('Copied!', { type: 'success' });
              }
            }
          );
          ZeresPluginLibrary.DCM.openContextMenu(
            e,
            this.buildMenu([
              {
                type: 'group',
                items: menuItems
              }
            ])
          );
          return;
        }
      }
    };
    element.addEventListener('contextmenu', e => messageContext(e));
    element.addEventListener('click', e => {
      if (!this.menu.deleteKeyDown) return;
      let target = e.target;
      let isMarkup = false;
      let isEdited = false;
      let isBadImage = target.tagName == 'DIV' && target.classList == ZeresPluginLibrary.WebpackModules.getByProps('imageError').imageError;
      if (!isBadImage) {
        while (!target.classList.contains('message-2qnXI6') && !(isMarkup = target.classList.contains(this.classes.markup))) {
          if (target.classList.contains(this.style.edited)) isEdited = target;
          target = target.parentElement;
        }
      }
      if (!isMarkup && !isBadImage) return;
      const messageId = message.id;
      const record = this.messageRecord[messageId];
      if (!record) return;
      this.invalidateChannelCache(record.message.channel_id); // good idea?
      this.cacheChannelMessages(record.message.channel_id);
      if (isEdited) {
        this.deleteEditedMessageFromRecord(messageId, isEdited.edit);
      } else {
        this.deleteMessageFromRecords(messageId);
      }
      this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
      this.saveData();
    });
    return element;
  }
  populateParent(parent, messages) {
    let lastMessage;
    let lastType; /* unused */
    let messageGroup;
    const populate = i => {
      try {
        // todo: maybe make the text red if it's deleted?
        const messageId = messages[i];
        const record = this.getSavedMessage(messageId);
        const message = record ? record.message : this.getMessageAny(messageId);
        if (!message) return;
        // todo: get type and use it
        if (!messageGroup /*  || !lastType */ || !lastMessage || lastMessage.channel_id != message.channel_id || lastMessage.author.id != message.author.id || new Date(message.timestamp).getDate() !== new Date(lastMessage.timestamp).getDate() || (message.attachments.length && message.content.length)) {
          messageGroup = this.createMessageGroup(message, true);
        } else {
          messageGroup = this.createMessageGroup(message);
        }
        lastMessage = message;
        const markup = messageGroup.getElementsByClassName(this.classes.markup)[0];
        const contentDiv = messageGroup.getElementsByClassName(XenoLib.getSingleClass('embedWrapper container'))[0];
        if (record && record.edit_history) {
          markup.classList.add(this.style.edited);
          for (let ii = 0; ii < record.edit_history.length; ii++) {
            const hist = record.edit_history[ii];
            const editedMarkup = this.formatMarkup(hist.content, message.channel_id);
            editedMarkup.insertAdjacentHTML('beforeend', `<time class="${this.multiClasses.edited}">(` + this.translatedEdited + `)</time>`); // TODO, change this
            new ZeresPluginLibrary.Tooltip(editedMarkup, 'Edited at ' + (typeof hist.time === 'string' ? hist.time : this.createTimeStamp(hist.time)), { side: 'left' });
            editedMarkup.classList.add(this.style.edited);
            editedMarkup.edit = ii;
            markup.appendChild(editedMarkup);
          }
        }
        markup.append(this.formatMarkup(message.content, message.channel_id));
        if (!record) {
          const channel = this.tools.getChannel(message.channel_id);
          const guild = this.tools.getServer(channel && channel.guild_id);
          markup.addEventListener('click', () => this.jumpToMessage(message.channel_id, message.id, guild && guild.id));
        }
        // todo, embeds
        // how do I do embeds?

        // why don't attachments show for sent messages? what's up with that?
        if (message.attachments.length) {
          // const attachmentsContent = this.parseHTML(`<div class="${this.multiClasses.message.cozy.content}"></div>`);
          const attemptToUseCachedImage = (attachmentId, attachmentIdx, hidden, filename, width, height) => {
            const img = document.createElement('img');
            img.classList = ZeresPluginLibrary.WebpackModules.getByProps('clickable').clickable;
            img.messageId = messageId;
            img.idx = attachmentIdx;
            img.id = attachmentId; // USED FOR FINDING THE IMAGE THRU CONTEXT MENUS
            if (hidden) {
              img.src = `https://i.clouds.tf/q2vy/r8q6.png#${record.message.channel_id},${img.id}`;
              img.width = 200;
            } else {
              // img.src = 'http://localhost:7474/' + attachmentId + filename.match(/\.[0-9a-z]+$/i)[0] + `#${record.message.channel_id},${img.id}`;
              img.src = this.imageCacheServerSimulator.get('http://localhost:7474/' + attachmentId + filename.match(/\.[0-9a-z]+$/i)[0] + `#${record.message.channel_id},${img.id},${img.messageId}`);
              img.width = 256;
            }
            img.addEventListener('click', e => {
              if (this.menu.deleteKeyDown) {
                this.deleteMessageFromRecords(messageId);
                this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                this.saveData();
                return;
              }
              this.createModal(
                {
                  src: img.src + '?ML2=true', // self identify
                  placeholder: img.src, // cute image here
                  original: img.src,
                  width: width,
                  height: height,
                  onClickUntrusted: e => e.openHref(),
                  className: this.style.imageRoot
                },
                true
              );
            });
            img.onerror = () => {
              const imageErrorDiv = document.createElement('div');
              imageErrorDiv.classList = ZeresPluginLibrary.WebpackModules.getByProps('imageError').imageError;
              imageErrorDiv.messageId = messageId;
              imageErrorDiv.innerHTML = this.errorImage;
			  contentDiv.replaceChild(imageErrorDiv, img);
            };
            contentDiv.appendChild(img);
            return true;
          };
          const handleCreateImage = (attachment, idx) => {
            if (attachment.url == 'ERROR') {
              attemptToUseCachedImage(attachment.id, idx, attachment.hidden, attachment.filename, attachment.width, attachment.height);
            } else {
              if (!this.isImage(attachment.url)) return; // bruh
              const img = document.createElement('img');
              img.classList = ZeresPluginLibrary.WebpackModules.getByProps('clickable').clickable;
              img.messageId = messageId;
              img.id = attachment.id; // USED FOR FINDING THE IMAGE THRU CONTEXT MENUS
              img.idx = idx;
              // img.style.minHeight = '104px'; // bruh?
              if (record) {
                img.addEventListener('click', () => {
                  if (this.menu.deleteKeyDown) {
                    this.deleteMessageFromRecords(messageId);
                    this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                    this.saveData();
                    return;
                  }
                  this.createModal(
                    {
                      src: attachment.url + '?ML2=true', // self identify
                      placeholder: attachment.url, // cute image here
                      original: attachment.url,
                      width: attachment.width,
                      height: attachment.height,
                      onClickUntrusted: e => e.openHref(),
                      className: this.style.imageRoot
                    },
                    true
                  );
                });
              }
              img.onerror = () => {
                if (img.triedCache) {
                  const imageErrorDiv = document.createElement('div');
                  imageErrorDiv.classList = ZeresPluginLibrary.WebpackModules.getByProps('imageError').imageError;
                  imageErrorDiv.messageId = messageId;
				  imageErrorDiv.innerHTML = this.errorImage;
                  contentDiv.replaceChild(imageErrorDiv, img);
                }
                if (record && false) {
                  this.nodeModules.request.get(attachment.url, (err, res) => {
                    try {
                      if (err || res.statusCode != 404) return;
					  // record.message.attachments[idx]["original_url"] = record.message.attachments[idx].url
                      record.message.attachments[idx].url = 'ERROR';
                      // img.src = 'http://localhost:7474/' + attachment.id + attachment.filename.match(/\.[0-9a-z]+$/)[0];
                      img.src = this.imageCacheServerSimulator.get('http://localhost:7474/' + attachment.id + attachment.filename.match(/\.[0-9a-z]+$/)[0] + `#${record.message.channel_id},${img.id},${img.messageId}`);
                      img.triedCache = true;
                    } catch (err) {
                      console.error('Failed loading cached image', err.message);
                    }
                  });
                }
				attemptToUseCachedImage(attachment.id, idx, attachment.hidden, attachment.filename, attachment.width, attachment.height);
              };
              if (attachment.hidden) {
                img.src = `https://i.clouds.tf/q2vy/r8q6.png#${record.message.channel_id},${img.id}`;
                img.width = 200;
              } else {
                img.src = attachment.url;
                img.width = this.clamp(attachment.width, 200, 650);
              }
              contentDiv.appendChild(img);
            }
          };
          for (let ii = 0; ii < message.attachments.length; ii++) handleCreateImage(message.attachments[ii], ii);
        }
        if (message.embeds && message.embeds.length && false) {
          const ddiv = document.createElement('div');
          // TODO: optimize
          if (!this.populateParent.__embedcontainer) this.populateParent.__embedcontainer = this.safeGetClass(() => ZeresPluginLibrary.WebpackModules.getByProps('containerCozy', 'gifFavoriteButton').containerCozy, 'containerCozy');
          ddiv.className = this.populateParent.__embedcontainer;
          const fuckme = new (ZeresPluginLibrary.WebpackModules.getByDisplayName('MessageAccessories'))({ channel: this.tools.getChannel(message.channel_id) || this.menu.randomValidChannel });
          for (const embed of message.embeds) {
            const embedBase = {
              GIFVComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyGIFV'),
              ImageComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyImageZoomable'),
              LinkComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('MaskedLink'),
              VideoComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyVideo'),
              allowFullScreen: true,
              autoPlayGif: true,
              backgroundOpacity: '',
              className: ZeresPluginLibrary.WebpackModules.getByProps('embedWrapper', 'gifFavoriteButton').embedWrapper,
              embed: ZeresPluginLibrary.WebpackModules.getByProps('sanitizeEmbed').sanitizeEmbed(message.channel_id, message.id, embed),
              hideMedia: false,
              inlineGIFV: true,
              maxMediaHeight: 300,
              maxMediaWidth: 400,
              maxThumbnailHeight: 80,
              maxThumbnailWidth: 80,
              suppressEmbed: false,
              renderTitle: fuckme.renderEmbedTitle.bind(fuckme),
              renderDescription: fuckme.renderEmbedDescription.bind(fuckme),
              renderLinkComponent: ZeresPluginLibrary.WebpackModules.getByProps('defaultRenderLinkComponent').defaultRenderLinkComponent,
              renderImageComponent: ZeresPluginLibrary.WebpackModules.getByProps('renderImageComponent').renderImageComponent,
              renderVideoComponent: ZeresPluginLibrary.WebpackModules.getByProps('renderVideoComponent').renderVideoComponent,
              renderAudioComponent: ZeresPluginLibrary.WebpackModules.getByProps('renderAudioComponent').renderAudioComponent,
              renderMaskedLinkComponent: ZeresPluginLibrary.WebpackModules.getByProps('renderMaskedLinkComponent').renderMaskedLinkComponent
            };
            ZeresPluginLibrary.DiscordModules.ReactDOM.render(ZeresPluginLibrary.DiscordModules.React.createElement(ZeresPluginLibrary.WebpackModules.getByDisplayName('Embed'), embedBase), ddiv);
          }
          contentDiv.appendChild(ddiv);
        }
        if (!contentDiv.childElementCount && !message.content.length) return; // don't bother
        //messageContent.appendChild(divParent);
        parent.appendChild(messageGroup);
      } catch (err) {
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Error in populateParent', err);
      }
    };
    let i = 0;
    const addMore = () => {
      for (let added = 0; i < messages.length && (added < this.settings.renderCap || (this.menu.shownMessages != -1 && i < this.menu.shownMessages)); i++, added++) populate(i);
      handleMoreMessages();
      this.menu.shownMessages = i;
    };
    const handleMoreMessages = () => {
      if (i < messages.length) {
        const div = document.createElement('div');
        const moreButton = this.createButton('LOAD MORE', function () {
          this.parentElement.remove();
          addMore();
        });
        moreButton.style.width = '100%';
        moreButton.style.marginBottom = '20px';
        div.appendChild(moreButton);
        parent.appendChild(div);
      }
    };

    if (this.settings.renderCap) addMore();
    else for (; i < messages.length; i++) populate(i);
    this.processUserRequestQueue();
    if (!messages.length) {
      const strong = document.createElement('strong');
      strong.className = this.multiClasses.defaultColor;
      strong.innerText = "Not to worry, the logger is not broken! There simply wasn't anything logged in the selected tab.";
      parent.appendChild(strong);
    }
  }
  // >>-|| FILTERING ||-<<
  sortMessagesByAge(map) {
    // sort direction: new - old
    map.sort((a, b) => {
      const recordA = this.messageRecord[a];
      const recordB = this.messageRecord[b];
      if (!recordA || !recordB) return 0;
      let timeA = new Date(recordA.message.timestamp).getTime();
      let timeB = new Date(recordB.message.timestamp).getTime();
      if (recordA.edit_history && typeof recordA.edit_history[recordA.edit_history.length - 1].time !== 'string') timeA = recordA.edit_history[recordA.edit_history.length - 1].time;
      if (recordB.edit_history && typeof recordB.edit_history[recordB.edit_history.length - 1].time !== 'string') timeB = recordB.edit_history[recordB.edit_history.length - 1].time;
      if (recordA.delete_data && recordA.delete_data.time) timeA = recordA.delete_data.time;
      if (recordB.delete_data && recordB.delete_data.time) timeB = recordB.delete_data.time;
      return parseInt(timeB) - parseInt(timeA);
    });
  }
  getFilteredMessages() {
    let messages = [];

    const pushIdsIntoMessages = map => {
      for (let channel in map) {
        for (let messageIdIDX in map[channel]) {
          messages.push(map[channel][messageIdIDX]);
        }
      }
    };
    const checkIsMentioned = map => {
      for (let channel in map) {
        for (let messageIdIDX in map[channel]) {
          const messageId = map[channel][messageIdIDX];
          const record = this.getSavedMessage(messageId);
          if (!record) continue;
          if (record.ghost_pinged) {
            messages.push(messageId);
          }
        }
      }
    };

    if (this.menu.selectedTab == 'sent') {
      for (let i of this.cachedMessageRecord) {
        messages.push(i.id);
      }
    }
    if (this.menu.selectedTab == 'edited') pushIdsIntoMessages(this.editedMessageRecord);
    if (this.menu.selectedTab == 'deleted') pushIdsIntoMessages(this.deletedMessageRecord);
    if (this.menu.selectedTab == 'purged') pushIdsIntoMessages(this.purgedMessageRecord);
    if (this.menu.selectedTab == 'ghostpings') {
      checkIsMentioned(this.deletedMessageRecord);
      checkIsMentioned(this.editedMessageRecord);
      checkIsMentioned(this.purgedMessageRecord);
    }

    const filters = this.menu.filter.split(',');

    for (let i = 0; i < filters.length; i++) {
      const split = filters[i].split(':');
      if (split.length < 2) continue;

      const filterType = split[0].trim().toLowerCase();
      const filter = split[1].trim().toLowerCase();

      if (filterType == 'server' || filterType == 'guild')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          const guild = this.tools.getServer(message.guild_id || (channel && channel.guild_id));
          return (message.guild_id || (channel && channel.guild_id)) == filter || (guild && guild.name.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'channel')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          return message.channel_id == filter || (channel && channel.name.toLowerCase().includes(filter.replace('#', '').toLowerCase()));
        });

      if (filterType == 'message' || filterType == 'content')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          return x == filter || (message && message.content.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'user')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          const member = ZeresPluginLibrary.DiscordModules.GuildMemberStore.getMember(message.guild_id || (channel && channel.guild_id), message.author.id);
          return message.author.id == filter || message.author.username.toLowerCase().includes(filter.toLowerCase()) || (member && member.nick && member.nick.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'has') {
        switch (filter) {
          case 'image':
            messages = messages.filter(x => {
              const message = this.getMessageAny(x);
              if (!message) return false;
              if (Array.isArray(message.attachments)) if (message.attachments.some(({ filename }) => this.isImage(filename))) return true;
              if (Array.isArray(message.embeds)) return message.embeds.some(({ image }) => !!image);
              return false;
            });
            break;
          case 'link':
            messages = messages.filter(x => {
              const message = this.getMessageAny(x);
              if (!message) return false;
              return message.content.search(/https?:\/\/[\w\W]{2,}/) !== -1;
            });
            break;
        }
      }
    }

    if (this.menu.selectedTab != 'sent') {
      this.sortMessagesByAge(messages);
      if (this.settings.reverseOrder) messages.reverse(); // this gave me a virtual headache
    } else if (!this.settings.reverseOrder) messages.reverse(); // this gave me a virtual headache

    return messages;
  }
  // >>-|| REPOPULATE ||-<<
  refilterMessages() {
    const messagesDIV = document.getElementById(this.style.menuMessages);
    const original = messagesDIV.style.display;
    messagesDIV.style.display = 'none';
    while (messagesDIV.firstChild) messagesDIV.removeChild(messagesDIV.firstChild);
    this.menu.messages = this.getFilteredMessages();
    this.populateParent(messagesDIV, this.menu.messages);
    messagesDIV.style.display = original;
  }
  // >>-|| HEADER ||-<<
  openTab(tab) {
    const tabBar = document.getElementById(this.style.menuTabBar);
    if (!tabBar) return this.showToast(`Error switching to tab ${tab}!`, { type: 'error', timeout: 3000 });
    tabBar.querySelector(`.${this.style.tabSelected}`).classList.remove(this.style.tabSelected);
    tabBar.querySelector('#' + tab).classList.add(this.style.tabSelected);
    this.menu.selectedTab = tab;
    setTimeout(() => this.refilterMessages(), 0);
  }
  createHeader() {
    if (!this.createHeader.classes || this.createHeader.classes.__errored) {
      try {
        const TabBarStuffs = ZeresPluginLibrary.WebpackModules.getByProps('body', 'tabBar');
        this.createHeader.classes = {
          itemTabBarItem: this.style.tabBarItem,
          tabBarContainer: this.style.tabBarContainer,
          tabBar: this.style.tabBar,
          tabBarSingle: this.style.tabBar
        };
      } catch {
        this.createHeader.classes = {
          itemTabBarItem: 'tabBarItem' + ' ' + 'item',
          tabBarContainer: 'tabBarContainer',
          tabBar: 'tabBar',
          tabBarSingle: 'tabBar',
          __errored: true
        };
      }
    }
    const classes = this.createHeader.classes;
    const createTab = (title, id) => {
      const tab = this.parseHTML(`<div id="${id}" class="${classes.itemTabBarItem} ${this.style.tab} ${id == this.menu.selectedTab ? this.style.tabSelected : ''}" role="button">${title}</div>`);
      tab.addEventListener('mousedown', () => this.openTab(id));
      return tab;
    };
    const tabBar = this.parseHTML(`<div class="${classes.tabBarContainer}"><div class="${classes.tabBar}" id="${this.style.menuTabBar}"></div></div>`);
    const tabs = tabBar.getElementsByClassName(classes.tabBarSingle)[0];
    tabs.appendChild(createTab('Sent', 'sent'));
    tabs.appendChild(createTab('Deleted', 'deleted'));
    tabs.appendChild(createTab('Edited', 'edited'));
    tabs.appendChild(createTab('Purged', 'purged'));
    tabs.appendChild(createTab('Ghost pings', 'ghostpings'));
    tabBar.style.marginRight = '20px';
    return tabBar;
  }
  createTextBox() {
    if (!this.createTextBox.classes || this.createTextBox.classes.__errored) {
      try {
        this.createTextBox.classes = {
          inputWrapper: this.style.inputWrapper,
          inputMultiInput: this.style.multiInput,
          multiInputFirst: this.style.multiInputFirst,
          inputDefaultMultiInputField: this.style.input,
          questionMark: this.style.questionMark,
          icon: this.style.questionMark,
          focused: ZeresPluginLibrary.WebpackModules.getByProps('focused').focused.split(/ /g),
          questionMarkSingle: this.style.questionMark
        }
      } catch {
        this.createTextBox.classes = {
          inputWrapper: 'inputMini inputWrapper',
          inputMultiInput: 'inputPrefix input' + ' ' + 'multiInput',
          multiInputFirst: 'multiInputFirst',
          inputDefaultMultiInputField: 'inputPrefix inputDefault' + ' ' + 'multiInputField',
          questionMark: 'questionMark',
          icon: 'questionMark',
          focused: 'focused',
          questionMarkSingle: 'questionMark',
          __errored: true
        }
      }
    }
    const classes = this.createTextBox.classes;
    let textBox = this.parseHTML(
      `<div class="${classes.inputWrapper}"><div class="${classes.inputMultiInput}"><div class="${classes.inputWrapper} ${classes.multiInputFirst}"><input class="${classes.inputDefaultMultiInputField}" name="username" type="text" placeholder="Message filter" maxlength="999" value="${this.menu.filter}" id="${this.style.filter}"></div><span tabindex="0" class="${classes.questionMark}" role="button"><svg name="QuestionMark" class="${classes.icon}" aria-hidden="false" width="16" height="16" viewBox="0 0 24 24"><g fill="currentColor" fill-rule="evenodd" transform="translate(7 4)"><path d="M0 4.3258427C0 5.06741573.616438356 5.68539326 1.35616438 5.68539326 2.09589041 5.68539326 2.71232877 5.06741573 2.71232877 4.3258427 2.71232877 2.84269663 4.31506849 2.78089888 4.5 2.78089888 4.68493151 2.78089888 6.28767123 2.84269663 6.28767123 4.3258427L6.28767123 4.63483146C6.28767123 5.25280899 5.97945205 5.74719101 5.42465753 6.05617978L4.19178082 6.73595506C3.51369863 7.10674157 3.14383562 7.78651685 3.14383562 8.52808989L3.14383562 9.64044944C3.14383562 10.3820225 3.76027397 11 4.5 11 5.23972603 11 5.85616438 10.3820225 5.85616438 9.64044944L5.85616438 8.96067416 6.71917808 8.52808989C8.1369863 7.78651685 9 6.30337079 9 4.69662921L9 4.3258427C9 1.48314607 6.71917808 0 4.5 0 2.21917808 0 0 1.48314607 0 4.3258427zM4.5 12C2.5 12 2.5 15 4.5 15 6.5 15 6.5 12 4.5 12L4.5 12z"></path></g></svg></span></div></div>`
    );
    const inputEl = textBox.getElementsByTagName('input')[0];
    inputEl.addEventListener('focusout', e => {
      DOMTokenList.prototype.remove.apply(e.target.parentElement.parentElement.classList, classes.focused);
    });
    inputEl.addEventListener('focusin', e => {
      DOMTokenList.prototype.add.apply(e.target.parentElement.parentElement.classList, classes.focused);
    });
    const onUpdate = e => {
      if (this.menu.filterSetTimeout) clearTimeout(this.menu.filterSetTimeout);
      this.menu.filter = inputEl.value;
      const filters = this.menu.filter.split(',');
      // console.log(filters);
      if (!filters[0].length) return this.refilterMessages();
      this.menu.filterSetTimeout = setTimeout(() => {
        if (filters[0].length) {
          for (let i = 0; i < filters.length; i++) {
            const split = filters[i].split(':');
            if (split.length < 2) return;
          }
        }
        this.refilterMessages();
      }, 200);
    };
    inputEl.addEventListener('keyup', onUpdate); // maybe I can actually use keydown but it didn't work for me
    inputEl.addEventListener('paste', onUpdate);
    const helpButton = textBox.getElementsByClassName(classes.questionMarkSingle)[0];
    helpButton.addEventListener('click', () => {
      const extraHelp = this.createButton('Logger help', () => this.showLoggerHelpModal());
      this.createModal({
        confirmText: 'OK',
        header: 'Filter help',
        size: this.createModal.confirmationModal.Sizes.LARGE,
        children: [
          ZeresPluginLibrary.ReactTools.createWrappedElement([
            this.parseHTML(
              `<div class="${this.multiClasses.defaultColor}">"server: <servername or serverid>" - Filter results with the specified server name or id.
                        "channel: <channelname or channelid>" - Filter results with the specified channel name or id.
                        "user: <username, nickname or userid>" - Filter results with the specified username, nickname or userid.
                        "message: <search or messageid>" or "content: <search or messageid>" - Filter results with the specified message content.
                        "has: <image|link> - Filter results to only images or links

                        Separate the search tags with commas.
                        Example: server: tom's bd stuff, message: heck


                        Shortcut help:

                        "Ctrl + M" (default) - Open message log.
                        "Ctrl + N" (default) - Open message log with selected channel filtered.\n\n</div>`.replace(/\n/g, '</br>')
            ),
            extraHelp
          ])
        ],
        red: false
      });
    });
    new ZeresPluginLibrary.Tooltip(helpButton, 'Help!', { side: 'top' });
    return textBox;
  }
  // >>-|| MENU MODAL CREATION ||-<<
  openWindow(type) {
	// const tesettttt = null;
	// let tes2 = tesettttt.test;
	// console.log(tes2);
    // return;
    if (this.menu.open) {
      this.menu.scrollPosition = 0;
      if (type) this.openTab(type);
      return;
    }
    this.menu.open = true;
    if (type) this.menu.selectedTab = type;
    if (!this.menu.selectedTab) this.menu.selectedTab = 'deleted';
    const messagesDIV = this.parseHTML(`<div id="${this.style.menuMessages}"></div>`);
    const viewportHeight = document.getElementById('app-mount').getBoundingClientRect().height;
    messagesDIV.style.minHeight = viewportHeight * 0.514090909 + 'px'; // hack but ok
    //messagesDIV.style.display = 'none';
    const onChangeOrder = el => {
      this.settings.reverseOrder = !this.settings.reverseOrder;
	  // const theElement = document.getElementsByClassName(this.style.menuRoot)[0];
	  // to me: don't touch filters ever again lol
	  const theElement = Array.from(Array.from(document.getElementsByClassName(this.style.menuRoot)[0].children).filter(x => !x.id && !x.dir)[0].children).filter(x => x.type == "button")[0];
      // el.target.innerText = 'Sort direction: ' + (!this.settings.reverseOrder ? 'new - old' : 'old - new'); // maybe a func?
	  theElement.innerText = 'Sort direction: ' + (!this.settings.reverseOrder ? 'new - old' : 'old - new'); // maybe a func?
      this.saveSettings();
      this.refilterMessages();
    };

    // const Text = ZeresPluginLibrary.WebpackModules.getByDisplayName('Text') || ZeresPluginLibrary.WebpackModules.getByDisplayName('LegacyText');
    const Text = ZeresPluginLibrary.DiscordModules.TextElement;
    const onClearLog = e => {
      if (!Text) return;
      if (document.getElementById(this.style.filter).parentElement.parentElement.className.indexOf(this.createTextBox.classes.focused[0]) != -1) return;
      let type = this.menu.selectedTab;
      if (type === 'ghostpings') type = 'ghost pings';
      else {
        type += ' messages';
      }
      this.createModal({
        header: 'Clear log',
        children: ZeresPluginLibrary.DiscordModules.React.createElement(Text, { size: Text.Sizes.SIZE_16, children: [`Are you sure you want to delete all ${type}${this.menu.filter.length ? ' that also match filter' : ''}?`] }),
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: () => {
          if (this.menu.selectedTab == 'sent') {
            if (!this.menu.filter.length)
              for (let id of this.menu.messages)
                this.cachedMessageRecord.splice(
                  this.cachedMessageRecord.findIndex(m => m.id === id),
                  1
                );
            else this.cachedMessageRecord.length = 0; // hack, does it cause a memory leak?
          } else {
            for (let id of this.menu.messages) {
              const record = this.messageRecord[id];
              let isSelected = false;
              if (record) {
                this.invalidateChannelCache(record.message.channel_id);
                if (this.selectedChannel) isSelected = record.message.channel_id === this.selectedChannel.id;
              }
              this.deleteMessageFromRecords(id);
              if (this.selectedChannel && isSelected) this.cacheChannelMessages(this.selectedChannel.id);
            }
            this.saveData();
          }
          setImmediate(_ => this.refilterMessages());
          // this.menu.refilterOnMount = true;
        }
      });
    };
    this.createModal(
      {
        confirmText: 'Clear log',
        cancelText: 'Sort direction: ' + (!this.settings.reverseOrder ? 'new - old' : 'old - new'),
        header: ZeresPluginLibrary.ReactTools.createWrappedElement([this.createTextBox(), this.createHeader()]),
        size: this.createModal.confirmationModal.Sizes.LARGE,
        children: [ZeresPluginLibrary.ReactTools.createWrappedElement([messagesDIV])],
        onCancel: onChangeOrder,
        onConfirm: onClearLog,
        onClose: _ => { },
        ml2Data: true,
        className: this.style.menuRoot,
        ref: e => {
          if (!e) return;
          /* advanced tech! */
          const stateNode = ZeresPluginLibrary.Utilities.getNestedProp(e, '_reactInternalFiber.return.return.stateNode.firstChild.childNodes.1.firstChild');
          if (!stateNode) return;
          stateNode.addEventListener(
            'scroll',
            this.tools.DiscordUtils.debounce(() => {
              this.scrollPosition = document.getElementById(this.style.menuMessages).parentElement.parentElement.parentElement.scrollTop;
            }, 100)
          );
        }
      },
      false,
      this.style.menu
    );
    let loadAttempts = 0;
    const loadMessages = () => {
      loadAttempts++;
      try {
		/* really bad code start */
		let tabBar = document.getElementById(`${this.style.menuTabBar}`);
		// 						  main tab part  dom wrapper  react wrapper  header
		let tabBarHeader = tabBar.parentElement.parentElement.parentElement.parentElement;
		tabBarHeader.style.width = "100%";
		/* really bad code end */
        this.refilterMessages();
      } catch (e) {
        if (loadAttempts > 4) {
          XenoLib.Notifications.error(`Couldn't load menu messages! Report this issue to Lighty or Davilarek, error info is in console`, { timeout: 0 });
          ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Failed loading menu', e);
          return;
        }
        setTimeout(loadMessages, 100);
      }
    };
    setTimeout(loadMessages, 100);
  }
  /* ==================================================-|| END MENU ||-================================================== */
  /* ==================================================-|| START CONTEXT MENU ||-================================================== */
  patchContextMenus() {
    const _this = this;

    this.unpatches.push(BdApi.ContextMenu.patch('message', (ret, props) => {
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'message'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());

      const messageId = props.message.id;
      const channelId = props.channel.id;
      const record = this.messageRecord[messageId];
      if (record) {
        /*
                addElement('Show in menu', () => {
                    this.menu.filter = `message:${messageId}`;
                    this.openWindow();
                }); */
        if (record.delete_data) {
          const options = menu.find(m => m.props.children && m.props.children.length > 10);
          options.props.children.splice(0, options.props.children.length);
          addElement(
            'Hide Deleted Message',
            () => {
              this.dispatcher.dispatch({
                type: 'MESSAGE_DELETE',
                id: messageId,
                channelId: channelId,
                ML2: true // ignore ourselves lol, it's already deleted
                // on a side note, probably does nothing if we don't ignore
              });
              this.showToast('Hidden!', { type: 'success' });
              record.delete_data.hidden = true;
              this.saveData();
            }
          );
          const idx = this.noTintIds.indexOf(messageId);
          addElement(
            `${idx !== -1 ? 'Add' : 'Remove'} Deleted Tint`,
            () => {
              if (idx !== -1) this.noTintIds.splice(idx, 1);
              else this.noTintIds.push(messageId);
              this.showToast(idx !== -1 ? 'Added!' : 'Removed!', { type: 'success' });
            }
          );
        }
        if (record.edit_history) {
          if (record.edits_hidden) {
            addElement(
              'Unhide Edits',
              () => {
                record.edits_hidden = false;
                this.saveData();
                this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
              }
            );
          } else {
            let target = props.target;
            if (target) {
              while (target && target.className && target.className.indexOf(this.style.edited) === -1) {
                target = target.parentElement;
              }
              if (target) {
                if (!this.editModifiers[messageId]) {
                  addElement(
                    'Hide Edits',
                    () => {
                      record.edits_hidden = true;
                      this.saveData();
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    }
                  );
                }
                const editNum = target.getAttribute('editNum');
                if (this.editModifiers[messageId]) {
                  addElement(
                    `${this.editModifiers[messageId].noSuffix ? 'Show' : 'Hide'} (edited) Tag`,
                    () => {
                      this.editModifiers[messageId].noSuffix = true;
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    }
                  );
                  addElement(
                    `Undo Show As Message`,
                    () => {
                      delete this.editModifiers[messageId];
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    },
                    this.obfuscatedClass('undo-show-as-message')
                  );
                } else if (typeof editNum !== 'undefined' && editNum !== null) {
                  addElement(
                    'Show Edit As Message',
                    () => {
                      this.editModifiers[messageId] = { editNum };
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    }
                  );
                  addElement(
                    'Delete Edit',
                    () => {
                      this.deleteEditedMessageFromRecord(messageId, parseInt(editNum));
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    },
                    { /*color: 'colorDanger'*/ className: ZLibrary.WebpackModules.getByProps("colorDanger", "colorPremium")["colorDanger"] }
                  );
                }
              }
            }
          }
        }
        if (record) {
          addElement(
            'Remove From Log',
            () => {
              this.deleteMessageFromRecords(messageId);
              this.saveData();
              if (record.delete_data) {
                this.dispatcher.dispatch({
                  type: 'MESSAGE_DELETE',
                  id: messageId,
                  channelId: channelId,
                  ML2: true // ignore ourselves lol, it's already deleted
                  // on a side note, probably does nothing if we don't ignore
                });
              } else {
                this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
              }
            },
            { /*color: 'colorDanger'*/ className: ZLibrary.WebpackModules.getByProps("colorDanger", "colorPremium")["colorDanger"] }
          );
        }
      }

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    const handleWhiteBlackList = (newItems, id) => {
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });
      const whitelistIdx = this.settings.whitelist.findIndex(m => m === id);
      const blacklistIdx = this.settings.blacklist.findIndex(m => m === id);
      if (whitelistIdx == -1 && blacklistIdx == -1) {
        addElement(
          `Add to Whitelist`,
          () => {
            this.settings.whitelist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          }
        );
        addElement(
          `Add to Blacklist`,
          () => {
            this.settings.blacklist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          }
        );
      } else if (whitelistIdx != -1) {
        addElement(
          `Remove From Whitelist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Blacklist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.settings.blacklist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          }
        );
      } else {
        addElement(
          `Remove From Blacklist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Whitelist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.settings.whitelist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          }
        );
      }
	  /*
      const notifIdx = this.settings.notificationBlacklist.indexOf(id);
      addElement(
        `${notifIdx === -1 ? 'Add To' : 'Remove From'} Notification Blacklist`,
        () => {
          if (notifIdx === -1) this.settings.notificationBlacklist.push(id);
          else this.settings.notificationBlacklist.splice(notifIdx, 1);
          this.saveSettings();
          this.showToast(notifIdx === -1 ? 'Added!' : 'Removed!', { type: 'success' });
        }
      );
	  */
	  
	  // const notifIdx = this.settings.notificationBlacklist.indexOf(id);
	  const notifWhitelistIdx = this.settings.notificationWhitelist.findIndex(m => m === id);
      const notifBlacklistIdx = this.settings.notificationBlacklist.findIndex(m => m === id);
	  /*
      addElement(
        `${notifIdx === -1 ? 'Add To' : 'Remove From'} Notification Blacklist`,
        () => {
          if (notifIdx === -1) this.settings.notificationBlacklist.push(id);
          else this.settings.notificationBlacklist.splice(notifIdx, 1);
          this.saveSettings();
          this.showToast(notifIdx === -1 ? 'Added!' : 'Removed!', { type: 'success' });
        },
        this.obfuscatedClass('change-notif-blacklist')
      );
	  */
	  if (notifWhitelistIdx == -1 && notifBlacklistIdx == -1) {
        addElement(
          `Add to Notification Whitelist`,
          () => {
            this.settings.notificationWhitelist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          }
        );
        addElement(
          `Add to Notification Blacklist`,
          () => {
            this.settings.notificationBlacklist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          }
        );
      } else if (notifWhitelistIdx != -1) {
        addElement(
          `Remove From Notification Whitelist`,
          () => {
            this.settings.notificationWhitelist.splice(notifWhitelistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Notification Blacklist`,
          () => {
            this.settings.notificationWhitelist.splice(notifWhitelistIdx, 1);
            this.settings.notificationBlacklist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          }
        );
      } else {
        addElement(
          `Remove From Notification Blacklist`,
          () => {
            this.settings.notificationBlacklist.splice(notifBlacklistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Notification Whitelist`,
          () => {
            this.settings.notificationBlacklist.splice(notifBlacklistIdx, 1);
            this.settings.notificationWhitelist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          }
        );
      }
    };/*

    this.unpatches.push(BdApi.ContextMenu.patch('channel-context', (ret, props) => {
      console.log(ret, props);
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'channel-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For Channel`,
        () => {
          _this.menu.filter = `channel:${props.channel.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.channel.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    })); */

    this.unpatches.push(BdApi.ContextMenu.patch('guild-context', (ret, props) => {
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'guild-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());

      addElement(
        `Open Log For Guild`,
        () => {
          _this.menu.filter = `guild:${props.guild.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.guild.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('user-context', (ret, props) => {
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'user-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For User`,
        () => {
          _this.menu.filter = `user:${props.user.id}`;
          _this.openWindow();
        }
      );

      if (props.channel?.isDM()) {
        addElement(
          `Open Log For DM`,
          () => {
            _this.menu.filter = `channel:${props.channel.id}`;
            _this.openWindow();
          }
        );

        handleWhiteBlackList(newItems, props.channel.id);
      }

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('channel-context', (ret, props) => {
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'channel-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For Channel`,
        () => {
          _this.menu.filter = `channel:${props.channel.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.channel.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));
	
	this.unpatches.push(BdApi.ContextMenu.patch('gdm-context', (ret, props) => {
      const menu = ZeresPluginLibrary.Utilities.getNestedProp(
        ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.navId === 'gdm-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For Channel`,
        () => {
          _this.menu.filter = `channel:${props.channel.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.channel.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    return;
    const Patcher = XenoLib.createSmartPatcher({ before: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.before(this.getName(), moduleToPatch, functionName, callback, options), instead: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.instead(this.getName(), moduleToPatch, functionName, callback, options), after: (moduleToPatch, functionName, callback, options = {}) => ZeresPluginLibrary.Patcher.after(this.getName(), moduleToPatch, functionName, callback, options), unpatchAll: () => ZeresPluginLibrary.Patcher.unpatchAll(this.getName()) });
    const WebpackModules = ZeresPluginLibrary.WebpackModules;
    const nativeImageContextMenuPatch = () => {
      const mod = WebpackModules.find(e => e.default && (e.__powercordOriginal_default || e.default).displayName === 'NativeImageContextMenu');
      if (!mod) return console.error('Failed to patch NativeImageContextMenu');
      this.unpatches.push(
      this.Patcher.after(
        mod,
        'default',
        (_, [props], ret) => {
          const newItems = [];
          if (!this.menu.open) return;
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          let matched;
          let isCached = false;
          if (!props.src) return;
          if (props.src.startsWith('data:image/png')) {
            const cut = props.src.substr(0, 100);
            matched = cut.match(/;(\d+);(\d+);/);
            isCached = true;
          } else {
            matched = props.src.match(/.*ments\/(\d+)\/(\d+)\//);
            if (!matched) matched = props.src.match(/r8q6.png#(\d+),(\d+)/);
            if (!matched) {
              matched = props.src.match(/localhost:7474.*#(\d+),(\d+)/);
              isCached = true;
            }
          }
          if (!matched) return;
          const channelId = matched[1];
          const attachmentId = matched[2];
          const element = document.getElementById(attachmentId);
          if (!element) return;
          const attachmentIdx = element.idx;
          const record = this.getSavedMessage(element.messageId);
          if (!record) return;
          addElement(
            'Save to Folder',
            () => {
              const { dialog } = this.nodeModules.electron.remote;
              dialog
                .showSaveDialog({
                  defaultPath: record.message.attachments[attachmentIdx].filename
                })
                .then(({ filePath: dir }) => {
                  try {
                    if (!dir) return;
                    const attemptToUseCached = () => {
                      const srcFile = `${this.settings.imageCacheDir}/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}`;
                      if (!this.nodeModules.fs.existsSync(srcFile)) return this.showToast('Image does not exist locally!', { type: 'error', timeout: 5000 });
                      this.nodeModules.fs.copyFileSync(srcFile, dir);
                      this.showToast('Saved!', { type: 'success' });
                    };
                    if (isCached) {
                      attemptToUseCached();
                    } else {
                      const req = this.nodeModules.request(record.message.attachments[attachmentIdx].url);
                      req.on('response', res => {
                        if (res.statusCode == 200) {
                          req
                            .pipe(this.nodeModules.fs.createWriteStream(dir))
                            .on('finish', () => this.showToast('Saved!', { type: 'success' }))
                            .on('error', () => this.showToast('Failed to save! No permissions.', { type: 'error', timeout: 5000 }));
                        } else if (res.statusCode == 404) {
                          attemptToUseCached();
                        } else {
                          attemptToUseCached();
                        }
                      });
                    }
                  } catch (err) {
                    console.error('Failed saving', err.message);
                  }
                });
            },
            this.obfuscatedClass('save-to')
          );
          addElement(
            'Copy to Clipboard',
            () => {
              const { clipboard, nativeImage } = this.nodeModules.electron;
              const attemptToUseCached = () => {
                const srcFile = `${this.settings.imageCacheDir}/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}`;
                if (!this.nodeModules.fs.existsSync(srcFile)) return this.showToast('Image does not exist locally!', { type: 'error', timeout: 5000 });
                clipboard.write({ image: srcFile });
                this.showToast('Copied!', { type: 'success' });
              };
              if (isCached) {
                attemptToUseCached();
              } else {
                const path = this.nodeModules.path;
                const process = require('process');
                // ImageToClipboard by Zerebos
                this.nodeModules.request({ url: record.message.attachments[attachmentIdx].url, encoding: null }, (error, response, buffer) => {
                  try {
                    if (error || response.statusCode != 200) {
                      this.showToast('Failed to copy. Image may not exist. Attempting to use local image cache.', { type: 'error' });
                      attemptToUseCached();
                      return;
                    }
                    if (process.platform === 'win32' || process.platform === 'darwin') {
                      clipboard.write({ image: nativeImage.createFromBuffer(buffer) });
                    } else {
                      const file = path.join(process.env.HOME, 'ml2temp.png');
                      this.nodeModules.fs.writeFileSync(file, buffer, { encoding: null });
                      clipboard.write({ image: file });
                      this.nodeModules.fs.unlinkSync(file);
                    }
                    this.showToast('Copied!', { type: 'success' });
                  } catch (err) {
                    console.error('Failed to cached', err.message);
                  }
                });
              }
            },
            this.obfuscatedClass('copy-to')
          );
          addElement(
            'Jump to Message',
            () => {
              this.jumpToMessage(channelId, element.messageId, record.message.guild_id);
            },
            this.obfuscatedClass('jump-to')
          );
          if (record.delete_data && record.delete_data.hidden) {
            addElement(
              'Unhide Deleted Message',
              () => {
                record.delete_data.hidden = false;
                this.invalidateChannelCache(record.message.channel_id); // good idea?
                this.cacheChannelMessages(record.message.channel_id);
                this.saveData();
                this.showToast('Unhidden!', { type: 'success' });
              },
              this.obfuscatedClass('unhide-deleted')
            );
          }
          if (record.edit_history && record.edits_hidden) {
            addElement(
              'Unhide Message History',
              () => {
                record.edits_hidden = false;
                this.invalidateChannelCache(record.message.channel_id); // good idea?
                this.cacheChannelMessages(record.message.channel_id);
                this.saveData();
                this.showToast('Unhidden!', { type: 'success' });
              },
              this.obfuscatedClass('unhide-edited')
            );
          }
          addElement(
            'Remove From Log',
            () => {
              this.deleteMessageFromRecords(element.messageId);
              this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
              this.saveData();
              if (record.delete_data) this.dispatcher.dispatch({ type: 'MESSAGE_DELETE', id: messageId, channelId: channelId, ML2: true });
              else this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
            },
            this.obfuscatedClass('remove')
          );
          if (!props.src.startsWith('https://i.clouds.tf/q2vy/r8q6.png')) {
            addElement(
              'Hide Image From Log',
              () => {
                record.message.attachments[attachmentIdx].hidden = true;
                element.src = `https://i.clouds.tf/q2vy/r8q6.png#${channelId},${attachmentId}`;
                element.width = 200;
              },
              this.obfuscatedClass('hide-image')
            );
          } else {
            addElement(
              'Unhide Image From Log',
              () => {
                record.message.attachments[attachmentIdx].hidden = false;
                const srcFile = `http://localhost:7474/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}#${channelId},${attachmentId}`;
                element.src = record.message.attachments[attachmentIdx].url === 'ERROR' ? srcFile : record.message.attachments[attachmentIdx].url;
                element.width = record.message.attachments[attachmentIdx].url === 'ERROR' ? 256 : this.clamp(record.message.attachments[attachmentIdx].width, 200, 650);
              },
              this.obfuscatedClass('unhide-image')
            );
          }
          if (!newItems.length) return;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(this.settings.contextmenuSubmenuName, newItems, this.obfuscatedClass('mlv2'))]));
        }
      )
      );
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('NativeImageContextMenu', nativeImageContextMenuPatch));

    const messageContextPatch = () => {
      const mod = WebpackModules.find(e => e.default && (e.__powercordOriginal_default || e.default).displayName === 'MessageContextMenu');
      if (!mod) return console.error('[MessageLoggerV2] Failed to find MessageContextMenu');
      this.unpatches.push(
      this.Patcher.after(
        mod,
        'default',
        (_, [props], ret) => {
          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement('Open Logs', () => this.openWindow(), this.obfuscatedClass('open'));
          const messageId = props.message.id;
          const channelId = props.channel.id;
          const record = this.messageRecord[messageId];
          if (record) {
            /*
                    addElement('Show in menu', () => {
                        this.menu.filter = `message:${messageId}`;
                        this.openWindow();
                    }); */
            if (record.delete_data) {
              const options = menu.find(m => m.props.children && m.props.children.length > 10);
              options.props.children.splice(0, options.props.children.length);
              addElement(
                'Hide Deleted Message',
                () => {
                  this.dispatcher.dispatch({
                    type: 'MESSAGE_DELETE',
                    id: messageId,
                    channelId: channelId,
                    ML2: true // ignore ourselves lol, it's already deleted
                    // on a side note, probably does nothing if we don't ignore
                  });
                  this.showToast('Hidden!', { type: 'success' });
                  record.delete_data.hidden = true;
                  this.saveData();
                },
                this.obfuscatedClass('hide-deleted')
              );
              const idx = this.noTintIds.indexOf(messageId);
              addElement(
                `${idx !== -1 ? 'Add' : 'Remove'} Deleted Tint`,
                () => {
                  if (idx !== -1) this.noTintIds.splice(idx, 1);
                  else this.noTintIds.push(messageId);
                  this.showToast(idx !== -1 ? 'Added!' : 'Removed!', { type: 'success' });
                },
                this.obfuscatedClass('change-tint')
              );
            }
            if (record.edit_history) {
              if (record.edits_hidden) {
                addElement(
                  'Unhide Edits',
                  () => {
                    record.edits_hidden = false;
                    this.saveData();
                    this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                  },
                  this.obfuscatedClass('unhide-edits')
                );
              } else {
                let target = props.target;
                if (target) {
                  while (target && target.className && target.className.indexOf(this.style.edited) === -1) {
                    target = target.parentElement;
                  }
                  if (target) {
                    if (!this.editModifiers[messageId]) {
                      addElement(
                        'Hide Edits',
                        () => {
                          record.edits_hidden = true;
                          this.saveData();
                          this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                        },
                        this.obfuscatedClass('hide-edits')
                      );
                    }
                    const editNum = target.getAttribute('editNum');
                    if (this.editModifiers[messageId]) {
                      addElement(
                        `${this.editModifiers[messageId].noSuffix ? 'Show' : 'Hide'} (edited) Tag`,
                        () => {
                          this.editModifiers[messageId].noSuffix = true;
                          this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                        },
                        this.obfuscatedClass('change-edit-tag')
                      );
                      addElement(
                        `Undo Show As Message`,
                        () => {
                          delete this.editModifiers[messageId];
                          this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                        },
                        this.obfuscatedClass('undo-show-as-message')
                      );
                    } else if (typeof editNum !== 'undefined' && editNum !== null) {
                      addElement(
                        'Show Edit As Message',
                        () => {
                          this.editModifiers[messageId] = { editNum };
                          this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                        },
                        this.obfuscatedClass('show-as-message')
                      );
                      addElement(
                        'Delete Edit',
                        () => {
                          this.deleteEditedMessageFromRecord(messageId, parseInt(editNum));
                          this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                        },
                        this.obfuscatedClass('delete-edit'),
                        { /*color: 'colorDanger'*/ className: ZLibrary.WebpackModules.getByProps("colorDanger", "colorPremium")["colorDanger"] }
                      );
                    }
                  }
                }
              }
            }
            if (record) {
              addElement(
                'Remove From Log',
                () => {
                  this.deleteMessageFromRecords(messageId);
                  this.saveData();
                  if (record.delete_data) {
                    this.dispatcher.dispatch({
                      type: 'MESSAGE_DELETE',
                      id: messageId,
                      channelId: channelId,
                      ML2: true // ignore ourselves lol, it's already deleted
                      // on a side note, probably does nothing if we don't ignore
                    });
                  } else {
                    this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                  }
                },
                this.obfuscatedClass('remove-from-log'),
                { /*color: 'colorDanger'*/ className: ZLibrary.WebpackModules.getByProps("colorDanger", "colorPremium")["colorDanger"] }
              );
            }
          }
          if (!newItems.length) return;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(this.settings.contextmenuSubmenuName, newItems, this.obfuscatedClass('mlv2'))]));
        }
      )
      );
      return true;
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('MessageContextMenu', messageContextPatch));

    const handleWhiteBlackList_ = (newItems, id) => {
      const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
      const whitelistIdx = this.settings.whitelist.findIndex(m => m === id);
      const blacklistIdx = this.settings.blacklist.findIndex(m => m === id);
      if (whitelistIdx == -1 && blacklistIdx == -1) {
        addElement(
          `Add to Whitelist`,
          () => {
            this.settings.whitelist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          },
          this.obfuscatedClass('add-whitelist')
        );
        addElement(
          `Add to Blacklist`,
          () => {
            this.settings.blacklist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          },
          this.obfuscatedClass('add-blacklist')
        );
      } else if (whitelistIdx != -1) {
        addElement(
          `Remove From Whitelist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          },
          this.obfuscatedClass('remove-whitelist')
        );
        addElement(
          `Move to Blacklist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.settings.blacklist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          },
          this.obfuscatedClass('move-blacklist')
        );
      } else {
        addElement(
          `Remove From Blacklist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          },
          this.obfuscatedClass('remove-blacklist')
        );
        addElement(
          `Move to Whitelist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.settings.whitelist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          },
          this.obfuscatedClass('move-whitelist')
        );
      }
      // const notifIdx = this.settings.notificationBlacklist.indexOf(id);
	  const notifWhitelistIdx = this.settings.notificationWhitelist.findIndex(m => m === id);
      const notifBlacklistIdx = this.settings.notificationBlacklist.findIndex(m => m === id);
	  /*
      addElement(
        `${notifIdx === -1 ? 'Add To' : 'Remove From'} Notification Blacklist`,
        () => {
          if (notifIdx === -1) this.settings.notificationBlacklist.push(id);
          else this.settings.notificationBlacklist.splice(notifIdx, 1);
          this.saveSettings();
          this.showToast(notifIdx === -1 ? 'Added!' : 'Removed!', { type: 'success' });
        },
        this.obfuscatedClass('change-notif-blacklist')
      );
	  */
	  if (notifWhitelistIdx == -1 && notifBlacklistIdx == -1) {
        addElement(
          `Add to Notification Whitelist`,
          () => {
            this.settings.notificationWhitelist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          },
          this.obfuscatedClass('add-notif-whitelist')
        );
        addElement(
          `Add to Notification Blacklist`,
          () => {
            this.settings.notificationBlacklist.push(id);
            this.saveSettings();
            this.showToast('Added!', { type: 'success' });
          },
          this.obfuscatedClass('add-notif-blacklist')
        );
      } else if (notifWhitelistIdx != -1) {
        addElement(
          `Remove From Notification Whitelist`,
          () => {
            this.settings.notificationWhitelist.splice(notifWhitelistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          },
          this.obfuscatedClass('remove-notif-whitelist')
        );
        addElement(
          `Move to Notification Blacklist`,
          () => {
            this.settings.notificationWhitelist.splice(notifWhitelistIdx, 1);
            this.settings.notificationBlacklist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          },
          this.obfuscatedClass('move-notif-blacklist')
        );
      } else {
        addElement(
          `Remove From Notification Blacklist`,
          () => {
            this.settings.notificationBlacklist.splice(notifBlacklistIdx, 1);
            this.saveSettings();
            this.showToast('Removed!', { type: 'success' });
          },
          this.obfuscatedClass('remove-notif-blacklist')
        );
        addElement(
          `Move to Notification Whitelist`,
          () => {
            this.settings.notificationBlacklist.splice(notifBlacklistIdx, 1);
            this.settings.notificationWhitelist.push(id);
            this.saveSettings();
            this.showToast('Moved!', { type: 'success' });
          },
          this.obfuscatedClass('move-notif-whitelist')
        );
      }
    };

    const loggerIdentifier = this.randomString();
    const channelListTextChannelContextMenuPatch = (fmod) => {
      const mods = WebpackModules.findAll(e => (e.default === fmod || (e.default && e.default.__originalFunction === fmod)) && (e[loggerIdentifier] === undefined && (e[loggerIdentifier] = true)));
      if (!mods) return;
      const _this = this;
      function ChannelListTextChannelContextMenu(props) {
        const ret = props[MLV2_TYPE_L3](props);
        try {
          if (props.channel && props.channel.type === 4) return ret; // no lol, categories are unsupported
          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return ret;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement('Open Logs', () => _this.openWindow(), _this.obfuscatedClass('open'));
          addElement(
            `Open Log For Channel`,
            () => {
              _this.menu.filter = `channel:${props.channel.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-channel')
          );
          handleWhiteBlackList(newItems, props.channel.id);
          if (!newItems.length) return ret;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(_this.settings.contextmenuSubmenuName, newItems, _this.obfuscatedClass('mlv2'))]));
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch Channel Context Menu', err);
        }
        return ret;
      }
      function NormalMenu(props) {
        const ret = props[MLV2_TYPE_L2](props);
        try {
          if (ret.type.displayName !== 'NormalMenu') return ret;
          if (!ChannelListTextChannelContextMenu.displayName) Object.assign(ChannelListTextChannelContextMenu, ret.type);
          ret.props[MLV2_TYPE_L3] = ret.type;
          ChannelListTextChannelContextMenu.__originalFunction = ret.type;
          ret.type = ChannelListTextChannelContextMenu;
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch Normal Menu', err);
        }
        return ret;
      }
      function ChannelListTextChannelContextMenuWrapper(props) {
        const ret = props[MLV2_TYPE_L1](props);
        try {
          if (!NormalMenu.displayName) Object.assign(NormalMenu, ret.props.children.type);
          ret.props.children.props[MLV2_TYPE_L2] = ret.props.children.type;
          NormalMenu.__originalFunction = ret.props.children.type;
          ret.props.children.type = NormalMenu;
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch ChannelListTextChannelContextMenuWrapper', err);
        }
        return ret;
      }
      mods.forEach(mod => {
        this.unpatches.push(
          this.Patcher.after(
            mod,
            'default',
              (_, __, ret) => {
              const damnedmenu = ret.props.children;
              if (damnedmenu.props[MLV2_TYPE_L1]) return;
              if (!ChannelListTextChannelContextMenuWrapper.displayName) Object.assign(ChannelListTextChannelContextMenuWrapper, damnedmenu.type);
              damnedmenu.props[MLV2_TYPE_L1] = damnedmenu.type;
              ChannelListTextChannelContextMenuWrapper.__originalFunction = damnedmenu.type;
              damnedmenu.type = ChannelListTextChannelContextMenuWrapper;
            }
          )
        )
      });
      return true;
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('ChannelListTextChannelContextMenu', channelListTextChannelContextMenuPatch, true));

    const guildContextMenu = () => {
      const mod = WebpackModules.find(e => e.default && (e.__powercordOriginal_default || e.default).displayName === 'GuildContextMenuWrapper');
      if (!mod) return console.error('[MessageLoggerV2] GuildContextMenu not found');

      const _this = this;
      function GuildContextMenu(props) {
        try {
          const ret = props[MLV2_TYPE_L1](props);

          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement(
            'Open Logs',
            () => {
              _this.openWindow();
            },
            _this.obfuscatedClass('open')
          );
          addElement(
            `Open Log For Guild`,
            () => {
              _this.menu.filter = `guild:${props.guild.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-guild')
          );
          handleWhiteBlackList(newItems, props.guild.id);
          if (!newItems.length) return;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(_this.settings.contextmenuSubmenuName, newItems, _this.obfuscatedClass('mlv2'))]));
          return ret;
        } catch (err) {
          ZeresPluginLibrary.Logger.warn(_this.getName(), 'Failed to run patch GuildContextMenu', err);
          try {
            const ret = props[MLV2_TYPE_L1](props);
            return ret;
          } catch (err) {
            ZeresPluginLibrary.Logger.error(_this.getName(), 'Failed to original only GuildContextMenu', err);
            return null;
          }
        }
      }
      GuildContextMenu.displayName = 'GuildContextMenu';
      this.unpatches.push(
        this.Patcher.after(
          mod,
          'default',
          (_, __, { props: { children } }) => {
            if (children.props[MLV2_TYPE_L1]) return;
            if (!GuildContextMenu.displayName) Object.assign(GuildContextMenu, children.type);
            children.props[MLV2_TYPE_L1] = children.type;
            GuildContextMenu.__originalFunction = children.type;
            children.type = GuildContextMenu;
          }
        )
      );
      return true;
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('GuildContextMenuWrapper', guildContextMenu));

    const guildChannelUserContextMenuPatch = (fmod) => {
      const mod = WebpackModules.find(e => (e.default === fmod || (e.default && e.default.__originalFunction === fmod)));
      if (!mod) return console.error('[MessageLoggerV2] GuildChannelUserContextMenu not found');
      const _this = this;
      function GuildChannelUserContextMenu(props) {
        const ret = props[MLV2_TYPE_L2](props);
        try {
          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return ret;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement(
            'Open Logs',
            () => {
              _this.openWindow();
            },
            _this.obfuscatedClass('open')
          );
          addElement(
            `Open Log For User`,
            () => {
              _this.menu.filter = `user:${props.user.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-user')
          );
          if (!newItems.length) return ret;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(_this.settings.contextmenuSubmenuName, newItems, _this.obfuscatedClass('mlv2'))]));
        } catch (err) {
          console.error(err);
        }
        return ret;
      }
      function GuildChannelUserContextMenuWrapper(props) {
        const ret = props[MLV2_TYPE_L1](props);
        try {
          if (ret.props.children.props[MLV2_TYPE_L2]) return ret;
          if (!GuildChannelUserContextMenu.displayName) Object.assign(GuildChannelUserContextMenu, ret.props.children.type);
          ret.props.children.props[MLV2_TYPE_L2] = ret.props.children.type;
          GuildChannelUserContextMenu.__originalFunction = ret.props.children.type;
          ret.props.children.type = GuildChannelUserContextMenu;
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch GuildChannelUserContextMenuWrapper', err);
        }
        return ret;
      }
      this.unpatches.push(
        this.Patcher.after(
          mod,
          'default',
          (_, __, ret) => {
            const damnedmenu = ret.props.children;
            if (damnedmenu.props[MLV2_TYPE_L1]) return;
            if (!GuildChannelUserContextMenuWrapper.displayName) Object.assign(GuildChannelUserContextMenuWrapper, damnedmenu.type);
            damnedmenu.props[MLV2_TYPE_L1] = damnedmenu.type;
            GuildChannelUserContextMenuWrapper.__originalFunction = damnedmenu.type;
            damnedmenu.type = GuildChannelUserContextMenuWrapper;
          }
        )
      );
      return true;
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('GuildChannelUserContextMenu', guildChannelUserContextMenuPatch));

    const dmUserContextMenuPatch = (fmod) => {
      const mod = WebpackModules.find(e => (e.default === fmod || (e.default && e.default.__originalFunction === fmod)));
      if (!mod) return console.error('[MessageLoggerV2] DMUserContextMenu not found');
      const _this = this;
      function DMUserContextMenu(props) {
        const ret = props[MLV2_TYPE_L2](props);
        try {
          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return ret;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement(
            'Open Logs',
            () => {
              _this.openWindow();
            },
            _this.obfuscatedClass('open')
          );
          addElement(
            `Open Log For User`,
            () => {
              _this.menu.filter = `user:${props.user.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-user')
          );
          addElement(
            `Open Log For DM`,
            () => {
              _this.menu.filter = `channel:${props.channel.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-dm')
          );
          handleWhiteBlackList(newItems, props.channel.id);
          if (!newItems.length) return;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(_this.settings.contextmenuSubmenuName, newItems, _this.obfuscatedClass('mlv2'))]));
        } catch (err) {
          console.error('[MessageLoggerV2] Error in DMUserContextMenu patch', err);
        }
        return ret;
      }
      function DMUserContextMenuWrapper(props) {
        const ret = props[MLV2_TYPE_L1](props);
        try {
          if (!DMUserContextMenu.displayName) Object.assign(DMUserContextMenu, ret.props.children.type);
          ret.props.children.props[MLV2_TYPE_L2] = ret.props.children.type;
          DMUserContextMenu.__originalFunction = ret.props.children.type;
          ret.props.children.type = DMUserContextMenu;
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch DMUserContextMenuWrapper', err);
        }
        return ret;
      }
      this.unpatches.push(
        this.Patcher.after(
          mod,
          'default',
          (_, __, ret) => {
            const damnedmenu = ret.props.children;
            if (damnedmenu.props[MLV2_TYPE_L1]) return;
            if (!DMUserContextMenuWrapper.displayName) Object.assign(DMUserContextMenuWrapper, damnedmenu.type);
            damnedmenu.props[MLV2_TYPE_L1] = damnedmenu.type;
            DMUserContextMenuWrapper.__originalFunction = damnedmenu.type;
            damnedmenu.type = DMUserContextMenuWrapper;
          }
        )
      );
      return true;
    }
    this.unpatches.push(XenoLib.listenLazyContextMenu('DMUserContextMenu', dmUserContextMenuPatch));

    const groupDMUserContextMenuPatch = (fmod) => {
      const mod = WebpackModules.find(e => (e.default === fmod || (e.default && e.default.__originalFunction === fmod)));
      if (!mod) return console.error('[MessageLoggerV2] GroupDMUserContextMenu not found');
      const _this = this;
      function GroupDMUserContextMenu(props) {
        const ret = props[MLV2_TYPE_L2](props);
        try {
          const newItems = [];
          const menu = ZeresPluginLibrary.Utilities.getNestedProp(
            ZeresPluginLibrary.Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return ret;
          const addElement = (label, callback, id, options = {}) => newItems.push(XenoLib.createContextMenuItem(label, callback, id, options));
          addElement('Open Logs', () => _this.openWindow(), _this.obfuscatedClass('open'));
          addElement(
            `Open Log For Channel`,
            () => {
              _this.menu.filter = `channel:${props.channel.id}`;
              _this.openWindow();
            },
            _this.obfuscatedClass('open-channel')
          );
          handleWhiteBlackList(newItems, props.channel.id);
          if (!newItems.length) return ret;
          menu.push(XenoLib.createContextMenuGroup([XenoLib.createContextMenuSubMenu(_this.settings.contextmenuSubmenuName, newItems, _this.obfuscatedClass('mlv2'))]));
        } catch (err) {
          console.error('[MessageLoggerV2] Error in GroupDMUserContextMenu patch', err);
        }
        return ret;
      }
      function GroupDMUserContextMenuWrapper(props) {
        const ret = props[MLV2_TYPE_L1](props);
        try {
          if (!GroupDMUserContextMenu.displayName) Object.assign(GroupDMUserContextMenu, ret.props.children.type);
          ret.props.children.props[MLV2_TYPE_L2] = ret.props.children.type;
          GroupDMUserContextMenu.__originalFunction = ret.props.children.type;
          ret.props.children.type = GroupDMUserContextMenu;
        } catch (err) {
          console.error('[MessageLoggerV2] Failed to patch GroupDMUserContextMenuWrapper', err);
        }
        return ret;
      }
      this.unpatches.push(
        this.Patcher.after(
          mod,
          'default',
          (_, __, ret) => {
            const damnedmenu = ret.props.children;
            if (damnedmenu.props[MLV2_TYPE_L1]) return;
            if (!GroupDMUserContextMenuWrapper.displayName) Object.assign(GroupDMUserContextMenuWrapper, damnedmenu.type);
            damnedmenu.props[MLV2_TYPE_L1] = damnedmenu.type;
            GroupDMUserContextMenuWrapper.__originalFunction = damnedmenu.type;
            damnedmenu.type = GroupDMUserContextMenuWrapper;
          }
        )
      );
      return true;
    };
    this.unpatches.push(XenoLib.listenLazyContextMenu('GroupDMUserContextMenu', groupDMUserContextMenuPatch));

  }
  /* ==================================================-|| END CONTEXT MENU ||-================================================== */
};
/*@end @*/
