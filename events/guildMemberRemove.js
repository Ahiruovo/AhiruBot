import { EmbedBuilder, MessageFlags } from 'discord.js';

const guildMemberRemove = (client, LOG_CHANNEL_NAME) => {
  client.on('guildMemberRemove', (member) => {
    if (client.disabledEvents.get(member.guild?.id)?.has('guildMemberRemove')) return;
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