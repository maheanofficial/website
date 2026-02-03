import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Story } from '../utils/storyManager';
import SmartImage from './SmartImage';
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
                {/* Background */}
                <div className="carousel-background">
                    <SmartImage
                        src={currentStory.cover_image}
                        alt={currentStory.title}
                        className="carousel-bg-image"
                        showFullText={true}
                    />
                    <div className="carousel-overlay"></div>
                </div>

                {/* Arrows */}
                <button className="carousel-arrow carousel-arrow-left" onClick={prevSlide}>
                    <ChevronLeft className="icon" />
                </button>
                <button className="carousel-arrow carousel-arrow-right" onClick={nextSlide}>
                    <ChevronRight className="icon" />
                </button>

                {/* Content */}
                <div className="carousel-content">
                    <div className="carousel-header">
                        <span className="carousel-logo">MAHEAN.COM</span>
                    </div>

                    <div className="carousel-info">
                        <div className="carousel-category">
                            <span className="carousel-badge">{currentStory.category}</span>
                        </div>
                        <h2 className="carousel-title">{currentStory.title}</h2>

                        <div className="carousel-footer">
                            <div className="carousel-author">
                                <SmartImage
                                    src={undefined}
                                    alt={currentStory.author || 'Author'}
                                    className="carousel-avatar"
                                    isRound={true}
                                />
                                <div>
                                    <div className="carousel-author-label">Author</div>
                                    <div className="carousel-author-name">{currentStory.author}</div>
                                </div>
                            </div>

                            <Link to={`/stories/${currentStory.slug || currentStory.id}`} className="carousel-btn">
                                <Play size={16} fill="white" />
                                <span>বিস্তারিত পড়ুন</span>
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
