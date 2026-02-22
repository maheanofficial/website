const MOJIBAKE_PATTERN = /(?:Ã Â¦|Ã Â§|Ãƒ|Ã‚|Ã¢â‚¬|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬ï¿½|à¦|à§|â€|â€™|â€œ|â€�)/;

const scoreMojibake = (value: string) =>
    (String(value).match(/(?:Ã Â¦|Ã Â§|Ãƒ|Ã‚|Ã¢â‚¬|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬ï¿½|à¦|à§|â€|â€™|â€œ|â€�|ï¿½|�)/g) || []).length;

const scoreBangla = (value: string) =>
    (String(value).match(/[\u0980-\u09FF]/g) || []).length;

const decodeLatin1AsUtf8 = (value: string) => {
    try {
        const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
        return value;
    }
};

export const repairMojibakeText = (value: string): string => {
    if (!value || !MOJIBAKE_PATTERN.test(value)) return value;

    let current = value;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const decoded = decodeLatin1AsUtf8(current);
        if (!decoded || decoded === current) break;

        const improvedBangla = scoreBangla(decoded) > scoreBangla(current);
        const reducedNoise = scoreMojibake(decoded) < scoreMojibake(current);
        if (!improvedBangla && !reducedNoise) break;

        current = decoded;
    }

    return current;
};
