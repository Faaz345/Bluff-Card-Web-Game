'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Gamepad2, Users, Zap, Shield } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          router.push('/game/lobby');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-game-background via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Multiplayer",
      description: "Play with 2-8 players in real-time"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-time",
      description: "Instant updates across all devices"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure",
      description: "Protected rooms with unique codes"
    },
    {
      icon: <Gamepad2 className="w-8 h-8" />,
      title: "Fun",
      description: "Classic bluffing gameplay"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-background via-slate-900 to-slate-800">
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo/Title */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent mb-4">
                Bluff
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 font-medium">
                The Ultimate Card Bluffing Game
              </p>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Challenge your friends in this classic card game of deception and strategy. 
              Create rooms, join games, and see who's the ultimate bluffer!
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button
                size="lg"
                variant="primary"
                onClick={() => router.push('/auth/signup')}
                className="text-lg px-8 py-4"
              >
                Start Playing
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => router.push('/auth/login')}
                className="text-lg px-8 py-4 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Sign In
              </Button>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-blue-400 mb-3 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <p className="text-slate-500 text-sm">
              Built with Next.js, Supabase, and Tailwind CSS
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 