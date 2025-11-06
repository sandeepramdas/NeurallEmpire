import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  VideoCameraIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface VideoAgent {
  id: string;
  uuid: string;
  agentId: string;
  avatarType: string;
  voiceProvider: string;
  voiceName: string;
  totalConversations: number;
  totalMessages: number;
  satisfactionScore: number;
  isActive: boolean;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    type: string;
  };
}

const VideoAgentsList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videoAgents, setVideoAgents] = useState<VideoAgent[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchVideoAgents();
  }, []);

  const fetchVideoAgents = async () => {
    try {
      const response = await api.get('/video-agents');
      setVideoAgents(response.data.videoAgents || []);
    } catch (error) {
      console.error('Error fetching video agents:', error);
      toast.error('Failed to load video agents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video agent?')) {
      return;
    }

    setDeleting(id);

    try {
      await api.delete(`/video-agents/${id}`);
      toast.success('Video agent deleted successfully');
      setVideoAgents(videoAgents.filter((va) => va.id !== id));
    } catch (error) {
      console.error('Error deleting video agent:', error);
      toast.error('Failed to delete video agent');
    } finally {
      setDeleting(null);
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading video agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <VideoCameraIcon className="h-8 w-8 text-indigo-600" />
              AI Video Agents
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your intelligent video avatars with voice interactions
            </p>
          </div>
          <button
            onClick={() => navigate('create')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Video Agent
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 rounded-md p-3">
                <VideoCameraIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Agents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videoAgents.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
                <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Conversations
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videoAgents.reduce((sum, va) => sum + va.totalConversations, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-md p-3">
                <PlayIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Messages
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videoAgents.reduce((sum, va) => sum + va.totalMessages, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-md p-3">
                <span className="text-2xl">⭐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Satisfaction
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videoAgents.length > 0
                    ? (
                        videoAgents.reduce((sum, va) => sum + va.satisfactionScore, 0) /
                        videoAgents.length
                      ).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Agents List */}
        {videoAgents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <VideoCameraIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No video agents yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first AI video agent to get started with intelligent video interactions
            </p>
            <button
              onClick={() => navigate('create')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Video Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videoAgents.map((videoAgent) => (
              <div
                key={videoAgent.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{getAvatarIcon(videoAgent.avatarType)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {videoAgent.agent.name}
                        </h3>
                        <p className="text-sm text-indigo-100">
                          {videoAgent.avatarType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        videoAgent.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {videoAgent.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Voice:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {videoAgent.voiceProvider.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Conversations:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {videoAgent.totalConversations}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {videoAgent.totalMessages}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Satisfaction:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {videoAgent.satisfactionScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <button
                      onClick={() => navigate(`${videoAgent.id}/chat`)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Launch
                    </button>
                    <button
                      onClick={() => navigate(`${videoAgent.id}/analytics`)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      Analytics
                    </button>
                    <button
                      onClick={() => navigate(`${videoAgent.id}/edit`)}
                      className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(videoAgent.id)}
                      disabled={deleting === videoAgent.id}
                      className="inline-flex justify-center items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {deleting === videoAgent.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400">
                  Created {new Date(videoAgent.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoAgentsList;
