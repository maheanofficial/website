import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Mic2, X, Check, Settings2 } from 'lucide-react';
import './AudioPlayer.css';

interface AudioPlayerProps {
    src?: string;
    text?: string;
    title?: string;
    cover?: string;
}

type VoiceMode = 'female' | 'male' | 'neutral';
type TtsProvider = 'neural' | 'browser';

const TTS_CHUNK_FALLBACK = 1100;
const BROWSER_VOICE_ID_KEY = 'mahean_tts_browser_voice_id';
const BROWSER_VOICE_MODE_KEY = 'mahean_tts_browser_voice_mode';

const voiceModeLabels: Record<VoiceMode, string> = {
    female: 'বাংলা নারী কণ্ঠ',
    male: 'বাংলা পুরুষ কণ্ঠ',
    neutral: 'বাংলা নিরপেক্ষ কণ্ঠ'
};

const neuralVoiceHints: Record<VoiceMode, string> = {
    female: 'উষ্ণ, অনুভূতিপূর্ণ এবং গল্প বলার টোন',
    male: 'গভীর, স্থির এবং পরিষ্কার উচ্চারণ',
    neutral: 'সমতল, ব্যালেন্সড এবং দীর্ঘ গল্পের জন্য উপযুক্ত'
};

const cleanTextForTTS = (rawText: string) =>
    String(rawText || '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^#+\s/gm, '')
        .replace(/`/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();

const splitTextIntoChunks = (content: string, maxChars: number) => {
    if (!content) return [];
    if (content.length <= maxChars) return [content];

    const sentenceParts = content
        .split(/(?<=[।.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    const chunks: string[] = [];
    let bucket = '';

    const pushBucket = () => {
        if (bucket.trim()) chunks.push(bucket.trim());
        bucket = '';
    };

    sentenceParts.forEach((sentence) => {
        if (sentence.length > maxChars) {
            pushBucket();
            for (let index = 0; index < sentence.length; index += maxChars) {
                chunks.push(sentence.slice(index, index + maxChars));
            }
            return;
        }

        const candidate = bucket ? `${bucket} ${sentence}` : sentence;
        if (candidate.length > maxChars) {
            pushBucket();
            bucket = sentence;
            return;
        }
        bucket = candidate;
    });

    pushBucket();
    return chunks;
};

const getModeSettings = (mode: VoiceMode) => {
    switch (mode) {
        case 'female':
            return { rate: 0.92, pitch: 1.04 };
        case 'male':
            return { rate: 0.86, pitch: 0.9 };
        default:
            return { rate: 0.89, pitch: 0.96 };
    }
};

const isBanglaVoice = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    return lang.startsWith('bn') || name.includes('bangla') || name.includes('bengali');
};

const getVoiceGender = (voice: SpeechSynthesisVoice): VoiceMode => {
    const name = voice.name.toLowerCase();
    const femaleKeywords = ['female', 'tripti', 'tania', 'aditi', 'nabanita'];
    const maleKeywords = ['male', 'pradeep', 'bashkar', 'suhas', 'hemant'];

    if (femaleKeywords.some((keyword) => name.includes(keyword))) return 'female';
    if (maleKeywords.some((keyword) => name.includes(keyword))) return 'male';
    return 'neutral';
};

const getVoiceDisplayName = (voice: SpeechSynthesisVoice) => {
    const cleaned = voice.name
        .replace(/Google|Microsoft|Bangla|Bengali|Bangladesh|India/gi, '')
        .replace(/[()-]/g, '')
        .trim();
    return cleaned || voice.name;
};

const toVoiceId = (voice: SpeechSynthesisVoice) => `${voice.name}::${voice.lang}`;

const readStoredVoiceId = () => {
    if (typeof window === 'undefined') return '';
    try {
        return localStorage.getItem(BROWSER_VOICE_ID_KEY) || '';
    } catch {
        return '';
    }
};

const saveVoiceId = (value: string) => {
    if (typeof window === 'undefined') return;
    try {
        if (!value) {
            localStorage.removeItem(BROWSER_VOICE_ID_KEY);
            return;
        }
        localStorage.setItem(BROWSER_VOICE_ID_KEY, value);
    } catch {
        // ignore localStorage errors
    }
};

const readStoredVoiceMode = (): VoiceMode | null => {
    if (typeof window === 'undefined') return null;
    try {
        const value = (localStorage.getItem(BROWSER_VOICE_MODE_KEY) || '').trim().toLowerCase();
        if (value === 'female' || value === 'male' || value === 'neutral') return value;
        return null;
    } catch {
        return null;
    }
};

const saveVoiceMode = (mode: VoiceMode) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(BROWSER_VOICE_MODE_KEY, mode);
    } catch {
        // ignore localStorage errors
    }
};

const voiceQualityScore = (voice: SpeechSynthesisVoice, preferredMode: VoiceMode) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();

    let score = 0;

    if (lang === 'bn-bd') score += 90;
    else if (lang === 'bn-in') score += 80;
    else if (lang.startsWith('bn')) score += 60;

    if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 45;
    if (name.includes('wavenet')) score += 35;
    if (name.includes('microsoft')) score += 12;
    if (name.includes('google')) score += 10;
    if (!voice.localService) score += 8;

    const inferredGender = getVoiceGender(voice);
    if (inferredGender === preferredMode) score += 20;
    if (preferredMode === 'neutral' && inferredGender === 'neutral') score += 15;

    return score;
};

const pickPreferredVoice = (voiceList: SpeechSynthesisVoice[], preferredMode: VoiceMode) => {
    if (!voiceList.length) return null;
    const sorted = [...voiceList].sort((a, b) =>
        voiceQualityScore(b, preferredMode) - voiceQualityScore(a, preferredMode)
    );
    return sorted[0] || null;
};

const AudioPlayer = ({ src, text, title = 'Audio Track', cover }: AudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const isTTS = (!src || src.includes('demo-story.mp3')) && Boolean(text?.trim());
    const [ttsProvider, setTtsProvider] = useState<TtsProvider>('browser');
    const [ttsReady, setTtsReady] = useState(false);
    const [ttsError, setTtsError] = useState('');
    const [maxChunkChars, setMaxChunkChars] = useState(TTS_CHUNK_FALLBACK);
    const [isBuffering, setIsBuffering] = useState(false);
    const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => readStoredVoiceMode() || 'female');

    const chunkListRef = useRef<string[]>([]);
    const chunkAudioCacheRef = useRef<Map<number, string>>(new Map());
    const currentChunkIndexRef = useRef(0);
    const playSessionRef = useRef(0);

    const revokeChunkCache = () => {
        chunkAudioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
        chunkAudioCacheRef.current.clear();
    };

    const resetNeuralAudioState = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    };

    const stopBrowserSpeech = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        speechRef.current = null;
    };

    const requestNeuralChunkAudio = async (chunkText: string, mode: VoiceMode) => {
        const response = await fetch('/api/tts', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'speak',
                text: chunkText,
                style: mode
            })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const message = typeof payload?.error === 'string'
                ? payload.error
                : 'Neural voice generation failed.';
            throw new Error(message);
        }

        const audioBlob = await response.blob();
        if (!audioBlob || audioBlob.size === 0) {
            throw new Error('Neural voice returned empty audio.');
        }
        return URL.createObjectURL(audioBlob);
    };

    const prefetchNeuralChunk = async (chunkIndex: number, sessionId: number, mode: VoiceMode) => {
        const chunks = chunkListRef.current;
        if (chunkIndex < 0 || chunkIndex >= chunks.length) return;
        if (chunkAudioCacheRef.current.has(chunkIndex)) return;
        if (playSessionRef.current !== sessionId) return;

        try {
            const objectUrl = await requestNeuralChunkAudio(chunks[chunkIndex], mode);
            if (playSessionRef.current !== sessionId) {
                URL.revokeObjectURL(objectUrl);
                return;
            }
            chunkAudioCacheRef.current.set(chunkIndex, objectUrl);
        } catch (error) {
            console.warn('Neural prefetch failed', error);
        }
    };

    const playNeuralChunk = async (chunkIndex: number, sessionId: number, mode: VoiceMode) => {
        const audio = audioRef.current;
        const chunks = chunkListRef.current;

        if (!audio || chunks.length === 0) {
            setIsPlaying(false);
            return;
        }

        if (chunkIndex < 0 || chunkIndex >= chunks.length) {
            setIsPlaying(false);
            setChunkProgress({ current: chunks.length, total: chunks.length });
            return;
        }

        setIsBuffering(true);
        setTtsError('');

        try {
            let objectUrl = chunkAudioCacheRef.current.get(chunkIndex);
            if (!objectUrl) {
                objectUrl = await requestNeuralChunkAudio(chunks[chunkIndex], mode);
                if (playSessionRef.current !== sessionId) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                chunkAudioCacheRef.current.set(chunkIndex, objectUrl);
            }

            if (playSessionRef.current !== sessionId) return;

            currentChunkIndexRef.current = chunkIndex;
            setChunkProgress({ current: chunkIndex + 1, total: chunks.length });
            audio.src = objectUrl;
            audio.currentTime = 0;
            audio.volume = isMuted ? 0 : volume;
            await audio.play();
            setIsPlaying(true);

            void prefetchNeuralChunk(chunkIndex + 1, sessionId, mode);
        } catch (error) {
            if (playSessionRef.current !== sessionId) return;
            const message = error instanceof Error ? error.message : 'Neural playback failed.';
            setTtsError(message);
            setIsPlaying(false);
        } finally {
            if (playSessionRef.current === sessionId) {
                setIsBuffering(false);
            }
        }
    };

    const playNeuralChunkRef = useRef(playNeuralChunk);
    playNeuralChunkRef.current = playNeuralChunk;

    const startBrowserSpeech = (modeOverride: VoiceMode = voiceMode, voiceOverride: SpeechSynthesisVoice | null = selectedVoice) => {
        if (!text) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setTtsError('এই ব্রাউজারে ভয়েস সিন্থেসিস সাপোর্ট নেই।');
            return;
        }

        const cleanedText = cleanTextForTTS(text)
            .replace(/([,;:])/g, '$1 ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!cleanedText) {
            setTtsError('পড়ার মতো টেক্সট পাওয়া যায়নি।');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        const effectiveVoice = voiceOverride || selectedVoice || pickPreferredVoice(voices, modeOverride);
        if (effectiveVoice) {
            utterance.voice = effectiveVoice;
            utterance.lang = effectiveVoice.lang;
            setSelectedVoice(effectiveVoice);
            saveVoiceId(toVoiceId(effectiveVoice));
        } else {
            utterance.lang = 'bn-BD';
        }

        const modeSettings = getModeSettings(modeOverride);
        utterance.rate = modeSettings.rate;
        utterance.pitch = modeSettings.pitch;
        utterance.volume = isMuted ? 0 : volume;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => {
            setIsPlaying(false);
            setTtsError('ব্রাউজার ভয়েসে গল্প পড়া যায়নি।');
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (!isTTS) {
            setTtsReady(true);
            return;
        }

        let cancelled = false;
        setTtsReady(false);
        setTtsError('');

        const loadConfig = async () => {
            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'config' })
                });

                const payload = await response.json().catch(() => ({}));
                if (cancelled) return;

                const enabled = Boolean(payload?.enabled);
                setTtsProvider(enabled ? 'neural' : 'browser');

                const configuredMax = Number.parseInt(String(payload?.maxInputChars || ''), 10);
                if (Number.isFinite(configuredMax) && configuredMax > 200) {
                    setMaxChunkChars(Math.min(2500, configuredMax));
                } else {
                    setMaxChunkChars(TTS_CHUNK_FALLBACK);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('TTS config load failed', error);
                    setTtsProvider('browser');
                    setMaxChunkChars(TTS_CHUNK_FALLBACK);
                }
            } finally {
                if (!cancelled) {
                    setTtsReady(true);
                }
            }
        };

        void loadConfig();
        return () => {
            cancelled = true;
        };
    }, [isTTS]);

    useEffect(() => {
        if (!isTTS || ttsProvider !== 'browser') return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            const banglaVoices = allVoices.filter(isBanglaVoice);
            const uniqueVoices = banglaVoices.filter((voice, index, list) =>
                list.findIndex((entry) => entry.name === voice.name && entry.lang === voice.lang) === index
            );
            const rankedVoices = [...uniqueVoices].sort((a, b) =>
                voiceQualityScore(b, voiceMode) - voiceQualityScore(a, voiceMode)
            );
            setVoices(rankedVoices);

            if (uniqueVoices.length === 0) {
                setSelectedVoice(null);
                return;
            }

            const selectedId = selectedVoice ? toVoiceId(selectedVoice) : '';
            const savedVoiceId = readStoredVoiceId();

            const savedVoice = rankedVoices.find((voice) => toVoiceId(voice) === savedVoiceId) || null;
            const stillSelected = rankedVoices.find((voice) => toVoiceId(voice) === selectedId) || null;
            const preferredVoice = pickPreferredVoice(rankedVoices, voiceMode);

            const effectiveVoice = stillSelected || savedVoice || preferredVoice;
            if (effectiveVoice) {
                setSelectedVoice(effectiveVoice);
            }
        };

        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        };
    }, [isTTS, ttsProvider, selectedVoice, voiceMode]);

    useEffect(() => {
        if (!isTTS) return;

        const cleaned = cleanTextForTTS(text || '');
        const chunks = splitTextIntoChunks(cleaned, maxChunkChars);

        chunkListRef.current = chunks;
        currentChunkIndexRef.current = 0;
        setChunkProgress({ current: 0, total: chunks.length });
        playSessionRef.current += 1;
        setIsPlaying(false);
        setIsBuffering(false);
        setTtsError('');
        revokeChunkCache();
        resetNeuralAudioState();
        stopBrowserSpeech();
    }, [text, maxChunkChars, isTTS]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = isMuted ? 0 : volume;
    }, [volume, isMuted]);

    useEffect(() => {
        saveVoiceMode(voiceMode);
    }, [voiceMode]);

    useEffect(() => {
        if (!selectedVoice) return;
        saveVoiceId(toVoiceId(selectedVoice));
    }, [selectedVoice]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedData = () => {
            if (isTTS) return;
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        };

        const handleTimeUpdate = () => {
            if (isTTS) return;
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            if (isTTS && ttsProvider === 'neural') {
                const nextChunk = currentChunkIndexRef.current + 1;
                if (nextChunk >= chunkListRef.current.length) {
                    setIsPlaying(false);
                    setChunkProgress((prev) => ({ current: prev.total, total: prev.total }));
                    return;
                }

                const sessionId = playSessionRef.current;
                void playNeuralChunkRef.current(nextChunk, sessionId, voiceMode);
                return;
            }

            setIsPlaying(false);
            if (!isTTS) setCurrentTime(0);
        };

        audio.addEventListener('loadeddata', handleLoadedData);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadeddata', handleLoadedData);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isTTS, ttsProvider, voiceMode]);

    useEffect(() => () => {
        playSessionRef.current += 1;
        setShowVoiceModal(false);
        revokeChunkCache();
        resetNeuralAudioState();
        stopBrowserSpeech();
    }, []);

    const togglePlay = () => {
        if (isTTS) {
            if (!ttsReady) return;

            if (ttsProvider === 'neural') {
                const audio = audioRef.current;
                if (!audio) return;

                if (isPlaying) {
                    audio.pause();
                    setIsPlaying(false);
                    return;
                }

                if (audio.src && audio.paused && audio.currentTime > 0) {
                    audio.play()
                        .then(() => setIsPlaying(true))
                        .catch((error) => {
                            console.warn('Neural resume failed, restarting chunk', error);
                            const nextSession = playSessionRef.current + 1;
                            playSessionRef.current = nextSession;
                            void playNeuralChunk(currentChunkIndexRef.current, nextSession, voiceMode);
                        });
                    return;
                }

                if (currentChunkIndexRef.current >= chunkListRef.current.length) {
                    currentChunkIndexRef.current = 0;
                }

                const nextSession = playSessionRef.current + 1;
                playSessionRef.current = nextSession;
                void playNeuralChunk(currentChunkIndexRef.current, nextSession, voiceMode);
                return;
            }

            if (typeof window === 'undefined' || !window.speechSynthesis) return;
            if (isPlaying) {
                window.speechSynthesis.pause();
                setIsPlaying(false);
                return;
            }
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setIsPlaying(true);
                return;
            }
            startBrowserSpeech();
            return;
        }

        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        audio.play()
            .then(() => setIsPlaying(true))
            .catch((error) => console.warn('Audio play failed', error));
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isTTS) return;

        const time = Number.parseFloat(e.target.value);
        if (!Number.isFinite(time)) return;
        if (!audioRef.current) return;

        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextVolume = Number.parseFloat(e.target.value);
        if (!Number.isFinite(nextVolume)) return;
        setVolume(nextVolume);
        setIsMuted(nextVolume <= 0);
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);

        if (!audioRef.current) return;
        audioRef.current.volume = nextMuted ? 0 : volume;
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleVoiceSelect = (voice: SpeechSynthesisVoice) => {
        const nextMode = getVoiceGender(voice);
        setSelectedVoice(voice);
        setVoiceMode(nextMode);
        saveVoiceMode(nextMode);
        saveVoiceId(toVoiceId(voice));
        setShowVoiceModal(false);

        if (!isTTS || !isPlaying) return;

        if (ttsProvider === 'browser') {
            startBrowserSpeech(nextMode, voice);
            return;
        }

        playSessionRef.current += 1;
        revokeChunkCache();
        const sessionId = playSessionRef.current;
        void playNeuralChunk(currentChunkIndexRef.current, sessionId, nextMode);
    };

    const handleStyleSelect = (mode: VoiceMode) => {
        setVoiceMode(mode);
        setSelectedVoice(null);
        saveVoiceMode(mode);
        saveVoiceId('');
        setShowVoiceModal(false);

        if (!isTTS || !isPlaying) return;

        if (ttsProvider === 'browser') {
            startBrowserSpeech(mode, null);
            return;
        }

        playSessionRef.current += 1;
        revokeChunkCache();
        const sessionId = playSessionRef.current;
        void playNeuralChunk(currentChunkIndexRef.current, sessionId, mode);
    };

    const providerLabel = ttsProvider === 'neural' ? 'Neural Bangla' : 'Browser Bangla';
    const shouldShowChunkProgress = isTTS && ttsProvider === 'neural' && chunkProgress.total > 0;

    const statusLabel = (() => {
        if (!isTTS) return isPlaying ? 'Now Playing...' : 'Paused';
        if (!ttsReady) return 'কণ্ঠ সেটআপ হচ্ছে...';
        if (isBuffering) return 'কণ্ঠ প্রস্তুত হচ্ছে...';
        if (isPlaying) return 'গল্প পড়া চলছে...';
        return 'শুনতে প্রস্তুত';
    })();

    return (
        <div className="audio-player glass-panel">
            <audio
                ref={audioRef}
                src={!isTTS ? src : undefined}
                preload={isTTS ? 'none' : 'metadata'}
            />

            <div className="ap-info">
                {cover && (
                    <div className="ap-cover-wrapper">
                        <img src={cover} alt="Cover" className={`ap-cover ${isPlaying ? 'spinning' : ''}`} />
                    </div>
                )}
                <div className="ap-text">
                    <h4 className="ap-title">{title}</h4>
                    <span className="ap-status">{statusLabel}</span>

                    {isTTS && (
                        <span className="text-[10px] text-amber-400 opacity-80 mt-1 truncate max-w-[220px]">
                            কণ্ঠ: {voiceModeLabels[voiceMode]} • {providerLabel}
                        </span>
                    )}

                    {shouldShowChunkProgress && (
                        <span className="text-[10px] text-gray-300 opacity-80 mt-1">
                            অংশ {chunkProgress.current}/{chunkProgress.total}
                        </span>
                    )}
                </div>
            </div>

            <div className="ap-controls-container">
                <div className="ap-main-controls">
                    {!isTTS && (
                        <button
                            className="ap-btn secondary"
                            onClick={() => {
                                if (!audioRef.current) return;
                                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                            }}
                        >
                            <SkipBack size={18} />
                        </button>
                    )}

                    <button className="ap-btn primary play-btn" onClick={togglePlay} disabled={isTTS && !ttsReady}>
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    {!isTTS && (
                        <button
                            className="ap-btn secondary"
                            onClick={() => {
                                if (!audioRef.current) return;
                                audioRef.current.currentTime += 10;
                            }}
                        >
                            <SkipForward size={18} />
                        </button>
                    )}
                </div>

                {!isTTS ? (
                    <div className="ap-progress-container">
                        <span className="ap-time">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="ap-slider progress-slider"
                        />
                        <span className="ap-time">{formatTime(duration)}</span>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center justify-center gap-3 mt-4 border-t border-white/10 pt-4">
                        {isPlaying && (
                            <div className="flex items-center justify-center gap-2">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-xs text-gray-200 font-medium tracking-wide opacity-90 uppercase text-center">
                                    Story narration in progress
                                </span>
                            </div>
                        )}

                        <button
                            className="voice-change-btn group"
                            onClick={() => setShowVoiceModal((value) => !value)}
                            title="Change reading voice"
                        >
                            <Settings2 size={13} className="text-white/90 group-hover:rotate-90 transition-transform duration-500" />
                            <span>কণ্ঠ পরিবর্তন করুন</span>
                        </button>

                        {ttsError && (
                            <span className="text-[11px] text-rose-300 text-center max-w-[260px]">
                                {ttsError}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="ap-volume-container">
                <button className="ap-btn icon-only" onClick={toggleMute}>
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="ap-slider volume-slider"
                />
            </div>

            {showVoiceModal && (
                <div className="voice-selection-modal">
                    <div className="voice-header">
                        <span className="voice-title">গল্প পড়ার কণ্ঠ বাছাই করুন</span>
                        <button className="close-btn" onClick={() => setShowVoiceModal(false)}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="voice-list">
                        {(['female', 'male', 'neutral'] as VoiceMode[]).map((mode) => (
                            <button
                                key={mode}
                                className={`voice-option ${voiceMode === mode && !selectedVoice ? 'active' : ''}`}
                                onClick={() => handleStyleSelect(mode)}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="voice-name font-semibold text-sm">{voiceModeLabels[mode]}</span>
                                    <span className="voice-lang bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300 mt-1">
                                        {ttsProvider === 'neural' ? neuralVoiceHints[mode] : 'ডিফল্ট সিস্টেম কণ্ঠ'}
                                    </span>
                                </div>
                                {voiceMode === mode && !selectedVoice && <Check size={16} className="text-amber-400" />}
                            </button>
                        ))}

                        {ttsProvider === 'browser' && voices.length > 0 && (
                            voices.map((voice, index) => {
                                const gender = getVoiceGender(voice);
                                const label = voiceModeLabels[gender] || `বাংলা কণ্ঠ ${index + 1}`;
                                const subLabel = `${getVoiceDisplayName(voice)} • ${voice.lang.toUpperCase()}`;
                                const isActive = selectedVoice?.name === voice.name && selectedVoice?.lang === voice.lang;

                                return (
                                    <button
                                        key={`${voice.name}-${voice.lang}-${index}`}
                                        className={`voice-option ${isActive ? 'active' : ''}`}
                                        onClick={() => handleVoiceSelect(voice)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="voice-name font-semibold text-sm">{label}</span>
                                            <span className="voice-lang bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300 mt-1">
                                                {subLabel}
                                            </span>
                                        </div>
                                        {isActive && <Check size={16} className="text-amber-400" />}
                                    </button>
                                );
                            })
                        )}

                        {ttsProvider === 'browser' && voices.length === 0 && (
                            <div className="text-[10px] text-center text-gray-400 mt-2 flex flex-col items-center gap-2">
                                <Mic2 size={20} className="opacity-40" />
                                <p className="opacity-80 max-w-[220px]">
                                    ডিভাইসে বাংলা ভয়েস না থাকলে default voice ব্যবহার হবে। Edge/Windows এ উচ্চমানের free
                                    voice পেতে: Settings → Speech → Voices থেকে Bengali pack যোগ করুন।
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-[10px] text-amber-400 hover:underline"
                                >
                                    ভয়েস রিফ্রেশ করুন
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioPlayer;
