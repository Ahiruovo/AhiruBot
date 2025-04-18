import { EmbedBuilder, MessageFlags } from 'discord.js';

// 用於記錄用戶加入語音的時間
const quickJoinLeaveMap = new Map();

const quickVoiceJoinLeave = (client, VC_LOG_CHANNEL_NAME, db) => {
  client.on('voiceStateUpdate', (oldState, newState) => {
    if (client.disabledEvents.get((newState.guild || oldState.guild)?.id)?.has('quickVoiceJoinLeave')) return;
    const user = (newState.member || oldState.member).user;
    const userMention = `<@${user.id}>`;
    const username = user.username;
    const userAvatar = user.displayAvatarURL();
    const guild = newState.guild || oldState.guild;
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    const vcLogChannel = guild.channels.cache.find(
      c => c.name === VC_LOG_CHANNEL_NAME && c.isTextBased()
    );

    // 加入語音時記錄時間
    if (!oldState.channel && newState.channel) {
      quickJoinLeaveMap.set(user.id, Date.now());
    }
    // 離開語音時檢查是否快速進出
    else if (oldState.channel && !newState.channel) {
      const joinTime = quickJoinLeaveMap.get(user.id);
      if (joinTime && (Date.now() - joinTime <= 10000)) {
        const duration = ((Date.now() - joinTime) / 1000).toFixed(1);
        const quickEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setAuthor({ name: username, iconURL: userAvatar })
          .setTitle('快速進出語音警告')
          .setDescription(`使用者 ${userMention} 在 10 秒內加入又退出語音頻道！\n實際停留：${duration} 秒\n${discordTime}`);
        if (vcLogChannel && vcLogChannel.isTextBased()) {
          vcLogChannel.send({ embeds: [quickEmbed] }).catch(console.error);
        }
        quickJoinLeaveMap.delete(user.id);
      } else {
        quickJoinLeaveMap.delete(user.id);
      }
    }
  });
};
quickVoiceJoinLeave.description = '偵測用戶在 10 秒內快速進出語音頻道，並在 vclog 頻道發送警告。';
export default quickVoiceJoinLeave; 