import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name?: string) {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export function getRandomGradient() {
  const gradients = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat().format(num);
}