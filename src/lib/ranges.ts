export type SkillLevel = 'REATIVO' | 'DEPENDENTE' | 'INDEPENDENTE' | 'INTERDEPENDENTE';

const LEVEL_ORDER: Record<SkillLevel, number> = {
  REATIVO: 0,
  DEPENDENTE: 1,
  INDEPENDENTE: 2,
  INTERDEPENDENTE: 3,
};

function getIndependentMin(n: number): number {
  const map: Record<number, number> = {
    2: 0.5,
    3: 0.667,
    4: 0.5,
    5: 0.6,
    6: 0.5,
  };
  return map[n] ?? 0.5;
}

function getDependentMin(n: number): number {
  if (n <= 2) return 0.5;
  return 1 / n;
}

export function calculateAchievedLevel(n: number, correct: number): SkillLevel {
  if (n === 0) return 'REATIVO';
  if (correct === 0) return 'REATIVO';
  if (correct >= n) return 'INTERDEPENDENTE';

  const pct = correct / n;
  const indMin = getIndependentMin(n);
  const depMin = getDependentMin(n);

  if (pct >= indMin) return 'INDEPENDENTE';
  if (pct >= depMin) return 'DEPENDENTE';
  return 'REATIVO';
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
    INDEPENDENTE: 'blue',
    INTERDEPENDENTE: 'green',
  };
  return map[level];
}

export function levelLabel(level: SkillLevel | string): string {
  const map: Record<string, string> = {
    REATIVO: 'Reativo',
    DEPENDENTE: 'Dependente',
    INDEPENDENTE: 'Independente',
    INTERDEPENDENTE: 'Interdependente',
  };
  return map[level] ?? level;
}

export { LEVEL_ORDER };
