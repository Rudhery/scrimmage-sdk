/** A match produced by {@link buildBracket}, before it is assigned an id. */
export interface BracketMatchSpec {
  readonly round: number;
  readonly position: number;
  readonly homeTeamId: string | null;
  readonly awayTeamId: string | null;
  /** Pre-decided winner (a bye), or `null` for a match still to be played. */
  readonly winnerTeamId: string | null;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) {
    size *= 2;
  }
  return size;
}

/** Standard bracket seeding order for a power-of-two size (1-indexed seeds). */
function seedSlots(size: number): number[] {
  let slots = [1, 2];
  while (slots.length < size) {
    const mirror = slots.length * 2 + 1;
    const next: number[] = [];
    for (const seed of slots) {
      next.push(seed, mirror - seed);
    }
    slots = next;
  }
  return slots;
}

/**
 * Build a single-elimination bracket from a seed-ordered list of team ids
 * (index 0 = seed 1 = strongest). The result is a pure description of every
 * match: round 1 is filled from the standard seeding, top seeds receive byes
 * when the field is not a power of two, and those byes are advanced into round
 * 2. Later rounds start empty (both slots `null`) and are filled as matches are
 * played. Matches are returned sorted by round then position.
 */
export function buildBracket(seededTeamIds: readonly string[]): BracketMatchSpec[] {
  const teamCount = seededTeamIds.length;
  if (teamCount < 2) {
    throw new Error('A bracket needs at least two teams.');
  }

  const size = nextPowerOfTwo(teamCount);
  const totalRounds = Math.log2(size);
  const order = seedSlots(size);
  const teamForSeed = (seed: number): string | null =>
    seed <= teamCount ? (seededTeamIds[seed - 1] as string) : null;

  const matches = new Map<string, BracketMatchSpec>();
  const key = (round: number, position: number): string => `${round}:${position}`;
  const put = (spec: BracketMatchSpec): void => {
    matches.set(key(spec.round, spec.position), spec);
  };

  // Round 1 comes straight from the seeding order.
  const firstRoundMatches = size / 2;
  for (let position = 0; position < firstRoundMatches; position++) {
    const homeTeamId = teamForSeed(order[2 * position] as number);
    const awayTeamId = teamForSeed(order[2 * position + 1] as number);
    const bye = homeTeamId === null ? awayTeamId : awayTeamId === null ? homeTeamId : null;
    put({ round: 1, position, homeTeamId, awayTeamId, winnerTeamId: bye });
  }

  // Later rounds start empty.
  for (let round = 2; round <= totalRounds; round++) {
    const count = size / 2 ** round;
    for (let position = 0; position < count; position++) {
      put({ round, position, homeTeamId: null, awayTeamId: null, winnerTeamId: null });
    }
  }

  // Advance round-1 byes into round 2 (winner takes home slot for even positions).
  if (totalRounds >= 2) {
    for (let position = 0; position < firstRoundMatches; position++) {
      const match = matches.get(key(1, position));
      if (!match?.winnerTeamId) {
        continue;
      }
      const next = matches.get(key(2, Math.floor(position / 2)));
      if (!next) {
        continue;
      }
      matches.set(key(next.round, next.position), {
        ...next,
        homeTeamId: position % 2 === 0 ? match.winnerTeamId : next.homeTeamId,
        awayTeamId: position % 2 === 0 ? next.awayTeamId : match.winnerTeamId,
      });
    }
  }

  return [...matches.values()].sort((a, b) => a.round - b.round || a.position - b.position);
}
