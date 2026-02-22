import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';

const BODY_LIMIT_BYTES = 512 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 80;
const SPEAK_WINDOW_MS = 60_000;
const SPEAK_MAX_REQUESTS = 35;
const DEFAULT_MAX_INPUT_CHARS = 1400;
const DEFAULT_TIMEOUT_MS = 30_000;
const OPENAI_SPEECH_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_FEMALE_VOICE = 'coral';
const DEFAULT_MALE_VOICE = 'verse';
const DEFAULT_NEUTRAL_VOICE = 'alloy';
const DEFAULT_OUTPUT_FORMAT = 'mp3';
const VOICE_VALUE_PATTERN = /^[a-z0-9_-]{2,32}$/i;

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const clampFloat = (value, min, max, fallback) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

const normalizeStyle = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'female' || normalized === 'male' || normalized === 'neutral') {
        return normalized;
    }
    return 'female';
};

const sanitizeText = (value) =>
    String(value || '')
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const resolveVoiceFromStyle = (style) => {
    const femaleVoice = pickFirstEnv('OPENAI_TTS_FEMALE_VOICE', 'OPENAI_TTS_VOICE') || DEFAULT_FEMALE_VOICE;
    const maleVoice = pickFirstEnv('OPENAI_TTS_MALE_VOICE') || DEFAULT_MALE_VOICE;
    const neutralVoice = pickFirstEnv('OPENAI_TTS_NEUTRAL_VOICE', 'OPENAI_TTS_VOICE') || DEFAULT_NEUTRAL_VOICE;

    if (style === 'male') return maleVoice;
    if (style === 'neutral') return neutralVoice;
    return femaleVoice;
};

const resolveVoiceInput = (value, fallbackVoice) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized && VOICE_VALUE_PATTERN.test(normalized)) {
        return normalized;
    }
    return fallbackVoice;
};

const buildInstructions = (style) => {
    const tone = style === 'male'
        ? 'deep and calm'
        : (style === 'neutral' ? 'balanced and clear' : 'warm and expressive');

    return [
        'Read this as natural Bangla storytelling.',
        'Use clear Bangla pronunciation and smooth pacing.',
        `Keep a ${tone} narrator tone.`,
        'Avoid robotic rhythm.'
    ].join(' ');
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: 'Too many requests. Please try again shortly.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const extractErrorMessage = async (response) => {
    const bodyText = await response.text().catch(() => '');
    if (!bodyText) return '';

    try {
        const parsed = JSON.parse(bodyText);
        const direct = typeof parsed?.error === 'string' ? parsed.error : '';
        const nested = typeof parsed?.error?.message === 'string' ? parsed.error.message : '';
        return direct || nested || '';
    } catch {
        return bodyText.slice(0, 300);
    }
};

const requestOpenAiSpeech = async ({ apiKey, payload, timeoutMs }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(OPENAI_SPEECH_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
};

const requestSpeechWithFallback = async ({ apiKey, payload, timeoutMs }) => {
    const primary = await requestOpenAiSpeech({
        apiKey,
        timeoutMs,
        payload: {
            ...payload,
            format: DEFAULT_OUTPUT_FORMAT
        }
    });
    if (primary.ok) {
        return { response: primary, errorMessage: '' };
    }

    const primaryMessage = await extractErrorMessage(primary);
    const primaryStatus = Number(primary.status) || 500;
    if (primaryStatus !== 400 || !primaryMessage.toLowerCase().includes('format')) {
        return { response: primary, errorMessage: primaryMessage };
    }

    const fallback = await requestOpenAiSpeech({
        apiKey,
        timeoutMs,
        payload: {
            ...payload,
            response_format: DEFAULT_OUTPUT_FORMAT
        }
    });
    if (fallback.ok) {
        return { response: fallback, errorMessage: '' };
    }

    const fallbackMessage = await extractErrorMessage(fallback);
    return { response: fallback, errorMessage: fallbackMessage || primaryMessage };
};

const sendAudioResponse = async (res, upstreamResponse) => {
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const upstreamType = String(upstreamResponse.headers.get('content-type') || '').toLowerCase();
    const contentType = upstreamType.startsWith('audio/')
        ? upstreamType
        : 'audio/mpeg';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-TTS-Provider', 'openai');
    res.end(buffer);
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `tts:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: BODY_LIMIT_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, { error: error?.message || 'Invalid JSON body.' });
        return;
    }

    const apiKey = pickFirstEnv('OPENAI_API_KEY');
    const model = pickFirstEnv('OPENAI_TTS_MODEL') || DEFAULT_MODEL;
    const maxInputChars = parsePositiveInt(process.env.OPENAI_TTS_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS);
    const action = String(body.action || 'speak').trim().toLowerCase();

    if (action === 'config') {
        json(res, 200, {
            enabled: Boolean(apiKey),
            provider: apiKey ? 'openai' : 'browser',
            model: apiKey ? model : '',
            maxInputChars,
            styles: {
                female: resolveVoiceFromStyle('female'),
                male: resolveVoiceFromStyle('male'),
                neutral: resolveVoiceFromStyle('neutral')
            }
        });
        return;
    }

    if (action !== 'speak') {
        json(res, 400, { error: `Unsupported action: ${action}` });
        return;
    }

    if (!isTrustedOrigin(req)) {
        json(res, 403, { error: 'Cross-site request blocked.' });
        return;
    }

    if (!applyRateLimit(res, `tts:speak:${clientIp}`, SPEAK_MAX_REQUESTS, SPEAK_WINDOW_MS)) {
        return;
    }

    if (!apiKey) {
        json(res, 503, {
            error: 'Neural TTS is not configured. Set OPENAI_API_KEY on the server.'
        });
        return;
    }

    const text = sanitizeText(body.text);
    if (!text) {
        json(res, 400, { error: 'text is required.' });
        return;
    }
    if (text.length > maxInputChars) {
        json(res, 413, {
            error: `text is too long. Max allowed length is ${maxInputChars} characters.`
        });
        return;
    }

    const style = normalizeStyle(body.style);
    const selectedVoice = resolveVoiceInput(body.voice, resolveVoiceFromStyle(style));
    const speed = clampFloat(Number(body.speed), 0.75, 1.15, 0.96);
    const instructions = String(body.instructions || '').trim() || buildInstructions(style);
    const timeoutMs = parsePositiveInt(process.env.OPENAI_TTS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

    let upstreamResponse;
    let upstreamError = '';
    try {
        const result = await requestSpeechWithFallback({
            apiKey,
            timeoutMs,
            payload: {
                model,
                voice: selectedVoice,
                input: text,
                speed,
                instructions
            }
        });
        upstreamResponse = result.response;
        upstreamError = result.errorMessage;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to contact speech provider.';
        json(res, 502, { error: message });
        return;
    }

    if (!upstreamResponse.ok) {
        const status = upstreamResponse.status === 429 ? 429 : 502;
        json(res, status, {
            error: upstreamError || 'Speech generation failed at provider.'
        });
        return;
    }

    await sendAudioResponse(res, upstreamResponse);
}
