export const LEVELS = [
  { name: 'Beginner', xpRequired: 0 },
  { name: 'Intermediate', xpRequired: 1000 },
  { name: 'Advanced', xpRequired: 2500 },
  { name: 'Pro', xpRequired: 5000 },
];

export function calculateLevel(xp: number): string {
  if (xp >= 5000) return 'Pro';
  if (xp >= 2500) return 'Advanced';
  if (xp >= 1000) return 'Intermediate';
  return 'Beginner';
}

export function getLevelFromXP(xp: number): { name: string } {
  return { name: calculateLevel(xp) };
}

export function getLevelProgress(xp: number) {
  if (xp >= 5000) return { current: xp, next: 10000, percentage: 100 };
  if (xp >= 2500) return { current: xp, next: 5000, percentage: ((xp - 2500) / 2500) * 100 };
  if (xp >= 1000) return { current: xp, next: 2500, percentage: ((xp - 1000) / 1500) * 100 };
  return { current: xp, next: 1000, percentage: (xp / 1000) * 100 };
}
