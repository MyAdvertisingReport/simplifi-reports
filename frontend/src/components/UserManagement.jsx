/**
 * UserManagement.jsx
 * Admin component for managing users and client assignments
 * 
 * Place in: frontend/src/components/UserManagement.jsx
 * 
 * Add route in App.jsx:
 *   import UserManagement from './components/UserManagement';
 *   <Route path="/admin/users" element={<UserManagement />} />
 */

import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const UserManagement = () => {
  // Get auth from localStorage (adjust if using context differently)
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New user form
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    role: 'sales_associate' 
  });
  const [saving, setSaving] = useState(false);
  
  // Assignment modal
  const [assigningUser, setAssigningUser] = useState(null);
  const [userClients, setUserClients] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch all data on mount
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersRes, clientsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers }),
        fetch(`${API_BASE}/api/clients`, { headers }),
        fetch(`${API_BASE}/api/client-assignments`, { headers }).catch(() => ({ ok: false }))
      ]);
      
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      if (!clientsRes.ok) throw new Error('Failed to fetch clients');
      
      const usersData = await usersRes.json();
      const clientsData = await clientsRes.json();
      
      setUsers(usersData);
      setClients(clientsData);
      
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAllAssignments(assignmentsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newUser)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      setShowNewUserForm(false);
      setNewUser({ email: '', password: '', name: '', role: 'sales_associate' });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open assignment modal
  const openAssignments = async (user) => {
    setAssigningUser(user);
    
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}/clients`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUserClients(data.map(c => c.id));
      } else {
        setUserClients([]);
      }
    } catch (err) {
      setUserClients([]);
    }
  };

  // Toggle client assignment
  const toggleClientAssignment = async (clientId) => {
    const isAssigned = userClients.includes(clientId);
    
    try {
      if (isAssigned) {
        // Remove assignment
        const res = await fetch(
          `${API_BASE}/api/clients/${clientId}/assignments/${assigningUser.id}`, 
          { method: 'DELETE', headers }
        );
        if (res.ok) {
          setUserClients(prev => prev.filter(id => id !== clientId));
        }
      } else {
        // Add assignment
        const res = await fetch(
          `${API_BASE}/api/clients/${clientId}/assignments`, 
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId: assigningUser.id })
          }
        );
        if (res.ok) {
          setUserClients(prev => [...prev, clientId]);
        }
      }
    } catch (err) {
      alert('Failed to update assignment');
    }
  };

  // Get assigned clients count for a user
  const getAssignedCount = (userId) => {
    return allAssignments.filter(a => a.user_id === userId).length;
  };

  // Role badge colors
  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      sales_manager: 'bg-blue-100 text-blue-800',
      sales_associate: 'bg-green-100 text-green-800',
      sales: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      admin: 'Admin',
      sales_manager: 'Sales Manager',
      sales_associate: 'Sales Associate',
      sales: 'Sales'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[role] || styles.sales}`}>
        {labels[role] || role}
      </span>
    );
  };

  // Access check
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-xl mb-2">Access Denied</div>
        <p className="text-gray-600">You must be an admin to access user management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage users and client assignments</p>
        </div>
        <button
          onClick={() => setShowNewUserForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Clients
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr 
                key={user.id} 
                className={user.id === currentUser.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-xs text-blue-600">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.role === 'admin' || user.role === 'sales_manager' ? (
                    <span className="text-gray-400 text-sm">All clients (by role)</span>
                  ) : (
                    <button
                      onClick={() => openAssignments(user)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {getAssignedCount(user.id)} clients 
                      <span className="ml-1">→</span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New User Modal */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Add New User</h2>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@wsicnews.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sales_associate">Sales Associate</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {newUser.role === 'sales_associate' && 'Can only see assigned clients'}
                    {newUser.role === 'sales_manager' && 'Can see all clients and approve orders'}
                    {newUser.role === 'admin' && 'Full access to everything'}
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Assignment Modal */}
      {assigningUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">
                Assign Clients to {assigningUser.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select which clients this user can access
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {clients.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No clients available</p>
              ) : (
                <div className="space-y-1">
                  {clients.map(client => (
                    <label
                      key={client.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={userClients.includes(client.id)}
                        onChange={() => toggleClientAssignment(client.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-gray-900">{client.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
              <span className="text-sm text-gray-500">
                {userClients.length} client{userClients.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => {
                  setAssigningUser(null);
                  fetchData(); // Refresh to update counts
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
