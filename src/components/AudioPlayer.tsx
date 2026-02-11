import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Mic2, X, Check, Settings2 } from 'lucide-react';
import './AudioPlayer.css';

interface AudioPlayerProps {
    src?: string;
    text?: string; // Content to read if no audio file
    title?: string;
    cover?: string;
}

type VoiceMode = 'female' | 'male' | 'neutral';

const AudioPlayer = ({ src, text, title = "Audio Track", cover }: AudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // TTS State
    const isTTS = (!src || src.includes('demo-story.mp3')) && !!text;
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Voice Selection State
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('neutral');

    const isBanglaVoice = (voice: SpeechSynthesisVoice) => {
        const lang = voice.lang.toLowerCase();
        const name = voice.name.toLowerCase();
        return lang.startsWith('bn') || name.includes('bangla') || name.includes('bengali');
    };

    const getVoiceGender = (voice: SpeechSynthesisVoice): VoiceMode => {
        const name = voice.name.toLowerCase();
        const femaleKeywords = ['female', 'tripti', 'tania', 'aditi', 'microsoft', 'google'];
        const maleKeywords = ['male', 'pradeep', 'bashkar', 'suhas', 'hemant'];

        if (femaleKeywords.some(keyword => name.includes(keyword))) return 'female';
        if (maleKeywords.some(keyword => name.includes(keyword))) return 'male';
        return 'neutral';
    };

    const getVoiceDisplayName = (voice: SpeechSynthesisVoice) => {
        const cleaned = voice.name
            .replace(/Google|Microsoft|Bangla|Bengali|Bangladesh|India/gi, '')
            .replace(/[()-]/g, '')
            .trim();
        return cleaned || voice.name;
    };

    const voiceModeLabels: Record<VoiceMode, string> = {
        female: 'বাংলা নারী কণ্ঠ',
        male: 'বাংলা পুরুষ কণ্ঠ',
        neutral: 'বাংলা উভয় কণ্ঠ'
    };

    const getModeSettings = (mode: VoiceMode) => {
        switch (mode) {
            case 'female':
                return { rate: 0.9, pitch: 1.05 };
            case 'male':
                return { rate: 0.82, pitch: 0.88 };
            default:
                return { rate: 0.85, pitch: 0.95 };
        }
    };

    // Load Voices
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();

            const candidates = allVoices.filter(isBanglaVoice);
            const uniqueByName = (list: SpeechSynthesisVoice[]) => {
                const seen = new Set<string>();
                return list.filter((voice) => {
                    if (seen.has(voice.name)) return false;
                    seen.add(voice.name);
                    return true;
                });
            };

            const femaleCandidates = uniqueByName(candidates.filter(v => getVoiceGender(v) === 'female'));
            const maleCandidates = uniqueByName(candidates.filter(v => getVoiceGender(v) === 'male'));
            const neutralCandidates = uniqueByName(candidates.filter(v => getVoiceGender(v) === 'neutral'));

            const curatedList = uniqueByName([
                ...femaleCandidates,
                ...maleCandidates,
                ...neutralCandidates
            ]);

            setVoices(curatedList);

            // Auto-select preferred (Default to Female/Primary)
            if (curatedList.length > 0) {
                const stillAvailable = selectedVoice && curatedList.some(v => v.name === selectedVoice.name);
                if (!stillAvailable) {
                    setSelectedVoice(curatedList[0]);
                    setVoiceMode(getVoiceGender(curatedList[0]));
                }
            }
        };

        loadVoices();

        // Voice loading is async in some browsers (Chrome)
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;

        }
    }, [selectedVoice]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (speechRef.current) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || isTTS) return;

        const setAudioData = () => {
            setDuration(audio.duration);
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        // Add event listeners
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);

        // Cleanup
        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isTTS]);

    // TTS Logic
    // Helper to clean Markdown/HTML for TTS
    const cleanTextForTTS = (rawText: string) => {
        if (!rawText) return "";
        return rawText
            .replace(/\*\*/g, '')   // Remove bold markers
            .replace(/\*/g, '')     // Remove italic markers
            .replace(/^#+\s/gm, '') // Remove headers
            .replace(/`/g, '')      // Remove code ticks
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text, remove URL
            .replace(/<[^>]*>?/gm, ''); // Remove any HTML tags if present
    };

    // TTS Logic
    const initTTS = () => {
        if (!text) return;

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const cleanedText = cleanTextForTTS(text);
        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Priority: Selected Voice > bn-BD default
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else {
            utterance.lang = 'bn-BD';
        }

        utterance.volume = volume;
        // Storyteller Mode Settings:
        const modeSettings = selectedVoice ? getModeSettings('neutral') : getModeSettings(voiceMode);
        utterance.rate = modeSettings.rate;
        utterance.pitch = modeSettings.pitch;

        utterance.onend = () => {
            setIsPlaying(false);
        };

        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utterance.onstart = () => setIsPlaying(true);

        // Error handling
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setIsPlaying(false);
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const togglePlay = () => {
        if (isTTS) {
            if (isPlaying) {
                window.speechSynthesis.pause();
                setIsPlaying(false);
            } else {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                    setIsPlaying(true);
                } else {
                    // Start fresh
                    initTTS();
                }
            }
        } else {
            // HTML5 Audio Logic
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isTTS) return;

        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        setIsMuted(vol === 0);

        if (isTTS) {
            // Dynamic TTS volume update varies by browser
        } else if (audioRef.current) {
            audioRef.current.volume = vol;
        }
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);

        if (audioRef.current) {
            audioRef.current.volume = newMuted ? 0 : volume || 1;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleVoiceSelect = (voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
        setVoiceMode(getVoiceGender(voice));
        // If playing, restart with new voice
        if (isPlaying && isTTS) {
            window.speechSynthesis.cancel();
            setTimeout(() => {
                // Restart with new voice
                const cleanedText = cleanTextForTTS(text || "");
                const utterance = new SpeechSynthesisUtterance(cleanedText);
                utterance.voice = voice;
                utterance.lang = voice.lang;
                utterance.volume = volume;
                const modeSettings = getModeSettings('neutral');
                utterance.rate = modeSettings.rate;
                utterance.pitch = modeSettings.pitch;

                utterance.onend = () => setIsPlaying(false);
                utterance.onpause = () => setIsPlaying(false);
                utterance.onresume = () => setIsPlaying(true);
                utterance.onstart = () => setIsPlaying(true);

                speechRef.current = utterance;
                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            }, 100);
        }
        setShowVoiceModal(false);
    };

    const handleFallbackVoiceSelect = (mode: VoiceMode) => {
        setSelectedVoice(null);
        setVoiceMode(mode);

        if (isPlaying && isTTS) {
            window.speechSynthesis.cancel();
            setTimeout(() => {
                const cleanedText = cleanTextForTTS(text || "");
                const utterance = new SpeechSynthesisUtterance(cleanedText);
                utterance.lang = 'bn-BD';
                utterance.volume = volume;
                const modeSettings = getModeSettings(mode);
                utterance.rate = modeSettings.rate;
                utterance.pitch = modeSettings.pitch;

                utterance.onend = () => setIsPlaying(false);
                utterance.onpause = () => setIsPlaying(false);
                utterance.onresume = () => setIsPlaying(true);
                utterance.onstart = () => setIsPlaying(true);

                speechRef.current = utterance;
                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            }, 100);
        }

        setShowVoiceModal(false);
    };

    return (
        <div className="audio-player glass-panel">
            {!isTTS && <audio ref={audioRef} src={src} preload="metadata" />}

            <div className="ap-info">
                {cover && (
                    <div className="ap-cover-wrapper">
                        <img src={cover} alt="Cover" className={`ap-cover ${isPlaying ? 'spinning' : ''}`} />
                    </div>
                )}
                <div className="ap-text">
                    <h4 className="ap-title">{title}</h4>
                    <span className="ap-status">
                        {isPlaying ? (isTTS ? 'Reading Story...' : 'Now Playing...') : (isTTS ? 'Ready to Read' : 'Paused')}
                    </span>
                    {isTTS && (
                        <span className="text-[10px] text-amber-400 opacity-80 mt-1 truncate max-w-[180px]">
                            Voice: {selectedVoice
                                ? `${voiceModeLabels[getVoiceGender(selectedVoice)]} • ${getVoiceDisplayName(selectedVoice)}`
                                : `${voiceModeLabels[voiceMode]} • ডিফল্ট`}
                        </span>
                    )}
                </div>
            </div>

            <div className="ap-controls-container">
                <div className="ap-main-controls">
                    {!isTTS && (
                        <button className="ap-btn secondary" onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime -= 10;
                        }}>
                            <SkipBack size={18} />
                        </button>
                    )}

                    <button className="ap-btn primary play-btn" onClick={togglePlay}>
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    {!isTTS && (
                        <button className="ap-btn secondary" onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime += 10;
                        }}>
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
                                    Reading in Progress...
                                </span>
                            </div>
                        )}

                        {/* Premium Voice Selection Button */}
                        <button
                            className="voice-change-btn group"
                            onClick={() => setShowVoiceModal(!showVoiceModal)}
                            title="Change Reading Voice"
                        >
                            <Settings2 size={13} className="text-white/90 group-hover:rotate-90 transition-transform duration-500" />
                            <span>Change Narrator Voice</span>
                        </button>
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

            {/* Voice Selection Modal */}
            {showVoiceModal && (
                <div className="voice-selection-modal">
                    <div className="voice-header">
                        <span className="voice-title">Select Narrator Voice</span>
                        <button className="close-btn" onClick={() => setShowVoiceModal(false)}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="voice-list">
                        {voices.length > 0 ? (
                            voices.map((voice, idx) => {
                                const gender = getVoiceGender(voice);
                                const label = voiceModeLabels[gender] || `বাংলা কণ্ঠ ${idx + 1}`;
                                const subLabel = `${getVoiceDisplayName(voice)} • ${voice.lang.toUpperCase()}`;

                                return (
                                    <button
                                        key={`${voice.name}-${idx}`}
                                        className={`voice-option ${selectedVoice?.name === voice.name ? 'active' : ''}`}
                                        onClick={() => handleVoiceSelect(voice)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="voice-name font-semibold text-sm">
                                                {label}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="voice-lang bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                                                    {subLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedVoice?.name === voice.name && <Check size={16} className="text-amber-400" />}
                                    </button>
                                )
                            })
                        ) : (
                            <div className="flex flex-col gap-3">
                                {(['female', 'male', 'neutral'] as VoiceMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        className={`voice-option ${!selectedVoice && voiceMode === mode ? 'active' : ''}`}
                                        onClick={() => handleFallbackVoiceSelect(mode)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="voice-name font-semibold text-sm">
                                                {voiceModeLabels[mode]}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="voice-lang bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                                                    ডিফল্ট সিস্টেম ভয়েস
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                <div className="text-[10px] text-center text-gray-400 mt-2 flex flex-col items-center gap-2">
                                    <Mic2 size={20} className="opacity-40" />
                                    <p className="opacity-80 max-w-[220px]">
                                        বাংলা কণ্ঠ ডিভাইসে না থাকলে ডিফল্ট ভয়েস ব্যবহার হবে। বাংলা ভয়েস যোগ করতে Windows
                                        Settings → Speech → Voices এ যান।
                                    </p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-[10px] text-amber-400 hover:underline"
                                    >
                                        Click to Reload Voices
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioPlayer;
