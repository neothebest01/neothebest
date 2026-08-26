require('dotenv').config();

const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const { setRichPresence } = require('./handlers/presenceHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { initRepeatHandler } = require('./handlers/repeatHandler');
const { getVoiceConnection } = require('@discordjs/voice');

// Load config
const configPath = path.join(__dirname, '../config.json');
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  config = {};
}

// Collect all tokens from environment variables & config.json
const rawTokens = [];

// 1. From DISCORD_TOKENS (comma separated)
if (process.env.DISCORD_TOKENS) {
  process.env.DISCORD_TOKENS.split(',').forEach(t => rawTokens.push(t.trim()));
}

// 2. From DISCORD_TOKEN
if (process.env.DISCORD_TOKEN) {
  rawTokens.push(process.env.DISCORD_TOKEN.trim());
}

// 3. From DISCORD_TOKEN_1, DISCORD_TOKEN_2, etc.
Object.keys(process.env).forEach(key => {
  if (key.startsWith('DISCORD_TOKEN_')) {
    rawTokens.push(process.env[key].trim());
  }
});

// 4. From config.json tokens array
if (config.tokens && Array.isArray(config.tokens)) {
  config.tokens.forEach(t => rawTokens.push(t));
}

// Clean and deduplicate tokens
const tokens = [...new Set(
  rawTokens
    .map(t => String(t).trim().replace(/^["']|["']$/g, ''))
    .filter(t => t && t !== 'YOUR_DISCORD_TOKEN_HERE')
)];

if (tokens.length === 0) {
  console.error('❌ [LỖI] Chưa tìm thấy DISCORD_TOKEN trong file .env!');
  console.error('👉 Vui lòng thêm DISCORD_TOKENS=token1,token2 vào file .env');
  process.exit(1);
}

console.log(`\n==========================================`);
console.log(`🚀 Neo Multi-Selfbot System - Khởi chạy ${tokens.length} tài khoản`);
console.log(`==========================================\n`);

const clients = [];

// Helper function for humanized typing reply
async function sendHumanizedReply(client, message, replyText) {
  const typingConfig = client.config.typingEffect || { enabled: true, minDelayMs: 1500, maxDelayMs: 3500 };

  if (typingConfig.enabled) {
    await message.channel.sendTyping().catch(() => {});
    const minMs = typingConfig.minDelayMs || 1500;
    const maxMs = typingConfig.maxDelayMs || 3500;
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  return message.reply(replyText).catch(() => {});
}

// Start individual account client
async function startAccount(token, index) {
  const client = new Client({
    checkUpdate: false
  });

  client.config = config;

  client.on('ready', async () => {
    console.log(`==========================================`);
    console.log(`🤖 Neo Selfbot [Tài khoản #${index + 1}] đã đăng nhập!`);
    console.log(`👤 User: ${client.user.tag} (ID: ${client.user.id})`);
    console.log(`⚙️ Prefix: ${client.config.prefix || '$'}`);
    console.log(`==========================================\n`);

    loadCommands(client);

    // Only set Rich Presence and Repeat Scheduler for Primary Account (Owner - Account #1)
    if (index === 0) {
      setRichPresence(client, client.config);
      initRepeatHandler(client);
    }
  });

  client.on('error', (err) => {
    console.error(`[Tài khoản #${index + 1} Error]`, err.message);
  });

  // Message event listener
  client.on('messageCreate', async (message) => {
    const prefix = client.config.prefix || '$';

    // 1. Process commands sent by this selfbot user
    if (message.author.id === client.user.id && message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);
      if (command) {
        try {
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

    // 2. AFK Auto Responder
    if (message.author.id !== client.user.id) {
      const isDM = message.channel.type === 'DM';
      const isMentioned = message.mentions && message.mentions.has(client.user);

      if (client.config.afk && client.config.afk.enabled && (isDM || isMentioned)) {
        sendHumanizedReply(client, message, `[Auto-AFK] ${client.config.afk.reason}`);
        return;
      }

      // 3. Keyword Auto Responder
      if (client.config.autoResponder && client.config.autoResponder.enabled) {
        const contentLower = message.content.toLowerCase();
        const triggers = client.config.autoResponder.triggers || {};

        for (const [trigger, response] of Object.entries(triggers)) {
          if (contentLower === trigger.toLowerCase()) {
            sendHumanizedReply(client, message, response);
            break;
          }
        }
      }
    }
  });

  // Voice State Listener (Auto turn off AFK when owner rejoins Voice)
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.id === client.user.id) {
      const isAFK = client.config.afk && client.config.afk.enabled;
      const joinedVoice = newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId);

      if (isAFK && joinedVoice) {
        console.log(`\n🟢 [Voice AFK - Acc #${index + 1}] Bạn đã tham gia lại Voice Channel! Tự động TẮT chế độ AFK.`);
        client.config.afk.enabled = false;

        if (newState.guild) {
          const connection = getVoiceConnection(newState.guild.id);
          if (connection) {
            connection.destroy();
          }
        }
      }
    }
  });

  try {
    await client.login(token);
    clients.push(client);
  } catch (err) {
    console.error(`❌ [Lỗi đăng nhập Tài khoản #${index + 1}]:`, err.message);
  }
}

// Global unhandled rejection handling
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

// Launch all account clients
(async () => {
  for (let i = 0; i < tokens.length; i++) {
    await startAccount(tokens[i], i);
  }
})();
