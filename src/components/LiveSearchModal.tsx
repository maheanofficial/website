import { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, User, Tag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getStories, getCachedStories, type Story } from '../utils/storyManager';
import SmartImage from './SmartImage';
import './LiveSearchModal.css';

interface LiveSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LiveSearchModal({ isOpen, onClose }: LiveSearchModalProps) {
    const [query, setQuery] = useState('');
    const [stories, setStories] = useState<Story[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadAllStories = async () => {
            const cached = getCachedStories();
            if (cached.length) setStories(cached);
            const fresh = await getStories().catch(() => []);
            if (fresh.length) setStories(fresh);
        };
        if (isOpen) {
            loadAllStories();
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard shortcuts (Ctrl+K, Cmd+K, /, Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (isOpen) onClose();
                else setQuery('');
            }
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const trimmedQuery = query.trim().toLowerCase();
    const filteredStories = trimmedQuery
        ? stories.filter((story) => {
            const titleMatch = story.title.toLowerCase().includes(trimmedQuery);
            const authorMatch = (story.author || '').toLowerCase().includes(trimmedQuery);
            const categoryMatch = (story.category || '').toLowerCase().includes(trimmedQuery);
            const tagMatch = (story.tags || []).some((t) => t.toLowerCase().includes(trimmedQuery));
            const contentMatch = (story.content || story.excerpt || '').toLowerCase().includes(trimmedQuery);
            return titleMatch || authorMatch || categoryMatch || tagMatch || contentMatch;
        }).slice(0, 8)
        : stories.slice(0, 5);

    const handleKeyDownInInput = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredStories.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredStories.length) % Math.max(1, filteredStories.length));
        } else if (e.key === 'Enter' && filteredStories[selectedIndex]) {
            e.preventDefault();
            const target = filteredStories[selectedIndex];
            onClose();
            navigate(`/stories/${target.slug || target.id}`);
        }
    };

    return (
        <div className="live-search-overlay" onClick={onClose}>
            <div className="live-search-modal" onClick={(e) => e.stopPropagation()}>
                <div className="live-search-header">
                    <Search className="live-search-icon" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDownInInput}
                        placeholder="গল্পের নাম, লেখক বা বিষয় দিয়ে খুঁজুন... (Ctrl + K)"
                        className="live-search-input"
                    />
                    {query && (
                        <button className="live-search-clear" onClick={() => setQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                    <button className="live-search-close" onClick={onClose}>
                        ESC
                    </button>
                </div>

                <div className="live-search-body">
                    <div className="live-search-kicker">
                        {trimmedQuery
                            ? `খোঁজার ফলাফল (${filteredStories.length})`
                            : '⚡ সাম্প্রতিক জনপ্রিয় গল্পসমূহ'}
                    </div>

                    {filteredStories.length === 0 ? (
                        <div className="live-search-empty">
                            <BookOpen size={32} />
                            <p>"{query}" দিয়ে কোনো গল্প পাওয়া যায়নি!</p>
                        </div>
                    ) : (
                        <div className="live-search-results">
                            {filteredStories.map((story, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <Link
                                        key={story.id}
                                        to={`/stories/${story.slug || story.id}`}
                                        className={`live-search-item ${isSelected ? 'selected' : ''}`}
                                        onClick={onClose}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        <div className="live-search-thumb">
                                            <SmartImage
                                                src={story.cover_image || story.image}
                                                alt={story.title}
                                                showFullText={true}
                                            />
                                        </div>
                                        <div className="live-search-info">
                                            <h4 className="live-search-title">{story.title}</h4>
                                            <div className="live-search-meta">
                                                <span><User size={12} /> {story.author || 'মাহিয়ান আহমেদ'}</span>
                                                {story.category && <span><Tag size={12} /> {story.category}</span>}
                                            </div>
                                        </div>
                                        <ArrowRight className="live-search-arrow" size={16} />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
