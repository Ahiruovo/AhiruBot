import { EmbedBuilder, MessageFlags } from 'discord.js';

const messageDelete = (client, LOG_CHANNEL_NAME, db) => {
  client.on('messageDelete', (message) => {
    if (client.disabledEvents.get(message.guild?.id)?.has('messageDelete')) return;

    // 判斷是否為 log 頻道
    const isLogChannel = message.channel?.name === LOG_CHANNEL_NAME;
    // 判斷是否為機器人自己發的訊息
    const isBotMessage = message.author?.id === client.user.id;

    // 確保有 deleted_logs 資料表
    db.prepare('CREATE TABLE IF NOT EXISTS deleted_logs (id TEXT, username TEXT, content TEXT, deleted_at TEXT, channel TEXT)').run();
    // 寫入 database
    db.prepare('INSERT INTO deleted_logs (id, username, content, deleted_at, channel) VALUES (?, ?, ?, ?, ?)').run(
      message.author?.id || '未知',
      message.author?.username || '未知',
      message.content || '（無法取得內容）',
      new Date().toISOString(),
      message.channel?.name || '未知'
    );
    console.log(`[資料寫入] 刪除訊息：${message.content || '（無法取得內容）'} by ${message.author?.username || '未知用戶'}`);

    // 如果是 log 頻道且是 bot 自己的訊息，不要再發 embed
    if (isLogChannel && isBotMessage) return;

    // 其餘情況才發 embed
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
          `${authorMention} 刪除了訊息於 ${channelMention}\n內容：${content}\n${discordTime}`
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