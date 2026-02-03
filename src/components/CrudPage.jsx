import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, API_BASE_URL } from '../lib/api';
import { getAccessToken } from '../lib/session';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

const roleInfoConfig = {
  'platform-roles': {
    linkResource: 'platform-role-permissions',
    roleKey: 'platform_role_id',
    permissionKey: 'platform_permission_id',
    permissionResource: 'platform-permissions',
    permissionLabel: 'key_name'
  },
  'branch-roles': {
    linkResource: 'branch-role-permissions',
    roleKey: 'branch_role_id',
    permissionKey: 'permission_id',
    permissionResource: 'permissions',
    permissionLabel: 'key_name'
  }
};

function formatValue(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function getInitials(value) {
  if (!value) {
    return 'NA';
  }
  const words = String(value).trim().split(/\s+/);
  const initials = words.slice(0, 2).map((word) => word[0]).join('');
  return initials.toUpperCase();
}

function normalizeServerValidation(data, fields) {
  const fieldKeys = new Set(fields.map((field) => field.key));
  const errors = {};
  let message = '';

  const addError = (key, value) => {
    if (!key) {
      if (!message && value) {
        message = value;
      }
      return;
    }
    if (fieldKeys.has(key)) {
      errors[key] = value || 'Invalid value.';
    } else if (!message && value) {
      message = value;
    }
  };

  const readObjectErrors = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return;
    }
    if (typeof payload.message === 'string' && !message) {
      message = payload.message;
    }
    if (typeof payload.error === 'string' && !message) {
      message = payload.error;
    }
    if (typeof payload.title === 'string' && !message) {
      message = payload.title;
    }
    if (Array.isArray(payload.errors)) {
      payload.errors.forEach((entry) => {
        if (!entry) {
          return;
        }
        if (typeof entry === 'string') {
          addError('', entry);
          return;
        }
        const key = entry.field || entry.path || entry.param || entry.key;
        const value = entry.message || entry.msg || entry.error || entry.description;
        addError(key, value);
      });
    } else if (payload.errors && typeof payload.errors === 'object') {
      Object.entries(payload.errors).forEach(([key, value]) => {
        const messageValue = Array.isArray(value) ? value[0] : value;
        addError(key, typeof messageValue === 'string' ? messageValue : 'Invalid value.');
      });
    }
    if (payload.details && typeof payload.details === 'object') {
      readObjectErrors(payload.details);
    }
    if (payload.data && typeof payload.data === 'object') {
      readObjectErrors(payload.data);
    }
  };

  if (typeof data === 'string') {
    message = data;
  } else {
    readObjectErrors(data);
  }

  return { errors, message };
}

