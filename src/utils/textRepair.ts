const MOJIBAKE_PATTERN = /(?:\u00E0\u00A6|\u00E0\u00A7|\u00C3|\u00C2|\u00E2\u20AC|\u00EF\u00BF\u00BD|\uFFFD)/;

const scoreMojibake = (value: string) =>
    (String(value).match(/(?:\u00E0\u00A6|\u00E0\u00A7|\u00C3|\u00C2|\u00E2\u20AC|\u00EF\u00BF\u00BD|\uFFFD)/g) || []).length;

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

const decodeEscapedUnicode = (value: string) =>
    String(value ?? '').replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))
    );

export const repairMojibakeText = (value: string): string => {
    const input = decodeEscapedUnicode(String(value || ''));
    if (!input) return '';
    if (!MOJIBAKE_PATTERN.test(input)) return input;

    let current = input;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const decoded = decodeLatin1AsUtf8(current);
        if (!decoded || decoded === current) break;

        const improvedBangla = scoreBangla(decoded) > scoreBangla(current);
        const reducedNoise = scoreMojibake(decoded) < scoreMojibake(current);
        if (!improvedBangla && !reducedNoise) break;

        current = decoded;
    }

    return decodeEscapedUnicode(current);
};
