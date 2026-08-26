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
 * Initializes repeat scheduler polling loop
 */
function initRepeatHandler(client) {
  if (!client.config.repeatTasks) {
    client.config.repeatTasks = [];
  }

  console.log(`⏱️ [Repeat Handler] Đã khởi chạy với ${client.config.repeatTasks.length} nhiệm vụ lặp lại.`);

  // Check every 10 seconds
  setInterval(async () => {
    const tasks = client.config.repeatTasks || [];
    const now = Date.now();
    let updated = false;

    for (const task of tasks) {
      if (!task.enabled) continue;

      const elapsed = now - (task.lastSent || 0);

      // Check if interval has elapsed
      if (elapsed >= task.intervalMs) {
        try {
          const channel = client.channels.cache.get(task.channelId);
          if (channel) {
            await channel.send(task.content);
            console.log(`🟢 [Repeat Task Triggered] Đã gửi: "${task.content}" tới kênh #${channel.name || task.channelId}`);
          } else {
            console.warn(`⚠️ [Repeat Task Warning] Không tìm thấy kênh ID: ${task.channelId}`);
          }
        } catch (err) {
          console.error(`❌ [Repeat Task Error] Gửi tin nhắn thất bại:`, err.message);
        }

        // Update lastSent timestamp to preserve exact continuity
        task.lastSent = now;
        updated = true;
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
