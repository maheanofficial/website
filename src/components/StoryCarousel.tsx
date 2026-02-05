import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Story } from '../utils/storyManager';
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
            <div className="carousel-container" style={{ background: '#050505' }}>
                {/* Typographic Background (No Image) */}
                <div className="carousel-background" style={{ display: 'none' }}></div>

                {/* Arrows */}
                <button className="carousel-arrow carousel-arrow-left" onClick={prevSlide}>
                    <ChevronLeft className="icon" />
                </button>
                <button className="carousel-arrow carousel-arrow-right" onClick={nextSlide}>
                    <ChevronRight className="icon" />
                </button>

                {/* Typographic Content Content */}
                <div className="carousel-content" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '40px' }}>

                    {/* GolpoKotha Badge (Top Right) */}
                    <div style={{ position: 'absolute', top: '15px', right: '20px' }}>
                        <Link to="/">
                            <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" style={{ height: '50px', width: 'auto' }} />
                        </Link>
                    </div>

                    <div className="carousel-info" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                        <div className="carousel-category" style={{ marginBottom: '16px' }}>
                            <span className="carousel-badge" style={{ background: '#22c55e', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                                {currentStory.status === 'completed' ? 'সমাপ্ত' : 'চলমান'}
                            </span>
                        </div>

                        <h2 className="carousel-title" style={{ fontFamily: "'Hind Siliguri', sans-serif", fontSize: '48px', color: '#f59e0b', lineHeight: '1.2', marginBottom: '16px', fontWeight: '700' }}>
                            {currentStory.title}
                        </h2>

                        <div className="carousel-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div className="carousel-author" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Optional Avatar or just name */}
                                <div style={{ fontSize: '18px', color: '#e5e7eb', fontWeight: '500' }}>
                                    {currentStory.author}
                                </div>
                            </div>

                            <Link to={`/stories/${currentStory.slug || currentStory.id}`} className="carousel-btn" style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '30px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <Play size={16} fill="black" />
                                <span>এখনই পড়ুন</span>
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
