'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { encodeWavPCM16 } from '../lib/wav';
import VoiceVisualStatus from './VoiceVisualStatus';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('Disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<{ audio: string; text: string }[]>([]);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  // Get WebSocket host from environment or default to localhost
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:8787';

  // Unlock audio context (required for iOS and some browsers)
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    audioUnlockedRef.current = true;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      const ws = new WebSocket(`ws://${wsHost}/websocket`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setStatus('Connecting...');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'status':
              setStatus(data.text);
              if (data.text === 'ready') {
                setStatus('Ready');
              } else if (data.text === 'Speaking…') {
                setIsSpeaking(true);
              } else if (data.text === 'Idle') {
                setIsSpeaking(false);
              }
              break;

            case 'text':
              // User's transcribed speech
              setMessages((prev) => [...prev, { role: 'user', content: data.text }]);
              break;

            case 'audio':
              // AI's audio response
              audioQueueRef.current.push({
                audio: data.audio,
                text: data.text,
              });
              setMessages((prev) => {
                // Append to last assistant message or create new one
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: lastMsg.content + ' ' + data.text },
                  ];
                }
                return [...prev, { role: 'assistant', content: data.text }];
              });
              void playNextInQueue();
              break;

            case 'error':
              console.error('Server error:', data.text);
              setStatus('Error: ' + data.text);
              break;
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setStatus('Disconnected');
        wsRef.current = null;
      };

      // Wait for connection to be ready
      await waitForOpen(ws);
    } catch (error) {
      console.error('Connection failed:', error);
      setStatus('Connection failed');
    }
  }, [wsHost]);

  // Wait for WebSocket to open
  const waitForOpen = (ws: WebSocket): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      if (ws.readyState === WebSocket.OPEN) {
        clearTimeout(timeout);
        resolve();
      } else {
        ws.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });
  };

  // Play audio from queue
  const playNextInQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const { audio } = audioQueueRef.current.shift()!;

    try {
      // Decode base64 to blob
      const blob = b64ToBlob(audio);
      const url = URL.createObjectURL(blob);
      const audioElement = new Audio(url);

      audioElement.onended = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        void playNextInQueue();
      };

      audioElement.onerror = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        void playNextInQueue();
      };

      await audioElement.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      isPlayingRef.current = false;
      void playNextInQueue();
    }
  };

  // Convert base64 to Blob
  const b64ToBlob = (base64: string): Blob => {
    const mime = sniffAudioMime(base64);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  };

  // Detect audio MIME type from base64 header
  const sniffAudioMime = (base64: string): string => {
    const decoded = atob(base64.substring(0, 20));
    if (decoded.startsWith('RIFF') && decoded.includes('WAVE')) {
      return 'audio/wav';
    }
    if (decoded.charCodeAt(0) === 0xff && (decoded.charCodeAt(1) & 0xe0) === 0xe0) {
      return 'audio/mpeg';
    }
    return 'audio/wav'; // Default
  };

  // Handle voice activity detection
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechEnd: async (audio) => {
      console.log('Speech ended, processing...');

      // Encode audio to WAV format
      const wavBuffer = encodeWavPCM16(audio, 16000);

      // Send to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(wavBuffer);
        setStatus('Processing...');
      }
    },
    onVADMisfire: () => {
      console.log('VAD misfire');
    },
    onSpeechStart: () => {
      console.log('Speech started');
      setStatus('Listening...');
    },
  });

  // Start conversation
  const handleStart = async () => {
    unlockAudio();
    await connect();

    // Wait a bit for connection to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    vad.start();
    setIsListening(true);
    setStatus('Listening...');
  };

  // Stop conversation
  const handleStop = () => {
    vad.pause();
    setIsListening(false);
    wsRef.current?.close();
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cmd', data: 'clear' }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      vad.pause();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Visual Status */}
      <VoiceVisualStatus
        isListening={isListening}
        isSpeaking={isSpeaking}
        status={status}
        isConnected={isConnected}
      />

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">
        {!isListening ? (
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Conversation
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-8 py-4 bg-red-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Stop Conversation
          </button>
        )}
        <button
          onClick={handleClear}
          className="px-6 py-4 bg-gray-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Messages */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-purple-200 py-12">
            <p className="text-xl mb-2">Ready to chat!</p>
            <p className="text-sm opacity-75">Click "Start Conversation" to begin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>
                  <div className="text-sm">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
