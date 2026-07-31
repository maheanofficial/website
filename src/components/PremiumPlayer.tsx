import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Timer, Gauge, Youtube, VolumeX } from 'lucide-react';
import { toBanglaNumber } from '../utils/numberFormatter';
import './PremiumPlayer.css';

interface PremiumPlayerProps {
    videoId: string;
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

export default function PremiumPlayer({ videoId, title }: PremiumPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [isMuted, setIsMuted] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const [sleepTimer, setSleepTimer] = useState<number | null>(null);
    const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

    const playerRef = useRef<YTPlayer | null>(null);
    const containerId = `yt-player-${videoId}`;
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanupIntervals = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    const stopTrackingProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    const startTrackingProgress = () => {
        stopTrackingProgress();
        progressIntervalRef.current = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                setCurrentTime(playerRef.current.getCurrentTime());
            }
        }, 500);
    };

    const onPlayerReady = (event: { target: { getDuration: () => number; setVolume: (v: number) => void } }) => {
        setDuration(event.target.getDuration());
        event.target.setVolume(volume);
    };

    const onPlayerStateChange = (event: { data: number }) => {
        const state = event.data;
        if (window.YT && state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startTrackingProgress();
        } else {
            setIsPlaying(false);
            stopTrackingProgress();
        }
    };

    const initializePlayer = () => {
        if (!window.YT || !window.YT.Player) return;
        playerRef.current = new window.YT.Player(containerId, {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });
    };

    useEffect(() => {
        // Load YouTube Iframe API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                initializePlayer();
            };
        } else {
            initializePlayer();
        }

        return () => {
            cleanupIntervals();
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    const handlePlayPause = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (playerRef.current) {
            playerRef.current.seekTo(val, true);
            setCurrentTime(val);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setVolume(val);
        if (playerRef.current) {
            playerRef.current.setVolume(val);
            if (isMuted && val > 0) {
                setIsMuted(false);
                playerRef.current.unMute();
            }
        }
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    const handleSpeedChange = (newSpeed: number) => {
        setSpeed(newSpeed);
        if (playerRef.current && playerRef.current.setPlaybackRate) {
            playerRef.current.setPlaybackRate(newSpeed);
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
                if (playerRef.current) {
                    playerRef.current.pauseVideo();
                }
                setSleepTimer(null);
                setSecondsRemaining(null);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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
            <div id={containerId} style={{ display: 'none' }}></div>

            <div className="player-header">
                <span className="player-kicker">অডিওবুক ও গল্পপাঠ</span>
                <h3 className="player-title">{title || 'গল্পকথা শুনুন'}</h3>
            </div>

            {/* Visualizer Art */}
            <div className="player-visualizer">
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <div className={`vis-bar ${isPlaying ? 'playing' : ''}`}></div>
                <Youtube className="vis-icon" size={32} />
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
                <button className="control-btn" onClick={() => playerRef.current?.seekTo(Math.max(0, currentTime - 10), true)}>
                    <RotateCcw size={20} />
                </button>

                <button className="play-pause-btn" onClick={handlePlayPause}>
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} />}
                </button>

                <div className="volume-control-wrapper">
                    <button className="control-btn" onClick={toggleMute}>
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
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

            {/* Premium Settings Row */}
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
