'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { authApi } from '@/api/auth';
import { User, UserRole } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  ChefHat,
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';

export default function StaffManagementPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'CHEF'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('CHEF');
  const [formShift, setFormShift] = useState('Morning');
  const [formStation, setFormStation] = useState('Hot Kitchen');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load staff roster:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch staff members' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('CHEF');
    setFormShift('Morning (8 AM - 4 PM)');
    setFormStation('Hot Kitchen');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormShift(u.shift || 'Morning');
    setFormStation(u.assignedStation || u.assigned_station || 'Main Kitchen');
    setFormIsActive(u.is_active !== undefined ? u.is_active : u.isActive !== undefined ? u.isActive : true);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      if (editingUser) {
        // Update user
        await authApi.updateUser(editingUser.id, {
          name: formName,
          role: formRole,
          shift: formShift,
          assigned_station: formStation,
          password: formPassword.trim() ? formPassword.trim() : undefined,
          is_active: formIsActive,
        });
        setFeedback({ type: 'success', message: `Staff member "${formName}" updated successfully!` });
      } else {
        // Create user
        if (!formPassword.trim()) {
          throw new Error('A secure password is required for new accounts.');
        }
        await authApi.createUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          shift: formShift,
          assigned_station: formStation,
        });
        setFeedback({ type: 'success', message: `New ${formRole === 'CHEF' ? 'Chef' : 'Manager'} "${formName}" onboarded!` });
      }
      setIsModalOpen(false);
      await loadStaff();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentAdmin?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to remove ${u.name} (${u.role}) from the staff roster?`)) {
      return;
    }

    try {
      await authApi.deleteUser(u.id);
      setFeedback({ type: 'success', message: `Staff member "${u.name}" removed.` });
      await loadStaff();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove user' });
    }
  };

  // Metrics
  const totalChefs = users.filter((u) => u.role === 'CHEF').length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const activeStaff = users.filter((u) => u.is_active !== false && u.isActive !== false).length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.assignedStation && u.assignedStation.toLowerCase().includes(q)) ||
      (u.assigned_station && u.assigned_station.toLowerCase().includes(q)) ||
      (u.shift && u.shift.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight font-serif">
                Staff & Chef Management
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-green text-brand-beige">
                {users.length} members
              </span>
            </div>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Control staff credentials, assign kitchen prep stations, shifts, and view operational staff roster.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-gold text-brand-green hover:bg-brand-gold-light border border-brand-gold-dark text-xs font-black shadow-xs transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Add Staff / Chef</span>
            </button>

            <button
              type="button"
              onClick={loadStaff}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-brand-beige border border-brand-beige-dark text-xs font-bold text-brand-green shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-brand-green/60">
              <span className="text-[10px] uppercase font-black tracking-wider">Active Staff</span>
              <Users className="w-4 h-4 text-brand-green/40" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              {activeStaff} / {users.length}
            </p>
            <p className="text-[11px] text-brand-green/60">Operational crew active</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] uppercase font-black tracking-wider">Kitchen Chefs (KDS)</span>
              <ChefHat className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
              {totalChefs}
            </p>
            <p className="text-[11px] text-amber-900/60">Assigned to food stations</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-brand-gold-dark">
              <span className="text-[10px] uppercase font-black tracking-wider">Admins & Managers</span>
              <ShieldCheck className="w-4 h-4 text-brand-gold" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              {totalAdmins}
            </p>
            <p className="text-[11px] text-brand-green/60">Full console authorization</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(
              [
                { label: 'All Staff', value: 'ALL' },
                { label: 'Chefs Only', value: 'CHEF' },
                { label: 'Admins Only', value: 'ADMIN' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  roleFilter === tab.value
                    ? 'bg-brand-green text-brand-beige shadow-xs'
                    : 'bg-white hover:bg-brand-beige text-brand-green/80 border border-brand-beige-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
            <input
              type="text"
              placeholder="Search name, email, station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        {/* Staff & Chef Roster Cards */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-brand-green/60">Loading staff roster...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-brand-beige-dark text-center space-y-2">
            <Users className="w-8 h-8 text-brand-green/40 mx-auto" />
            <p className="text-sm font-bold text-brand-green">No staff members found</p>
            <p className="text-xs text-brand-green/60">Try adjusting your filter or search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const isChef = u.role === 'CHEF';
              const isCurrentUser = u.id === currentAdmin?.id;
              const isActive = u.is_active !== false && u.isActive !== false;

              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                    isActive ? 'border-brand-beige-dark hover:border-brand-gold/60' : 'border-red-200 bg-red-50/20 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0 ${
                            isChef
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-brand-green text-brand-beige border border-brand-gold'
                          }`}
                        >
                          {isChef ? <ChefHat className="w-6 h-6 text-amber-700" /> : <ShieldCheck className="w-6 h-6 text-brand-gold" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-brand-green truncate">{u.name}</h3>
                            {isCurrentUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-green text-brand-beige">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-green/60 truncate">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full font-mono tracking-wider ${
                          isChef
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-brand-green text-brand-gold border border-brand-gold/50'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-brand-beige-dark/50 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-brand-beige-light/80 p-2 rounded-xl">
                        <span className="text-brand-green/50 block text-[9px] uppercase font-bold">Shift</span>
                        <span className="font-bold text-brand-green truncate block">{u.shift || 'General'}</span>
                      </div>
                      <div className="bg-brand-beige-light/80 p-2 rounded-xl">
                        <span className="text-brand-green/50 block text-[9px] uppercase font-bold">Station</span>
                        <span className="font-bold text-brand-green truncate block">
                          {u.assignedStation || u.assigned_station || 'Main Line'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-brand-beige-dark/50 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-semibold">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className={isActive ? 'text-emerald-700' : 'text-red-700'}>
                        {isActive ? 'Active Duty' : 'Suspended'}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 rounded-lg bg-brand-beige-light hover:bg-brand-beige text-brand-green border border-brand-beige-dark transition-all"
                        title="Edit Staff Member"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all"
                          title="Remove Staff Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add or Edit Staff Member */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-beige-dark shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-beige-dark/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-gold text-brand-green flex items-center justify-center font-bold">
                    {formRole === 'CHEF' ? <ChefHat className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-brand-green">
                      {editingUser ? 'Edit Staff Member' : 'Onboard New Staff / Chef'}
                    </h2>
                    <p className="text-[10px] text-brand-green/60">
                      Configure credentials and operational duties
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-brand-beige hover:bg-brand-beige-dark flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-brand-green">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-brand-green">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. chef.vikram@vaanvibes.com"
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark focus:outline-none focus:border-brand-gold disabled:bg-slate-100 disabled:opacity-75"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-brand-green">
                    {editingUser ? 'New Password (leave blank to keep unchanged)' : 'Login Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? '••••••••' : 'Minimum 6 characters'}
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark focus:outline-none focus:border-brand-gold font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-brand-green">Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark bg-white font-bold"
                    >
                      <option value="CHEF">CHEF (Kitchen KDS)</option>
                      <option value="ADMIN">ADMIN (Full Console)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-brand-green">Working Shift</label>
                    <select
                      value={formShift}
                      onChange={(e) => setFormShift(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark bg-white"
                    >
                      <option value="Morning (8 AM - 4 PM)">Morning (8 AM - 4 PM)</option>
                      <option value="Evening (4 PM - 12 AM)">Evening (4 PM - 12 AM)</option>
                      <option value="All-Day Shift">All-Day Shift</option>
                      <option value="Night Kitchen">Night Kitchen</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-brand-green">Assigned Station / Section</label>
                  <select
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark bg-white"
                  >
                    <option value="Hot Kitchen (Tandoor & Gravy)">Hot Kitchen (Tandoor & Gravy)</option>
                    <option value="Beverage & Barista Counter">Beverage & Barista Counter</option>
                    <option value="Desserts & Bakery Station">Desserts & Bakery Station</option>
                    <option value="Pass & Quality Inspection">Pass & Quality Inspection</option>
                    <option value="Control Desk (Admin POS)">Control Desk (Admin POS)</option>
                  </select>
                </div>

                {editingUser && (
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActiveToggle"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-brand-beige-dark text-brand-green focus:ring-brand-gold w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="isActiveToggle" className="font-bold text-brand-green cursor-pointer">
                      Account is Active & Permitted to Login
                    </label>
                  </div>
                )}

                <div className="pt-3 border-t border-brand-beige-dark/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-brand-gold hover:bg-brand-gold-light text-brand-green font-black shadow-xs disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingUser ? 'Update Staff' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
