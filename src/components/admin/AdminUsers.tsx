import { useEffect, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { createUser, deleteUser, getAllUsers, type User, type UserRole } from '../../utils/userManager';
import './AdminUsers.css';

interface AdminUsersProps {
    currentUser?: User | null;
}

const AdminUsers = ({ currentUser }: AdminUsersProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('moderator');
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const isAdmin = currentUser?.role === 'admin';

    const loadUsers = () => {
        setUsers(getAllUsers());
    };

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
        } else {
            setUsers([]);
        }
    }, [isAdmin]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setStatus(null);

        const result = createUser({
            username: username || undefined,
            email: email || undefined,
            password,
            displayName: displayName || undefined,
            role
        });

        if (!result.success) {
            setStatus({ type: 'error', message: result.message });
            return;
        }

        setStatus({ type: 'success', message: 'User created successfully.' });
        setUsername('');
        setEmail('');
        setDisplayName('');
        setPassword('');
        setRole('moderator');
        loadUsers();
    };

    const handleDelete = (user: User) => {
        setStatus(null);
        const confirmed = window.confirm(`Delete account "${user.displayName || user.username}"?`);
        if (!confirmed) return;

        const result = deleteUser(user.id);
        if (!result.success) {
            setStatus({ type: 'error', message: result.message });
            return;
        }

        setStatus({ type: 'success', message: result.message });
        loadUsers();
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
                        {users.map(user => (
                            <div key={user.id} className="list-item">
                                <div className="list-item-info">
                                    <span className="item-name">{user.displayName || user.username}</span>
                                    <span className="item-meta">{user.email || user.username}</span>
                                </div>
                                <div className="admin-user-actions">
                                    <span className="admin-user-role">{user.role}</span>
                                    <button
                                        type="button"
                                        className="admin-user-delete-btn"
                                        onClick={() => handleDelete(user)}
                                        disabled={user.id === currentUser?.id || user.id === 'admin-123'}
                                        title={user.id === 'admin-123'
                                            ? 'System admin cannot be deleted'
                                            : (user.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user')}
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!users.length && <p>No users found.</p>}
                    </div>
                </div>

                <div className="admin-card">
                    <h3 className="card-title">Create New User</h3>
                    <form onSubmit={handleSubmit} className="admin-form-compact">
                        <div className="form-group">
                            <label>User ID / Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="form-input"
                                placeholder="e.g. moderator01"
                            />
                        </div>
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
                            <label>Email (Optional)</label>
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
                                onChange={(event) => setRole(event.target.value as UserRole)}
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
