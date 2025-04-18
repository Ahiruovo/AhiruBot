export default (client, db) => {
  client.on('messageCreate', message => {
    if (message.author.bot) return;
    // 關鍵字陣列
    const keywords = ['nigga', '黑鬼', 'nigger', 'nig', 'niqqa', 'nibbas', '我是白人', 'ni'];
    if (keywords.some(word => message.content.includes(word))) {
      const userMention = `<@${message.author.id}>`;
      message.channel.send(`${userMention}你是黑鬼`);
    }
  });
};