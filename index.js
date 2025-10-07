import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Database from 'better-sqlite3';

import music from './events/music.js';
import * as nicknameCommand from './events/nickname.js';

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

// 全域禁用事件 Map
client.disabledEvents = new Map(); // key: guildId, value: Set of event names
client.eventDescriptions = new Map();

// 初始化資料庫
const db = new Database('./data/bot.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    guild_name TEXT,
    disabled_events TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    joined_at TEXT
  )
`).run();

// Ready 事件
client.once('ready', async () => {
  console.log(`✅ Bot 上線！登入帳號：${client.user.tag}`);
  console.log('✅ Ready 事件完成，初始化事件中...');

  // 快取歷史訊息
  client.messagesCache = new Map();
  for (const guild of client.guilds.cache.values()) {
    const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
    for (const channel of textChannels.values()) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        messages.forEach(msg => client.messagesCache.set(msg.id, msg));
      } catch (err) {
        console.error(`讀取頻道 ${channel.name} 歷史訊息失敗：`, err.message);
      }
    }
  }
  console.log('✅ 歷史訊息快取完成');

  // 載入 guild disabledEvents 設定
  const rows = db.prepare('SELECT guild_id, disabled_events FROM guild_settings').all();
  for (const row of rows) {
    if (row.disabled_events) {
      try {
        const disabledArr = JSON.parse(row.disabled_events);
        if (Array.isArray(disabledArr)) {
          client.disabledEvents.set(row.guild_id, new Set(disabledArr));
        }
      } catch (e) {
        console.error(`解析 disabled_events 失敗 (guild_id: ${row.guild_id}):`, e);
      }
    }
  }
  console.log('✅ 已載入所有伺服器事件設定');
});

// 註冊 slash 指令
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

// 添加音樂指令
commands.push(music(client).data.toJSON());

// nickname 指令
commands.push(nicknameCommand.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ 已註冊所有 Slash 指令（全域）');
  } catch (error) {
    console.error(error);
  }
})();

// interactionCreate
client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;

    // 更新 guild 設定
    db.prepare(`
      INSERT INTO guild_settings (guild_id, guild_name, disabled_events)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET guild_name=excluded.guild_name
    `).run(
      interaction.guildId,
      interaction.guild?.name || '未知伺服器',
      JSON.stringify(Array.from(client.disabledEvents.get(interaction.guildId) || []))
    );

    const eventName = interaction.options.getString('event');
    const guildId = interaction.guildId;

    switch(interaction.commandName) {
      case 'disable': {
        if (!client.disabledEvents.has(guildId)) client.disabledEvents.set(guildId, new Set());
        const set = client.disabledEvents.get(guildId);
        if (set.has(eventName)) set.delete(eventName);
        else set.add(eventName);

        await interaction.reply({ 
          content: set.has(eventName) ? `已禁用事件：${eventName}` : `已啟用事件：${eventName}`, 
          flags: MessageFlags.Ephemeral 
        });

        db.prepare(`UPDATE guild_settings SET disabled_events = ? WHERE guild_id = ?`)
          .run(JSON.stringify(Array.from(client.disabledEvents.get(guildId) || [])), guildId);
        break;
      }
      case 'enable': {
        if (!client.disabledEvents.has(guildId)) client.disabledEvents.set(guildId, new Set());
        const set = client.disabledEvents.get(guildId);
        if (set.has(eventName)) set.delete(eventName);
        await interaction.reply({ content: `已啟用事件：${eventName}`, flags: MessageFlags.Ephemeral });
        db.prepare(`UPDATE guild_settings SET disabled_events = ? WHERE guild_id = ?`)
          .run(JSON.stringify(Array.from(client.disabledEvents.get(guildId) || [])), guildId);
        break;
      }
      case 'eventdesc': {
        let descMsg = '**所有事件功能說明：**\n';
        for (const [name, desc] of client.eventDescriptions.entries()) {
          descMsg += `\n- \`${name}\`：${desc}`;
        }
        await interaction.reply({ content: descMsg, flags: MessageFlags.Ephemeral });
        break;
      }
      case 'play': {
        await music(client).execute(interaction);
        break;
      }
      case 'nickname': {
        await nicknameCommand.execute(interaction);
        break;
      }
    }
  } catch (err) {
    console.error('interactionCreate error:', err);
    if (interaction.replied || interaction.deferred) return;
    await interaction.reply({ content: '發生錯誤，請聯絡管理員。', flags: MessageFlags.Ephemeral });
  }
});

// 載入 events 資料夾
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
  if (!file.endsWith('.js')) return;

  import(pathToFileURL(path.join(eventsPath, file)).href).then(eventModule => {
    const event = eventModule.default || eventModule;
    if (typeof event === 'function') {
      console.log(`✅ 載入事件: ${file}`);
      if (file === 'voiceStateUpdate.js' || file === 'quickVoiceJoinLeave.js') {
        event(client, VC_LOG_CHANNEL_NAME, db);
      } else if (file === 'music.js') {
        // 已註冊
      } else {
        event(client, LOG_CHANNEL_NAME, db);
      }
    }
    if (event.description) client.eventDescriptions.set(file.replace('.js', ''), event.description);
  }).catch(err => {
    console.error(`載入事件失敗 (${file}):`, err);
  });
});

// 登入
client.login(process.env.DISCORD_TOKEN);
