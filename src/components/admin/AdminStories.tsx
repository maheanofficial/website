import { useState, useEffect } from 'react';
import { Search, Plus, ArrowUpDown, MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import './AdminStories.css';
import { getAllStories, saveStory, deleteStory, type Story, type StoryPart } from '../../utils/storyManager';
import { getCategories } from '../../utils/categoryManager';
import ImageUploader from './ImageUploader';
import type { User } from '../../utils/userManager';

interface AdminStoriesProps {
    user?: User | null;
}

const AdminStories = ({ user }: AdminStoriesProps) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState('');
    const [parts, setParts] = useState<StoryPart[]>([{ id: '1', title: 'Part 01', content: '' }]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const allStories = getAllStories();
        setStories(allStories);
        setCategories(getCategories().map(c => c.name));
    };

    const handleCreateNew = () => {
        setEditingId(null);
        resetForm();
        setViewMode('create');
    };

    const handleEdit = (story: Story) => {
        setEditingId(story.id);
        setTitle(story.title);
        setCategory(story.category || '');
        setCoverImage(story.cover_image || '');
        setParts(story.parts || [{ id: '1', title: 'Part 01', content: '' }]);
        setViewMode('edit');
    };

    const resetForm = () => {
        setTitle('');
        setCategory('');
        setCoverImage('');
        setParts([{ id: '1', title: 'Part 01', content: '' }]);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newStory: Story = {
            id: editingId || Date.now().toString(),
            title,
            category,
            cover_image: coverImage,
            parts,
            status: 'published',
            date: new Date().toISOString(),
            author: user?.displayName || 'Admin',
            authorId: user?.id || 'admin',
            views: 0,
            comments: 0,
            content: parts.map(p => p.content).join('\n'),
            excerpt: parts[0]?.content.slice(0, 100) || ''
        };
        saveStory(newStory);
        loadData();
        setViewMode('list');
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
                <div className="editor-header">
                    <h2 className="text-xl font-bold text-white mb-6">
                        {viewMode === 'create' ? 'নতুন সিরিজ যোগ করুন' : 'সিরিজ এডিট করুন'}
                    </h2>
                    <button onClick={() => setViewMode('list')} className="text-gray-400 hover:text-white">
                        Cancel
                    </button>
                </div>

                <form onSubmit={handleSave} className="max-w-4xl">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">সিরিজ টাইটেল</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] text-white p-3 rounded-lg focus:border-orange-500 outline-none"
                                placeholder="যেমন: এক সমুদ্র প্রেম"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">ক্যাটাগরি</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] text-white p-3 rounded-lg focus:border-orange-500 outline-none"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm mb-2">Thumbnail (16:9)</label>
                        <ImageUploader value={coverImage} onChange={setCoverImage} label="" placeholder="Upload Image" />
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200">
                            {viewMode === 'create' ? 'Create Series' : 'Update Series'}
                        </button>
                    </div>
                </form>
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
