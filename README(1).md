
# Discord AI Voice Bot

A Discord bot that records voice in a channel, transcribes it into text using AssemblyAI, generates a response using OpenAI, and plays the generated response back in the channel.

## Features

- 🎙️ **Record Voice**: Capture live voice input from a user in a voice channel.
- 📝 **Transcribe Audio**: Convert recorded voice into text using AssemblyAI.
- 🤖 **Generate Response**: Generate a conversational response using OpenAI Chat API with audio output.
- 🔊 **Play Response**: Play the AI-generated audio response back in the same voice channel.

---

## Demo

### Workflow
1. User joins a voice channel and starts recording via a button command.
2. The bot captures the user's voice, processes the audio, and transcribes the text.
3. The transcribed text is sent to OpenAI, which generates a conversational audio response.
4. The bot plays the AI-generated audio in the voice channel.

---

## Installation

### Prerequisites

1. **Node.js**: Install [Node.js](https://nodejs.org) (LTS recommended).
2. **Discord Bot**: Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications).
3. **AssemblyAI API Key**: Get an API key from [AssemblyAI](https://www.assemblyai.com/).
4. **OpenAI API Key**: Get an API key from [OpenAI](https://platform.openai.com/signup/).

### Clone the Repository

```bash
git clone https://github.com/yourusername/discord-ai-voice-bot.git
cd discord-ai-voice-bot
```

### Install Dependencies

```bash
npm install
```

### Configure API Keys

Create a `.env` file in the root directory and add the following:
```env
DISCORD_BOT_TOKEN=your_discord_bot_token
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
OPENAI_API_KEY=your_openai_api_key
```

---

## Usage

1. **Start the Bot**:
   ```bash
   node bot.js
   ```

2. **Command**:
   - Type `!controls` in a text channel to get the buttons to start or stop recording.
   - Join a voice channel to enable recording.

3. **Enjoy the Experience**:
   - Speak in the voice channel, and the bot will transcribe and respond intelligently.

---

## Code Overview

### Dependencies

- [discord.js](https://discord.js.org/) - Discord API Wrapper for Node.js.
- [@discordjs/voice](https://github.com/discordjs/voice) - Voice utilities for Discord bots.
- [axios](https://axios-http.com/) - HTTP client for API requests.
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) - Static build of FFmpeg.
- [prism-media](https://github.com/amishshah/prism-media) - Media handling for Node.js.

Install them via:
```bash
npm install discord.js @discordjs/voice axios ffmpeg-static prism-media
```

### Bot Logic

- **Recording**: The bot joins the voice channel and records audio streams.
- **Transcription**: Audio is uploaded to AssemblyAI for text conversion.
- **Response**: Transcribed text is sent to OpenAI for an audio response.
- **Playback**: The AI-generated response is played in the voice channel.

### File Structure

```plaintext
discord-ai-voice-bot/
├── bot.js        # Main bot script
├── package.json  # Node.js dependencies and scripts
├── README.md     # Project documentation
├── .env          # API keys and configuration
```

---

## API Integration

### AssemblyAI

Used for transcription of recorded audio. The MP3 is uploaded, and the transcribed text is retrieved.

### OpenAI

Used for generating conversational audio responses. The transcribed text is sent as input, and the audio response is fetched and played.

---

## Example Output

### User: 
*"Hello bot, how are you?"*

### Bot Response (via OpenAI):
*"I'm doing great! How can I assist you today?"*

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request.

---

## Acknowledgments

- [AssemblyAI](https://assemblyai.com) for the transcription API.
- [OpenAI](https://openai.com) for AI-driven responses.
- [Discord.js](https://discord.js.org) for making Discord bot development easy.
