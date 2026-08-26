const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  name: 'sub',
  description: 'Quản lý & điều khiển toàn bộ danh sách Sub-Bot từ Tài khoản Owner',
  async execute(message, args, client) {
    const subCommand = args[0] ? args[0].toLowerCase() : 'list';
    const allClients = client.allClients || [client];

    // 1. LIST ALL CONNECTED BOTS: $sub list (hoặc $bots)
    if (subCommand === 'list' || subCommand === 'ls' || subCommand === 'status') {
      let replyText = `🤖 **DANH SÁCH BOTS TRONG HỆ THỐNG MULTI-SELFBOT (${allClients.length}):**\n\n`;

      allClients.forEach((bot, idx) => {
        const isOwner = idx === 0 ? '👑 [OWNER]' : '🤖 [SUB-BOT]';
        const isCurrent = bot.user.id === client.user.id ? ' 👈 (Acc này)' : '';
        const voiceState = bot.guilds.cache.some(g => getVoiceConnection(g.id)) ? '🔊 [Đang trong Voice]' : '🔇 [Ngoại tuyến Voice]';

        replyText += `**[${idx + 1}]** ${isOwner} **${bot.user.tag}**${isCurrent}\n`;
        replyText += `   • ID: \`${bot.user.id}\` | Trạng thái: ${voiceState}\n\n`;
      });

      replyText += `👉 Điều khiển Voice: \`$sub voice <STT|all> <#kênh>\` | Thoát Voice: \`$sub leave <STT|all>\``;
      return message.sendAutoDelete(replyText);
    }

    // 2. CONTROL VOICE JOIN: $sub voice <STT|all> <#kênh_hoặc_ID>
    if (subCommand === 'voice' || subCommand === 'join') {
      const targetBotIndex = args[1] ? args[1].toLowerCase() : 'all';
      const channelArg = args[2] || args[1];

      if (!channelArg) {
        return message.sendAutoDelete('❌ **Cú pháp:** `$sub voice <STT|all> <#kênh_hoặc_ID>`\nVí dụ:\n- `$sub voice all <#kênh>` (Tất cả bot cùng vào voice)\n- `$sub voice 2 <#kênh>` (Chỉ bot số 2 vào voice)');
      }

      // Resolve channel ID
      const channelId = channelArg.replace(/[<#@!&>]/g, '');

      let targetBots = [];
      if (targetBotIndex === 'all') {
        targetBots = allClients;
      } else {
        const idx = parseInt(targetBotIndex, 10);
        if (isNaN(idx) || idx < 1 || idx > allClients.length) {
          // If 1st arg was channel instead of bot index (e.g. $sub voice <#channel>) -> target all
          const directChannel = message.guild?.channels?.cache?.get(targetBotIndex.replace(/[<#@!&>]/g, ''));
          if (directChannel) {
            targetBots = allClients;
          } else {
            return message.sendAutoDelete(`❌ Vui lòng chọn STT Bot hợp lệ từ 1 đến ${allClients.length} hoặc \`all\`!`);
          }
        } else {
          targetBots = [allClients[idx - 1]];
        }
      }

      let successCount = 0;
      for (const bot of targetBots) {
        try {
          const targetChannel = bot.channels.cache.get(channelId);
          if (targetChannel && targetChannel.isVoice()) {
            joinVoiceChannel({
              channelId: targetChannel.id,
              guildId: targetChannel.guild.id,
              adapterCreator: targetChannel.guild.voiceAdapterCreator,
              selfDeaf: true,
              selfMute: false
            });
            successCount++;
          }
        } catch (e) {
          console.error(`[Sub Voice Error - ${bot.user.tag}]`, e.message);
        }
      }

      return message.sendAutoDelete(`✅ **Đã điều khiển ${successCount}/${targetBots.length} Bot vào kênh Voice thành công!**`);
    }

    // 3. CONTROL VOICE LEAVE: $sub leave <STT|all>
    if (subCommand === 'leave' || subCommand === 'dc' || subCommand === 'disconnect') {
      const targetBotIndex = args[1] ? args[1].toLowerCase() : 'all';

      let targetBots = [];
      if (targetBotIndex === 'all') {
        targetBots = allClients;
      } else {
        const idx = parseInt(targetBotIndex, 10);
        if (isNaN(idx) || idx < 1 || idx > allClients.length) {
          return message.sendAutoDelete(`❌ Vui lòng chọn STT Bot hợp lệ từ 1 đến ${allClients.length} hoặc \`all\`!`);
        }
        targetBots = [allClients[idx - 1]];
      }

      let dcCount = 0;
      for (const bot of targetBots) {
        bot.guilds.cache.forEach(guild => {
          const connection = getVoiceConnection(guild.id);
          if (connection) {
            connection.destroy();
            dcCount++;
          }
        });
      }

      return message.sendAutoDelete(`🚪 **Đã điều khiển ${dcCount} kết nối Voice của các Bot ngắt kết nối!**`);
    }

    // Default help
    return message.sendAutoDelete(
      '💡 **CÚ PHÁP ĐIỀU KHIỂN MULTI-BOT ($sub):**\n\n' +
      '• `$sub list` : Xem danh sách & trạng thái tất cả các Bot\n' +
      '• `$sub voice <STT|all> <#kênh>` : Bắt 1 Bot hoặc Tất cả Bot vào Voice\n' +
      '• `$sub leave <STT|all>` : Bắt 1 Bot hoặc Tất cả Bot thoát Voice'
    );
  }
};
