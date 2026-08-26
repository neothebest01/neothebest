const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module = module.exports = {
  name: 'voice',
  description: 'Tham gia hoặc rời khỏi một kênh Voice Channel chỉ định ($voice <#channel> hoặc ID hoặc leave)',
  async execute(message, args, client) {
    // Leave command
    if (args[0] === 'leave' || args[0] === 'off' || args[0] === 'disconnect') {
      if (!message.guild) return message.sendAutoDelete('❌ Lệnh này chỉ dùng trong Server.');
      const connection = getVoiceConnection(message.guild.id);
      if (connection) {
        connection.destroy();
        return message.sendAutoDelete('🔇 **Đã rời khỏi Voice Channel!**');
      } else {
        return message.sendAutoDelete('⚠️ Selfbot hiện không ở trong Voice Channel nào.');
      }
    }

    let targetChannel = null;

    // 1. Channel specified via mention (<#id>) or raw ID
    if (args[0]) {
      const channelId = args[0].replace(/[<#@!&>]/g, '');
      targetChannel = message.guild?.channels?.cache?.get(channelId) || client.channels.cache.get(channelId);
    } else {
      // 2. Fallback to user's current voice channel
      targetChannel = message.member?.voice?.channel;
    }

    if (!targetChannel) {
      return message.sendAutoDelete('❌ **Vui lòng cung cấp ID kênh Voice hoặc Tag kênh Voice!**\n👉 Ví dụ: `$voice 1234567890` hoặc `$voice <#1234567890>` hoặc `$voice leave`');
    }

    // Check channel type (Guild Voice or Guild Stage)
    const isVoice = targetChannel.type === 'GUILD_VOICE' || targetChannel.type === 'GUILD_STAGE_VOICE' || targetChannel.type === 2 || targetChannel.type === 13;
    if (!isVoice) {
      return message.sendAutoDelete('❌ ID kênh bạn nhập không phải là một Kênh Voice!');
    }

    try {
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: targetChannel.guild.id,
        adapterCreator: targetChannel.guild.voiceAdapterCreator,
        selfMute: true,
        selfDeaf: true
      });

      await message.sendAutoDelete(`🔊 **Đã kết nối thành công vào Voice:** \`${targetChannel.name}\` (<#${targetChannel.id}>)`);
    } catch (err) {
      console.error('[Voice Command Error]', err);
      await message.sendAutoDelete(`❌ Không thể tham gia Voice Channel: ${err.message}`);
    }
  }
};
