import VoiceChat from "./components/VoiceChat";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            AI Voice Assistant
          </h1>
          <p className="text-xl text-purple-200">
            Powered by Next.js, Hono & Cloudflare Workers
          </p>
        </div>
        <VoiceChat />
      </main>
    </div>
  );
}
