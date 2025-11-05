import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  VideoCameraIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://neurallempire-production.up.railway.app';

const VideoAgentChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [videoAgent, setVideoAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideoAgent();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchVideoAgent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/video-agents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVideoAgent(response.data.videoAgent);

      // Add welcome message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: `Hello! I'm ${response.data.videoAgent.agent.name}. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error fetching video agent:', error);
      toast.error('Failed to load video agent');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateMockResponse(inputMessage),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setSending(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setSending(false);
    }
  };

  const generateMockResponse = (_message: string): string => {
    const responses = [
      "That's a great question! Let me help you with that.",
      "I understand what you're asking. Here's what I think...",
      "Interesting! Let me provide you with some information about that.",
      "I'm here to help! Based on what you've asked...",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success('Recording stopped');
    } else {
      setIsRecording(true);
      toast.success('Recording started... (Demo mode)');

      // Auto-stop after 5 seconds (demo)
      setTimeout(() => {
        setIsRecording(false);
        toast('Processing speech...');
      }, 5000);
    }
  };

  const getAvatarIcon = (type: string) => {
    const icons: Record<string, string> = {
      REALISTIC_3D: '👤',
      PROFESSIONAL: '💼',
      CARTOON: '🎨',
      ANIME: '⭐',
      CUSTOM: '🖼️',
    };
    return icons[type] || '👤';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading video agent...</p>
        </div>
      </div>
    );
  }

  if (!videoAgent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Video agent not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Avatar Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {/* Video Display */}
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 aspect-[3/4]">
                {isVideoEnabled ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-9xl mb-4 animate-pulse">
                        {getAvatarIcon(videoAgent.avatarType)}
                      </div>
                      <div className="text-white text-lg font-medium">
                        {videoAgent.agent.name}
                      </div>
                      <div className="text-indigo-200 text-sm mt-2">
                        {sending ? 'Thinking...' : isRecording ? 'Listening...' : 'Ready'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoCameraIcon className="h-24 w-24 text-white opacity-50" />
                  </div>
                )}

                {/* Video Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button
                    onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    className={`p-3 rounded-full ${
                      isVideoEnabled
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white transition-colors`}
                  >
                    <VideoCameraIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={toggleRecording}
                    className={`p-4 rounded-full ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-white/20 hover:bg-white/30'
                    } text-white transition-colors`}
                  >
                    {isRecording ? (
                      <StopIcon className="h-6 w-6" />
                    ) : (
                      <MicrophoneIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>

              {/* Agent Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {videoAgent.agent.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {videoAgent.agent.description || 'AI Video Assistant'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {videoAgent.voiceProvider.replace('_', ' ')}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    {videoAgent.avatarType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-[700px]">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Conversation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Chat with {videoAgent.agent.name}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === 'user'
                            ? 'text-indigo-200'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.4s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </form>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Press Enter to send • Use microphone for voice input
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAgentChat;
