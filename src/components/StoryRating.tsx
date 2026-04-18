import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { toBanglaNumber } from '../utils/numberFormatter';
import './StoryRating.css';

interface StoryRatingProps {
    storyId: string;
}

const RATING_KEY_PREFIX = 'mahean_story_rating_';
const STAR_LABELS = ['', 'খারাপ', 'মোটামুটি', 'ভালো', 'খুব ভালো', 'অসাধারণ!'];

const getSavedRating = (storyId: string): number => {
    try {
        const saved = localStorage.getItem(`${RATING_KEY_PREFIX}${storyId}`);
        const parsed = Number.parseInt(saved || '0', 10);
        return parsed >= 1 && parsed <= 5 ? parsed : 0;
    } catch {
        return 0;
    }
};

const saveRating = (storyId: string, rating: number) => {
    try {
        localStorage.setItem(`${RATING_KEY_PREFIX}${storyId}`, String(rating));
    } catch { /* ignore */ }
};

export default function StoryRating({ storyId }: StoryRatingProps) {
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const saved = getSavedRating(storyId);
        if (saved > 0) {
            setUserRating(saved);
            setSubmitted(true);
        } else {
            setUserRating(0);
            setSubmitted(false);
        }
    }, [storyId]);

    const handleRate = (rating: number) => {
        setUserRating(rating);
        setSubmitted(true);
        saveRating(storyId, rating);
    };

    const displayRating = hoverRating || userRating;

    return (
        <div className="story-rating-box">
            <div className="story-rating-head">
                <span className="story-rating-kicker">গল্পটি কেমন লাগল?</span>
                <p>
                    {submitted
                        ? `আপনি ${toBanglaNumber(userRating)} তারা দিয়েছেন। ধন্যবাদ!`
                        : 'তারা দিয়ে আপনার মতামত জানান।'}
                </p>
            </div>
            <div
                className="story-rating-stars"
                role="group"
                aria-label="গল্পের রেটিং"
                onMouseLeave={() => setHoverRating(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= displayRating ? 'is-active' : ''}`}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        aria-label={`${star} তারা — ${STAR_LABELS[star]}`}
                    >
                        <Star size={30} />
                    </button>
                ))}
            </div>
            {displayRating > 0 && (
                <p className="story-rating-label">{STAR_LABELS[displayRating]}</p>
            )}
        </div>
    );
}
