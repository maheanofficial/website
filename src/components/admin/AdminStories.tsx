import { useState, useEffect } from 'react';
import { Trash2, BookOpen, Edit2, X } from 'lucide-react';
import { getAllStories, saveStory, deleteStory, updateStoryStatus, type Story, type StoryPart } from '../../utils/storyManager';
import { getCategories } from '../../utils/categoryManager';
import { getAllAuthors } from '../../utils/authorManager';
import SmartImage from '../SmartImage';
import ImageUploader from './ImageUploader';
import type { User } from '../../utils/userManager';
import { Check, XCircle } from 'lucide-react';

interface AdminStoriesProps {
    user?: User | null;
}

const AdminStories = ({ user }: AdminStoriesProps) => {
    const [stories, setStories] = useState<Story[]>([]);
    const isAdmin = user?.role === 'admin';

    // Form state
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [slug, setSlug] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [isFeatured, setIsFeatured] = useState(false);
    const [parts, setParts] = useState<StoryPart[]>([
        { id: '1', title: 'Part 01', content: '' }
    ]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Derived lists
    const [categories, setCategories] = useState<string[]>([]);
    const [authorsList, setAuthorsList] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        // If admin, get ALL stories (including pending/rejected)
        // If writer, get ONLY their own stories (from all statuses)
        const allStories = getAllStories();

        if (isAdmin || !user) {
            setStories(allStories);
        } else {
            // Writer view: Only own stories
            setStories(allStories.filter(s => s.submittedBy === user.id || s.author === user.username));
        }

        setCategories(getCategories().map(c => c.name));
        setAuthorsList(getAllAuthors().map(a => a.name));
    };

    const handleAddStory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !author || !category || parts.some(p => !p.content)) {
            alert('Please fill all required fields and at least one part content.');
            return;
        }

        const newStory: Story = {
            id: editingId || Date.now().toString(),
            title,
            excerpt: parts[0]?.content.substring(0, 150) || '',
            content: parts.map(p => p.content).join('\n\n'),
            authorId: author,
            categoryId: category,
            author,
            category,
            slug: slug || undefined,
            cover_image: coverImage || undefined,
            image: coverImage || undefined,
            is_featured: isFeatured,
            views: 0,
            comments: 0,
            parts,
            readTime: `${Math.ceil(parts.reduce((acc, p) => acc + p.content.length, 0) / 200)} min`,
            date: editingId ? (stories.find(s => s.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
            status: editingId ? (stories.find(s => s.id === editingId)?.status) : (isAdmin ? 'published' : 'pending'),
            submittedBy: user?.id
        };

        const existingStory = editingId ? stories.find(s => s.id === editingId) : null;
        if (existingStory) {
            newStory.views = existingStory.views;
            newStory.comments = existingStory.comments;
        }

        saveStory(newStory);
        loadData();

        // Reset
        handleCancelEdit();
        alert(editingId ? 'Story updated successfully!' : 'Story published successfully!');
    };

    const handleEdit = (story: Story) => {
        setEditingId(story.id);
        setTitle(story.title);
        setAuthor(story.author || '');
        setCategory(story.category || '');
        setSlug(story.slug || '');
        setCoverImage(story.image || story.cover_image || '');
        setIsFeatured(!!story.is_featured);
        setParts(story.parts && story.parts.length > 0 ? story.parts : [
            { id: '1', title: 'Part 01', content: story.content || '' }
        ]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setAuthor('');
        setCategory('');
        setSlug('');
        setCoverImage('');
        setIsFeatured(false);
        setParts([{ id: '1', title: 'Part 01', content: '' }]);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Delete this story?')) {
            deleteStory(id);
            loadData();
        }
    };

    // Part management (same as before)
    const addPart = () => {
        const newId = (parts.length + 1).toString();
        setParts([...parts, { id: newId, title: `Part ${String(newId).padStart(2, '0')}`, content: '' }]);
    };
    const updatePart = (index: number, field: 'title' | 'content', value: string) => {
        const newParts = [...parts];
        newParts[index] = { ...newParts[index], [field]: value };
        setParts(newParts);
    };
    const removePart = (index: number) => {
        if (parts.length > 1) setParts(parts.filter((_, i) => i !== index));
    };

    return (
        <div className="admin-section">
            <h2 className="admin-section-title"><BookOpen size={20} /> Stories Management</h2>

            <div className="admin-grid-layout">
                {/* Story List */}
                <div className="admin-card">
                    <h3 className="card-title">All Stories ({stories.length})</h3>
                    <div className="story-list-scroll">
                        {stories.map(story => (
                            <div key={story.id} className="list-item">
                                <div className="list-item-avatar shadow-sm mr-4" style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                    <SmartImage src={story.cover_image} alt={story.title} className="w-full h-full object-cover" showFullText={true} />
                                </div>
                                <div className="list-item-info flex-1">
                                    <span className="item-title block font-bold text-white mb-1">
                                        {story.title}
                                        {story.status === 'pending' && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">Pending Approval</span>}
                                        {story.status === 'rejected' && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full border border-red-500/30">Rejected</span>}
                                        {story.status === 'published' && <span className="ml-2 text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full border border-green-500/30">Published</span>}
                                    </span>
                                    <span className="item-meta text-xs text-gray-400">{story.author} • {story.category} • {new Date(story.date).toLocaleDateString()}</span>
                                </div>
                                {isAdmin && story.status === 'pending' && (
                                    <>
                                        <button onClick={() => { updateStoryStatus(story.id, 'published'); loadData(); }} className="icon-btn text-green-500 hover:text-green-400" title="Approve">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={() => { updateStoryStatus(story.id, 'rejected'); loadData(); }} className="icon-btn text-red-500 hover:text-red-400" title="Reject">
                                            <XCircle size={16} />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => handleEdit(story)} className="icon-btn edit text-indigo-400 hover:text-indigo-300">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(story.id)} className="icon-btn delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Form */}
                <div className={`admin-card full-width ${editingId ? 'editing' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="card-title">{editingId ? 'Edit Story' : 'Create New Story'}</h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                <X size={14} /> Cancel Edit
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleAddStory} className="admin-form">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" required />
                            </div>
                            <div className="form-group half">
                                <label>Author</label>
                                <input type="text" value={author} onChange={e => setAuthor(e.target.value)} list="author-list" className="form-input" required />
                                <datalist id="author-list">
                                    {authorsList.map(a => <option key={a} value={a} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>Category</label>
                                <input type="text" value={category} onChange={e => setCategory(e.target.value)} list="cat-list" className="form-input" required />
                                <datalist id="cat-list">
                                    {categories.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div className="form-group half">
                                <label>Slug (Optional)</label>
                                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className="form-input" />
                            </div>
                        </div>

                        <div className="form-group">
                            <ImageUploader
                                label="Cover Image"
                                value={coverImage}
                                onChange={setCoverImage}
                                placeholder={title}
                            />
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
                                Featured Story (Show in Carousel)
                            </label>
                        </div>

                        <div className="parts-manager">
                            <label>Story Parts</label>
                            {parts.map((part, index) => (
                                <div key={part.id} className="part-editor">
                                    <div className="part-header">
                                        <input
                                            value={part.title}
                                            onChange={e => updatePart(index, 'title', e.target.value)}
                                            className="part-title-input"
                                        />
                                        {parts.length > 1 && <button type="button" onClick={() => removePart(index)} className="text-red-400">Remove</button>}
                                    </div>
                                    <textarea
                                        value={part.content}
                                        onChange={e => updatePart(index, 'content', e.target.value)}
                                        className="form-textarea"
                                        placeholder="Write content here..."
                                    />
                                </div>
                            ))}
                            <button type="button" onClick={addPart} className="btn-secondary btn-sm">+ Add Part</button>
                        </div>

                        <button type="submit" className={`btn mt-4 ${editingId ? 'btn-secondary font-bold text-lg' : 'btn-primary'}`}>
                            {editingId ? 'SAVE CHANGES' : 'PUBLISH STORY'}
                        </button>
                    </form>
                </div>
            </div>
        </div >
    );
};

export default AdminStories;
