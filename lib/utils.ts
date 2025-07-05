import { type ClassValue } from 'clsx';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function formatPlayerName(name: string): string {
  return name.trim().slice(0, 20);
}

export function getCardColor(value: string): 'red' | 'black' {
  const suit = value.slice(-1);
  return suit === '♥' || suit === '♦' ? 'red' : 'black';
}

export function getCardDisplayValue(value: string): string {
  if (value.length <= 2) return value;
  return value.slice(0, -1);
}

export function getCardSuit(value: string): string {
  return value.slice(-1);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}