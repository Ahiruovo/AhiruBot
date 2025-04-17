import { EmbedBuilder, MessageFlags } from 'discord.js';

const messageDelete = (client, LOG_CHANNEL_NAME) => {
  client.on('messageDelete', (message) => {
    if (client.disabledEvents.get(message.guild?.id)?.has('messageDelete')) return;
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    const content = message.content || '（無法取得，可能因未快取）';
    const authorMention = message.author ? `<@${message.author.id}>` : '（無法取得，可能因未快取）';
    const authorName = message.author ? message.author.username : '（無法取得，可能因未快取）';
    const authorIcon = message.author ? message.author.displayAvatarURL() : null;
    const channelId = message.channel?.id;
    const channelMention = channelId ? `<#${channelId}>` : '未知頻道';
    const logChannel = message.guild?.channels.cache.find(
      c => c.name === LOG_CHANNEL_NAME && c.isTextBased()
    );
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({
          name: authorName,
          iconURL: authorIcon
        })
        .setTitle('刪除了訊息')
        .setDescription(
          `${authorMention} 刪除了訊息於 ${channelMention}
內容：${content}
${discordTime}`
        );
      const imageAttachment = message.attachments?.find(att => att.contentType && att.contentType.startsWith('image'));
      if (imageAttachment) {
        embed.setImage(imageAttachment.url);
      }
      logChannel.send({ embeds: [embed] }).catch(console.error);
    }
  });
};
messageDelete.description = '當有人刪除訊息時，會在 log 頻道記錄。';
export default messageDelete; 