import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowUpDown, Edit, Trash, Eye, Sparkles, ChevronDown, X } from 'lucide-react';
import './AdminStories.css';
import { getAllStories, saveStory, deleteStory, type Story, type StoryPart } from '../../utils/storyManager';
import { getCategories } from '../../utils/categoryManager';
import ImageUploader from './ImageUploader';
import type { User } from '../../utils/userManager';

interface AdminStoriesProps {
    user?: User | null;
    initialViewMode?: 'list' | 'create' | 'edit';
}

const AdminStories = ({ user, initialViewMode = 'list' }: AdminStoriesProps) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const navigate = useNavigate();

    // Update viewMode if initialViewMode changes (e.g. navigation)
    useEffect(() => {
        if (initialViewMode) {
            setViewMode(initialViewMode);
            if (initialViewMode === 'create') {
                resetForm();
            }
        }
    }, [initialViewMode]);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState<string[]>([]); // New Tags
    const [description, setDescription] = useState(''); // Maps to excerpt
    const [categories, setCategories] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState('');
    const [parts, setParts] = useState<StoryPart[]>([{ id: '1', title: 'Part 01', content: '' }]);

    useEffect(() => {
        loadData();
    }, []);

    // Auto-generate slug from title if empty
    useEffect(() => {
        if (viewMode === 'create' && title && !editingId) {
            setSlug(title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
        }
    }, [title, viewMode, editingId]);

    const loadData = () => {
        const allStories = getAllStories();
        setStories(allStories);
        setCategories(getCategories().map(c => c.name));
    };

    const handleCreateNew = () => {
        navigate('/author/dashboard/series/create');
    };

    const handleEdit = (story: Story) => {
        setEditingId(story.id);
        setTitle(story.title);
        setSlug(story.slug || '');
        setCategory(story.category || '');
        setTags(story.tags || []);
        setDescription(story.excerpt || '');
        setCoverImage(story.cover_image || '');
        setParts(story.parts || [{ id: '1', title: 'Part 01', content: '' }]);
        navigate(`/author/dashboard/series/edit/${story.id}`);
    };

    const resetForm = () => {
        setTitle('');
        setSlug('');
        setCategory('');
        setTags([]);
        setDescription('');
        setCoverImage('');
        setParts([{ id: '1', title: 'Part 01', content: '' }]);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newStory: Story = {
            id: editingId || Date.now().toString(),
            title,
            slug,
            category,
            categoryId: category, // Using name as ID for now
            tags,
            cover_image: coverImage,
            parts,
            status: 'published',
            date: new Date().toISOString(),
            author: user?.displayName || 'Admin',
            authorId: user?.id || 'admin',
            views: 0,
            comments: 0,
            content: parts.map(p => p.content).join('\n'), // Legacy
            excerpt: description || parts[0]?.content.slice(0, 100) || ''
        };
        saveStory(newStory);
        loadData();
        navigate('/author/dashboard/series');
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure?')) {
            deleteStory(id);
            loadData();
        }
    }

    // Filter Logic
    const filteredStories = stories.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === 'All Status' || s.status === statusFilter.toLowerCase())
    );

    if (viewMode === 'create' || viewMode === 'edit') {
        return (
            <div className="editor-overlay">
                <div className="editor-header w-full max-w-5xl mx-auto flex justify-between items-center mb-6">
                    <div></div>
                    <button onClick={() => navigate('/author/dashboard/series')} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111] hover:bg-[#222] text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="max-w-5xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8 text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">{viewMode === 'create' ? 'নতুন সিরিজ যোগ করুন' : 'সিরিজ এডিট করুন'}</h2>
                        <p className="text-gray-400 text-sm">Fill out the details below to {viewMode === 'create' ? 'add a new series' : 'edit the series'}.</p>
                    </div>

                    <form onSubmit={handleSave} className="form-container-flat">

                        {/* Row 1: Title & Slug */}
                        <div className="form-grid-2 mb-8">
                            <div className="form-group">
                                <label className="form-label-flat">সিরিজ টাইটেল</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="form-input-flat"
                                    placeholder="যেমন: এক সমুদ্র প্রেম"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="form-label-flat !mb-0">Slug</label>
                                    <button type="button" className="btn-auto-slug" onClick={() => {
                                        if (title) {
                                            setSlug(title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                                        }
                                    }}>
                                        <Sparkles size={12} /> Auto-Generate Slug
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    className="form-input-flat"
                                    placeholder="e.g., ek-samudro-prem"
                                />
                            </div>
                        </div>

                        {/* Row 2: Categories & Tags */}
                        <div className="form-grid-2 mb-8">
                            <div className="form-group">
                                <label className="form-label-flat">Categories</label>
                                <div className="relative custom-select-wrapper">
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="form-select-flat"
                                    >
                                        <option value="">Select categories</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="select-arrow" size={16} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label-flat">Tags</label>
                                <div className="relative custom-select-wrapper">
                                    <select className="form-select-flat">
                                        <option value="">Select tags</option>
                                    </select>
                                    <ChevronDown className="select-arrow" size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Description */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <label className="form-label-flat !mb-0">Description ({description.length}/500)</label>
                            </div>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={500}
                                rows={4}
                                className="form-textarea-flat resize-none"
                                placeholder="Write a short description about this series..."
                            />
                        </div>

                        {/* Row 4: Thumbnail */}
                        <div className="mb-8">
                            <label className="form-label-flat">Thumbnail (16:9)</label>
                            <ImageUploader
                                value={coverImage}
                                onChange={setCoverImage}
                                placeholder="Click to upload an image"
                                containerClass="thumbnail-uploader-container w-full aspect-video"
                            />
                        </div>

                        <div className="form-actions text-center justify-center pt-4">
                            <button type="button" onClick={() => navigate('/author/dashboard/series')} className="btn-cancel">
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit">
                                {viewMode === 'create' ? 'Create Series' : 'Update Series'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-stories-container">
            {/* Action Bar */}
            <div className="stories-actions-bar">
                <div className="search-filter-group">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="সিরিজ খুঁজুন..."
                            className="search-input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select className="status-dropdown" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option>All Status</option>
                        <option>Published</option>
                        <option>Draft</option>
                    </select>
                </div>

                <button className="create-btn" onClick={handleCreateNew}>
                    <Plus size={18} />
                    নতুন সিরিজ যোগ করুন
                </button>
            </div>

            {/* Data Table */}
            <div className="data-table-container">
                <div className="data-table-header">
                    <div className="col-header col-title">টাইটেল <ArrowUpDown size={12} /></div>
                    <div className="col-header col-status">স্ট্যাটাস <ArrowUpDown size={12} /></div>
                    <div className="col-header col-progress">Progress</div>
                    <div className="col-header col-parts">পর্ব</div>
                    <div className="col-header col-created">তৈরি হয়েছে <ArrowUpDown size={12} /></div>
                    <div className="col-header col-updated">আপডেট হয়েছে <ArrowUpDown size={12} /></div>
                    <div className="col-header col-actions">অ্যাকশনসমূহ</div>
                </div>

                {filteredStories.length > 0 ? (
                    <div className="table-body">
                        {filteredStories.map(story => (
                            <div key={story.id} className="data-row">
                                <div className="col-title cell-text">{story.title}</div>
                                <div className="col-status">
                                    <span className={`status-badge status-${story.status || 'draft'}`}>
                                        {story.status || 'Draft'}
                                    </span>
                                </div>
                                <div className="col-progress cell-text text-gray-500">None</div>
                                <div className="col-parts cell-text">{story.parts?.length || 0}</div>
                                <div className="col-created cell-text text-gray-400">{new Date(story.date).toLocaleDateString()}</div>
                                <div className="col-updated cell-text text-gray-400">-</div>
                                <div className="col-actions flex gap-2 justify-end">
                                    <button className="action-btn" title="View"><Eye size={16} /></button>
                                    <button className="action-btn" onClick={() => handleEdit(story)} title="Edit"><Edit size={16} /></button>
                                    <button className="action-btn text-red-500 hover:bg-red-900/20" onClick={() => handleDelete(story.id)} title="Delete"><Trash size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-table">
                        <p>No results found.</p>
                        <span className="empty-sub-text">series.no_series_available</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStories;
