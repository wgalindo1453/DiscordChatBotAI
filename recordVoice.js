const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    joinVoiceChannel,
    getVoiceConnection,
} = require("@discordjs/voice");
const fs = require("fs");
const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const prism = require("prism-media");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let isRecording = false;
let pcmStream;
let pcmFile;
let userId;

// Create buttons for recording and stopping
function createButtons() {
    const recordButton = new ButtonBuilder()
        .setCustomId("start_recording")
        .setLabel("🎙️ Start Recording")
        .setStyle(ButtonStyle.Success);

    const stopButton = new ButtonBuilder()
        .setCustomId("stop_recording")
        .setLabel("🛑 Stop Recording")
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder().addComponents(recordButton, stopButton);
}

// Start recording logic
function startRecording(channelId, guildId, user) {
    const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator: client.guilds.cache.get(guildId).voiceAdapterCreator,
        selfDeaf: false,
    });

    console.log("🎙️ Joined the voice channel and ready to record.");

    const receiver = connection.receiver;
    userId = user.id;

    receiver.speaking.on("start", () => {
        if (isRecording) {
            console.log(`🎤 Detected speech from user: ${user.id}`);
            const pcmPath = `./audio-${user.id}.pcm`;
            pcmFile = fs.createWriteStream(pcmPath);
            pcmStream = receiver.subscribe(user.id).pipe(new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 }));

            pcmStream.pipe(pcmFile);

            pcmFile.on("finish", () => {
                console.log(`✅ Finished writing PCM audio: ${pcmPath}`);
                convertPCMToMP3(pcmPath, `./audio-${user.id}.mp3`);
            });
        }
    });
}

// Convert PCM to MP3 after recording stops
function convertPCMToMP3(pcmPath, mp3Path) {
    console.log("🔄 Converting PCM to MP3...");

    const ffmpegProcess = spawn(ffmpeg, [
        "-f", "s16le", // Input format
        "-ar", "48000", // Sample rate
        "-ac", "1", // Channels
        "-i", pcmPath, // Input file
        "-acodec", "libmp3lame", // Audio codec
        "-q:a", "3", // Quality
        mp3Path, // Output file
    ]);

    ffmpegProcess.stdout.on("data", (data) => {
        console.log(`📥 ffmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on("data", (data) => {
        console.error(`📥 ffmpeg stderr: ${data}`);
    });

    ffmpegProcess.on("close", (code) => {
        if (code === 0) {
            console.log(`✅ MP3 file saved: ${mp3Path}`);
        } else {
            console.error(`❌ ffmpeg process exited with code ${code}`);
        }

        // Clean up PCM file
        if (fs.existsSync(pcmPath)) {
            fs.unlinkSync(pcmPath);
            console.log(`🗑️ Deleted temporary PCM file: ${pcmPath}`);
        }
    });
}

// Stop recording
function stopRecording(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        console.log("❌ Left the voice channel and stopped recording.");
    }

    if (pcmStream) {
        pcmStream.unpipe();
        pcmFile.end();
        console.log("🛑 Recording stopped.");
    }

    isRecording = false;
}

// Discord button handling
client.on("messageCreate", (message) => {
    if (message.content === "!controls") {
        const buttons = createButtons();
        message.channel.send({ content: "Use the buttons below to control recording:", components: [buttons] });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const guildId = interaction.guild.id;
    const channelId = interaction.member.voice.channel?.id;

    if (!channelId) {
        return interaction.reply({ content: "You need to join a voice channel first!", ephemeral: true });
    }

    if (interaction.customId === "start_recording") {
        if (isRecording) {
            return interaction.reply({ content: "Recording is already in progress!", ephemeral: true });
        }
        isRecording = true;
        startRecording(channelId, guildId, interaction.member.user);
        return interaction.reply({ content: "🎙️ Recording started!", ephemeral: true });
    }

    if (interaction.customId === "stop_recording") {
        if (!isRecording) {
            return interaction.reply({ content: "No recording in progress to stop!", ephemeral: true });
        }
        stopRecording(guildId);
        return interaction.reply({ content: "🛑 Recording stopped!", ephemeral: true });
    }
});

// Login to Discord
client.login("Your-bot-token"); // Replace with your bot token