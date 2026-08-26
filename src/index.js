require('dotenv').config();

const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const { setRichPresence } = require('./handlers/presenceHandler');
const { loadCommands } = require('./handlers/commandHandler');

// Load config
const configPath = path.join(__dirname, '../config.json');
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  config = {};
}

// Override config with environment variables if available
config.token = process.env.DISCORD_TOKEN || config.token;
config.prefix = process.env.PREFIX || config.prefix || '$';
if (config.rpc) {
  config.rpc.applicationId = process.env.APPLICATION_ID || config.rpc.applicationId || '1541749570071957565';
}

// Lightweight HTTP server for Render Free Web Service health checks
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Neo Selfbot is Running!')).listen(port, () => {
  console.log(`🌐 HTTP Health Check Server running on port ${port}`);
});

const client = new Client({
  checkUpdate: false
});

client.config = config;

// When client is ready
client.on('ready', async () => {
  console.log(`\n==========================================`);
  console.log(`🤖 Neo Selfbot đã đăng nhập thành công!`);
  console.log(`👤 User: ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`⚙️ Prefix: ${client.config.prefix}`);
  console.log(`==========================================\n`);

  // Load commands & Set presence
  loadCommands(client);
  setRichPresence(client, client.config);
});

client.on('error', (err) => {
  console.error('[Discord Error Event]', err);
});

client.on('warn', (warning) => {
  console.warn('[Discord Warning Event]', warning);
});
async function sendHumanizedReply(message, replyText) {
  const typingConfig = client.config.typingEffect || { enabled: true, minDelayMs: 1500, maxDelayMs: 3500 };

  if (typingConfig.enabled) {
    // Trigger typing indicator on channel
    await message.channel.sendTyping().catch(() => {});

    // Calculate random human-like delay
    const minMs = typingConfig.minDelayMs || 1500;
    const maxMs = typingConfig.maxDelayMs || 3500;
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  return message.reply(replyText).catch(() => {});
}

// Command & Event listener
client.on('messageCreate', async (message) => {
  const prefix = client.config.prefix || '$';

  // 1. Process commands sent by selfbot user
  if (message.author.id === client.user.id && message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
      try {
        // Helper to send reply and auto-delete both command trigger & response after 10 seconds
        message.sendAutoDelete = async (content, delay = 10000) => {
          const sentMsg = await message.channel.send(content).catch(() => {});
          setTimeout(() => {
            if (sentMsg && sentMsg.deletable) sentMsg.delete().catch(() => {});
            if (message && message.deletable) message.delete().catch(() => {});
          }, delay);
          return sentMsg;
        };

        await command.execute(message, args, client);
      } catch (err) {
        console.error(`[Error Command $${commandName}]`, err);
      }
    }
    return;
  }

  // 2. AFK Auto Responder for incoming DMs or Mentions
  if (message.author.id !== client.user.id) {
    const isDM = message.channel.type === 'DM';
    const isMentioned = message.mentions && message.mentions.has(client.user);

    if (client.config.afk && client.config.afk.enabled && (isDM || isMentioned)) {
      sendHumanizedReply(message, `[Auto-AFK] ${client.config.afk.reason}`);
      return;
    }

    // 3. Keyword Auto Responder
    if (client.config.autoResponder && client.config.autoResponder.enabled) {
      const contentLower = message.content.toLowerCase();
      const triggers = client.config.autoResponder.triggers || {};

      for (const [trigger, response] of Object.entries(triggers)) {
        if (contentLower === trigger.toLowerCase()) {
          sendHumanizedReply(message, response);
          break;
        }
      }
    }
  }
});

// 4. Voice State Listener: Auto turn off AFK when owner rejoins Voice
const { getVoiceConnection } = require('@discordjs/voice');

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.id === client.user.id) {
    const isAFK = client.config.afk && client.config.afk.enabled;
    const joinedVoice = newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId);

    if (isAFK && joinedVoice) {
      console.log(`\n🟢 [Voice AFK] Bạn đã tham gia lại Voice Channel! Tự động TẮT chế độ AFK.`);
      client.config.afk.enabled = false;

      // Disconnect selfbot voice connection if active
      if (newState.guild) {
        const connection = getVoiceConnection(newState.guild.id);
        if (connection) {
          connection.destroy();
        }
      }
    }
  }
});

// Error handling
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

if (!config.token || config.token === 'YOUR_DISCORD_TOKEN_HERE') {
  console.error('❌ [LỖI] Chưa tìm thấy DISCORD_TOKEN trong Environment Variables trên Render!');
} else {
  const cleanToken = String(config.token).trim().replace(/^["']|["']$/g, '');
  console.log(`🔑 Đang đăng nhập vào Discord... (Độ dài Token: ${cleanToken.length} ký tự)`);
  
  client.login(cleanToken).then(() => {
    console.log('✅ Đã xác thực thành công với Discord!');
  }).catch(err => {
    console.error('❌ [LỖI ĐĂNG NHẬP DISCORD]:', err.message);
  });
}
