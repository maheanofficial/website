import { useState, useEffect } from 'react';
import { Trash2, Plus, Hash, Edit2, X } from 'lucide-react';
import { getCategories, saveCategory, deleteCategory, type Category } from '../../utils/categoryManager';
import SmartImage from '../SmartImage';
import ImageUploader from './ImageUploader';

const AdminCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatSlug, setNewCatSlug] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [newCatImage, setNewCatImage] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        setCategories(getCategories());
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName) return;

        const cat: Category = {
            id: editingId || Date.now().toString(),
            name: newCatName,
            slug: newCatSlug || newCatName.toLowerCase().replace(/ /g, '-'),
            description: newCatDesc,
            image: newCatImage
        };

        saveCategory(cat);
        setCategories(getCategories());

        // Reset
        setEditingId(null);
        setNewCatName('');
        setNewCatSlug('');
        setNewCatDesc('');
        setNewCatImage('');
    };

    const handleEdit = (cat: Category) => {
        setEditingId(cat.id);
        setNewCatName(cat.name);
        setNewCatSlug(cat.slug || '');
        setNewCatDesc(cat.description || '');
        setNewCatImage(cat.image || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewCatName('');
        setNewCatSlug('');
        setNewCatDesc('');
        setNewCatImage('');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            deleteCategory(id);
            setCategories(getCategories());
        }
    };

    return (
        <div className="admin-section">
            <h2 className="admin-section-title"><Hash size={20} /> Categories</h2>

            <div className="admin-grid-layout">
                {/* List */}
                <div className="admin-card">
                    <h3 className="card-title">Existing Categories</h3>
                    <div className="category-list">
                        {categories.map(cat => (
                            <div key={cat.id} className="list-item">
                                <div className="list-item-avatar shadow-sm mr-4" style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                    <SmartImage src={cat.image} alt={cat.name} className="w-full h-full object-cover" showFullText={true} />
                                </div>
                                <div className="list-item-info flex-1">
                                    <span className="item-name block font-bold text-white">{cat.name}</span>
                                    <span className="item-meta text-xs text-gray-400">/{cat.slug}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(cat)} className="icon-btn edit text-indigo-400 hover:text-indigo-300">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} className="icon-btn delete">
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
                        <h3 className="card-title">{editingId ? 'Edit Category' : 'Add New Category'}</h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                <X size={14} /> Cancel
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleAdd} className="admin-form-compact">
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Slug (Optional)</label>
                            <input
                                type="text"
                                value={newCatSlug}
                                onChange={e => setNewCatSlug(e.target.value)}
                                className="form-input"
                                placeholder="auto-generated"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={newCatDesc}
                                onChange={e => setNewCatDesc(e.target.value)}
                                className="form-input"
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label>Category Image</label>
                            <ImageUploader
                                value={newCatImage}
                                onChange={setNewCatImage}
                                placeholder={newCatName}
                            />
                        </div>
                        <button type="submit" className={`btn w-full ${editingId ? 'btn-secondary font-bold text-lg' : 'btn-primary'}`}>
                            {editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                            {editingId ? 'SAVE CHANGES' : 'ADD CATEGORY'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminCategories;
