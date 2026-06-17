const INDEXNOW_KEY = '63133624986647138bb9a47cc15c5d86';
const INDEXNOW_HOST = 'www.mahean.com';
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

export async function submitToIndexNow(urls) {
    if (!Array.isArray(urls) || !urls.length) return;

    const normalizedUrls = urls
        .map((url) => {
            const str = String(url || '').trim();
            if (str.startsWith('/')) {
                return `https://${INDEXNOW_HOST}${str}`;
            }
            return str;
        })
        .filter((str) => str.startsWith(`https://${INDEXNOW_HOST}/`));

    if (!normalizedUrls.length) return;

    try {
        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                host: INDEXNOW_HOST,
                key: INDEXNOW_KEY,
                keyLocation: INDEXNOW_KEY_LOCATION,
                urlList: normalizedUrls
            })
        });

        if (response.ok) {
            console.log(`[IndexNow] Successfully submitted ${normalizedUrls.length} URLs.`);
        } else {
            const body = await response.text();
            console.warn(`[IndexNow] Submission failed (status ${response.status}):`, body);
        }
    } catch (error) {
        console.error('[IndexNow] Failed to submit URLs:', error);
    }
}
