import React, { useState } from 'react';
import { MessageSquare, Users, BookOpen, Brain, LogIn, UserPlus } from 'lucide-react';
import AuthModal from '../Auth/AuthModal';

const HomePage: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleShowLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleShowRegister = () => {
    setAuthMode('register');
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9]">
      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#0D47A1]">Educational Chat</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShowLogin}
                className="px-4 py-2 text-[#1E88E5] hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                onClick={handleShowRegister}
                className="px-4 py-2 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Brain className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-[#0D47A1] mb-6 leading-tight">
              Welcome to the
              <br />
              <span className="bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] bg-clip-text text-transparent">
                Educational Chat
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[#37474F] mb-12 max-w-3xl mx-auto leading-relaxed">
              to chat with <strong className="text-[#1E88E5]">Teo</strong> and{' '}
              <strong className="text-[#1E88E5]">Jojo</strong>
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={handleShowRegister}
                className="px-8 py-4 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg flex items-center space-x-3"
              >
                <UserPlus className="w-6 h-6" />
                <span>Get Started</span>
              </button>
              <button
                onClick={handleShowLogin}
                className="px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white text-[#1E88E5] border-2 border-[#1E88E5] rounded-xl font-semibold text-lg transition-all hover:shadow-lg flex items-center space-x-3"
              >
                <LogIn className="w-6 h-6" />
                <span>Already have an account</span>
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#43A047] to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Interactive Conversation
              </h3>
              <p className="text-[#37474F] text-sm">
                Chat in real time with characters designed for different educational levels
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Adaptive Learning
              </h3>
              <p className="text-[#37474F] text-sm">
                Each character adapts to different learning styles and needs
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Intelligent Assessment
              </h3>
              <p className="text-[#37474F] text-sm">
                Reporting system that evaluates student progress and comprehension
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Education Management
              </h3>
              <p className="text-[#37474F] text-sm">
                Teachers can monitor progress and download detailed reports
              </p>
            </div>
          </div>

          {/* Characters Preview */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0D47A1] mb-8">
              Meet our characters
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🧒</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0D47A1] mb-2">Teo</h3>
                <p className="text-[#37474F] mb-4">9 years • 4th Grade</p>
                <p className="text-[#37474F] text-sm leading-relaxed">
                  Teo has difficulties with reading and writing. He enjoys colors and learns best with visual examples and patient guidance.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👧</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0D47A1] mb-2">Jojo</h3>
                <p className="text-[#37474F] mb-4">15 years • 10th Grade</p>
                <p className="text-[#37474F] text-sm leading-relaxed">
                  Jojo is shy and has mild intellectual challenges. She likes music and soccer, and learns better with concrete examples.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 text-center border border-blue-200">
            <h2 className="text-3xl font-bold text-[#0D47A1] mb-4">
              Ready to get started?
            </h2>
            <p className="text-[#37474F] text-lg mb-8 max-w-2xl mx-auto">
              Join our educational platform and discover a new way to learn and teach through conversation.
            </p>
            <button
              onClick={handleShowRegister}
              className="px-10 py-4 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-xl font-semibold text-xl transition-all hover:shadow-lg"
            >
              Create a free account
            </button>
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
      />
    </div>
  );
};

export default HomePage;