import { EmbedBuilder, ChannelType, MessageFlags } from 'discord.js';

const channalUpdate = (client, LOG_CHANNEL_NAME) => {
  // 監聽頻道新增
  client.on('channelCreate', (channel) => {
    if (client.disabledEvents.get(channel.guild?.id)?.has('channelCreate')) return;
    const logChannel = channel.guild?.channels.cache.find(
      c => c.name === LOG_CHANNEL_NAME && c.isTextBased()
    );
    if (!logChannel) return;
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    let typeText = '';
    if (channel.type === ChannelType.GuildText) typeText = '文字頻道';
    else if (channel.type === ChannelType.GuildVoice) typeText = '語音頻道';
    else return;
    const channelId = channel.id;
    const channelMention = `<#${channelId}>`;
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('頻道已新增')
      .setDescription(`新增了${typeText}：\n${channelMention}\n${discordTime}`);
    logChannel.seSnd({ embeds: [embed] }).catch(console.error);
  });

  // 監聽頻道刪除
  client.on('channelDelete', (channel) => {
    if (client.disabledEvents.get(channel.guild?.id)?.has('channelDelete')) return;
    const logChannel = channel.guild?.channels.cache.find(
      c => c.name === LOG_CHANNEL_NAME && c.isTextBased()
    );
    if (!logChannel) return;
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    let typeText = '';
    if (channel.type === ChannelType.GuildText) typeText = '文字頻道';
    else if (channel.type === ChannelType.GuildVoice) typeText = '語音頻道';
    else return;
    const channelId = channel.id;
    const channelMention = `<#${channelId}>`;
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('頻道已刪除')
      .setDescription(`刪除了${typeText}：\n${channelMention}\n${discordTime}`);
    logChannel.send({ embeds: [embed] }).catch(console.error);
  });
};
channalUpdate.description = '當有頻道新增或刪除時，會在 log 頻道記錄。';
export default channalUpdate;
