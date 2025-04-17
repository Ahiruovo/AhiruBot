export default (client) => {
  client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (message.content.includes('nigga')) {
      const userMention = `<@${message.author.id}>`;
      message.channel.send(`${userMention}你是黑鬼`);
    }
    if (message.content.includes('黑鬼')) {
        const userMention = `<@${message.author.id}>`;
        message.channel.send(`${userMention}你是黑鬼`);
    }
  });
};