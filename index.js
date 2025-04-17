import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, InteractionResponseType, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const LOG_CHANNEL_NAME = 'log';
const VC_LOG_CHANNEL_NAME = 'vclog';

// 新增：全域禁用事件 Map
client.disabledEvents = new Map(); // key: guildId, value: Set of event names
client.eventDescriptions = new Map();

client.once('ready', async () => {
  console.log(`✅ Bot 上線！登入帳號：${client.user.tag}`);
  // 整合 channalHistory.js 的訊息快取邏輯
  client.messagesCache = new Map();
  for (const guild of client.guilds.cache.values()) {
    const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
    for (const channel of textChannels.values()) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        messages.forEach(msg => {
          client.messagesCache.set(msg.id, msg);
        });
      } catch (err) {
        console.error(`讀取頻道 ${channel.name} 歷史訊息失敗：`, err.message);
      }
    }
  }
  console.log('✅ 歷史訊息快取完成');
});

// 註冊 /disable 指令
const commands = [
  new SlashCommandBuilder()
    .setName('disable')
    .setDescription('啟用或禁用特定事件')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('事件名稱（如 messageDelete, voiceStateUpdate, quickVoiceJoinLeave）')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('enable')
    .setDescription('啟用已被禁用的事件')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('事件名稱（如 messageDelete, voiceStateUpdate, quickVoiceJoinLeave）')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('eventdesc')
    .setDescription('顯示所有事件的功能說明')
].map(cmd => cmd.toJSON());

console.log('CLIENT_ID:', process.env.CLIENT_ID);
// console.log('GUILD_ID:', process.env.GUILD_ID);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 清空 guild 指令
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, '1292830013271572564'),
  { body: [] }
);
console.log('已清空 guild 指令');

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ 已註冊 /disable 指令（全域）');
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'disable') {
      const eventName = interaction.options.getString('event');
      const guildId = interaction.guildId;
      if (!client.disabledEvents.has(guildId)) {
        client.disabledEvents.set(guildId, new Set());
      }
      const set = client.disabledEvents.get(guildId);
      if (set.has(eventName)) {
        set.delete(eventName);
        await interaction.reply(`已啟用事件：${eventName}`);
      } else {
        set.add(eventName);
        let msg = `已禁用事件：${eventName}`;
        if (client.eventDescriptions.has(eventName)) {
          msg += `\n\n${client.eventDescriptions.get(eventName)}`;
        }
        await interaction.reply(msg);
      }
    } else if (interaction.commandName === 'enable') {
      const eventName = interaction.options.getString('event');
      const guildId = interaction.guildId;
      if (!client.disabledEvents.has(guildId)) {
        client.disabledEvents.set(guildId, new Set());
      }
      const set = client.disabledEvents.get(guildId);
      if (set.has(eventName)) {
        set.delete(eventName);
        let msg = `已啟用事件：${eventName}`;
        if (client.eventDescriptions.has(eventName)) {
          msg += `\n\n${client.eventDescriptions.get(eventName)}`;
        }
        await interaction.reply(msg);
      } else {
        await interaction.reply(`該事件本來就已啟用：${eventName}`);
      }
    } else if (interaction.commandName === 'eventdesc') {
      let descMsg = '**所有事件功能說明：**\n';
      for (const [eventName, desc] of client.eventDescriptions.entries()) {
        descMsg += `\n- \`${eventName}\`：${desc}`;
      }
      await interaction.reply({ content: descMsg, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    console.error('interactionCreate error:', err);
    if (interaction.replied || interaction.deferred) return;
    await interaction.reply({ content: '發生錯誤，請聯絡管理員。', flags: MessageFlags.Ephemeral });
  }
});

// 自動載入 events 資料夾下所有事件
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
  if (file.endsWith('.js')) {
    import(pathToFileURL(path.join(eventsPath, file)).href).then(eventModule => {
      const event = eventModule.default || eventModule;
      if (typeof event === 'function') {
        if (file === 'voiceStateUpdate.js') {
          event(client, VC_LOG_CHANNEL_NAME);
        } else if (file === 'quickVoiceJoinLeave.js') {
          event(client, VC_LOG_CHANNEL_NAME);
        } else {
          event(client, LOG_CHANNEL_NAME);
        }
      }
      // 收集 description
      if (event.description) {
        client.eventDescriptions.set(file.replace('.js', ''), event.description);
      }
    });
  }
});

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('Keep-alive server is running'));

client.login(process.env.DISCORD_TOKEN);

