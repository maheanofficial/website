import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Story } from '../utils/storyManager';
import { buildCategoryFilterPath } from '../utils/storyFilters';
import './StoryCarousel.css';

interface StoryCarouselProps {
    stories: Story[];
}

export default function StoryCarousel({ stories }: StoryCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const featuredStories = stories.filter(s => s.is_featured);

    useEffect(() => {
        if (featuredStories.length === 0) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % featuredStories.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [featuredStories.length]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % featuredStories.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + featuredStories.length) % featuredStories.length);

    if (featuredStories.length === 0) return null;

    const currentStory = featuredStories[currentSlide];

    return (
        <div className="carousel-wrapper">
            <div className="carousel-container">

                {/* Arrows */}
                <button className="carousel-arrow carousel-arrow-left" onClick={prevSlide}>
                    <ChevronLeft className="icon" />
                </button>
                <button className="carousel-arrow carousel-arrow-right" onClick={nextSlide}>
                    <ChevronRight className="icon" />
                </button>

                {/* Typographic Content Content */}
                <div className="carousel-content">
                    <div className="carousel-info">
                        <div className="carousel-category">
                            {currentStory.category ? (
                                <Link
                                    to={buildCategoryFilterPath(currentStory.category)}
                                    className="carousel-badge"
                                >
                                    {currentStory.category}
                                </Link>
                            ) : (
                                <span className="carousel-badge">
                                    Featured Story
                                </span>
                            )}
                        </div>

                        <h2 className="carousel-title">
                            {currentStory.title}
                        </h2>

                        <div className="carousel-footer">
                            <div className="carousel-author">
                                <div className="carousel-author-name">{currentStory.author}</div>
                            </div>

                            <Link to={`/stories/${currentStory.slug || currentStory.id}`} className="carousel-btn">
                                <Play size={16} fill="black" />
                                <span>Read now</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dots */}
            <div className="carousel-dots">
                {featuredStories.map((_, index) => (
                    <button
                        key={index}
                        className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                        onClick={() => setCurrentSlide(index)}
                    >
                        {index === currentSlide && <div className="carousel-dot-progress"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
}
