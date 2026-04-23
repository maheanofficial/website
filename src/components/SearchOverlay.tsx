import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, X } from 'lucide-react';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import './SearchOverlay.css';

interface SearchOverlayProps {
    open: boolean;
    onClose: () => void;
}

const normalizeText = (text: string) => text.toLowerCase().normalize('NFC').trim();

const storyMatchesQuery = (story: Story, query: string): boolean => {
    if (!query) return false;
    const q = normalizeText(query);
    const fields = [story.title, story.author, story.excerpt, story.category, ...(story.categories ?? []), ...(story.tags ?? [])];
    return fields.some((f) => f && normalizeText(f).includes(q));
};

const DEBOUNCE_MS = 250;

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
    const [inputValue, setInputValue] = useState('');
    const [activeQuery, setActiveQuery] = useState('');
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        getStories().then((data) => { if (isMounted) setStories(data); });
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (open) {
            setInputValue('');
            setActiveQuery('');
            setTimeout(() => inputRef.current?.focus(), 80);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setActiveQuery(val.trim()), DEBOUNCE_MS);
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = inputValue.trim();
        if (q) {
            onClose();
            navigate(`/search?q=${encodeURIComponent(q)}`);
        }
    }, [inputValue, navigate, onClose]);

    const results = useMemo(() => {
        if (!activeQuery) return [];
        return stories.filter((s) => storyMatchesQuery(s, activeQuery)).slice(0, 6);
    }, [stories, activeQuery]);

    if (!open) return null;

    return (
        <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="search-overlay__inner">
                <form className="search-overlay__form" onSubmit={handleSubmit}>
                    <Search className="search-overlay__icon" size={22} />
                    <input
                        ref={inputRef}
                        type="search"
                        className="search-overlay__input"
                        placeholder="গল্পের নাম, লেখক বা ট্যাগ লিখুন..."
                        value={inputValue}
                        onChange={handleInput}
                        autoComplete="off"
                    />
                    <button type="submit" className="search-overlay__submit" aria-label="Search">
                        <ArrowRight size={20} />
                    </button>
                </form>

                <p className="search-overlay__hint">
                    এন্টার চাপুন &nbsp;•&nbsp; <kbd>ESC</kbd> বন্ধ করুন
                </p>

                {results.length > 0 && (
                    <div className="search-overlay__results">
                        {results.map((story) => (
                            <button
                                key={story.id}
                                className="search-overlay__result-item"
                                onClick={() => { onClose(); navigate(`/series/${story.slug || story.id}`); }}
                            >
                                <span className="search-overlay__result-title">{story.title}</span>
                                {story.author && (
                                    <span className="search-overlay__result-author">{story.author}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {activeQuery && results.length === 0 && (
                    <p className="search-overlay__no-results">কোনো ফলাফল পাওয়া যায়নি।</p>
                )}
            </div>

            <button className="search-overlay__close" onClick={onClose} aria-label="Close">
                <X size={22} />
            </button>
        </div>
    );
}
