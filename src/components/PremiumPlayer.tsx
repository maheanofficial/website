import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Timer, Gauge, Youtube, VolumeX, Volume1 } from 'lucide-react';
import { toBanglaNumber } from '../utils/numberFormatter';
import './PremiumPlayer.css';

interface PremiumPlayerProps {
    videoId?: string;
    audioUrl?: string;
    text?: string;
    title?: string;
}

interface YTPlayer {
    destroy: () => void;
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    setVolume: (volume: number) => void;
    mute: () => void;
    unMute: () => void;
    setPlaybackRate: (rate: number) => void;
    getCurrentTime: () => number;
}

declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: {
            Player: new (elementId: string, options: unknown) => YTPlayer;
            PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
        };
    }
}

// Clean markdown / HTML tags from text for clear Bangla reading
const cleanTextForSpeech = (rawText?: string): string => {
    if (!rawText) return '';
    return rawText
        .replace(/<[^>]*>/g, '') // remove HTML tags
        .replace(/__MAHEAN_META__:[\s\S]*?:__MAHEAN_META_END__/g, '') // remove meta tags
        .replace(/[*_#`~[\]()]/g, ' ') // remove markdown symbols
        .replace(/\s+/g, ' ')
        .trim();
};

// Split text into short Bangla sentence chunks (under 160 chars for TTS URL limits)
const splitIntoSentences = (text: string): string[] => {
    if (!text) return [];
    const rawChunks = text.split(/(?<=[।?!.\n])\s+/);
    const chunks: string[] = [];

    for (const chunk of rawChunks) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;
        if (trimmed.length <= 160) {
            chunks.push(trimmed);
        } else {
            // Split long chunks by commas or spaces into ~120 char pieces
            const subParts = trimmed.match(/.{1,140}(?:\s+|$)/g) || [trimmed];
            for (const sub of subParts) {
                if (sub.trim()) chunks.push(sub.trim());
            }
        }
    }
    return chunks;
};

export default function PremiumPlayer({ videoId, audioUrl, text, title }: PremiumPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [isMuted, setIsMuted] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const [sleepTimer, setSleepTimer] = useState<number | null>(null);
    const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

    // Audio Mode: 'youtube' | 'audio' | 'tts'
    const playerMode = videoId && videoId.trim() ? 'youtube' : audioUrl && audioUrl.trim() ? 'audio' : 'tts';

    // Refs
    const ytPlayerRef = useRef<YTPlayer | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
    const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`).current;

    // TTS Refs
    const currentSentenceIdxRef = useRef(0);
    const sentencesRef = useRef<string[]>([]);
    const isTtsActiveRef = useRef(false);

    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanedText = cleanTextForSpeech(text);

    // Estimate TTS Duration (~160 words per minute for Bangla)
    useEffect(() => {
        if (playerMode === 'tts' && cleanedText) {
            const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
            const estimatedMins = Math.max(0.5, wordCount / 160);
            setDuration(Math.round(estimatedMins * 60));
            sentencesRef.current = splitIntoSentences(cleanedText);
        }
    }, [cleanedText, playerMode]);

    const cleanupIntervals = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    const stopTrackingProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    // YouTube Player Initialization
    const initializeYTPlayer = () => {
        if (!videoId || !window.YT || !window.YT.Player) return;
        ytPlayerRef.current = new window.YT.Player(containerId, {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: { playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0 },
            events: {
                onReady: (event: { target: { getDuration: () => number; setVolume: (v: number) => void } }) => {
                    setDuration(event.target.getDuration());
                    event.target.setVolume(volume);
                },
                onStateChange: (event: { data: number }) => {
                    if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                        setIsPlaying(true);
                        stopTrackingProgress();
                        progressIntervalRef.current = setInterval(() => {
                            if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                                setCurrentTime(ytPlayerRef.current.getCurrentTime());
                            }
                        }, 500);
                    } else {
                        setIsPlaying(false);
                        stopTrackingProgress();
                    }
                }
            }
        });
    };

    useEffect(() => {
        if (playerMode === 'youtube') {
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = () => initializeYTPlayer();
            } else {
                initializeYTPlayer();
            }
        }

        return () => {
            cleanupIntervals();
            if (ytPlayerRef.current?.destroy) {
                ytPlayerRef.current.destroy();
            }
            if (ttsAudioRef.current) {
                ttsAudioRef.current.pause();
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, playerMode]);

    // Web Speech API Fallback
    const playWebSpeechUtterance = (index: number) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const sentenceText = sentencesRef.current[index];
        if (!sentenceText) return;

        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = 'bn-BD';
        utterance.rate = speed;
        utterance.volume = isMuted ? 0 : volume / 100;

        const voices = synth.getVoices();
        const banglaVoice = voices.find(
            (v) =>
                v.lang.startsWith('bn') ||
                v.name.toLowerCase().includes('bangla') ||
                v.name.toLowerCase().includes('bengali')
        );
        if (banglaVoice) utterance.voice = banglaVoice;

        utterance.onend = () => {
            if (isTtsActiveRef.current) {
                currentSentenceIdxRef.current = index + 1;
                playSentenceAudio(index + 1);
            }
        };

        utterance.onerror = () => {
            if (isTtsActiveRef.current && index + 1 < sentencesRef.current.length) {
                currentSentenceIdxRef.current = index + 1;
                playSentenceAudio(index + 1);
            } else {
                setIsPlaying(false);
                stopTrackingProgress();
            }
        };

        synth.speak(utterance);
        synth.resume();
    };

    // Bangla Google Audio TTS Stream + Fallback
    const playSentenceAudio = (index: number) => {
        if (!sentencesRef.current.length) {
            sentencesRef.current = splitIntoSentences(cleanedText);
        }

        if (index >= sentencesRef.current.length) {
            setIsPlaying(false);
            stopTrackingProgress();
            currentSentenceIdxRef.current = 0;
            setCurrentTime(duration);
            return;
        }

        const sentenceText = sentencesRef.current[index];
        if (!sentenceText) return;

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=bn&client=tw-ob&q=${encodeURIComponent(sentenceText)}`;

        if (!ttsAudioRef.current) {
            ttsAudioRef.current = new Audio();
        }

        const audio = ttsAudioRef.current;
        audio.src = ttsUrl;
        audio.playbackRate = speed;
        audio.volume = isMuted ? 0 : volume / 100;

        audio.onended = () => {
            if (isTtsActiveRef.current) {
                const nextIdx = index + 1;
                currentSentenceIdxRef.current = nextIdx;
                playSentenceAudio(nextIdx);
            }
        };

        audio.onerror = () => {
            // Fallback to Web Speech API if Google TTS is blocked or offline
            console.warn('Google TTS audio load failed, using WebSpeech API fallback');
            playWebSpeechUtterance(index);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((err) => {
                    console.warn('Google TTS audio playback blocked, using WebSpeech fallback:', err);
                    playWebSpeechUtterance(index);
                });
        }
    };

    const startTtsPlayback = () => {
        isTtsActiveRef.current = true;
        setIsPlaying(true);

        if (!sentencesRef.current || sentencesRef.current.length === 0) {
            sentencesRef.current = splitIntoSentences(cleanedText);
        }

        stopTrackingProgress();
        progressIntervalRef.current = setInterval(() => {
            setCurrentTime((prev) => {
                const next = prev + 0.5 * speed;
                return next >= duration ? duration : next;
            });
        }, 500);

        playSentenceAudio(currentSentenceIdxRef.current);
    };

    const pauseTtsPlayback = () => {
        isTtsActiveRef.current = false;
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.pause();
            window.speechSynthesis.cancel();
        }
        setIsPlaying(false);
        stopTrackingProgress();
    };

    // Control Handlers
    const handlePlayPause = () => {
        if (playerMode === 'youtube') {
            if (!ytPlayerRef.current) return;
            if (isPlaying) ytPlayerRef.current.pauseVideo();
            else ytPlayerRef.current.playVideo();
        } else if (playerMode === 'audio') {
            if (!audioRef.current) return;
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                void audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
            // TTS Mode
            if (isPlaying) {
                pauseTtsPlayback();
            } else {
                startTtsPlayback();
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setCurrentTime(val);

        if (playerMode === 'youtube' && ytPlayerRef.current) {
            ytPlayerRef.current.seekTo(val, true);
        } else if (playerMode === 'audio' && audioRef.current) {
            audioRef.current.currentTime = val;
        } else if (playerMode === 'tts') {
            if (sentencesRef.current.length > 0 && duration > 0) {
                const ratio = val / duration;
                const targetIdx = Math.floor(ratio * sentencesRef.current.length);
                currentSentenceIdxRef.current = Math.min(targetIdx, sentencesRef.current.length - 1);
                if (isPlaying) {
                    playSentenceAudio(currentSentenceIdxRef.current);
                }
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setVolume(val);
        setIsMuted(val === 0);

        if (playerMode === 'youtube' && ytPlayerRef.current) {
            ytPlayerRef.current.setVolume(val);
        } else if (playerMode === 'audio' && audioRef.current) {
            audioRef.current.volume = val / 100;
        } else if (playerMode === 'tts' && ttsAudioRef.current) {
            ttsAudioRef.current.volume = val / 100;
        }
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);

        if (playerMode === 'youtube' && ytPlayerRef.current) {
            if (nextMuted) ytPlayerRef.current.mute();
            else ytPlayerRef.current.unMute();
        } else if (playerMode === 'audio' && audioRef.current) {
            audioRef.current.muted = nextMuted;
        } else if (playerMode === 'tts' && ttsAudioRef.current) {
            ttsAudioRef.current.muted = nextMuted;
        }
    };

    const handleSpeedChange = (newSpeed: number) => {
        setSpeed(newSpeed);

        if (playerMode === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
            ytPlayerRef.current.setPlaybackRate(newSpeed);
        } else if (playerMode === 'audio' && audioRef.current) {
            audioRef.current.playbackRate = newSpeed;
        } else if (playerMode === 'tts' && ttsAudioRef.current) {
            ttsAudioRef.current.playbackRate = newSpeed;
        }
    };

    const setTimer = (minutes: number | null) => {
        setSleepTimer(minutes);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (minutes === null) {
            setSecondsRemaining(null);
            return;
        }

        let seconds = minutes * 60;
        setSecondsRemaining(seconds);

        timerIntervalRef.current = setInterval(() => {
            seconds -= 1;
            setSecondsRemaining(seconds);

            if (seconds <= 0) {
                if (playerMode === 'youtube' && ytPlayerRef.current) {
                    ytPlayerRef.current.pauseVideo();
                } else if (playerMode === 'audio' && audioRef.current) {
                    audioRef.current.pause();
                } else {
                    pauseTtsPlayback();
                }
                setSleepTimer(null);
                setSecondsRemaining(null);
                cleanupIntervals();
            }
        }, 1000);
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="premium-audio-player fade-in">
            {playerMode === 'youtube' && <div id={containerId} style={{ display: 'none' }}></div>}

            {playerMode === 'audio' && audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                    onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            <div className="player-header">
                <span className="player-kicker">
                    {playerMode === 'tts' ? '🎧 অডিওবুক ও গল্পপাঠ (বাংলা ভয়েস)' : 'অডিওবুক ও গল্পপাঠ'}
                </span>
                <h3 className="player-title">{title || 'গল্পকথা শুনুন'}</h3>
            </div>

            {/* Visualizer Art */}
            <div className="player-visualizer">
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                {playerMode === 'youtube' ? (
                    <Youtube className="vis-icon" size={32} />
                ) : (
                    <Volume2 className="vis-icon" size={32} />
                )}
            </div>

            {/* Progress Slider */}
            <div className="player-progress-area">
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="player-slider"
                />
                <div className="player-time-row">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Core Controls */}
            <div className="player-controls">
                <button
                    className="control-btn"
                    onClick={() => {
                        const target = Math.max(0, currentTime - 10);
                        setCurrentTime(target);
                        if (playerMode === 'youtube' && ytPlayerRef.current) ytPlayerRef.current.seekTo(target, true);
                        if (playerMode === 'audio' && audioRef.current) audioRef.current.currentTime = target;
                    }}
                    title="১০ সেকেন্ড পেছনে যান"
                >
                    <RotateCcw size={20} />
                </button>

                <button
                    className="play-pause-btn"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'পজ করুন' : 'প্লে করুন'}
                >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} />}
                </button>

                <div className="volume-control-wrapper">
                    <button className="control-btn" onClick={toggleMute} title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}>
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 50 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                    />
                </div>
            </div>

            {/* Settings Row */}
            <div className="player-settings-row">
                {/* Speed Menu */}
                <div className="player-dropdown-btn">
                    <Gauge size={16} />
                    <span>গতি: {toBanglaNumber(speed.toFixed(2))}x</span>
                    <div className="player-dropdown-menu">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                            <button key={s} onClick={() => handleSpeedChange(s)} className={speed === s ? 'active' : ''}>
                                {s === 1.0 ? 'স্বাভাবিক' : `${toBanglaNumber(s.toFixed(2))}x`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sleep Timer Menu */}
                <div className="player-dropdown-btn">
                    <Timer size={16} />
                    <span>
                        {sleepTimer
                            ? `বন্ধ হবে: ${toBanglaNumber(Math.ceil((secondsRemaining || 0) / 60))} মি.`
                            : 'স্লিপ টাইমার'}
                    </span>
                    <div className="player-dropdown-menu">
                        <button onClick={() => setTimer(null)} className={sleepTimer === null ? 'active' : ''}>বন্ধ</button>
                        {[10, 20, 30, 45, 60].map((m) => (
                            <button key={m} onClick={() => setTimer(m)} className={sleepTimer === m ? 'active' : ''}>
                                {toBanglaNumber(m)} মিনিট
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
