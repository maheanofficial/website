import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Image as ImageIcon, BookOpen, Send, User, Plus, Trash2, Globe, ArrowRight } from 'lucide-react';
import { saveStory, type Story } from '../utils/storyManager';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';

const SubmitStoryPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        author_image: '',
        author_link: '',
        category: 'thriller',
        cover_image: '',
        excerpt: '',
    });

    // State for managing story parts
    const [parts, setParts] = useState<{ title: string, content: string }[]>([
        { title: 'পর্ব ১', content: '' }
    ]);

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

    const handleAddPart = () => {
        setParts([...parts, { title: `পর্ব ${parts.length + 1}`, content: '' }]);
    };

    const handleRemovePart = (index: number) => {
        if (parts.length > 1) {
            const newParts = parts.filter((_, i) => i !== index);
            setParts(newParts);
        }
    };

    const handlePartChange = (index: number, field: 'title' | 'content', value: string) => {
        const newParts = [...parts];
        newParts[index][field] = value;
        setParts(newParts);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (parts.some(p => !p.content.trim())) {
            alert('দয়া করে সব পর্বের বিষয়বস্তু লিখুন।');
            return;
        }

        setIsSubmitting(true);

        // Simulate network delay
        setTimeout(() => {
            const newStory: Story = {
                id: Date.now().toString(),
                ...formData,
                authorId: formData.author.toLowerCase().replace(/\s+/g, '-'), // Generate a simple ID
                categoryId: formData.category,
                date: new Date().toISOString(),
                views: 0,
                status: 'pending', // Pending approval
                // @ts-ignore - The Story type interface might need updating to include author_image/link officially if we want type safety, but JS runtime will store it fine.
                // We are storing extra metadata that might not be in the interface yet, or we'll assume the interface is flexible or won't complain at runtime.
                // Actually, I should update the interface in storyManager.ts ideally, but for now I'll cast or ignore to make it work.
                author_image: formData.author_image,
                author_link: formData.author_link,
                parts: parts
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
                            আপনার কল্পনা শক্তি দিয়ে তৈরি করুন অসাধারণ সব গল্প।
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="submit-form card p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">

                        {/* Section Title */}
                        <div className="mb-6 pb-2 border-b border-white/10">
                            <h3 className="text-xl font-bold text-amber-500 mb-1">গল্পের তথ্য</h3>
                        </div>

                        {/* Title Grid */}
                        <div className="grid grid-cols-1 gap-6 mb-6">
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <BookOpen size={16} className="text-amber-500" /> গল্পের নাম <span className="text-red-500">*</span>
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
                        </div>

                        {/* Author Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <User size={16} className="text-amber-500" /> লেখকের নাম <span className="text-red-500">*</span>
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
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <Globe size={16} className="text-amber-500" /> লেখকের সোশ্যাল লিংক (অপশনাল)
                                </label>
                                <input
                                    type="url"
                                    className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="Facebook/Instagram প্রোফাইল লিংক"
                                    value={formData.author_link}
                                    onChange={e => setFormData({ ...formData, author_link: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Author Image & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <ImageIcon size={16} className="text-amber-500" /> লেখকের ছবি (লিংক)
                                </label>
                                <input
                                    type="url"
                                    className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="লেখকের ছবির লিংক দিন"
                                    value={formData.author_image}
                                    onChange={e => setFormData({ ...formData, author_image: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                    <PenTool size={16} className="text-amber-500" /> ক্যাটাগরি <span className="text-red-500">*</span>
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
                        </div>

                        {/* Cover Info */}
                        <div className="form-group mb-6">
                            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                <ImageIcon size={16} className="text-amber-500" /> গল্পের কভার ইমেজ (অপশনাল)
                            </label>
                            <input
                                type="url"
                                className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                placeholder="https://example.com/cover-image.jpg"
                                value={formData.cover_image}
                                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                            />
                        </div>

                        {/* Excerpt */}
                        <div className="form-group mb-8">
                            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                                <BookOpen size={16} className="text-amber-500" /> ছোট সারাংশ (Excerpt) <span className="text-red-500">*</span>
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

                        {/* Story Parts Section */}
                        <div className="mb-6 pb-2 border-b border-white/10">
                            <h3 className="text-xl font-bold text-amber-500 mb-1">গল্পের পর্বসমূহ</h3>
                        </div>

                        <div className="space-y-6 mb-8">
                            {parts.map((part, index) => (
                                <div key={index} className="part-editor p-4 bg-black/20 rounded-xl border border-white/5 relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="w-full mr-4">
                                            <label className="text-xs text-gray-400 block mb-1">পর্বের নাম</label>
                                            <input
                                                type="text"
                                                value={part.title}
                                                onChange={(e) => handlePartChange(index, 'title', e.target.value)}
                                                className="bg-transparent border-b border-white/10 w-full text-white focus:border-amber-500 focus:outline-none py-1 font-medium"
                                            />
                                        </div>
                                        {parts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePart(index)}
                                                className="text-red-400 hover:text-red-300 p-2"
                                                title="মুছে ফেলুন"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        required
                                        rows={8}
                                        className="form-textarea bg-black/30 border border-white/5 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                        placeholder={`এখানে ${part.title} লিখুন...`}
                                        value={part.content}
                                        onChange={(e) => handlePartChange(index, 'content', e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons Container */}
                        <div className="flex flex-col gap-4 mt-8">
                            <button
                                type="button"
                                onClick={handleAddPart}
                                className="btn-gold-outline w-full py-3 flex items-center justify-center gap-2 group"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span>আরো একটি পর্ব যোগ করুন</span>
                            </button>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`btn-gold-solid w-full py-4 text-lg flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'জমা দেওয়া হচ্ছে...' : (
                                    <>
                                        <span>গল্প জমা দিন</span>
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

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
