import { useEffect, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import {
    createManagedUser,
    deleteManagedUser,
    listManagedUsers,
    type ManagedUser,
    type ManagedUserRole
} from '../../utils/adminUserService';
import type { User } from '../../utils/userManager';
import './AdminUsers.css';

interface AdminUsersProps {
    currentUser?: User | null;
}

const AdminUsers = ({ currentUser }: AdminUsersProps) => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<ManagedUserRole>('moderator');
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isAdmin = currentUser?.role === 'admin';

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await listManagedUsers();
            setUsers(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load users from server.';
            setStatus({ type: 'error', message });
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            void loadUsers();
        } else {
            setUsers([]);
        }
    }, [isAdmin]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setStatus(null);

        if (!email.trim()) {
            setStatus({ type: 'error', message: 'Email is required.' });
            return;
        }

        try {
            await createManagedUser({
                email: email.trim(),
                password,
                displayName: displayName || undefined,
                role
            });
            setStatus({ type: 'success', message: 'User created successfully in Supabase.' });
            setEmail('');
            setDisplayName('');
            setPassword('');
            setRole('moderator');
            await loadUsers();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create user.';
            setStatus({ type: 'error', message });
        }
    };

    const handleDelete = async (user: ManagedUser) => {
        setStatus(null);
        const confirmed = window.confirm(`Delete account "${user.displayName || user.email}"?`);
        if (!confirmed) return;

        try {
            await deleteManagedUser(user.id);
            setStatus({ type: 'success', message: 'User deleted from Supabase.' });
            await loadUsers();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete user.';
            setStatus({ type: 'error', message });
        }
    };

    if (!isAdmin) {
        return (
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <Users size={20} />
                    Users
                </h2>
                <div className="admin-card">
                    <p>Only admin can manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <h2 className="admin-section-title">
                <Users size={20} />
                Users
            </h2>

            <div className="admin-grid-layout">
                <div className="admin-card">
                    <h3 className="card-title">Existing Users ({users.length})</h3>
                    <div className="story-list-scroll">
                        {isLoading && <p>Loading users...</p>}
                        {users.map(user => (
                            <div key={user.id} className="list-item">
                                <div className="list-item-info">
                                    <span className="item-name">{user.displayName || user.email}</span>
                                    <span className="item-meta">{user.email}</span>
                                </div>
                                <div className="admin-user-actions">
                                    <span className="admin-user-role">{user.role}</span>
                                    <button
                                        type="button"
                                        className="admin-user-delete-btn"
                                        onClick={() => handleDelete(user)}
                                        disabled={user.id === currentUser?.id || user.email.toLowerCase() === 'admin@local'}
                                        title={user.email.toLowerCase() === 'admin@local'
                                            ? 'System admin cannot be deleted'
                                            : (user.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user')}
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!isLoading && !users.length && <p>No users found.</p>}
                    </div>
                </div>

                <div className="admin-card">
                    <h3 className="card-title">Create New User</h3>
                    <form onSubmit={handleSubmit} className="admin-form-compact">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value)}
                                className="form-input"
                                placeholder="Full name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="form-input"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Temporary Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select
                                value={role}
                                onChange={(event) => setRole(event.target.value as ManagedUserRole)}
                                className="form-select"
                            >
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary w-full">
                            <UserPlus size={18} />
                            Create User
                        </button>
                        {status && (
                            <div className={`admin-user-status ${status.type === 'error' ? 'error' : ''}`}>
                                {status.message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
