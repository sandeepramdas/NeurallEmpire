import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  UserIcon,
  SparklesIcon,
  PlayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: string;
  status: string;
}

const CreateVideoAgent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [step, setStep] = useState(1);
  const [testingVoice, setTestingVoice] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    agentId: '',

    // Configuration IDs (when using existing configs)
    ttsConfigId: '',
    avatarConfigId: '',

    // Avatar (for inline creation)
    avatarType: 'REALISTIC_3D',
    avatarGender: 'neutral',
    avatarStyle: 'professional',
    avatarImageUrl: '',

    // Voice (for inline creation)
    voiceProvider: 'OPENAI_TTS',
    voiceId: '',
    voiceName: 'Alloy',
    voiceGender: 'neutral',
    voiceLanguage: 'en-US',
    voiceSpeed: 1.0,
    voicePitch: 1.0,
    voiceStability: 0.5,
    voiceSimilarity: 0.75,

    // STT
    sttProvider: 'OPENAI_WHISPER',
    sttLanguage: 'en',
    sttModel: 'whisper-1',

    // Interaction
    enableVideo: true,
    enableVoice: true,
    enableText: true,
    enableEmotions: true,
    emotionIntensity: 0.7,

    // Conversation
    conversationMode: 'interactive',
    responseDelay: 500,
    idleAnimation: true,
    backgroundMusic: '',
    backgroundImage: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await api.get('/agents');
      setAgents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agentId) {
      toast.error('Please select an agent');
      return;
    }

    setLoading(true);

    try {
      await api.post('/video-agents', formData);
      toast.success('Video agent created successfully! 🎉');
      navigate('..');
    } catch (error: any) {
      console.error('Error creating video agent:', error);
      const message = error.response?.data?.error || 'Failed to create video agent';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async () => {
    setTestingVoice(true);
    toast.success('Voice test started! (Demo mode)');

    // Simulate voice test
    setTimeout(() => {
      setTestingVoice(false);
      toast.success('Voice test completed!');
    }, 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'avatar');

      const response = await api.post('/files/upload', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.url || response.data.data?.url;
      setFormData({ ...formData, avatarImageUrl: imageUrl });
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.error || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const avatarTypes = [
    { value: 'REALISTIC_3D', label: 'Realistic 3D', icon: '👤', description: 'Photorealistic human avatar' },
    { value: 'PROFESSIONAL', label: 'Professional', icon: '💼', description: 'Business-appropriate avatar' },
    { value: 'CARTOON', label: 'Cartoon', icon: '🎨', description: 'Friendly cartoon style' },
    { value: 'ANIME', label: 'Anime', icon: '⭐', description: 'Anime-inspired avatar' },
    { value: 'CUSTOM', label: 'Custom', icon: '🖼️', description: 'Upload your own' },
  ];

  const voiceProviders = [
    { value: 'OPENAI_TTS', label: 'OpenAI TTS', description: 'Fast and reliable' },
    { value: 'ELEVENLABS', label: 'ElevenLabs', description: 'Most natural (Premium)' },
    { value: 'GOOGLE_TTS', label: 'Google Cloud', description: '400+ voices' },
    { value: 'AZURE_TTS', label: 'Microsoft Azure', description: 'Neural voices' },
  ];

  const openAIVoices = [
    { value: 'alloy', label: 'Alloy', gender: 'neutral' },
    { value: 'echo', label: 'Echo', gender: 'male' },
    { value: 'fable', label: 'Fable', gender: 'neutral' },
    { value: 'onyx', label: 'Onyx', gender: 'male' },
    { value: 'nova', label: 'Nova', gender: 'female' },
    { value: 'shimmer', label: 'Shimmer', gender: 'female' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <VideoCameraIcon className="h-8 w-8 text-indigo-600" />
            Create AI Video Agent
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Transform your AI agent into an intelligent video avatar with voice and visual interactions
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Select Agent', icon: UserIcon },
              { num: 2, label: 'Configure Avatar', icon: VideoCameraIcon },
              { num: 3, label: 'Setup Voice', icon: MicrophoneIcon },
              { num: 4, label: 'Review & Create', icon: SparklesIcon },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      step >= s.num
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {step > s.num ? (
                      <CheckIcon className="h-6 w-6" />
                    ) : (
                      <s.icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step > s.num ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Agent */}
          {step === 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Select an AI Agent
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose which AI agent you want to transform into a video avatar
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No agents found. Create an AI agent first.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/agents/create')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create Agent
                    </button>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => setFormData({ ...formData, agentId: agent.id })}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        formData.agentId === agent.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {formData.agentId === agent.id && (
                        <div className="absolute top-2 right-2">
                          <CheckIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {agent.name[0]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {agent.description || 'No description'}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {agent.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.agentId}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Avatar */}
          {step === 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Configure Avatar
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose how your video agent will appear
              </p>

              <div className="space-y-6">
                {/* Avatar Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Avatar Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {avatarTypes.map((type) => (
                      <div
                        key={type.value}
                        onClick={() => setFormData({ ...formData, avatarType: type.value })}
                        className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${
                          formData.avatarType === type.value
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="text-4xl mb-2">{type.icon}</div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {type.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Avatar Image Upload */}
                {formData.avatarType === 'CUSTOM' && (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Upload Avatar Image
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Upload a photo or image that will be used as your video avatar. The AI will animate this image to speak with lip-sync.
                    </p>

                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Avatar preview"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-indigo-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData({ ...formData, avatarImageUrl: '' });
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="mt-2 text-xs text-gray-500">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      )}

                      <div className="flex-1">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p className="font-medium mb-1">Recommended:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Clear, front-facing photo</li>
                            <li>Good lighting</li>
                            <li>Neutral expression</li>
                            <li>Max size: 5MB</li>
                            <li>Format: JPG, PNG, WEBP</li>
                          </ul>
                        </div>
                        {uploadingImage && (
                          <p className="mt-2 text-sm text-indigo-600 flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Uploading...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Avatar Gender
                  </label>
                  <div className="flex gap-4">
                    {['male', 'female', 'neutral'].map((gender) => (
                      <label key={gender} className="flex items-center">
                        <input
                          type="radio"
                          name="avatarGender"
                          value={gender}
                          checked={formData.avatarGender === gender}
                          onChange={(e) =>
                            setFormData({ ...formData, avatarGender: e.target.value })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {gender}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Avatar Style
                  </label>
                  <div className="flex gap-4">
                    {['professional', 'casual', 'friendly', 'formal'].map((style) => (
                      <label key={style} className="flex items-center">
                        <input
                          type="radio"
                          name="avatarStyle"
                          value={style}
                          checked={formData.avatarStyle === style}
                          onChange={(e) =>
                            setFormData({ ...formData, avatarStyle: e.target.value })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {style}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Setup Voice */}
          {step === 3 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Setup Voice
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure how your video agent will speak
              </p>

              <div className="space-y-6">
                {/* Voice Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Voice Provider
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {voiceProviders.map((provider) => (
                      <div
                        key={provider.value}
                        onClick={() =>
                          setFormData({ ...formData, voiceProvider: provider.value })
                        }
                        className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                          formData.voiceProvider === provider.value
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {provider.label}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {provider.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OpenAI Voice Selection */}
                {formData.voiceProvider === 'OPENAI_TTS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Voice
                    </label>
                    <select
                      value={formData.voiceName}
                      onChange={(e) =>
                        setFormData({ ...formData, voiceName: e.target.value })
                      }
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      {openAIVoices.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {voice.label} ({voice.gender})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Voice Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Voice Speed: {formData.voiceSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={formData.voiceSpeed}
                    onChange={(e) =>
                      setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                {/* Test Voice Button */}
                <div>
                  <button
                    type="button"
                    onClick={testVoice}
                    disabled={testingVoice}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    {testingVoice ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Test Voice
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 4 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Review & Create
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Review your configuration and create your video agent
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Agent</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {agents.find((a) => a.id === formData.agentId)?.name || 'Not selected'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Avatar</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.avatarType.replace('_', ' ')} • {formData.avatarGender} • {formData.avatarStyle}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Voice</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.voiceProvider.replace('_', ' ')} • {formData.voiceName} • {formData.voiceSpeed}x speed
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Interaction</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.enableVideo && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        Video Enabled
                      </span>
                    )}
                    {formData.enableVoice && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        Voice Enabled
                      </span>
                    )}
                    {formData.enableText && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        Text Chat Enabled
                      </span>
                    )}
                    {formData.enableEmotions && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        Emotions Enabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Create Video Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateVideoAgent;
