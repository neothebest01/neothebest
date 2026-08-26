const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config.json');

/**
 * Saves current repeat tasks to config.json safely
 */
function saveRepeatTasks(client) {
  try {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    rawConfig.repeatTasks = client.config.repeatTasks || [];
    fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 4));
  } catch (err) {
    console.error('[RepeatHandler Error] Không thể lưu file config.json:', err.message);
  }
}

/**
 * Helper to parse time string like "24h", "30m", "1d", "60s" or raw number "24" (default hours)
 */
function parseInterval(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)([smhd]?)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'h').toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 60 * 60 * 1000;
  }
}

/**
 * Format milliseconds into human readable string (e.g. 23 giờ 45 phút)
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Đang xử lý...';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (parts.length === 0 || (parts.length === 1 && seconds > 0)) parts.push(`${seconds} giây`);

  return parts.join(' ');
}

/**
 * Initializes repeat scheduler polling loop for a specific client account
 */
function initRepeatHandler(client, accountIndex = 0) {
  if (!client.config.repeatTasks) {
    client.config.repeatTasks = [];
  }

  // Count tasks assigned to this account
  const myTasks = client.config.repeatTasks.filter(t => 
    (t.accountId && t.accountId === client.user.id) || (!t.accountId && accountIndex === 0)
  );

  console.log(`⏱️ [Repeat Handler - ${client.user.username}] Khởi chạy với ${myTasks.length} nhiệm vụ lặp riêng.`);

  // Check every 10 seconds
  setInterval(async () => {
    const tasks = client.config.repeatTasks || [];
    const now = Date.now();
    let updated = false;

    for (const task of tasks) {
      if (task.enabled === false) continue;

      // Ensure task belongs to this client account
      const isMyTask = (task.accountId && task.accountId === client.user.id) || (!task.accountId && accountIndex === 0);
      if (!isMyTask) continue;

      const elapsed = now - (task.lastSent || 0);

      // Check if interval has elapsed
      if (elapsed >= task.intervalMs) {
        task.lastSent = now;
        updated = true;
        saveRepeatTasks(client);

        try {
          const channel = client.channels.cache.get(task.channelId);
          if (channel) {
            await channel.send(task.content);
            console.log(`🟢 [Repeat Task Triggered - ${client.user.username}] Gửi: "${task.content}" tới #${channel.name || task.channelId}`);
          } else {
            console.warn(`⚠️ [Repeat Task Warning - ${client.user.username}] Không tìm thấy kênh ID: ${task.channelId}`);
          }
        } catch (err) {
          console.error(`❌ [Repeat Task Error - ${client.user.username}] Gửi thất bại:`, err.message);
        }
      }
    }

    if (updated) {
      saveRepeatTasks(client);
    }
  }, 10000);
}

module.exports = {
  initRepeatHandler,
  saveRepeatTasks,
  parseInterval,
  formatTimeRemaining
};
