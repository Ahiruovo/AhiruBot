// events/nickname.js
import { SlashCommandBuilder } from 'discord.js';

// 暫存每個用戶的定時器
const nicknameTimers = new Map();

export const data = new SlashCommandBuilder()
  .setName('nickname')
  .setDescription('每20秒自動更改指定用戶暱稱')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('要更改暱稱的用戶')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('nickname')
      .setDescription('要更改成的暱稱')
      .setRequired(true)
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('target');
  const newNickname = interaction.options.getString('nickname');
  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUser.id);

  // 如果已經有定時器，先清除
  if (nicknameTimers.has(targetUser.id)) {
    clearInterval(nicknameTimers.get(targetUser.id));
    nicknameTimers.delete(targetUser.id);
  }

  // 立即更改一次
  try {
    await member.setNickname(newNickname);
  } catch (err) {
    return interaction.reply({ content: '更改暱稱失敗，請檢查機器人權限。', ephemeral: true });
  }

  // 每20秒自動更改一次
  const timer = setInterval(async () => {
    try {
      await member.setNickname(newNickname);
    } catch (err) {
      clearInterval(timer);
      nicknameTimers.delete(targetUser.id);
    }
  }, 20000);
  nicknameTimers.set(targetUser.id, timer);

  await interaction.reply({ content: `已開始每20秒自動將 <@${targetUser.id}> 的暱稱更改為：${newNickname}` });
}
