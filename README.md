# AI Voice Assistant

A modern AI voice assistant built with Next.js 15, Hono, and Cloudflare Workers with Durable Objects. Features real-time voice conversations powered by Cloudflare AI models.

## Features

- **Real-time Voice Chat**: Speak naturally and get AI responses in voice
- **Voice Activity Detection**: Automatic speech detection using VAD
- **Audio Visualization**: Real-time frequency visualization of your voice and AI responses
- **Cloudflare AI**: Uses Whisper (STT), Llama 3.1 (LLM), and MeloTTS (TTS)
- **Durable Objects**: Persistent WebSocket connections for real-time streaming
- **Modern Stack**: Next.js 15, React 19, Hono, TypeScript, Tailwind CSS 4

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  - Voice Activity Detection (VAD)                           │
│  - Audio Visualization                                      │
│  - WebSocket Client                                         │
│  - Chat UI                                                  │
└─────────────────────────────────────────────────────────────┘
                           ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│              Hono + Durable Object Worker                   │
│  - WebSocket Handler                                        │
│  - Speech-to-Text (Whisper)                                 │
│  - LLM Inference (Llama 3.1)                                │
│  - Text-to-Speech (MeloTTS)                                 │
│  - Session State Management                                 │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
cloudeflare3/
├── src/                          # Next.js frontend
│   └── app/
│       ├── components/
│       │   ├── VoiceChat.tsx     # Main voice chat component
│       │   └── VoiceVisualStatus.tsx  # Audio visualization
│       ├── lib/
│       │   └── wav.ts            # WAV encoding utility
│       ├── page.tsx              # Home page
│       ├── layout.tsx            # Root layout
│       └── globals.css           # Global styles
├── worker/                       # Cloudflare Worker
│   ├── src/
│   │   └── index.ts              # Durable Object + Hono worker
│   ├── wrangler.jsonc            # Worker configuration
│   └── package.json              # Worker dependencies
├── public/                       # Static assets
├── next.config.ts                # Next.js configuration
├── open-next.config.ts           # OpenNext for Cloudflare
├── wrangler.jsonc                # Main Wrangler config
├── tailwind.config.ts            # Tailwind configuration
└── package.json                  # Root dependencies
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm, yarn, or pnpm
- Cloudflare account (for deployment)

### Installation

1. **Install dependencies:**

```bash
npm install
cd worker && npm install && cd ..
```

2. **Set up environment variables:**

```bash
cp .env.example .env.local
```

### Development

You need to run both the Next.js frontend and the worker in separate terminals:

**Terminal 1 - Start the Worker:**
```bash
npm run worker:dev
```
This starts the Durable Object worker at `http://localhost:8787`

**Terminal 2 - Start Next.js:**
```bash
npm run dev
```
This starts the Next.js frontend at `http://localhost:3000`

**Terminal 3 (Optional) - Type checking:**
```bash
npm run types:check
```

### How It Works

1. **User starts conversation** → VAD begins listening for speech
2. **User speaks** → Audio is captured and encoded to WAV format
3. **Audio sent to worker** via WebSocket
4. **Worker transcribes** audio using Cloudflare AI Whisper model
5. **LLM generates response** using Llama 3.1 with streaming
6. **Response sentences** are converted to speech using MeloTTS
7. **Audio chunks sent back** to client via WebSocket
8. **Client plays audio** sequentially with visualization

## Cloudflare AI Models Used

- **Speech-to-Text**: `@cf/openai/whisper-tiny-en`
- **Language Model**: `@cf/meta/llama-3.1-8b-instruct`
- **Text-to-Speech**: `@cf/myshell-ai/melotts`

## Deployment

### Deploy the Worker

```bash
npm run worker:deploy
```

### Deploy Next.js to Cloudflare Pages

First, build the Next.js app:

```bash
npm run build
```

Then deploy using Wrangler:

```bash
npm run deploy
```

Or deploy via Cloudflare Dashboard:
1. Go to Cloudflare Pages
2. Connect your repository
3. Set build command: `npm run build`
4. Set build output directory: `.open-next/assets`

### Environment Variables for Production

Update `.env.local` for production:

```env
NEXT_PUBLIC_WS_HOST=your-worker.workers.dev
```

## Available Scripts

### Root Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js for production
- `npm run start` - Start Next.js production server
- `npm run deploy` - Deploy Next.js to Cloudflare
- `npm run worker:dev` - Start worker development server
- `npm run worker:deploy` - Deploy worker to Cloudflare
- `npm run types:check` - Type-check all TypeScript files
- `npm run lint` - Run ESLint

### Worker Scripts

- `cd worker && npm run dev` - Start worker dev server
- `cd worker && npm run deploy` - Deploy worker

## Technologies

### Frontend
- **Next.js 15.4.6** - React meta-framework with App Router
- **React 19.1.0** - UI library
- **Tailwind CSS 4** - Utility-first CSS framework
- **@ricky0123/vad-react** - Voice Activity Detection
- **Web Audio API** - Audio visualization and processing

### Backend
- **Hono 4.10.1** - Fast web framework for Cloudflare Workers
- **Cloudflare Durable Objects** - Stateful WebSocket handling
- **Cloudflare AI** - AI model inference
- **Vercel AI SDK** - Streaming LLM responses
- **workers-ai-provider** - Cloudflare AI integration
- **p-queue** - Concurrency control for TTS

## Configuration

### Wrangler Configuration

The project uses two Wrangler configurations:

1. **Root `wrangler.jsonc`**: For Next.js deployment with OpenNext
2. **Worker `worker/wrangler.jsonc`**: For the Durable Object worker

### Durable Objects

The worker uses a Durable Object (`VoiceAIDurableObject`) to maintain:
- WebSocket connections
- Conversation history
- Session state

Each conversation gets a unique Durable Object instance.

## Development Tips

1. **Audio Context**: Click "Start Conversation" to unlock the audio context (required by browsers)
2. **Microphone Permission**: You'll need to grant microphone access
3. **WebSocket Connection**: Ensure the worker is running before starting the frontend
4. **Local Development**: Use `localhost:8787` for the worker URL
5. **Production**: Update `NEXT_PUBLIC_WS_HOST` to your deployed worker domain

## Troubleshooting

### WebSocket Connection Failed
- Ensure the worker is running on port 8787
- Check that `NEXT_PUBLIC_WS_HOST` is set correctly

### Audio Not Playing
- Check browser console for errors
- Ensure audio context is unlocked (user gesture required)
- Verify microphone permissions are granted

### VAD Not Loading
- Check network tab for ONNX model download
- Ensure you have a stable internet connection
- Try refreshing the page

### Type Errors
- Run `npm run types:generate` to regenerate Cloudflare types
- Run `npm run types:check` to see all type errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Author

Rasel Hossain

## Acknowledgments

- Cloudflare for the amazing Workers and AI platform
- Anthropic for Claude AI assistance
- Vercel for the AI SDK
- The open-source community

---

Built with ❤️ by Rasel Hossain | Powered by Cloudflare Workers & AI
