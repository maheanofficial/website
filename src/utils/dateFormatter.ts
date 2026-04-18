/**
 * Format date to Bangladesh timezone with clean, modern format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Format: "৩ ফেব ২০২৬"
    const formatted = date.toLocaleDateString('bn-BD', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return formatted;
};

/**
 * Format date - longer version
 * @param dateString - ISO date string or Date object  
 * @returns Formatted date string
 */
export const formatLongDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Format: "৩ ফেব্রুয়ারি ২০২৬"
    return date.toLocaleDateString('bn-BD', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * Format date with time
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Format: "৩ ফেব্রুয়ারি ২০২৬, দুপুর ১২:১৯"
    return date.toLocaleString('bn-BD', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Get relative time in Bengali (e.g., "২ ঘন্টা আগে")
 * @param dateString - ISO date string or Date object
 * @returns Relative time string in Bengali
 */
export const getRelativeTime = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffMs / 2592000000);
    const diffYears = Math.floor(diffMs / 31536000000);

    if (diffMins < 1) return 'এইমাত্র';
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    if (diffDays < 30) return `${diffDays} দিন আগে`;
    if (diffMonths < 12) return `${diffMonths} মাস আগে`;
    return `${diffYears} বছর আগে`;
};

// Backward compatibility aliases
export const formatBanglaDate = formatDateTime;
export const formatShortDate = formatLongDate;
