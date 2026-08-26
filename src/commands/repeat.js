const { saveRepeatTasks, parseInterval, formatTimeRemaining } = require('../handlers/repeatHandler');

module.exports = {
  name: 'repeat',
  description: 'Tự động lặp lại tin nhắn theo từng tài khoản (Không bị reset khi khởi động lại bot)',
  async execute(message, args, client) {
    const subCommand = args[0] ? args[0].toLowerCase() : 'list';

    // Ensure repeatTasks array exists
    if (!client.config.repeatTasks) {
      client.config.repeatTasks = [];
    }

    const tasks = client.config.repeatTasks;

    // 1. ADD NEW REPEAT TASK: $repeat add <thời_gian> [#kênh] <nội dung>
    if (subCommand === 'add' || subCommand === 'set' || subCommand === 'create') {
      const timeArg = args[1];
      if (!timeArg) {
        return message.sendAutoDelete(
          '❌ **Cú pháp chưa đúng!**\n👉 **Cú pháp:** `$repeat add <thời_gian> [#kênh_tùy_chọn] <nội_dung>`\nVí dụ:\n- `$repeat add 24h <#kênh> odaily`\n- `$repeat add 5m opray` (Đăng ký riêng cho tài khoản hiện tại)\n- `$repeat add 30m o daily`'
        );
      }

      const intervalMs = parseInterval(timeArg);
      if (!intervalMs || intervalMs < 5000) {
        return message.sendAutoDelete('❌ Thời gian không hợp lệ! Vui lòng nhập thời gian lớn hơn 5 giây (Ví dụ: `24h`, `12h`, `5m`, `60s`).');
      }

      let targetChannel = message.channel;
      let contentArgsIndex = 2;

      // Check if second argument is a channel mention or ID
      if (args[2]) {
        const potentialChannelId = args[2].replace(/[<#@!&>]/g, '');
        const foundChannel = message.guild?.channels?.cache?.get(potentialChannelId) || client.channels.cache.get(potentialChannelId);
        if (foundChannel) {
          targetChannel = foundChannel;
          contentArgsIndex = 3;
        }
      }

      const content = args.slice(contentArgsIndex).join(' ');
      if (!content) {
        return message.sendAutoDelete('❌ Vui lòng nhập nội dung tin nhắn cần lặp lại!\n👉 Ví dụ: `$repeat add 5m opray`');
      }

      const newTask = {
        id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        accountId: client.user.id,
        accountTag: client.user.tag,
        intervalMs: intervalMs,
        intervalText: timeArg.toLowerCase().endsWith('h') || timeArg.toLowerCase().endsWith('m') || timeArg.toLowerCase().endsWith('s') || timeArg.toLowerCase().endsWith('d') ? timeArg : `${timeArg}h`,
        channelId: targetChannel.id,
        content: content,
        lastSent: Date.now(), // First interval starts now
        enabled: true
      };

      tasks.push(newTask);
      saveRepeatTasks(client);

      const remainingStr = formatTimeRemaining(intervalMs);
      return message.sendAutoDelete(
        `✅ **Đã tạo nhiệm vụ lặp lại mới cho [${client.user.username}]!**\n` +
        `👤 **Tài khoản chạy:** \`${client.user.tag}\`\n` +
        `📌 **Nội dung:** \`${content}\`\n` +
        `⏱️ **Chu kỳ:** \`${newTask.intervalText}\` (Lần gửi tiếp theo sau: ${remainingStr})\n` +
        `📢 **Kênh gửi:** <#${targetChannel.id}>\n` +
        `💾 *Nhiệm vụ này chỉ gán riêng cho tài khoản này và KHÔNG BỊ RESET khi khởi động lại!*`
      );
    }

    // 2. LIST ALL REPEAT TASKS: $repeat list
    if (subCommand === 'list' || subCommand === 'ls') {
      if (tasks.length === 0) {
        return message.sendAutoDelete('📋 Hiện tại chưa có nhiệm vụ lặp lại nào.\n👉 Gõ `$repeat add 5m opray` để tạo mới!');
      }

      let replyText = `📋 **DANH SÁCH NHIỆM VỤ LẶP LẠI MULTI-ACCOUNT (${tasks.length}):**\n\n`;

      tasks.forEach((task, idx) => {
        const now = Date.now();
        const elapsed = now - (task.lastSent || 0);
        const remainingMs = Math.max(0, task.intervalMs - elapsed);
        const remainingStr = formatTimeRemaining(remainingMs);
        const statusSymbol = task.enabled !== false ? '🟢 [BẬT]' : '🔴 [TẮT]';
        const accDisplay = task.accountTag || (task.accountId === client.user.id ? client.user.tag : 'Chung / Account #1');

        replyText += `**[${idx + 1}]** ${statusSymbol} Nội dung: \`${task.content}\`\n`;
        replyText += `   • Tài khoản: **${accDisplay}**\n`;
        replyText += `   • Kênh: <#${task.channelId}>\n`;
        replyText += `   • Chu kỳ: \`${task.intervalText}\` | Lần gửi tiếp theo: **${remainingStr}**\n\n`;
      });

      replyText += `👉 Bật/Tắt nhiệm vụ: \`$repeat toggle <STT>\` | Xóa nhiệm vụ: \`$repeat delete <STT>\``;
      return message.sendAutoDelete(replyText);
    }

    // 3. TOGGLE ON/OFF TASK: $repeat toggle <STT>
    if (subCommand === 'toggle' || subCommand === 'on' || subCommand === 'off') {
      const indexArg = parseInt(args[1], 10);
      if (isNaN(indexArg) || indexArg < 1 || indexArg > tasks.length) {
        return message.sendAutoDelete(`❌ Vui lòng nhập số thứ tự hợp lệ từ 1 đến ${tasks.length}!\n👉 Gõ \`$repeat list\` để xem danh sách.`);
      }

      const task = tasks[indexArg - 1];
      task.enabled = !task.enabled;
      saveRepeatTasks(client);

      const statusText = task.enabled ? '🟢 **Đã BẬT**' : '🔴 **Đã TẮT**';
      return message.sendAutoDelete(`${statusText} nhiệm vụ số **[${indexArg}]** (\`${task.content}\`) của tài khoản **${task.accountTag || 'Account'}**.`);
    }

    // 4. DELETE SPECIFIC TASK: $repeat delete <STT>
    if (subCommand === 'delete' || subCommand === 'del' || subCommand === 'remove') {
      const indexArg = parseInt(args[1], 10);
      if (isNaN(indexArg) || indexArg < 1 || indexArg > tasks.length) {
        return message.sendAutoDelete(`❌ Vui lòng nhập số thứ tự hợp lệ từ 1 đến ${tasks.length}!\n👉 Gõ \`$repeat list\` để xem danh sách.`);
      }

      const deletedTask = tasks.splice(indexArg - 1, 1)[0];
      saveRepeatTasks(client);

      return message.sendAutoDelete(`✅ **Đã xóa nhiệm vụ số [${indexArg}]:** \`${deletedTask.content}\``);
    }

    // 5. CLEAR ALL TASKS: $repeat clear
    if (subCommand === 'clear') {
      const count = tasks.length;
      client.config.repeatTasks = [];
      saveRepeatTasks(client);
      return message.sendAutoDelete(`🧹 **Đã xóa sạch tất cả ${count} nhiệm vụ lặp lại!**`);
    }

    // Default help message
    return message.sendAutoDelete(
      '💡 **HƯỚNG DẪN LỆNH $repeat (PHÂN LOẠI THEO TÀI KHOẢN):**\n\n' +
      '• `$repeat add <thời_gian> [#kênh] <nội_dung>` : Tạo tin nhắn lặp cho tài khoản hiện tại (VD: `$repeat add 5m opray`)\n' +
      '• `$repeat list` : Xem danh sách & đếm ngược lần gửi tiếp theo\n' +
      '• `$repeat toggle <STT>` : Nút Tắt / Bật nhiệm vụ theo số thứ tự\n' +
      '• `$repeat delete <STT>` : Xóa nhiệm vụ theo số thứ tự\n' +
      '• `$repeat clear` : Xóa tất cả nhiệm vụ\n\n' +
      '*Mỗi tài khoản sẽ chỉ chạy đúng các lệnh của mình, có nút BẬT/TẮT và KHÔNG BỊ RESET khi khởi động lại!*'
    );
  }
};
