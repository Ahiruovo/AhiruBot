import { EmbedBuilder, MessageFlags } from 'discord.js';

const voiceStateUpdate = (client, VC_LOG_CHANNEL_NAME, db) => {
  client.on('voiceStateUpdate', (oldState, newState) => {
    if (client.disabledEvents.get((newState.guild || oldState.guild)?.id)?.has('voiceStateUpdate')) return;
    let logMsg = '';
    let embed = null;
    const user = (newState.member || oldState.member).user;
    const userMention = `<@${user.id}>`;
    const username = user.username;
    const userAvatar = user.displayAvatarURL();
    const guild = newState.guild || oldState.guild;
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    // 專用語音 log 頻道
    const vcLogChannel = guild.channels.cache.find(
      c => c.name === VC_LOG_CHANNEL_NAME && c.isTextBased()
    );

    // 加入語音
    if (!oldState.channel && newState.channel) {
      const channelMention = `<#${newState.channel.id}>`;
      logMsg = `${userMention} 加入語音頻道：${newState.channel.name}`;
      embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: username, iconURL: userAvatar })
        .setTitle('加入了頻道')
        .setDescription(`${userMention} 加入了 ${channelMention}\n${discordTime}`);
    }
    // 離開語音
    else if (oldState.channel && !newState.channel) {
      const channelMention = `<#${oldState.channel.id}>`;
      logMsg = `${userMention} 離開語音頻道：${oldState.channel.name}`;
      embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: username, iconURL: userAvatar })
        .setTitle('離開了頻道')
        .setDescription(`${userMention} 離開了 ${channelMention}\n${discordTime}`);
    }
    if (logMsg && embed) {
      console.log(logMsg);
      if (vcLogChannel && vcLogChannel.isTextBased()) {
        vcLogChannel.send({ embeds: [embed] }).catch(console.error);
      }
    }
  });
};
voiceStateUpdate.description = '當有人加入或離開語音頻道時，會在 vclog 頻道記錄。';
export default voiceStateUpdate; 