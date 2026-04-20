import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import SEO from '../components/SEO';
import StoryCard from '../components/StoryCard';
import SkeletonCard from '../components/SkeletonCard';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import './SearchPage.css';

const DEBOUNCE_MS = 350;

const normalizeText = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFC')
        .trim();

const storyMatchesQuery = (story: Story, query: string): boolean => {
    if (!query) return false;
    const q = normalizeText(query);
    const fields = [
        story.title,
        story.author,
        story.excerpt,
        story.category,
        ...(story.categories ?? []),
        ...(story.tags ?? []),
    ];
    return fields.some((field) => field && normalizeText(field).includes(q));
};

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';

    // inputValue reflects what is typed; activeQuery is what actually drives filtering
    const [inputValue, setInputValue] = useState(initialQuery);
    const [activeQuery, setActiveQuery] = useState(initialQuery);
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [loading, setLoading] = useState(stories.length === 0);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load stories from remote on mount
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const data = await getStories();
            if (isMounted) {
                setStories(data);
                setLoading(false);
            }
        };
        void load();
        return () => {
            isMounted = false;
        };
    }, []);

    // Keep input in sync when browser navigates via back/forward
    useEffect(() => {
        const q = searchParams.get('q') ?? '';
        setInputValue(q);
        setActiveQuery(q);
    }, [searchParams]);

    // Debounce: update URL (and therefore activeQuery) after user stops typing
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                const trimmed = value.trim();
                setActiveQuery(trimmed);
                setSearchParams(
                    trimmed ? { q: trimmed } : {},
                    { replace: true }
                );
            }, DEBOUNCE_MS);
        },
        [setSearchParams]
    );

    const handleClear = useCallback(() => {
        setInputValue('');
        setActiveQuery('');
        setSearchParams({}, { replace: true });
        inputRef.current?.focus();
    }, [setSearchParams]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            const trimmed = inputValue.trim();
            setActiveQuery(trimmed);
            setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
        },
        [inputValue, setSearchParams]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const results = useMemo<Story[]>(() => {
        if (!activeQuery) return [];
        return stories.filter((story) => storyMatchesQuery(story, activeQuery));
    }, [stories, activeQuery]);

    const hasQuery = Boolean(activeQuery);
    const hasResults = results.length > 0;

    const seoTitle = activeQuery
        ? `অনুসন্ধান: ${activeQuery}`
        : 'গল্প অনুসন্ধান';

    const canonicalUrl = activeQuery
        ? `${SITE_URL}/search?q=${encodeURIComponent(activeQuery)}`
        : `${SITE_URL}/search`;

    const resultCountText = (() => {
        if (!hasQuery) return null;
        if (loading) return null;
        if (!hasResults) return 'কোনো ফলাফল পাওয়া যায়নি';
        return `${toBanglaNumber(results.length)}টি ফলাফল পাওয়া গেছে`;
    })();

    return (
        <div className="search-page page-offset">
            <SEO
                title={seoTitle}
                description="বাংলা গল্প ও লেখক খুঁজুন। শিরোনাম, লেখক, ট্যাগ বা ক্যাটাগরি দিয়ে অনুসন্ধান করুন।"
                keywords="বাংলা গল্প খুঁজুন, Bangla Story Search, গল্প অনুসন্ধান"
                canonicalUrl={canonicalUrl}
                noIndex={hasQuery}
            />

            <div className="container">
                {/* Page header */}
                <div className="search-page-header">
                    <h1 className="search-page-title">গল্প অনুসন্ধান</h1>
                    <p className="search-page-subtitle">
                        শিরোনাম, লেখক, ট্যাগ বা ক্যাটাগরি দিয়ে পছন্দের গল্প খুঁজুন।
                    </p>
                </div>

                {/* Search form */}
                <form
                    className="search-form"
                    role="search"
                    onSubmit={handleSubmit}
                    aria-label="গল্প অনুসন্ধান"
                >
                    <div className="search-input-wrapper">
                        <Search className="search-input-icon" size={22} aria-hidden="true" />
                        <input
                            ref={inputRef}
                            type="search"
                            className="search-input"
                            placeholder="গল্পের নাম, লেখক বা ট্যাগ লিখুন..."
                            value={inputValue}
                            onChange={handleInputChange}
                            autoComplete="off"
                            autoFocus
                            aria-label="অনুসন্ধান করুন"
                        />
                        {inputValue && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={handleClear}
                                aria-label="মুছে ফেলুন"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <button type="submit" className="search-submit-btn">
                        খুঁজুন
                    </button>
                </form>

                {/* Result count banner */}
                {resultCountText && (
                    <div
                        className={`search-result-count ${!hasResults ? 'search-result-count--empty' : ''}`}
                        role="status"
                        aria-live="polite"
                    >
                        {hasResults ? (
                            <>
                                <span className="search-result-count-number">{toBanglaNumber(results.length)}</span>
                                <span>টি ফলাফল পাওয়া গেছে</span>
                                <span className="search-result-count-query">"{activeQuery}"</span>
                            </>
                        ) : (
                            <span>
                                "<strong>{activeQuery}</strong>" — কোনো ফলাফল পাওয়া যায়নি। অন্য কোনো শব্দ দিয়ে চেষ্টা করুন।
                            </span>
                        )}
                    </div>
                )}

                {/* Results grid */}
                <div className="search-results-area">
                    {loading && stories.length === 0 ? (
                        <div className="search-stories-grid">
                            <SkeletonCard count={6} />
                        </div>
                    ) : hasQuery && hasResults ? (
                        <div className="search-stories-grid">
                            {results.map((story, index) => (
                                <StoryCard key={story.id} story={story} index={index} />
                            ))}
                        </div>
                    ) : hasQuery && !hasResults && !loading ? (
                        <div className="search-empty-state">
                            <div className="search-empty-icon" aria-hidden="true">🔍</div>
                            <h2 className="search-empty-title">কোনো গল্প পাওয়া যায়নি</h2>
                            <p className="search-empty-text">
                                "<strong>{activeQuery}</strong>" সম্পর্কিত কোনো গল্প খুঁজে পাওয়া যায়নি।
                                <br />
                                অন্য শব্দ বা ট্যাগ দিয়ে আবার চেষ্টা করুন।
                            </p>
                        </div>
                    ) : !hasQuery ? (
                        <div className="search-idle-state">
                            <div className="search-idle-icon" aria-hidden="true">📚</div>
                            <p className="search-idle-text">
                                উপরের বাক্সে কিছু লিখুন — আমরা গল্প খুঁজে বের করব।
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
