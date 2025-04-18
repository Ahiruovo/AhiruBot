import { EmbedBuilder, MessageFlags } from 'discord.js';

const guildMemberRemove = (client, LOG_CHANNEL_NAME, db) => {
  client.on('guildMemberRemove', (member) => {
    if (client.disabledEvents.get(member.guild?.id)?.has('guildMemberRemove')) return;
    // 建立 guild_member_remove_logs 資料表（如尚未存在）
    db.prepare(`
      CREATE TABLE IF NOT EXISTS guild_member_remove_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        guild_id TEXT,
        guild_name TEXT,
        left_at TEXT
      )
    `).run();
    // 寫入 log
    db.prepare(`
      INSERT INTO guild_member_remove_logs (user_id, username, guild_id, guild_name, left_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      member.user?.id || '未知',
      member.user?.username || '未知',
      member.guild?.id || '未知',
      member.guild?.name || '未知',
      new Date().toISOString()
    );
    console.log(`[資料寫入] 成員退出：${member.user?.username || '未知用戶'} (${member.user?.id || '未知'}) from ${member.guild?.name || '未知伺服器'}`);

    const logChannel = member.guild.channels.cache.find(
      c => c.name === LOG_CHANNEL_NAME && c.isTextBased()
    );
    const now = new Date();
    const discordTime = `<t:${Math.floor(now.getTime() / 1000)}:F>`;
    const userMention = member.user ? `<@${member.user.id}>` : '（無法取得，可能因未快取）';
    const userName = member.user ? member.user.username : '（無法取得，可能因未快取）';
    const userAvatar = member.user.displayAvatarURL();
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setAuthor({
          name: userName,
          iconURL: userAvatar
        })
        .setTitle('退出了伺服器')
        .setDescription(
          `${userMention} 退出了伺服器\n${discordTime}`
        );
      logChannel.send({ embeds: [embed] }).catch(console.error);
    }
  });
};
guildMemberRemove.description = '當有成員退出伺服器時，會在 log 頻道記錄。';
export default guildMemberRemove; 