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
    return '—';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{resource.title}</h1>
          <p className="text-sm text-slate-500">Manage {resource.title.toLowerCase()} records.</p>
        </div>
        <Button onClick={openCreate}>New</Button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length + 1}>No data</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {headers.map((header) => (
                    <TableCell key={`${row.id}-${header}`}>
                      {header === 'status' ? <Badge>{formatValue(row[header])}</Badge> : formatValue(row[header])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-2">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit' : 'Create'} {resource.title}</DialogTitle>
            <DialogDescription>Fill in the fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {fields.map((field) => {
              if (field.type === 'select') {
                return (
                  <label key={field.key} className="grid gap-2 text-sm">
                    {field.label}
                    <select
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
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
                  <label key={field.key} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={Boolean(form[field.key])}
                      onChange={(event) => handleChange(field.key, event.target.checked)}
                    />
                    {field.label}
                  </label>
                );
              }

              return (
                <label key={field.key} className="grid gap-2 text-sm">
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
