'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Bluff Card Game</h1>
        <p className="text-xl">
          A multiplayer bluffing card game built with Next.js and Supabase
        </p>
        <div className="mt-8">
          <a href="/auth/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Login to Play
          </a>
        </div>
      </div>
    </main>
  );
} 