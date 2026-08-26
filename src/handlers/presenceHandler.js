const { CustomStatus, RichPresence } = require("discord.js-selfbot-v13");

/**
 * Sets up custom Rich Presence based on config
 * @param {import('discord.js-selfbot-v13').Client} client
 * @param {Object} config
 */
function setRichPresence(client, config) {
  if (!config.rpc || !config.rpc.enabled) return;

  try {
    const activities = [];

    // 1. Rich Presence activity
    const r = new RichPresence(client)
      .setApplicationId(config.rpc.applicationId || "1013444874229415997"); // Default Rich Presence App ID

    if (config.rpc.name) r.setName(config.rpc.name);
    if (config.rpc.details) r.setDetails(config.rpc.details);
    if (config.rpc.state) r.setState(config.rpc.state);

    if (config.rpc.type === "STREAMING" && config.rpc.url) {
      let streamUrl = config.rpc.url;
      if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
        streamUrl = `https://${streamUrl}`;
      }
      if (streamUrl.includes('twitch.tv') && !streamUrl.includes('www.twitch.tv')) {
        streamUrl = streamUrl.replace('twitch.tv', 'www.twitch.tv');
      }
      r.setType("STREAMING");
      r.setURL(streamUrl);
    } else if (config.rpc.type) {
      r.setType(config.rpc.type);
    }

    if (config.rpc.assets) {
      if (config.rpc.assets.largeImage && config.rpc.assets.largeImage.trim()) {
        try { r.setAssetsLargeImage(config.rpc.assets.largeImage); } catch (e) { console.log('[RPC Asset Warning]', e.message); }
      }
      if (config.rpc.assets.largeText && config.rpc.assets.largeText.trim()) {
        try { r.setAssetsLargeText(config.rpc.assets.largeText); } catch (e) { console.log('[RPC Asset Warning]', e.message); }
      }
      if (config.rpc.assets.smallImage && config.rpc.assets.smallImage.trim()) {
        try { r.setAssetsSmallImage(config.rpc.assets.smallImage); } catch (e) { console.log('[RPC Asset Warning]', e.message); }
        if (config.rpc.assets.smallText && config.rpc.assets.smallText.trim()) {
          try { r.setAssetsSmallText(config.rpc.assets.smallText); } catch (e) { console.log('[RPC Asset Warning]', e.message); }
        }
      }
    }

    // Set continuous elapsed timestamp (persisted across restarts)
    if (config.rpc.showTimestamp !== false) {
      if (!config.rpc.startTime) {
        config.rpc.startTime = Date.now();
        try {
          const fs = require('fs');
          const path = require('path');
          const configPath = path.join(__dirname, '../../config.json');
          const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          currentConfig.rpc.startTime = config.rpc.startTime;
          fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));
        } catch (e) {}
      }
      r.setStartTimestamp(config.rpc.startTime);
    }
    activities.push(r);

    // 2. Custom Status
    if (config.rpc.name) {
      const cs = new CustomStatus(client).setState(config.rpc.name);
      activities.push(cs);
    }

    client.user.setPresence({ activities });
    console.log("[RPC] Custom Rich Presence updated successfully!");
  } catch (error) {
    console.error("[RPC Error]", error);
  }
}

module.exports = { setRichPresence };
