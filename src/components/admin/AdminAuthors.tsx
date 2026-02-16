import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Plus, Users, Edit2, X, Sparkles } from 'lucide-react';

import { getAllAuthors, saveAuthor, deleteAuthor, type Author } from '../../utils/authorManager';
import ImageUploader from './ImageUploader';
import SmartImage from '../SmartImage';

const AdminAuthors = () => {
    const [authors, setAuthors] = useState<Author[]>([]);
    const latestLoadIdRef = useRef(0);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const refreshAuthors = useCallback(async () => {
        const loadId = latestLoadIdRef.current + 1;
        latestLoadIdRef.current = loadId;
        const data = await getAllAuthors();
        // Ignore stale responses to prevent older loads from overwriting recent saves.
        if (latestLoadIdRef.current === loadId) {
            setAuthors(data);
        }
    }, []);

    useEffect(() => {
        void refreshAuthors();
    }, [refreshAuthors]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedUsername = username.trim();
        if (!trimmedName || !trimmedUsername) return;
        const isEditing = Boolean(editingId);
        const duplicateUsername = authors.find((author) =>
            author.id !== editingId
            && author.username?.trim().toLowerCase() === trimmedUsername.toLowerCase()
        );
        if (duplicateUsername) {
            setStatus({ type: 'error', message: `Username "${trimmedUsername}" already exists.` });
            return;
        }

        try {
            const newAuthor: Author = {
                id: editingId || Date.now().toString(),
                name: trimmedName,
                username: trimmedUsername,
                bio: bio.trim(),
                avatar: avatar || 'https://via.placeholder.com/150',
                links
            };

            await saveAuthor(newAuthor);
            await refreshAuthors();
            setStatus({
                type: 'success',
                message: editingId ? 'Author updated successfully.' : 'Author created successfully.'
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save author.';
            setStatus({ type: 'error', message });
            return;
        }

        // Reset
        setEditingId(null);
        setName('');
        setUsername('');
        setBio('');
        setAvatar('');
        setLinks([]);

        if (!isEditing) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleEdit = (author: Author) => {
        setEditingId(author.id);
        setName(author.name);
        setUsername(author.username || '');
        setBio(author.bio || '');
        setAvatar(author.avatar || '');
        setLinks(author.links || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setUsername('');
        setBio('');
        setAvatar('');
        setLinks([]);
        setStatus(null);
    };

    const addLink = () => {
        setLinks([...links, { name: '', url: '' }]);
    };

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const updateLink = (index: number, field: 'name' | 'url', value: string) => {
        const newLinks = [...links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setLinks(newLinks);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this author?')) {
            await deleteAuthor(id);
            await refreshAuthors();
            setStatus({ type: 'success', message: 'Author deleted.' });
        }
    };

    return (
        <div className="admin-section">
            <div className="admin-section-header">
                <h2 className="admin-section-title"><Users size={20} /> Authors</h2>
            </div>

            <div className="admin-grid-layout">
                {/* List */}
                <div className="admin-card">
                    <h3 className="card-title">Authors List</h3>
                    {status && (
                        <p className={`mb-3 text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {status.message}
                        </p>
                    )}
                    <div className="author-list">
                        {authors.map(author => (
                            <div key={author.id} className="list-item">
                                <div className="list-item-avatar">
                                    <SmartImage src={author.avatar} alt={author.name} className="w-full h-full object-cover" isRound={true} showFullText={true} />
                                </div>
                                <div className="list-item-info">
                                    <span className="item-name">{author.name}</span>
                                    <span className="item-meta">
                                        {author.username ? `@${author.username}` : 'No username'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(author)} className="icon-btn edit text-indigo-400 hover:text-indigo-300">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(author.id)} className="icon-btn delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Form */}
                <div className={`admin-card ${editingId ? 'editing' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="card-title">{editingId ? 'Edit Author' : 'Add New Author'}</h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                <X size={14} /> Cancel
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleAdd} className="admin-form-compact">
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>Username (Unique ID)</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>Bio</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} className="form-input" rows={3} />
                        </div>

                        <div className="form-group">
                            <label>Avatar / Profile Photo</label>

                            {/* Preset Avatars Section */}
                            <div className="preset-avatars-section">
                                <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} className="text-orange-500" /> Quick Avatars
                                </p>

                                <div className="mb-4">
                                    <p className="preset-category-title">Characters & People</p>
                                    <div className="preset-grid">
                                        {[
                                            'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                                            'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
                                            'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
                                            'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
                                            'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
                                            'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
                                            'https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha',
                                            'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo',
                                            'https://api.dicebear.com/7.x/personas/svg?seed=Ruby',
                                            'https://api.dicebear.com/7.x/personas/svg?seed=Max'
                                        ].map((url, i) => (
                                            <button
                                                key={`char-${i}`}
                                                type="button"
                                                onClick={() => setAvatar(url)}
                                                className={`preset-btn ${avatar === url ? 'active' : ''}`}
                                            >
                                                <img src={url} alt="preset" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="preset-category-title">Abstract & Artistic</p>
                                    <div className="preset-grid">
                                        {[
                                            'https://api.dicebear.com/7.x/shapes/svg?seed=Abstract1',
                                            'https://api.dicebear.com/7.x/shapes/svg?seed=Abstract2',
                                            'https://api.dicebear.com/7.x/shapes/svg?seed=Abstract3',
                                            'https://api.dicebear.com/7.x/identicon/svg?seed=ID1',
                                            'https://api.dicebear.com/7.x/identicon/svg?seed=ID2',
                                            'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
                                            'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
                                            'https://api.dicebear.com/7.x/thumbs/svg?seed=T1',
                                            'https://api.dicebear.com/7.x/thumbs/svg?seed=T2',
                                            'https://api.dicebear.com/7.x/rings/svg?seed=R1'
                                        ].map((url, i) => (
                                            <button
                                                key={`abs-${i}`}
                                                type="button"
                                                onClick={() => setAvatar(url)}
                                                className={`preset-btn ${avatar === url ? 'active' : ''}`}
                                            >
                                                <img src={url} alt="preset" />
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setAvatar('')}
                                            className={`preset-btn clear-btn ${!avatar ? 'active' : ''}`}
                                            title="Clear Selection (Use Initial Icon)"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <ImageUploader
                                value={avatar}
                                onChange={setAvatar}
                                isRound={true}
                                folder="authors/avatars"
                            />
                        </div>
                        <div className="form-group">
                            <label>Social Links</label>
                            <div className="flex flex-col gap-2">
                                {links.map((link, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Name (e.g. Facebook)"
                                            value={link.name}
                                            onChange={e => updateLink(index, 'name', e.target.value)}
                                            className="form-input flex-1"
                                        />
                                        <input
                                            type="text"
                                            placeholder="URL"
                                            value={link.url}
                                            onChange={e => updateLink(index, 'url', e.target.value)}
                                            className="form-input flex-[2]"
                                        />
                                        <button type="button" onClick={() => removeLink(index)} className="p-2 text-red-400 hover:text-red-300">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addLink} className="btn-secondary btn-sm self-start">
                                    + Add Link
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="create-btn create-btn--block">
                            {editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                            {editingId ? 'SAVE CHANGES' : 'CREATE AUTHOR'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminAuthors;
