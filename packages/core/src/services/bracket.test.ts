import { describe, expect, it } from 'vitest';
import { buildBracket } from './bracket.js';

describe('buildBracket', () => {
  it('draws a power-of-two field with no byes', () => {
    const bracket = buildBracket(['a', 'b', 'c', 'd']);
    expect(bracket).toHaveLength(3); // 2 semis + 1 final

    const round1 = bracket.filter((m) => m.round === 1);
    expect(round1).toHaveLength(2);
    // Standard 4-seed order [1,4,2,3]: a vs d, then b vs c.
    expect(round1[0]).toMatchObject({ homeTeamId: 'a', awayTeamId: 'd', winnerTeamId: null });
    expect(round1[1]).toMatchObject({ homeTeamId: 'b', awayTeamId: 'c', winnerTeamId: null });

    const final = bracket.find((m) => m.round === 2);
    expect(final).toMatchObject({ homeTeamId: null, awayTeamId: null, winnerTeamId: null });
  });

  it('gives the top seed a bye and advances it', () => {
    const bracket = buildBracket(['a', 'b', 'c']); // size 4, seed 4 is empty
    const round1 = bracket.filter((m) => m.round === 1);

    expect(round1[0]).toMatchObject({ homeTeamId: 'a', awayTeamId: null, winnerTeamId: 'a' });
    expect(round1[1]).toMatchObject({ homeTeamId: 'b', awayTeamId: 'c', winnerTeamId: null });

    const final = bracket.find((m) => m.round === 2);
    expect(final).toMatchObject({ homeTeamId: 'a', awayTeamId: null });
  });

  it('produces 2^k - 1 matches and links rounds', () => {
    const bracket = buildBracket(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(bracket).toHaveLength(7); // 4 + 2 + 1
    expect(bracket.filter((m) => m.round === 1)).toHaveLength(4);
    expect(bracket.filter((m) => m.round === 3)).toHaveLength(1); // the final
  });

  it('rejects fewer than two teams', () => {
    expect(() => buildBracket(['a'])).toThrow();
  });
});
