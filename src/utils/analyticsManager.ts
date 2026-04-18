import { supabase } from '../lib/supabase';

export interface DailyStat {
    date: string;
    visitors: number;
    device: {
        mobile: number;
        iphone: number;
        pc: number;
        other: number;
    };
    country: Record<string, number>;
}

const STORAGE_KEY = 'mahean_analytics_data';
const ANALYTICS_TABLE = 'analytics_daily';

const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iphone';
    if (ua.includes('Android')) return 'mobile';
    if (ua.includes('Windows') || ua.includes('Mac') || ua.includes('Linux')) return 'pc';
    return 'other';
};

const seedData = (): DailyStat[] => {
    const data: DailyStat[] = [];
    const today = new Date();

    for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();

        const growthFactor = 1 + ((365 - i) / 365) * 0.8;
        const baseVisitors = 80 + Math.random() * 40;

        const weekdayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.4 :
            dayOfWeek === 2 || dayOfWeek === 3 ? 0.85 : 1.0;

        const monthDay = d.getDate();
        const monthSpike = (monthDay === 1 || monthDay === 15) ? 1.3 : 1.0;

        const randomVariation = 0.8 + Math.random() * 0.4;

        const totalVisitors = Math.floor(
            baseVisitors * growthFactor * weekdayMultiplier * monthSpike * randomVariation
        );

        const mobileShare = 0.45 + (growthFactor - 1) * 0.15;
        const iphoneShare = 0.22 + (growthFactor - 1) * 0.05;
        const pcShare = 0.28 - (growthFactor - 1) * 0.15;

        const mobile = Math.floor(totalVisitors * mobileShare);
        const iphone = Math.floor(totalVisitors * iphoneShare);
        const pc = Math.floor(totalVisitors * pcShare);
        const other = totalVisitors - mobile - iphone - pc;

        const bdShare = 0.75 + Math.random() * 0.1;
        const countries: Record<string, number> = {
            'Bangladesh': Math.floor(totalVisitors * bdShare),
            'India': Math.floor(totalVisitors * (0.08 + Math.random() * 0.05)),
            'USA': Math.floor(totalVisitors * (0.03 + Math.random() * 0.03)),
            'UK': Math.floor(totalVisitors * (0.02 + Math.random() * 0.02)),
            'Pakistan': Math.floor(totalVisitors * (0.01 + Math.random() * 0.02)),
        };

        const countryTotal = Object.values(countries).reduce((a, b) => a + b, 0);
        if (countryTotal < totalVisitors) {
            countries['Bangladesh'] += totalVisitors - countryTotal;
        }

        data.push({
            date: dateStr,
            visitors: totalVisitors,
            device: { mobile, iphone, pc, other },
            country: countries
        });
    }

    return data;
};

export const getAnalyticsData = (): DailyStat[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        const seed = seedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
    return JSON.parse(stored);
};

export const trackVisit = async () => {
    if (sessionStorage.getItem('visited_this_session')) return;

    const allData = getAnalyticsData();
    const todayStr = new Date().toISOString().split('T')[0];
    const deviceType = getDeviceType();

    let todayStat = allData.find(d => d.date === todayStr);

    if (todayStat) {
        todayStat.visitors += 1;
        todayStat.device[deviceType] = (todayStat.device[deviceType] || 0) + 1;
        todayStat.country['Bangladesh'] = (todayStat.country['Bangladesh'] || 0) + 1;
    } else {
        todayStat = {
            date: todayStr,
            visitors: 1,
            device: { mobile: 0, iphone: 0, pc: 0, other: 0 },
            country: { 'Bangladesh': 1 }
        };
        todayStat.device[deviceType] = 1;
        allData.push(todayStat);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    sessionStorage.setItem('visited_this_session', 'true');

    try {
        const payload = {
            date: todayStr,
            visitors: todayStat.visitors,
            mobile: todayStat.device.mobile,
            iphone: todayStat.device.iphone,
            pc: todayStat.device.pc,
            other: todayStat.device.other,
            countries: todayStat.country,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from(ANALYTICS_TABLE)
            .upsert(payload, { onConflict: 'date' });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase analytics update failed', error);
    }
};

export const getStatsForPeriod = (days: number) => {
    const allData = getAnalyticsData();
    const slice = allData.slice(-days);

    const totalVisitors = slice.reduce((acc, curr) => acc + curr.visitors, 0);
    const devices = slice.reduce((acc, curr) => ({
        mobile: acc.mobile + curr.device.mobile,
        iphone: acc.iphone + curr.device.iphone,
        pc: acc.pc + curr.device.pc,
        other: acc.other + curr.device.other
    }), { mobile: 0, iphone: 0, pc: 0, other: 0 });

    const countries: Record<string, number> = {};
    slice.forEach(day => {
        Object.entries(day.country).forEach(([cntry, count]) => {
            countries[cntry] = (countries[cntry] || 0) + count;
        });
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayVisitors = allData.find(d => d.date === todayStr)?.visitors || 0;

    return { totalVisitors, todayVisitors, devices, countries, data: slice };
};
