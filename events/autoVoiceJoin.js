// import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { createReadStream } from 'fs';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // 設定要自動播放的音檔名稱（不含.mp3）
// const AUTO_PLAY_AUDIO = 'welcome';

// // 設定冷卻時間（毫秒）- 防止頻繁觸發
// const COOLDOWN_TIME = 10000; // 10秒

// // 記錄最後播放時間（頻道ID為Key）
// const lastPlayTime = new Map();

// const description = '自動偵測有人加入語音頻道時，機器人會自動加入並播放歡迎音樂';

// export default (client, logChannelName, db) => {
//     const musicDir = path.join(process.cwd(), 'music');
    
//     // 檢查歡迎音樂檔案是否存在
//     const welcomeFile = path.join(musicDir, `${AUTO_PLAY_AUDIO}.mp3`);
//     if (!fs.existsSync(welcomeFile)) {
//         console.warn(`警告：找不到自動播放音樂檔案 ${welcomeFile}`);
//         console.warn(`請在 music 資料夾中放入 ${AUTO_PLAY_AUDIO}.mp3 檔案`);
//     } else {
//         console.log(`✅ 找到自動播放音樂檔案：${welcomeFile}`);
//     }

//     client.on('voiceStateUpdate', async (oldState, newState) => {
//         try {
//             // 檢查是否為機器人自己
//             if (newState.member.user.bot) return;
            
//             // 檢查禁用狀態
//             const guildId = newState.guild.id;
//             if (client.disabledEvents.has(guildId) && 
//                 client.disabledEvents.get(guildId).has('autoVoiceJoin')) {
//                 return;
//             }
            
//             // 檢查用戶是否加入了語音頻道（之前不在語音，現在在語音）
//             if (!oldState.channelId && newState.channelId) {
//                 const voiceChannel = newState.channel;
                
//                 // 檢查冷卻時間
//                 const now = Date.now();
//                 if (lastPlayTime.has(voiceChannel.id)) {
//                     const lastTime = lastPlayTime.get(voiceChannel.id);
//                     if (now - lastTime < COOLDOWN_TIME) {
//                         console.log(`冷卻中，跳過自動播放 (頻道: ${voiceChannel.name})`);
//                         return;
//                     }
//                 }
                
//                 // 檢查歡迎音樂檔案是否存在
//                 if (!fs.existsSync(welcomeFile)) {
//                     console.warn(`找不到自動播放音樂檔案，無法自動播放`);
//                     return;
//                 }
                
//                 console.log(`用戶 ${newState.member.user.username} 加入語音頻道 ${voiceChannel.name}，自動播放歡迎音樂`);
                
//                 // 更新最後播放時間
//                 lastPlayTime.set(voiceChannel.id, now);
                
//                 // 加入語音頻道
//                 const connection = joinVoiceChannel({
//                     channelId: voiceChannel.id,
//                     guildId: voiceChannel.guild.id,
//                     adapterCreator: voiceChannel.guild.voiceAdapterCreator,
//                     selfDeaf: true,
//                     selfMute: false
//                 });
                
//                 // 創建音訊播放器
//                 const player = createAudioPlayer({
//                     behaviors: {
//                         noSubscriber: NoSubscriberBehavior.Pause,
//                     }
//                 });
                
//                 // 創建音訊資源
//                 const stream = createReadStream(welcomeFile);
//                 const resource = createAudioResource(stream);
                
//                 // 播放音訊
//                 player.play(resource);
//                 connection.subscribe(player);
                
//                 // 記錄到資料庫
//                 if (db) {
//                     try {
//                         db.prepare(`
//                             CREATE TABLE IF NOT EXISTS auto_voice_join_logs (
//                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                                 user_id TEXT,
//                                 username TEXT,
//                                 channel_id TEXT,
//                                 channel_name TEXT,
//                                 guild_id TEXT,
//                                 guild_name TEXT,
//                                 timestamp TEXT
//                             )
//                         `).run();
                        
//                         db.prepare(`
//                             INSERT INTO auto_voice_join_logs (
//                                 user_id, username, channel_id, channel_name, 
//                                 guild_id, guild_name, timestamp
//                             ) VALUES (?, ?, ?, ?, ?, ?, ?)
//                         `).run(
//                             newState.member.user.id,
//                             newState.member.user.username,
//                             voiceChannel.id,
//                             voiceChannel.name,
//                             voiceChannel.guild.id,
//                             voiceChannel.guild.name,
//                             new Date().toISOString()
//                         );
//                     } catch (error) {
//                         console.error('記錄自動語音加入事件失敗:', error);
//                     }
//                 }
                
//                 // 播放完成後自動離開
//                 player.on(AudioPlayerStatus.Idle, () => {
//                     setTimeout(() => {
//                         connection.destroy();
//                         console.log(`歡迎音樂播放完畢，已離開語音頻道`);
//                     }, 500);
//                 });
                
//                 // 處理錯誤
//                 player.on('error', error => {
//                     console.error('播放歡迎音樂時發生錯誤:', error);
//                     connection.destroy();
//                 });
//             }
//         } catch (error) {
//             console.error('自動加入語音頻道時發生錯誤:', error);
//         }
//     });
// };

// // 導出事件描述
// export { description }; 