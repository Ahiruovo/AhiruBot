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

    // 建立 voice_state_update_logs 資料表（如尚未存在）
    db.prepare(`
      CREATE TABLE IF NOT EXISTS voice_state_update_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        action TEXT,
        channel_id TEXT,
        channel_name TEXT,
        guild_id TEXT,
        guild_name TEXT,
        event_time TEXT
      )
    `).run();

    // 加入語音
    if (!oldState.channel && newState.channel) {
      const channelMention = `<#${newState.channel.id}>`;
      logMsg = `${userMention} 加入語音頻道：${newState.channel.name}`;
      embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: username, iconURL: userAvatar })
        .setTitle('加入了頻道')
        .setDescription(`${userMention} 加入了 ${channelMention}\n${discordTime}`);
      // 寫入 log
      db.prepare(`
        INSERT INTO voice_state_update_logs (user_id, username, action, channel_id, channel_name, guild_id, guild_name, event_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        username,
        'join',
        newState.channel.id,
        newState.channel.name,
        guild.id,
        guild.name,
        now.toISOString()
      );
      console.log(`[資料寫入] 語音加入：${username} (${user.id}) 於 ${guild.name} 的 ${newState.channel.name}`);
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
      // 寫入 log
      db.prepare(`
        INSERT INTO voice_state_update_logs (user_id, username, action, channel_id, channel_name, guild_id, guild_name, event_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        username,
        'leave',
        oldState.channel.id,
        oldState.channel.name,
        guild.id,
        guild.name,
        now.toISOString()
      );
      console.log(`[資料寫入] 語音離開：${username} (${user.id}) 於 ${guild.name} 的 ${oldState.channel.name}`);
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