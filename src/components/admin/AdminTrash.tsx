import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { getTrashItems, restoreFromTrash, permanentDelete, emptyTrash, type TrashItem } from '../../utils/trashManager';
import { restoreStory } from '../../utils/storyManager';
import { restoreAuthor } from '../../utils/authorManager';
import { restoreCategory } from '../../utils/categoryManager';

const AdminTrash = () => {
    const [trashItems, setTrashItems] = useState<TrashItem[]>([]);

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = () => {
        setTrashItems(getTrashItems());
    };

    const handleRestore = (id: string) => {
        if (window.confirm('Restore this item?')) {
            const item = restoreFromTrash(id);
            if (item) {
                if (item.type === 'story') restoreStory(item.data);
                else if (item.type === 'author') restoreAuthor(item.data);
                else if (item.type === 'category') restoreCategory(item.data);
                loadTrash();
            }
        }
    };

    const handlePermanentDelete = (id: string) => {
        if (window.confirm('Permanently delete this item? This cannot be undone.')) {
            permanentDelete(id);
            loadTrash();
        }
    };

    const handleEmptyTrash = () => {
        if (window.confirm('Are you SURE you want to empty the trash? All items will be lost forever.')) {
            emptyTrash();
            loadTrash();
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'story': return 'Story';
            case 'author': return 'Author';
            case 'category': return 'Category';
            default: return type;
        }
    };

    return (
        <div className="admin-section">
            <div className="flex justify-between items-center mb-6">
                <h2 className="admin-section-title text-red-400">
                    <Trash2 size={24} /> Recycle Bin
                </h2>
                {trashItems.length > 0 && (
                    <button
                        onClick={handleEmptyTrash}
                        className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Empty Trash
                    </button>
                )}
            </div>

            <div className="admin-card full-width">
                <h3 className="card-title">Deleted Items ({trashItems.length})</h3>

                {trashItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Trash2 size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Trash is empty</p>
                    </div>
                ) : (
                    <div className="story-list-scroll">
                        {trashItems.map(item => (
                            <div key={item.id} className="list-item border-l-4 border-red-500/20">
                                <div className="list-item-info">
                                    <span className="item-title">{item.name}</span>
                                    <span className="item-meta">
                                        Type: {getTypeLabel(item.type)} • Deleted: {item.deletedAt}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(item.id)}
                                        className="icon-btn text-green-500 hover:bg-green-500/10"
                                        title="Restore"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => handlePermanentDelete(item.id)}
                                        className="icon-btn delete"
                                        title="Delete Forever"
                                    >
                                        <AlertTriangle size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTrash;
