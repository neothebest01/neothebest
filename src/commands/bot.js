module.exports = {
  name: 'bot',
  description: 'Chuyển đổi mục tiêu điều khiển từ Owner sang Sub-Bot bất kỳ',
  async execute(message, args, client) {
    const allClients = client.allClients || [client];
    const targetArg = args[0] ? args[0].toLowerCase() : 'list';

    // 1. View current active target & all bots list
    if (targetArg === 'list' || targetArg === 'status') {
      const currentTargetIdx = client.activeTargetIndex || 0;
      let replyText = `🤖 **DANH SÁCH BOTS HỆ THỐNG MULTI-SELFBOT (${allClients.length}):**\n\n`;

      allClients.forEach((bot, idx) => {
        const isOwner = idx === 0 ? '👑 [OWNER]' : '🤖 [SUB-BOT]';
        const isTarget = idx === currentTargetIdx ? ' 🎯 *(Đang chọn)*' : '';
        replyText += `**[${idx + 1}]** ${isOwner} **${bot.user.tag}**${isTarget}\n`;
      });

      replyText += `\n👉 **Cú pháp chuyển quyền:**\n`;
      replyText += `• \`$bot 2\` : Chuyển điều khiển sang Bot số 2\n`;
      replyText += `• \`$bot owner\` (hoặc \`$bot 1\`) : Trả về quyền Owner`;

      return message.sendAutoDelete(replyText);
    }

    // 2. Switch back to Owner
    if (targetArg === 'owner' || targetArg === 'main' || targetArg === 'reset') {
      client.activeTargetIndex = 0;
      const ownerBot = allClients[0] || client;
      return message.sendAutoDelete(`👑 **[OWNER MODE]** Đã chuyển quyền điều khiển về lại **Owner** (\`${ownerBot.user.tag}\`)!`);
    }

    // 3. Switch to specific Bot Index (1-based index)
    const idx = parseInt(targetArg, 10);
    if (isNaN(idx) || idx < 1 || idx > allClients.length) {
      return message.sendAutoDelete(`❌ Vui lòng nhập số thứ tự Bot hợp lệ từ 1 đến ${allClients.length} hoặc \`$bot owner\`!`);
    }

    const targetIndex = idx - 1;
    client.activeTargetIndex = targetIndex;
    const targetBot = allClients[targetIndex];

    const modeName = targetIndex === 0 ? '👑 [OWNER MODE]' : `🎯 [TARGET BOT #${idx} MODE]`;
    return message.sendAutoDelete(
      `${modeName} **Đã chuyển quyền điều khiển sang Bot #${idx} (\`${targetBot.user.tag}\`)!**\n` +
      `💡 *Mọi lệnh tiếp theo ($voice, $repeat...) bạn gõ sẽ do Bot #${idx} thực hiện.*`
    );
  }
};
