import { describe, it, expect } from 'vitest';
import { calculateStreak, evaluateBadges } from '../gamification';

interface MockActivity {
    updatedAt: string;
}

describe('calculateStreak', () => {
    it('returns empty streak for empty history', () => {
        const result = calculateStreak([]);
        expect(result.currentStreak).toBe(0);
        expect(result.longestStreak).toBe(0);
        expect(result.readToday).toBe(false);
    });

    it('calculates consecutive days correctly', () => {
        const today = new Date();
        const yesterday = new Date(Date.now() - 86400000);
        const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

        const history: MockActivity[] = [
            { updatedAt: twoDaysAgo.toISOString() },
            { updatedAt: yesterday.toISOString() },
            { updatedAt: today.toISOString() },
        ];

        const result = calculateStreak(history as Parameters<typeof calculateStreak>[0]);
        expect(result.currentStreak).toBe(3);
        expect(result.longestStreak).toBe(3);
        expect(result.readToday).toBe(true);
    });

    it('calculates streaks with gaps', () => {
        const today = new Date();
        const fourDaysAgo = new Date(Date.now() - 86400000 * 4);
        const fiveDaysAgo = new Date(Date.now() - 86400000 * 5);

        const history: MockActivity[] = [
            { updatedAt: fiveDaysAgo.toISOString() },
            { updatedAt: fourDaysAgo.toISOString() },
            { updatedAt: today.toISOString() },
        ];

        const result = calculateStreak(history as Parameters<typeof calculateStreak>[0]);
        expect(result.currentStreak).toBe(1);
        expect(result.longestStreak).toBe(2);
        expect(result.readToday).toBe(true);
    });
});

describe('evaluateBadges', () => {
    it('returns initial unearned badges for empty history', () => {
        const badges = evaluateBadges([], 0, { currentStreak: 0, longestStreak: 0, readToday: false });
        expect(badges.length).toBe(6);
        expect(badges.every(b => !b.isUnlocked)).toBe(true);
    });

    it('unlocks First Step on first read', () => {
        const history: MockActivity[] = [{ updatedAt: new Date().toISOString() }];
        const badges = evaluateBadges(
            history as Parameters<typeof evaluateBadges>[0],
            0,
            { currentStreak: 1, longestStreak: 1, readToday: true }
        );

        const firstStep = badges.find(b => b.id === 'first_step');
        expect(firstStep?.isUnlocked).toBe(true);
    });
});
