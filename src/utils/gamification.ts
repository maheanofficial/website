import type { ReaderActivityItem } from './readerExperience';

export type Badge = {
    id: string;
    name: string;
    description: string;
    icon: string; // lucide icon name or emoji or CSS class
    isUnlocked: boolean;
    unlockedAt?: string;
    progress: number; // 0 to 100
    targetValue: number;
    currentValue: number;
};

export type UserStreak = {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string;
    readToday: boolean;
};

// Retrieve user's gamification data
export const calculateStreak = (history: ReaderActivityItem[]): UserStreak => {
    if (history.length === 0) {
        return { currentStreak: 0, longestStreak: 0, readToday: false };
    }

    // Get unique dates (YYYY-MM-DD) from history updatedAt field
    const activeDates = Array.from(
        new Set(
            history
                .map((item) => {
                    try {
                        const date = new Date(item.updatedAt);
                        if (Number.isNaN(date.getTime())) return '';
                        // format to YYYY-MM-DD in local time
                        const offset = date.getTimezoneOffset();
                        const localDate = new Date(date.getTime() - offset * 60 * 1000);
                        return localDate.toISOString().split('T')[0];
                    } catch {
                        return '';
                    }
                })
                .filter(Boolean)
        )
    ).sort(); // Sort in ascending order

    if (activeDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0, readToday: false };
    }

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        return local.toISOString().split('T')[0];
    };

    const todayStr = getLocalDateString(new Date());
    const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

    const readToday = activeDates.includes(todayStr);
    const readYesterday = activeDates.includes(yesterdayStr);

    // Calculate current streak
    let currentStreak = 0;
    if (readToday || readYesterday) {
        // start tracing backwards from the latest date in activeDates that is today or yesterday
        let checkDate = readToday ? new Date() : new Date(Date.now() - 86400000);
        let checkStr = getLocalDateString(checkDate);

        while (activeDates.includes(checkStr)) {
            currentStreak++;
            // subtract 1 day
            checkDate = new Date(checkDate.getTime() - 86400000);
            checkStr = getLocalDateString(checkDate);
        }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate: Date | null = null;

    for (const dateStr of activeDates) {
        const currentDate = new Date(dateStr);
        if (expectedDate === null) {
            tempStreak = 1;
        } else {
            const diffTime = currentDate.getTime() - expectedDate.getTime();
            const diffDays = Math.round(diffTime / 86400000);
            
            if (diffDays <= 1) {
                // Consecutive day (or multiple records on same day)
                if (diffDays === 1) {
                    tempStreak++;
                }
            } else {
                // Streak broken
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 1;
            }
        }
        expectedDate = currentDate;
    }

    if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
    }

    return {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        lastActiveDate: activeDates[activeDates.length - 1],
        readToday
    };
};

// Check and award badges
export const evaluateBadges = (
    history: ReaderActivityItem[],
    commentsCount: number,
    streak: UserStreak
): Badge[] => {
    // 1. First Step (প্রথম পদক্ষেপ)
    const hasReadFirst = history.length >= 1;
    const badgeFirstStep: Badge = {
        id: 'first_step',
        name: 'First Step',
        description: 'Began reading your first story on the platform.',
        icon: 'footprints',
        isUnlocked: hasReadFirst,
        progress: hasReadFirst ? 100 : 0,
        targetValue: 1,
        currentValue: history.length > 0 ? 1 : 0
    };

    // 2. Bookworm (বুকওয়ার্ম)
    const bookwormProgress = Math.min(100, Math.round((history.length / 5) * 100));
    const badgeBookworm: Badge = {
        id: 'bookworm',
        name: 'Bookworm',
        description: 'Read or started at least 5 stories.',
        icon: 'book-open',
        isUnlocked: history.length >= 5,
        progress: bookwormProgress,
        targetValue: 5,
        currentValue: history.length
    };

    // 3. Night Owl (নৈশচারী)
    const readAfterMidnight = history.some((item) => {
        try {
            const hr = new Date(item.updatedAt).getHours();
            return hr >= 0 && hr < 5; // Midnight to 5 AM
        } catch {
            return false;
        }
    });
    const badgeNightOwl: Badge = {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Read a story chapter between midnight and 5:00 AM.',
        icon: 'moon',
        isUnlocked: readAfterMidnight,
        progress: readAfterMidnight ? 100 : 0,
        targetValue: 1,
        currentValue: readAfterMidnight ? 1 : 0
    };

    // 4. Active Reader (নিয়মিত পাঠক)
    const activeProgress = Math.min(100, Math.round((streak.longestStreak / 3) * 100));
    const badgeActiveReader: Badge = {
        id: 'active_reader',
        name: 'Active Reader',
        description: 'Maintained a 3-day consecutive reading streak.',
        icon: 'flame',
        isUnlocked: streak.longestStreak >= 3,
        progress: activeProgress,
        targetValue: 3,
        currentValue: streak.longestStreak
    };

    // 5. Dedicated Reader (নিষ্ঠাবান পাঠক)
    const dedicatedProgress = Math.min(100, Math.round((streak.longestStreak / 7) * 100));
    const badgeDedicatedReader: Badge = {
        id: 'dedicated_reader',
        name: 'Dedicated Reader',
        description: 'Maintained a 7-day consecutive reading streak.',
        icon: 'award',
        isUnlocked: streak.longestStreak >= 7,
        progress: dedicatedProgress,
        targetValue: 7,
        currentValue: streak.longestStreak
    };

    // 6. Reviewer (সমালোচক)
    const reviewerProgress = Math.min(100, Math.round((commentsCount / 1) * 100));
    const badgeReviewer: Badge = {
        id: 'reviewer',
        name: 'Story Reviewer',
        description: 'Left a comment or shared feedback on any story.',
        icon: 'message-square',
        isUnlocked: commentsCount >= 1,
        progress: reviewerProgress,
        targetValue: 1,
        currentValue: commentsCount
    };

    return [
        badgeFirstStep,
        badgeBookworm,
        badgeNightOwl,
        badgeActiveReader,
        badgeDedicatedReader,
        badgeReviewer
    ];
};
