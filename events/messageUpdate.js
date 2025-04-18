import { EmbedBuilder, MessageFlags } from 'discord.js';

const messageUpdate = (client, LOG_CHANNEL_NAME, db) => {
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (client.disabledEvents.get(newMessage.guild?.id)?.has('messageUpdate')) return;
    if (newMessage.partial) await newMessage.fetch();
    if (oldMessage.partial) await oldMessage.fetch();
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    // 建立 message_update_logs 資料表（如尚未存在）
    db.prepare(`
      CREATE TABLE IF NOT EXISTS message_update_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        old_content TEXT,
        new_content TEXT,
        channel_id TEXT,
        channel_name TEXT,
        updated_at TEXT
      )
    `).run();
    // 寫入 log
    db.prepare(`
      INSERT INTO message_update_logs (user_id, username, old_content, new_content, channel_id, channel_name, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newMessage.author?.id || '未知',
      newMessage.author?.username || '未知',
      oldMessage.content || '（無法取得）',
      newMessage.content || '（無法取得）',
      newMessage.channel?.id || '未知',
      newMessage.channel?.name || '未知',
      new Date().toISOString()
    );
    console.log(`[資料寫入] 編輯訊息：${oldMessage.content || '（無）'} -> ${newMessage.content || '（無）'} by ${newMessage.author?.username || '未知用戶'}`);

    const logChannel = newMessage.guild?.channels.cache.find(
      c => c.name === LOG_CHANNEL_NAME && c.isTextBased()
    );
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    const authorMention = newMessage.author ? `<@${newMessage.author.id}>` : '（無法取得，可能因未快取）';
    const authorName = newMessage.author ? newMessage.author.username : '（無法取得，可能因未快取）';
    const authorIcon = newMessage.author ? newMessage.author.displayAvatarURL() : null;
    const channelId = newMessage.channel?.id;
    const channelMention = channelId ? `<#${channelId}>` : '未知頻道';
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setAuthor({
          name: authorName,
          iconURL: authorIcon
        })
        .setTitle('編輯了訊息')
        .setDescription(
          `${authorMention} 編輯了訊息於 ${channelMention}\n原內容：${oldMessage.content || '（無法取得，可能因未快取）'}\n新內容：${newMessage.content || '（無法取得，可能因未快取）'}\n${discordTime}`
        );
      logChannel.send({ embeds: [embed] }).catch(console.error);
    }
  });
};
messageUpdate.description = '當有人編輯訊息時，會在 log 頻道記錄。';
export default messageUpdate; 