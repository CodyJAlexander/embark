import { useState, useEffect } from 'react';
import { useTeam } from '../../hooks/useTeam';
import { useAssignmentRoles } from '../../hooks/useAssignmentRoles';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { CapacityView } from '../Views/CapacityView';
import type { TeamMember, TeamRole, AssignmentRole, Team } from '../../types';

const roleLabels: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const roleDescriptions: Record<TeamRole, string> = {
  owner: 'Full access, can manage team and settings',
  admin: 'Can manage clients, tasks, and team members',
  member: 'Can manage clients and tasks',
  viewer: 'Read-only access',
};

type TabType = 'members' | 'roles' | 'capacity';

export function TeamManager() {
  const {
    teams,
    selectedTeam,
    selectTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    members,
    addMember,
    updateMember,
    removeMember,
    currentUser,
    setCurrentUser,
    hasPermission,
    allMembers,
  } = useTeam();

  const {
    roles: assignmentRoles,
    addRole,
    updateRole,
    deleteRole,
  } = useAssignmentRoles();

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempTeamName, setTempTeamName] = useState('');
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<AssignmentRole | null>(null);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState<string | null>(null);

  // ── Embark backend team ────────────────────────────────────────────────────
  const { updateUser } = useAuth();
  interface ServerTeam {
    id: string; name: string; inviteCode: string;
    members: Array<{ id: string; username: string; email: string; avatarUrl?: string }>;
  }
  const [serverTeam, setServerTeam] = useState<ServerTeam | null | undefined>(undefined); // undefined = loading
  const [serverTeamMode, setServerTeamMode] = useState<'create' | 'join'>('create');
  const [serverTeamName, setServerTeamName] = useState('');
  const [serverInviteCode, setServerInviteCode] = useState('');
  const [serverTeamLoading, setServerTeamLoading] = useState(false);
  const [serverTeamError, setServerTeamError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.get<ServerTeam>('/api/v1/teams/me').then(res => {
      setServerTeam(res.data ?? null);
    }).catch(() => setServerTeam(null));
  }, []);

  const handleServerTeamAction = async () => {
    if (serverTeamLoading) return;
    setServerTeamError(null);
    setServerTeamLoading(true);
    try {
      let res;
      if (serverTeamMode === 'create') {
        if (!serverTeamName.trim()) { setServerTeamError('Enter a team name.'); return; }
        res = await api.post<ServerTeam>('/api/v1/teams', { name: serverTeamName.trim() });
      } else {
        if (!serverInviteCode.trim()) { setServerTeamError('Enter an invite code.'); return; }
        res = await api.post<ServerTeam>('/api/v1/teams/join', { inviteCode: serverInviteCode.trim() });
      }
      if (res.error || !res.data) { setServerTeamError(res.error ?? 'Something went wrong.'); return; }
      setServerTeam(res.data);
      await updateUser({ teamId: res.data.id });
    } finally {
      setServerTeamLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!serverTeam?.inviteCode) return;
    navigator.clipboard.writeText(serverTeam.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Allow team management if: no members yet, user is admin/owner, or no current user is set (localStorage-only app)
  const canManageTeam = members.length === 0 || hasPermission('admin') || !currentUser;

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      createTeam(newTeamName.trim());
      setNewTeamName('');
      setShowAddTeamForm(false);
    }
  };

  const handleStartEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTempTeamName(team.name);
  };

  const handleSaveTeamName = () => {
    if (editingTeamId && tempTeamName.trim()) {
      updateTeam(editingTeamId, { name: tempTeamName.trim() });
    }
    setEditingTeamId(null);
    setTempTeamName('');
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam(teamId);
    setShowDeleteTeamConfirm(null);
  };

  return (
    <div className="space-y-6">
    {/* ── Embark Team (backend, shared visibility) ───────────────────────── */}
    <div className="glass-card p-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Embark Team</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Create or join a shared team so all members see the same clients.
      </p>

      {serverTeam === undefined ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : serverTeam ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{serverTeam.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{serverTeam.members.length} member{serverTeam.members.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Invite code:</span>
            <code className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-sm text-yellow-600 dark:text-yellow-400 tracking-widest border border-zinc-200 dark:border-zinc-700">
              {serverTeam.inviteCode}
            </code>
            <button
              onClick={copyInviteCode}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded hover:border-gray-500 dark:hover:border-zinc-400 text-gray-600 dark:text-gray-400 transition-colors"
            >
              {copiedCode ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {serverTeam.members.map(m => (
              <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 rounded px-2 py-1">
                {m.avatarUrl
                  ? <img src={m.avatarUrl} className="w-4 h-4 rounded-full object-cover" alt="" />
                  : <span className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-white text-[9px] font-bold">{m.username[0].toUpperCase()}</span>
                }
                {m.username}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            {(['create', 'join'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setServerTeamMode(mode); setServerTeamError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${serverTeamMode === mode ? 'bg-violet-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                {mode === 'create' ? 'Create team' : 'Join team'}
              </button>
            ))}
          </div>
          {serverTeamMode === 'create' ? (
            <input
              type="text"
              value={serverTeamName}
              onChange={e => setServerTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              onKeyDown={e => { if (e.key === 'Enter') void handleServerTeamAction(); }}
            />
          ) : (
            <input
              type="text"
              value={serverInviteCode}
              onChange={e => setServerInviteCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-violet-500 uppercase"
              onKeyDown={e => { if (e.key === 'Enter') void handleServerTeamAction(); }}
            />
          )}
          {serverTeamError && <p className="text-xs text-red-500">{serverTeamError}</p>}
          <button
            onClick={() => void handleServerTeamAction()}
            disabled={serverTeamLoading}
            className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {serverTeamLoading ? '…' : serverTeamMode === 'create' ? 'Create Team' : 'Join Team'}
          </button>
        </div>
      )}
    </div>

    {/* ── Assignment teams / members (existing localStorage-based section) ── */}
    <div className="flex gap-6 h-full">
      {/* Left Sidebar - Teams List */}
      <div className="w-64 flex-shrink-0">
        <div className="glass-card p-4 h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h2>
            <button
              onClick={() => setShowAddTeamForm(true)}
              className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
              title="Add Team"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Add Team Form */}
          {showAddTeamForm && (
            <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTeam();
                  if (e.key === 'Escape') {
                    setShowAddTeamForm(false);
                    setNewTeamName('');
                  }
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowAddTeamForm(false);
                    setNewTeamName('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className="px-3 py-1 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Teams List */}
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No teams yet</p>
              <button
                onClick={() => setShowAddTeamForm(true)}
                className="text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline"
              >
                Create your first team
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`relative group rounded-lg border transition-all cursor-pointer ${
                    selectedTeam?.id === team.id
                      ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700'
                      : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  {editingTeamId === team.id ? (
                    <div className="p-3">
                      <input
                        type="text"
                        value={tempTeamName}
                        onChange={(e) => setTempTeamName(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-violet-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTeamName();
                          if (e.key === 'Escape') {
                            setEditingTeamId(null);
                            setTempTeamName('');
                          }
                        }}
                        onBlur={handleSaveTeamName}
                      />
                    </div>
                  ) : (
                    <div
                      className="p-3"
                      onClick={() => selectTeam(team.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {selectedTeam?.id === team.id && (
                            <svg className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={`font-medium truncate ${
                            selectedTeam?.id === team.id
                              ? 'text-violet-700 dark:text-violet-300'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {team.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {team.members.length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Edit/Delete buttons - show on hover */}
                  {editingTeamId !== team.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditTeam(team);
                        }}
                        className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded"
                        title="Rename team"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {teams.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteTeamConfirm(team.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="Delete team"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {showDeleteTeamConfirm === team.id && (
                    <div className="absolute inset-0 bg-red-50 dark:bg-red-900/30 rounded-lg p-3 flex flex-col justify-center z-10">
                      <p className="text-xs text-red-700 dark:text-red-300 mb-2">Delete "{team.name}"?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team.id);
                          }}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteTeamConfirm(null);
                          }}
                          className="px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Team Members / Roles */}
      <div className="flex-1 space-y-6">
        {selectedTeam ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {members.length} team member{members.length !== 1 ? 's' : ''}
                </p>
              </div>

              {canManageTeam && activeTab === 'members' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Member
                </button>
              )}
              {canManageTeam && activeTab === 'roles' && (
                <button
                  onClick={() => setShowAddRoleForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Role
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'members'
                    ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Team Members
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'roles'
                    ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Assignment Roles
              </button>
              <button
                onClick={() => setActiveTab('capacity')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'capacity'
                    ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Capacity
              </button>
            </div>

            {activeTab === 'members' && (
              <>
                {/* Current User Selection */}
                {allMembers.length > 0 && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-violet-900 dark:text-violet-100">You are logged in as:</h3>
                        <p className="text-sm text-violet-600 dark:text-violet-300">
                          {currentUser ? currentUser.name : 'No user selected'}
                        </p>
                      </div>
                      {allMembers.length > 1 && (
                        <select
                          value={currentUser?.id || ''}
                          onChange={(e) => setCurrentUser(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="">Select user...</option>
                          {allMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                {members.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Add members to "{selectedTeam.name}" to get started.</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add First Member
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {members.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isCurrentUser={currentUser?.id === member.id}
                        canEdit={canManageTeam}
                        onEdit={() => setEditingMember(member)}
                        onDelete={() => removeMember(member.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Capacity Tab */}
            {activeTab === 'capacity' && (
              <CapacityView />
            )}

            {/* Assignment Roles Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Assignment roles define the different positions team members can have when assigned to clients.
                    These roles are shared across all teams.
                  </p>
                </div>

                {assignmentRoles.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assignment roles yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create roles like "Delivery Lead" or "Account Manager".</p>
                    <button
                      onClick={() => setShowAddRoleForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add First Role
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {assignmentRoles
                      .sort((a, b) => a.order - b.order)
                      .map((role) => (
                        <RoleCard
                          key={role.id}
                          role={role}
                          canEdit={canManageTeam}
                          onEdit={() => setEditingRole(role)}
                          onDelete={() => deleteRole(role.id)}
                          onToggleDefault={() => updateRole(role.id, { isDefault: !role.isDefault })}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team selected</h3>
              <p className="text-gray-500 dark:text-gray-400">Create a team to get started</p>
            </div>
          </div>
        )}

        {/* Add/Edit Member Form Modal */}
        {(showAddForm || editingMember) && (
          <MemberFormModal
            member={editingMember}
            onSave={(data) => {
              if (editingMember) {
                updateMember(editingMember.id, data);
              } else {
                addMember(data);
              }
              setShowAddForm(false);
              setEditingMember(null);
            }}
            onClose={() => {
              setShowAddForm(false);
              setEditingMember(null);
            }}
          />
        )}

        {/* Add/Edit Role Form Modal */}
        {(showAddRoleForm || editingRole) && (
          <RoleFormModal
            role={editingRole}
            onSave={(data) => {
              if (editingRole) {
                updateRole(editingRole.id, data);
              } else {
                addRole(data);
              }
              setShowAddRoleForm(false);
              setEditingRole(null);
            }}
            onClose={() => {
              setShowAddRoleForm(false);
              setEditingRole(null);
            }}
          />
        )}
      </div>
    </div>
    </div>
  );
}

interface MemberCardProps {
  member: TeamMember;
  isCurrentUser: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function MemberCard({ member, isCurrentUser, canEdit, onEdit, onDelete }: MemberCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${isCurrentUser ? 'border-violet-300 dark:border-violet-700 ring-2 ring-violet-100 dark:ring-violet-900/30' : 'border-gray-200 dark:border-gray-700'} p-4`}>
      <div className="flex items-center gap-4">
        <TeamMemberAvatar member={member} size="lg" showTooltip={false} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{member.name}</h3>
            {isCurrentUser && (
              <span className="px-2 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
          {member.jobTitle && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{member.jobTitle}</p>
          )}
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
              member.role === 'owner'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : member.role === 'admin'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : member.role === 'member'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {roleLabels[member.role]}
          </span>
          {member.lastActiveAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Active {formatRelativeTime(member.lastActiveAt)}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {member.role !== 'owner' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Are you sure you want to remove {member.name} from the team?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Remove
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemberFormModalProps {
  member: TeamMember | null;
  onSave: (data: Omit<TeamMember, 'id' | 'createdAt' | 'color'>) => void;
  onClose: () => void;
}

function MemberFormModal({ member, onSave, onClose }: MemberFormModalProps) {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [jobTitle, setJobTitle] = useState(member?.jobTitle || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [role, setRole] = useState<TeamRole>(member?.role || 'member');
  const [hourlyRate, setHourlyRate] = useState(member?.hourlyRate?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onSave({
      name: name.trim(),
      email: email.trim(),
      jobTitle: jobTitle.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Account Manager"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 150"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            >
              {(Object.keys(roleLabels) as TeamRole[]).map(r => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {roleDescriptions[role]}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              {member ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============ ROLE COMPONENTS ============

interface RoleCardProps {
  role: AssignmentRole;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDefault: () => void;
}

function RoleCard({ role, canEdit, onEdit, onDelete, onToggleDefault }: RoleCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-4">
        {/* Color indicator */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: role.color || '#8B5CF6' }}
        >
          {role.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{role.name}</h3>
            {role.isDefault && (
              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                Default
              </span>
            )}
          </div>
          {role.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{role.description}</p>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleDefault}
              className={`p-2 rounded-lg transition-colors ${
                role.isDefault
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                  : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={role.isDefault ? 'Remove as default' : 'Set as default'}
            >
              <svg className="w-4 h-4" fill={role.isDefault ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Are you sure you want to delete the "{role.name}" role?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_COLORS = [
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

interface RoleFormModalProps {
  role: AssignmentRole | null;
  onSave: (data: Omit<AssignmentRole, 'id' | 'order'>) => void;
  onClose: () => void;
}

function RoleFormModal({ role, onSave, onClose }: RoleFormModalProps) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [color, setColor] = useState(role?.color || ROLE_COLORS[0]);
  const [isDefault, setIsDefault] = useState(role?.isDefault || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      isDefault,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {role ? 'Edit Assignment Role' : 'Add Assignment Role'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Delivery Lead"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Primary person responsible for delivering the project"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-gray-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Show as default option when assigning team members
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              {role ? 'Save Changes' : 'Add Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
