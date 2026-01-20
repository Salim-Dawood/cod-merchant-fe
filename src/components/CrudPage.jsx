import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
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

function formatValue(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export default function CrudPage({ resource }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const [query, setQuery] = useState('');

  const fields = useMemo(() => resource.fields, [resource.fields]);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [resource.key]);

  const resetForm = () => {
    const initial = {};
    fields.forEach((field) => {
      initial[field.key] = field.type === 'boolean' ? false : '';
    });
    setForm(initial);
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
      } else {
        next[field.key] = value ?? '';
      }
    });
    setForm(next);
    setOpen(true);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      const payload = {};
      fields.forEach((field) => {
        const value = form[field.key];
        if (value === '' || value === null || value === undefined) {
          return;
        }
        if (field.type === 'number') {
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
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) {
      return;
    }
    try {
      await api.remove(resource.key, id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const headers = ['id', ...fields.map((field) => field.key)];
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
      headers.some((key) => String(row[key] ?? '').toLowerCase().includes(search))
    );
  }, [rows, query, headers]);

  const statusPills = Object.entries(stats.statusCounts || {}).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="surface-panel rise-fade rounded-3xl px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-ink)]">
              {resource.title}
            </p>
            <h2 className="font-display text-3xl leading-tight">{resource.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              Manage {resource.title.toLowerCase()} records and keep the system aligned.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-ink)]">Total</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-ink)]">Highest ID</p>
              <p className="text-lg font-semibold">{stats.maxId || '-'}</p>
            </div>
            <Button onClick={openCreate}>New Record</Button>
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
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="soft-panel overflow-hidden rounded-3xl">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-[var(--surface)]">
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length + 1}>Loading...</TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length + 1}>No data</TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {headers.map((header) => (
                    <TableCell key={`${row.id}-${header}`}>
                      {header === 'status' ? (
                        <Badge
                          className={
                            String(row[header]).toLowerCase() === 'active'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-ink)]'
                          }
                        >
                          {formatValue(row[header])}
                        </Badge>
                      ) : (
                        formatValue(row[header])
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
              if (field.type === 'select') {
                return (
                  <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)] md:col-span-2">
                    {field.label}
                    <select
                      className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      value={form[field.key] ?? ''}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                    >
                      <option value="">Select</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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

              return (
                <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  {field.label}
                  <Input
                    type={field.type}
                    value={form[field.key] ?? ''}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    required={field.required}
                  />
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
    </div>
  );
}
