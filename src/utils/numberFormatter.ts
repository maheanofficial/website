/**
 * Convert numbers to Bangla numerals when enabled.
 * @param num - Number to convert
 * @returns Formatted numeral string
 */
export const toBanglaNumber = (num: number | string): string => {
    const useBanglaDigits = false;
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const numString = num.toString();

    if (!useBanglaDigits) {
        return numString;
    }

    return numString.split('').map(char => {
        const digit = parseInt(char);
        return isNaN(digit) ? char : banglaDigits[digit];
    }).join('');
};

/**
 * Format number with Bangla suffix (K, M, etc.)
 * @param num - Number to format
 * @returns Formatted Bangla number with suffix
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
