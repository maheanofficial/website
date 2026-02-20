/**
 * Convert any Arabic numerals (0-9) into Bangla numerals.
 */
export const toBanglaNumber = (num: number | string): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const numString = num.toString();

    return numString
        .split('')
        .map((char) => {
            const digit = Number.parseInt(char, 10);
            return Number.isNaN(digit) ? char : banglaDigits[digit];
        })
        .join('');
};

/**
 * Format number with Bangla suffix (K, M, etc.)
 */
export const formatBanglaCount = (num: number): string => {
    if (num >= 10000000) {
        return toBanglaNumber((num / 10000000).toFixed(1)) + ' কোটি';
    }
    if (num >= 100000) {
        return toBanglaNumber((num / 100000).toFixed(1)) + ' লক্ষ';
    }
    if (num >= 1000) {
        return toBanglaNumber((num / 1000).toFixed(1)) + ' হাজার';
    }
    return toBanglaNumber(num);
};
