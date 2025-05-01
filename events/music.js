import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'ffmpeg-static';
import { createReadStream } from 'fs';

// 設定 ffmpeg 路徑
process.env.FFMPEG_PATH = ffmpeg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (client) => {
    // 確認音樂資料夾存在
    const musicDir = path.join(process.cwd(), 'music');
    if (!fs.existsSync(musicDir)) {
        console.error('警告：找不到 music 資料夾');
        try {
            fs.mkdirSync(musicDir);
            console.log(`已建立 music 資料夾：${musicDir}`);
        } catch (error) {
            console.error('建立 music 資料夾失敗', error);
        }
    }

    // 檢查可用的音樂檔案
    const musicFiles = [];
    try {
        fs.readdirSync(musicDir).forEach(file => {
            if (file.endsWith('.mp3')) {
                musicFiles.push(file);
            }
        });
        if (musicFiles.length > 0) {
            console.log('找到可用的音樂檔案：', musicFiles);
        } else {
            console.warn('警告：music 資料夾中沒有 .mp3 檔案');
        }
    } catch (error) {
        console.error('讀取 music 資料夾失敗', error);
    }

    const data = new SlashCommandBuilder()
        .setName('play')
        .setDescription('播放音樂')
        .addStringOption(option => {
            option.setName('音樂')
                .setDescription('選擇要播放的音樂')
                .setRequired(true);
            
            // 動態添加本地音檔作為選項
            if (musicFiles.length > 0) {
                musicFiles.forEach(file => {
                    const name = file.replace('.mp3', '');
                    option.addChoices({ name, value: name });
                });
            } else {
                // 如果沒有本地音檔，提供預設網路音源
                option.addChoices(
                    { name: '開場音樂', value: 'intro' },
                    { name: '警報聲', value: 'alarm' },
                    { name: '貓叫聲', value: 'meow' }
                );
            }
            
            return option;
        });

    const execute = async (interaction) => {
        try {
            if (!interaction.member.voice.channel) {
                return interaction.reply('請先加入語音頻道！');
            }

            await interaction.deferReply();
            const voiceChannel = interaction.member.voice.channel;
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                }
            });
            
            const musicOption = interaction.options.getString('音樂');
            let resource;
            
            // 檢查是否為本地檔案
            const localFile = path.join(musicDir, `${musicOption}.mp3`);
            if (fs.existsSync(localFile)) {
                console.log(`播放本地音樂檔案：${localFile}`);
                // 使用 createReadStream 來讀取檔案
                const stream = createReadStream(localFile);
                resource = createAudioResource(stream);
            } else {
                // 使用網路音訊 URL 作為備用
                let audioURL;
                switch (musicOption) {
                    case 'intro':
                        audioURL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
                        break;
                    case 'alarm':
                        audioURL = 'https://raw.githubusercontent.com/discord/discord-api-docs/main/examples/fanout-bot/robot-sound.mp3';
                        break;
                    case 'meow':
                        audioURL = 'https://raw.githubusercontent.com/discord/discord-api-docs/main/examples/fanout-bot/just-a-meow.mp3';
                        break;
                    default:
                        return interaction.editReply(`找不到音樂檔案：${musicOption}.mp3\n請將音樂檔案放在 music 資料夾中`);
                }
                console.log(`播放網路音樂：${audioURL}`);
                resource = createAudioResource(audioURL);
            }

            player.play(resource);
            connection.subscribe(player);

            // 處理播放狀態改變事件
            player.on(AudioPlayerStatus.Playing, () => {
                interaction.editReply(`🎵 正在播放：${musicOption}`);
            });

            // 處理播放完成事件
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                interaction.followUp('播放結束！');
            });

            // 處理錯誤事件
            player.on('error', error => {
                console.error('播放錯誤:', error);
                connection.destroy();
                interaction.followUp('播放音樂時發生錯誤！');
            });
        } catch (error) {
            console.error('音樂播放錯誤:', error);
            interaction.editReply('播放音樂時發生錯誤！');
        }
    };

    return { data, execute };
};
