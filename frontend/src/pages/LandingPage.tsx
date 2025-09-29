import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neural-900 via-primary-900 to-purple-900">
      <div className="relative">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-display font-bold text-white mb-6 animate-fade-in">
              🧠 <span className="gradient-text">NeurallEmpire</span> 👑
            </h1>
            <p className="text-2xl font-display text-neural-100 mb-4 animate-fade-in animation-delay-150">
              Where AI Meets ALL
            </p>
            <p className="text-lg text-neural-200 mb-12 max-w-2xl mx-auto animate-fade-in animation-delay-300">
              Transform your business with 10,000+ AI agents that dominate markets with 97% precision.
              Join the empire that's revolutionizing digital growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-500">
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-4 rounded-xl"
              >
                Start Your Empire
              </Link>
              <Link
                to="/login"
                className="btn-ghost text-white border-white hover:bg-white hover:text-neural-900 text-lg px-8 py-4 rounded-xl"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-white text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-display font-semibold mb-2">AI Agent Management</h3>
              <p className="text-neural-200">Deploy and manage thousands of AI agents for lead generation and marketing automation.</p>
            </div>
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-white text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-display font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-neural-200">Track performance, ROI, and conversion rates with advanced analytics dashboards.</p>
            </div>
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-white text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-display font-semibold mb-2">Multi-tenant SaaS</h3>
              <p className="text-neural-200">Complete SaaS platform with subdomain management and custom branding.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-display font-bold text-white mb-6">
            Ready to Build Your AI Empire?
          </h2>
          <p className="text-lg text-neural-200 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using NeurallEmpire to dominate their markets.
          </p>
          <Link
            to="/register"
            className="btn-primary text-lg px-8 py-4 rounded-xl"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;