const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

const {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    AudioPlayerStatus,
} = require("@discordjs/voice");

const fs = require("fs");
const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const prism = require("prism-media");
const axios = require("axios");

// AssemblyAI and OpenAI API Keys
const ASSEMBLYAI_API_KEY = "Your-Assembly-AI-Key";
const OPENAI_API_KEY = "Your-OpenAI-Key";

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

// Global audio player
const audioPlayer = createAudioPlayer();

// Creates buttons for recording and stopping
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

// Starts recording logic
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
                convertPCMToMP3(pcmPath, `./audio-${user.id}.mp3`, guildId, channelId);
            });
        }
    });
}

// Converts PCM to MP3 and trigger transcription
function convertPCMToMP3(pcmPath, mp3Path, guildId, channelId) {
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

    ffmpegProcess.on("close", (code) => {
        if (code === 0) {
            console.log(`✅ MP3 file saved: ${mp3Path}`);
            transcribeAndGenerateResponse(mp3Path, guildId, channelId); // Transcribe and respond
        } else {
            console.error(`❌ ffmpeg process exited with code ${code}`);
        }

        // Cleans up PCM file
        if (fs.existsSync(pcmPath)) {
            fs.unlinkSync(pcmPath);
            console.log(`🗑️ Deleted temporary PCM file: ${pcmPath}`);
        }
    });
}

// Transcribes and generate audio response
async function transcribeAndGenerateResponse(mp3Path, guildId, channelId) {
    try {
        // Transcription with AssemblyAI
        console.log("🔼 Uploading MP3 to AssemblyAI...");
        const uploadResponse = await uploadToAssemblyAI(mp3Path);

        console.log("📝 Transcribing audio...");
        const transcript = await fetchTranscription(uploadResponse.upload_url);

        console.log(`📜 Transcription result: ${transcript}`);

        // Generates audio response with OpenAI
        console.log("🤖 Generating response...");
        const audioResponsePath = await generateAudioResponse(transcript);

        // Plays response in the voice channel
        playMP3(guildId, channelId, audioResponsePath);
    } catch (error) {
        console.error("❌ Error in transcription or response generation:", error.message);
    }
}

// Upload MP3 to AssemblyAI
async function uploadToAssemblyAI(filePath) {
    const audioData = fs.createReadStream(filePath);
    const response = await axios.post(
        "https://api.assemblyai.com/v2/upload",
        audioData,
        {
            headers: {
                authorization: ASSEMBLYAI_API_KEY,
                "content-type": "application/octet-stream",
            },
        }
    );
    return response.data;
}

// Fetch transcription from AssemblyAI
async function fetchTranscription(uploadUrl) {
    const transcriptionResponse = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        {
            audio_url: uploadUrl,
            speaker_labels: true,
        },
        {
            headers: {
                authorization: ASSEMBLYAI_API_KEY,
                "content-type": "application/json",
            },
        }
    );

    const transcriptId = transcriptionResponse.data.id;

    // Poll for transcription completion
    let completed = false;
    let transcriptText = "";
    while (!completed) {
        const pollingResponse = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            {
                headers: {
                    authorization: ASSEMBLYAI_API_KEY,
                },
            }
        );

        const status = pollingResponse.data.status;
        if (status === "completed") {
            completed = true;
            transcriptText = pollingResponse.data.text;
        } else if (status === "failed") {
            throw new Error("Transcription failed.");
        } else {
            console.log("⏳ Waiting for transcription to complete...");
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before polling again
        }
    }

    return transcriptText;
}

// Generates audio response with OpenAI
async function generateAudioResponse(transcript) {
    const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
            model: "gpt-4o-audio-preview",
            modalities: ["text", "audio"],
            audio: { voice: "alloy", format: "wav" },
            messages: [
                {
                    role: "user",
                    content: transcript,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
        }
    );

    const audioData = response.data.choices[0].message.audio.data;
    const audioPath = `./response.wav`;
    fs.writeFileSync(audioPath, Buffer.from(audioData, "base64"));
    console.log(`✅ Audio response saved to: ${audioPath}`);
    return audioPath;
}

// Play the MP3 or WAV file in the voice channel
function playMP3(guildId, channelId, filePath) {
    const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator: client.guilds.cache.get(guildId).voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("🔊 Connected to the voice channel and ready to play audio.");
    });

    const resource = createAudioResource(filePath);
    audioPlayer.play(resource);

    connection.subscribe(audioPlayer);

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
        console.log("✅ Finished playing the audio.");
        connection.destroy();
        console.log("❌ Left the voice channel after playback.");
    });

    audioPlayer.on("error", (error) => {
        console.error(`❌ Audio player error: ${error.message}`);
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
client.login("discord-bot-token"); // Replace with your bot token
