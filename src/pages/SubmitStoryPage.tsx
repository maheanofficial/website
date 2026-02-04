import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Image as ImageIcon, BookOpen, Send, User } from 'lucide-react';
import { saveStory, type Story } from '../utils/storyManager';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';

const SubmitStoryPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: 'thriller',
        cover_image: '',
        excerpt: '',
        content: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { id: 'thriller', label: 'থ্রিলার' },
        { id: 'horror', label: 'হরর' },
        { id: 'romance', label: 'রোমান্টিক' },
        { id: 'adventure', label: 'অ্যাডভেঞ্চার' },
        { id: 'classic', label: 'ক্লাসিক' },
        { id: 'science_fiction', label: 'সায়েন্স ফিকশন' },
        { id: 'mystery', label: 'রহস্য' },
        { id: 'ghost', label: 'ভূতের গল্প' },
        { id: 'life', label: 'জীবনধর্মী' }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate network delay
        setTimeout(() => {
            const newStory: Story = {
                id: Date.now().toString(),
                ...formData,
                date: new Date().toISOString(),
                views: 0,
                status: 'pending', // Pending approval
                parts: [{
                    title: 'পর্ব ১',
                    content: formData.content
                }]
            };

            saveStory(newStory);
            setIsSubmitting(false);
            alert('আপনার গল্পটি জমা দেওয়া হয়েছে! এডমিন অ্যাপ্রুভ করলে এটি প্রকাশিত হবে।');
            navigate('/stories');
        }, 1500);
    };

    return (
        <div className="submit-story-page fade-in-up">
            <SEO
                title="গল্প জমা দিন - Mahean Ahmed"
                description="আপনার লেখা গল্প জমা দিন এবং শেয়ার করুন হাজারো পাঠকের সাথে।"
            />

            <div className="container pb-20">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20 mb-4">
                            <PenTool size={16} />
                            <span className="text-sm font-medium pb-0.5">লেখকের জগত</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            আপনার গল্প <span className="text-gray-500">জমা দিন</span>
                        </h1>
                        <p className="text-gray-400 text-lg">
                            আপনার কল্পনা শক্তি দিয়ে তৈরি করুন অসাধারণ সব গল্প। আমরা আপনার গল্প পৌঁছে দেব সবার কাছে।
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="submit-form card p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">

                        {/* Title & Author Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <BookOpen size={16} className="text-amber-500" /> গল্পের নাম
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="গল্পের একটি আকর্ষণীয় নাম দিন"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <User size={16} className="text-amber-500" /> লেখকের নাম
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="আপনার ছদ্মনাম বা আসল নাম"
                                    value={formData.author}
                                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Category & Cover Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <PenTool size={16} className="text-amber-500" /> ক্যাটাগরি
                                </label>
                                <select
                                    className="form-select bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <ImageIcon size={16} className="text-amber-500" /> কভার ইমেজ লিংক (অপশনাল)
                                </label>
                                <input
                                    type="url"
                                    className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="https://example.com/image.jpg"
                                    value={formData.cover_image}
                                    onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Excerpt */}
                        <div className="form-group mb-6">
                            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                <BookOpen size={16} className="text-amber-500" /> ছোট সারাংশ (Excerpt)
                            </label>
                            <textarea
                                required
                                rows={2}
                                className="form-textarea bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                placeholder="গল্পটি সম্পর্কে এক বা দুই লাইনে কিছু লিখুন..."
                                value={formData.excerpt}
                                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                            />
                        </div>

                        {/* Main Content */}
                        <div className="form-group mb-8">
                            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                <PenTool size={16} className="text-amber-500" /> মূল গল্প
                            </label>
                            <textarea
                                required
                                rows={12}
                                className="form-textarea bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                placeholder="এখানে আপনার সম্পূর্ণ গল্পটি লিখুন..."
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`submit-btn-premium w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'জমা দেওয়া হচ্ছে...' : (
                                <>
                                    <Send size={20} /> গল্প জমা দিন
                                </>
                            )}
                        </button>

                        <p className="text-center text-gray-500 text-sm mt-4">
                            * জমা দেওয়ার পর এডমিন প্যানেল থেকে রিভিউ করে পাবলিশ করা হবে।
                        </p>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubmitStoryPage;
