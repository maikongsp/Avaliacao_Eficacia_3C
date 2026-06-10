export type SkillLevel = 'REATIVO' | 'DEPENDENTE' | 'INDEPENDENTE';

const LEVEL_ORDER: Record<SkillLevel, number> = {
  REATIVO: 0,
  DEPENDENTE: 1,
  INDEPENDENTE: 2,
};

export function calculateAchievedLevel(n: number, correct: number): SkillLevel {
  if (n === 0) return 'REATIVO';
  if (correct === 0) return 'REATIVO';
  if (correct >= n) return 'INDEPENDENTE';
  return 'DEPENDENTE';
}

export function calculateGap(desiredLevel: SkillLevel, achievedLevel: SkillLevel, percentage: number): number {
  const desiredOrder = LEVEL_ORDER[desiredLevel];
  const achievedOrder = LEVEL_ORDER[achievedLevel];
  if (achievedOrder >= desiredOrder) return 0;
  return parseFloat((1.0 - percentage).toFixed(4));
}

export function metDesiredLevel(desired: SkillLevel, achieved: SkillLevel): boolean {
  return LEVEL_ORDER[achieved] >= LEVEL_ORDER[desired];
}

export function levelColor(level: SkillLevel): string {
  const map: Record<SkillLevel, string> = {
    REATIVO: 'red',
    DEPENDENTE: 'orange',
    INDEPENDENTE: 'green',
  };
  return map[level];
}

export function levelLabel(level: SkillLevel | string): string {
  const map: Record<string, string> = {
    REATIVO: 'Reativo',
    DEPENDENTE: 'Dependente',
    INDEPENDENTE: 'Independente',
  };
  return map[level] ?? level;
}

export { LEVEL_ORDER };