export default function CrudPage({ resource, permissions = [], authType }) {
  const canRead = authType === 'merchant'
    ? true
    : resource.permissions?.read
    ? permissions.includes(resource.permissions.read)
    : true;
  const [rows, setRows] = useState([]);
  const [, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [query, setQuery] = useState('');
  const [refOptions, setRefOptions] = useState({});
  const [permissionMap, setPermissionMap] = useState({});
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRole, setInfoRole] = useState(null);
  const [infoPermissions, setInfoPermissions] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const fields = useMemo(() => resource.fields, [resource.fields]);
  const roleConfig = roleInfoConfig[resource.key];
  const avatarUploadEndpoint = useMemo(() => {
    if (resource.key === 'platform-admins') {
      return '/platform-admins';
    }
    if (resource.key === 'users') {
      return '/merchant/users';
    }
    return '';
  }, [resource.key]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.list(resource.key);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [resource.key]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadRefOptions = async () => {
      const refFields = fields.filter((field) => field.ref);
      if (refFields.length === 0) {
        setRefOptions({});
        return;
      }

      try {
        const results = await Promise.all(
          refFields.map(async (field) => {
            const data = await api.list(field.ref);
            const items = Array.isArray(data) ? data : [];
            const options = items.map((item) => {
              const labelKey = field.refLabel;
              const labelValue =
                (labelKey && item[labelKey]) ||
                item.name ||
                item.email ||
                item.key_name ||
                `#${item.id}`;
              return {
                value: String(item.id),
                label: `${labelValue} (#${item.id})`
              };
            });
            return [field.key, options];
          })
        );
        setRefOptions(Object.fromEntries(results));
      } catch {
        setRefOptions({});
      }
    };

    loadRefOptions();
  }, [fields, resource.key]);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!roleConfig) {
        setPermissionMap({});
        return;
      }

      try {
        const [links, permissions] = await Promise.all([
          api.list(roleConfig.linkResource),
          api.list(roleConfig.permissionResource)
        ]);
        const permissionIndex = new Map(
          (Array.isArray(permissions) ? permissions : []).map((item) => [
            item.id,
            item[roleConfig.permissionLabel] || item.name || item.key_name || `#${item.id}`
          ])
        );
        const map = {};
        (Array.isArray(links) ? links : []).forEach((link) => {
          const roleId = link[roleConfig.roleKey];
          const permissionId = link[roleConfig.permissionKey];
          if (!roleId) {
            return;
          }
          if (!map[roleId]) {
            map[roleId] = [];
          }
          const label = permissionIndex.get(permissionId) || `#${permissionId}`;
          map[roleId].push(label);
        });
        setPermissionMap(map);
      } catch {
        setPermissionMap({});
      }
    };

    loadPermissions();
  }, [roleConfig]);

  const resetForm = () => {
    const initial = {};
    fields.forEach((field) => {
      initial[field.key] = field.type === 'boolean' ? false : '';
    });
    setForm(initial);
    setFieldErrors({});
    setError('');
  };

  const openCreate = () => {
    setEditRow(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    const next = {};
    fields.forEach((field) => {
      const value = row[field.key];
      if (field.type === 'boolean') {
        next[field.key] = Boolean(value);
      } else if (field.type === 'select' || field.ref) {
        next[field.key] = value === null || value === undefined ? '' : String(value);
      } else {
        next[field.key] = value ?? '';
      }
    });
    setForm(next);
    setFieldErrors({});
    setError('');
    setOpen(true);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const field = fields.find((item) => item.key === key);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (field?.required && field.type !== 'boolean') {
        const isEmpty = value === '' || value === null || value === undefined;
        if (isEmpty) {
          next[key] = `${field.label} is required.`;
        } else {
          delete next[key];
        }
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    fields.forEach((field) => {
      if (field.readOnly) {
        return;
      }
      if (!field.required || field.type === 'boolean') {
        return;
      }
      const value = form[field.key];
      if (value === '' || value === null || value === undefined) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (!validateForm()) {
        setError('Please fill in the required fields.');
        return;
      }
      const payload = {};
      fields.forEach((field) => {
        if (field.readOnly) {
          return;
        }
        const value = form[field.key];
        if (value === '' || value === null || value === undefined) {
          return;
        }
        if (field.type === 'number') {
          payload[field.key] = Number(value);
          return;
        }
        if (field.ref) {
          payload[field.key] = Number(value);
          return;
        }
        if (field.type === 'boolean') {
          payload[field.key] = Boolean(value);
          return;
        }
        payload[field.key] = value;
      });

      if (editRow) {
        await api.update(resource.key, editRow.id, payload);
      } else {
        await api.create(resource.key, payload);
      }
      setOpen(false);
      await load();
    } catch (err) {
      if (err?.status === 400) {
        const { errors, message } = normalizeServerValidation(err.data, fields);
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
        }
        if (message) {
          setError(message);
          return;
        }
      }
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.remove(resource.key, id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const openDelete = (row) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    await handleDelete(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const headers = useMemo(() => ['id', ...fields.map((field) => field.key)], [fields]);
  const tableHeaders = useMemo(
    () => (roleConfig ? [...headers, 'permission_count'] : headers),
    [headers, roleConfig]
  );
  const statusKey = fields.find((field) => field.key === 'status')?.key;
  const stats = useMemo(() => {
    const total = rows.length;
    const maxId = rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
    const statusCounts = statusKey
      ? rows.reduce((acc, row) => {
          const value = row[statusKey] || 'unknown';
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {})
      : {};
    return { total, maxId, statusCounts };
  }, [rows, statusKey]);

  const filteredRows = useMemo(() => {
    if (!query) {
      return rows;
    }
    const search = query.toLowerCase();
    return rows.filter((row) =>
      tableHeaders.some((key) => {
        if (key === 'permission_count') {
          return String((permissionMap[row.id] || []).length).includes(search);
        }
        return String(row[key] ?? '').toLowerCase().includes(search);
      })
    );
  }, [rows, query, tableHeaders, permissionMap]);

  const permissionCount = (roleId) => (permissionMap[roleId] || []).length;

  const openInfo = (row) => {
    setInfoRole(row);
    setInfoPermissions(permissionMap[row.id] || []);
    setInfoOpen(true);
  };

  const statusPills = Object.entries(stats.statusCounts || {}).slice(0, 3);

  const handleAvatarSelect = () => {
    if (!editRow?.id || !avatarUploadEndpoint) {
      return;
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editRow?.id || !avatarUploadEndpoint) {
      return;
    }
    try {
      setAvatarUploading(true);
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE_URL}${avatarUploadEndpoint}/${editRow.id}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to upload photo');
      }
      const data = await response.json().catch(() => null);
      const nextUrl = data?.avatar_url || data?.url;
      if (nextUrl) {
        setForm((prev) => ({ ...prev, avatar_url: String(nextUrl) }));
        try {
          localStorage.setItem(`profile_avatar_${resource.key}_${editRow.id}`, String(nextUrl));
        } catch {
          // ignore storage failures
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('profile-avatar-updated', {
              detail: { id: editRow.id, avatar_url: String(nextUrl) }
            })
          );
        }
      }
    } catch (err) {
      window.alert(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  if (!canRead) {
    return (
      <div className="surface-panel rise-fade rounded-3xl px-6 py-8">
        <h2 className="font-display text-2xl">No access</h2>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          You do not have permission to view this section.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6">
      <div className="surface-panel rise-fade rounded-[32px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--muted-ink)]">
              Merchant Ledger
            </p>
            <h2 className="font-display text-3xl leading-tight">{resource.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              Curate {resource.title.toLowerCase()} and keep the storefront experience consistent.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm sm:px-4 sm:py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Total</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm sm:px-4 sm:py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Highest ID</p>
              <p className="text-lg font-semibold">{stats.maxId || '-'}</p>
            </div>
            {resource.permissions?.create ? (
              permissions.includes(resource.permissions.create) && (
                <Button onClick={openCreate}>New Record</Button>
              )
            ) : (
              <Button onClick={openCreate}>New Record</Button>
            )}
          </div>
        </div>
        {statusPills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {statusPills.map(([status, count]) => (
              <Badge key={status} className="border border-[var(--border)] bg-[var(--surface)]">
                {status}: {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Input
            type="text"
            placeholder="Search by any field..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-md"
          />
          <Badge className="border border-[var(--border)] bg-[var(--surface)]">
            {loading ? 'Loading' : `${filteredRows.length} rows`}
          </Badge>
        </div>
      </div>

      <div className="soft-panel flex min-h-0 flex-1 flex-col rounded-[32px]">
        <div className="no-scrollbar h-full min-h-0 overflow-auto">
          <Table className="responsive-table w-full">
          <TableHeader className="sticky top-0 z-10 bg-black text-white">
            <TableRow className="bg-black hover:bg-black">
              <TableHead className="text-white w-[240px] max-w-none sm:w-[300px]">
                Profile
              </TableHead>
              {tableHeaders.map((header) => (
                <TableHead key={header} className="text-white">
                  {header}
                </TableHead>
              ))}
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length + 2}>Loading...</TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length + 2}>No data</TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const statusValue = row.status ? String(row.status).toLowerCase() : '';
                const statusClass =
                  statusValue === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : statusValue === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : statusValue === 'suspended'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';
                const primaryField = fields.find((field) => field.key === 'name')?.key
                  || fields.find((field) => field.key === 'email')?.key
                  || fields[0]?.key;
                const avatarText = primaryField ? formatValue(row[primaryField]) : `Record ${row.id}`;
                const avatarUrl = row.avatar_url ? String(row.avatar_url) : '';

                return (
                  <TableRow key={row.id}>
                    <TableCell
                      data-label="Profile"
                      className="w-[240px] max-w-none sm:w-[300px] whitespace-normal break-words"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={avatarText}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(avatarText)
                          )}
                        </div>
                        <div className="cell-clamp">
                          <div className="font-medium text-[var(--ink)]">
                            {avatarText}
                          </div>
                          <div className="text-xs text-[var(--muted-ink)]">
                            ID #{row.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {tableHeaders.map((header) => (
                      <TableCell key={`${row.id}-${header}`} data-label={header}>
                        {header === 'permission_count' ? (
                          <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                            {permissionCount(row.id)}
                          </Badge>
                        ) : header === 'status' ? (
                          <Badge className={`border ${statusClass}`}>
                            {formatValue(row[header])}
                          </Badge>
                        ) : (
                          <span className="cell-clamp">{formatValue(row[header])}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell data-label="Actions">
                      <div className="flex flex-wrap gap-2">
                        {roleConfig && (
                          <Button size="sm" variant="outline" onClick={() => openInfo(row)}>
                            Info
                          </Button>
                        )}
                        {(!resource.permissions?.update ||
                          permissions.includes(resource.permissions.update)) && (
                          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                            Edit
                          </Button>
                        )}
                        {(!resource.permissions?.delete ||
                          permissions.includes(resource.permissions.delete)) && (
                          <Button size="sm" variant="destructive" onClick={() => openDelete(row)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] w-[min(92vw,900px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit' : 'Create'} {resource.title}</DialogTitle>
            <DialogDescription>Fill in the fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => {
              if (field.readOnly) {
                return null;
              }
              if (field.type === 'select' || field.ref) {
                const options = field.ref ? refOptions[field.key] || [] : field.options || [];
                const hasError = Boolean(fieldErrors[field.key]);
                return (
                  <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)] md:col-span-2">
                    {field.label}
                    <select
                      className={`h-11 rounded-2xl border bg-[var(--surface)] px-4 text-sm text-[var(--ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 ${
                        hasError
                          ? 'border-red-300 focus-visible:ring-red-200'
                          : 'border-[var(--border)] focus-visible:ring-[var(--accent)]'
                      }`}
                      value={form[field.key] ?? ''}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                    >
                      <option value="">Select</option>
                      {options.map((option) => (
                        <option key={option.value || option} value={option.value || option}>
                          {option.label || option}
                        </option>
                      ))}
                    </select>
                    {hasError && (
                      <span className="text-xs text-red-600">{fieldErrors[field.key]}</span>
                    )}
                  </label>
                );
              }

              if (field.type === 'boolean') {
                return (
                  <label key={field.key} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--muted-ink)] md:col-span-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      checked={Boolean(form[field.key])}
                      onChange={(event) => handleChange(field.key, event.target.checked)}
                    />
                    {field.label}
                  </label>
                );
              }

              const hasError = Boolean(fieldErrors[field.key]);
              if (field.key === 'avatar_url') {
                return (
                  <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    {'Photo'}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAvatarSelect}
                        disabled={!editRow?.id || !avatarUploadEndpoint || avatarUploading}
                      >
                        {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      {!editRow?.id && (
                        <span className="text-xs text-[var(--muted-ink)]">Save the record before uploading.</span>
                      )}
                    </div>
                    {hasError && (
                      <span className="text-xs text-red-600">{fieldErrors[field.key]}</span>
                    )}
                  </label>
                );
              }
              return (
                <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  {field.label}
                  {field.type === 'password' ? (
                    <div className="relative">
                      <Input
                        type={showPasswords[field.key] ? 'text' : 'password'}
                        value={form[field.key] ?? ''}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        className={`pr-16 ${hasError ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key]
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--ink)]"
                      >
                        {showPasswords[field.key] ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  ) : (
                    <Input
                      type={field.type}
                      value={form[field.key] ?? ''}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                      className={hasError ? 'border-red-300 focus-visible:ring-red-200' : ''}
                    />
                  )}
                  {hasError && (
                    <span className="text-xs text-red-600">{fieldErrors[field.key]}</span>
                  )}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editRow ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {roleConfig && (
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] w-[min(90vw,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Role Info</DialogTitle>
              <DialogDescription>Role details and assigned permissions.</DialogDescription>
            </DialogHeader>
            {infoRole && (
              <div className="grid gap-4 text-sm">
                <div className="grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Role</p>
                  <p className="text-lg font-semibold">{infoRole.name || `#${infoRole.id}`}</p>
                  <div className="text-xs text-[var(--muted-ink)]">
                    {infoRole.description || 'No description'}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">
                    Permissions ({infoPermissions.length})
                  </p>
                  {infoPermissions.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--muted-ink)]">No permissions assigned.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {infoPermissions.map((perm) => (
                        <Badge key={perm} className="border border-[var(--border)] bg-[var(--surface)]">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setInfoOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-ink)]">
              Deleting ID #{deleteTarget.id}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

