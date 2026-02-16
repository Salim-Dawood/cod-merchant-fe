import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

function FlagChip({ title, url }) {
  if (url) {
    return (
      <img
        src={url}
        alt={title || 'Flag'}
        title={title}
        className="h-5 w-5 rounded-[6px] border border-[var(--border)] object-cover"
      />
    );
  }
  return (
    <span
      title={title}
      className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-[6px] border border-[var(--border)]"
      style={{ background: 'linear-gradient(180deg, #16a34a 0%, #16a34a 33%, #ffffff 33%, #ffffff 66%, #111827 66%)' }}
    />
  );
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

export default function CrudPage({ resource, permissions = [], authType, profile }) {
  const isMerchant = authType === 'merchant';
  const roleName = profile?.role_name ? String(profile.role_name).toLowerCase() : '';
  const isClient = isMerchant && roleName === 'client';
  const canRead = isMerchant
    ? true
    : resource.permissions?.read
    ? permissions.includes(resource.permissions.read)
    : true;
  const canWrite = !isClient;
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
  const [permissionIdMap, setPermissionIdMap] = useState({});
  const [permissionLinkMap, setPermissionLinkMap] = useState({});
  const [rolePermissionOptions, setRolePermissionOptions] = useState([]);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
  const [rolePermOpen, setRolePermOpen] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState('');
  const [rolePermQuery, setRolePermQuery] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRole, setInfoRole] = useState(null);
  const [infoPermissions, setInfoPermissions] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const [flagUploading, setFlagUploading] = useState(false);
  const flagInputRef = useRef(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productCategoryMap, setProductCategoryMap] = useState({});
  const [productImageMap, setProductImageMap] = useState({});
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [productFiles, setProductFiles] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const productImageInputRef = useRef(null);
  const [merchantOptions, setMerchantOptions] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [branchMerchantMap, setBranchMerchantMap] = useState({});
  const [clientProducts, setClientProducts] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const location = useLocation();

  const fields = useMemo(() => resource.fields, [resource.fields]);
  const roleConfig = roleInfoConfig[resource.key];
  const isProduct = resource.key === 'products';
  const avatarUploadEndpoint = useMemo(() => {
    if (resource.key === 'platform-admins') {
      return '/platform-admins';
    }
    if (resource.key === 'users') {
      return '/merchant/users';
    }
    return '';
  }, [resource.key]);
  const flagUploadEndpoint = useMemo(() => {
    if (resource.key === 'branches') {
      return '/merchant/branches';
    }
    return '';
  }, [resource.key]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let clientBranches = [];
      let clientMerchants = [];
      if (isClient) {
        const [branches, merchants] = await Promise.all([
          api.list('branches'),
          api.list('merchants')
        ]);
        clientBranches = Array.isArray(branches) ? branches : [];
        clientMerchants = Array.isArray(merchants) ? merchants : [];
        const merchantItems = clientMerchants;
        setMerchantOptions(
          merchantItems.map((merchant) => ({
            value: String(merchant.id),
            label: merchant.name || merchant.legal_name || `#${merchant.id}`
          }))
        );
        const merchantLabelMap = new Map(
          merchantItems.map((merchant) => [
            String(merchant.id),
            merchant.name || merchant.legal_name || `#${merchant.id}`
          ])
        );
        setBranchOptions(
          clientBranches.map((branch) => ({
            value: String(branch.id),
            merchant_id: String(branch.merchant_id ?? ''),
            label: `${branch.name || `Branch #${branch.id}`} • ${
              merchantLabelMap.get(String(branch.merchant_id)) || `#${branch.merchant_id}`
            }`
          }))
        );
        const branchMap = {};
        clientBranches.forEach((branch) => {
          if (branch?.id) {
            branchMap[String(branch.id)] = branch.merchant_id;
          }
        });
        setBranchMerchantMap(branchMap);
      } else {
        setMerchantOptions([]);
        setBranchOptions([]);
        setBranchMerchantMap({});
      }
      if (resource.key === 'products') {
        const requests = [
          api.list('products'),
          api.list('categories'),
          api.list('product-categories'),
          api.list('product-images')
        ];
        const [
          products,
          categories,
          productCategories,
          productImageItems
        ] = await Promise.all(requests);
        setRows(Array.isArray(products) ? products : []);
        const categoryItems = Array.isArray(categories) ? categories : [];
        setCategoryOptions(
          categoryItems.map((item) => ({
            value: String(item.id),
            label: item.name || item.slug || `#${item.id}`
          }))
        );
        const categoryMap = {};
        (Array.isArray(productCategories) ? productCategories : []).forEach((item) => {
          const productId = item.product_id;
          if (!productId) {
            return;
          }
          if (!categoryMap[productId]) {
            categoryMap[productId] = [];
          }
          categoryMap[productId].push(item);
        });
        setProductCategoryMap(categoryMap);
        const imageMap = {};
        (Array.isArray(productImageItems) ? productImageItems : []).forEach((item) => {
          const productId = item.product_id;
          if (!productId) {
            return;
          }
          if (!imageMap[productId]) {
            imageMap[productId] = [];
          }
          imageMap[productId].push(item);
        });
        setProductImageMap(imageMap);
        setClientProducts([]);
      } else if (resource.key === 'categories' && isClient) {
        const [categories, products, productCategories] = await Promise.all([
          api.list('categories'),
          api.list('products'),
          api.list('product-categories')
        ]);
        setRows(Array.isArray(categories) ? categories : []);
        setClientProducts(Array.isArray(products) ? products : []);
        const categoryMap = {};
        (Array.isArray(productCategories) ? productCategories : []).forEach((item) => {
          const productId = item.product_id;
          if (!productId) {
            return;
          }
          if (!categoryMap[productId]) {
            categoryMap[productId] = [];
          }
          categoryMap[productId].push(item);
        });
        setProductCategoryMap(categoryMap);
      } else {
        const data = await api.list(resource.key);
        setRows(Array.isArray(data) ? data : []);
        setCategoryOptions([]);
        setProductCategoryMap({});
        setProductImageMap({});
        setClientProducts([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [resource.key, isClient]);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const merchantId = params.get('merchant_id') || '';
    const branchId = params.get('branch_id') || '';
    const categoryId = params.get('category_id') || '';
    setSelectedMerchantId(merchantId);
    setSelectedBranchId(branchId);
    setSelectedCategoryId(categoryId);
  }, [location.search, isClient]);

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
        const needsBranchFlags = refFields.some((field) => field.ref === 'branch-roles' || field.ref === 'branches');
        let branchFlagMap = new Map();
        if (needsBranchFlags) {
          const branches = await api.list('branches');
          const branchItems = Array.isArray(branches) ? branches : [];
          branchFlagMap = new Map(
            branchItems.map((branch) => [String(branch.id), branch.flag_url || ''])
          );
        }

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
              const option = {
                value: String(item.id),
                label: `${labelValue} (#${item.id})`
              };
              if (field.ref === 'branches') {
                option.flag_url = item.flag_url || '';
              }
              if (field.ref === 'branch-roles') {
                option.branch_id = item.branch_id;
                option.flag_url = branchFlagMap.get(String(item.branch_id)) || '';
              }
              return option;
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
        setPermissionIdMap({});
        setPermissionLinkMap({});
        setRolePermissionOptions([]);
        return;
      }

      try {
        const [links, permissions] = await Promise.all([
          api.list(roleConfig.linkResource),
          api.list(roleConfig.permissionResource)
        ]);
        const permissionItems = Array.isArray(permissions) ? permissions : [];
        const permissionIndex = new Map(
          permissionItems.map((item) => [
            item.id,
            item[roleConfig.permissionLabel] || item.name || item.key_name || `#${item.id}`
          ])
        );
        const map = {};
        const idMap = {};
        const linkMap = {};
        (Array.isArray(links) ? links : []).forEach((link) => {
          const roleId = link[roleConfig.roleKey];
          const permissionId = link[roleConfig.permissionKey];
          if (!roleId) {
            return;
          }
          if (!map[roleId]) {
            map[roleId] = [];
          }
          if (!idMap[roleId]) {
            idMap[roleId] = [];
          }
          if (!linkMap[roleId]) {
            linkMap[roleId] = [];
          }
          const label = permissionIndex.get(permissionId) || `#${permissionId}`;
          map[roleId].push(label);
          idMap[roleId].push(permissionId);
          linkMap[roleId].push(link);
        });
        setPermissionMap(map);
        setPermissionIdMap(idMap);
        setPermissionLinkMap(linkMap);
        setRolePermissionOptions(
          permissionItems.map((item) => ({
            value: String(item.id),
            label: permissionIndex.get(item.id) || `#${item.id}`
          }))
        );
      } catch {
        setPermissionMap({});
        setPermissionIdMap({});
        setPermissionLinkMap({});
        setRolePermissionOptions([]);
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
    setSelectedCategories([]);
    setProductFiles([]);
    setRemovedImageIds([]);
    setSelectedRolePermissions([]);
    setRolePermOpen(false);
    setRolePermQuery('');
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
    if (isProduct) {
      const categoryLinks = productCategoryMap[row.id] || [];
      const categoryIds = categoryLinks.map((link) => String(link.category_id));
      setSelectedCategories(categoryIds);
      setProductFiles([]);
      setRemovedImageIds([]);
    }
    if (roleConfig) {
      const assigned = permissionIdMap[row.id] || [];
      setSelectedRolePermissions(assigned.map((id) => String(id)));
    }
    setRolePermOpen(false);
    setRolePermQuery('');
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

      let productId = editRow?.id || null;
      if (editRow) {
        await api.update(resource.key, editRow.id, payload);
      } else {
        const created = await api.create(resource.key, payload);
        productId = created?.id || null;
        if (!productId && resource.key === 'products') {
          const products = await api.list('products');
          const items = Array.isArray(products) ? products : [];
          const match =
            items.find((item) => item.slug === payload.slug && item.name === payload.name) ||
            items.find((item) => item.slug === payload.slug);
          productId = match?.id || null;
        }
      }

      if (resource.key === 'products') {
        if (!productId) {
          setError('Product saved but could not sync categories or images.');
          return;
        }
        const existingCategoryLinks = productCategoryMap[productId] || [];
        await Promise.all(
          existingCategoryLinks.map((link) => api.remove('product-categories', link.id))
        );
        const categoryIds = selectedCategories
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        await Promise.all(
          categoryIds.map((categoryId) =>
            api.create('product-categories', {
              product_id: productId,
              category_id: categoryId,
              is_active: true
            })
          )
        );
        const existingImages = productImageMap[productId] || [];
        const toRemove = existingImages.filter((image) => removedImageIds.includes(image.id));
        if (toRemove.length > 0) {
          await Promise.all(toRemove.map((image) => api.remove('product-images', image.id)));
        }
        if (productFiles.length > 0) {
          const token = getAccessToken();
          await Promise.all(
            productFiles.map((entry, index) => {
              const formData = new FormData();
              formData.append('photo', entry.file);
              formData.append('product_id', String(productId));
              formData.append('sort_order', String(existingImages.length + index + 1));
              formData.append('is_active', 'true');
              return fetch(`${API_BASE_URL}/product-images/upload`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                credentials: 'include',
                body: formData
              }).then(async (response) => {
                if (!response.ok) {
                  const text = await response.text();
                  throw new Error(text || 'Failed to upload image');
                }
                return response.json().catch(() => null);
              });
            })
          );
        }
      }
      if (roleConfig) {
        let roleId = editRow?.id || null;
        if (!roleId) {
          const createdRole = await api.list(resource.key);
          const items = Array.isArray(createdRole) ? createdRole : [];
          const match = items.find((item) => item.name === payload.name);
          roleId = match?.id || null;
        }
        if (!roleId) {
          setError('Role saved but could not sync permissions.');
          return;
        }
        const existingLinks = permissionLinkMap[roleId] || [];
        await Promise.all(
          existingLinks.map((link) => api.remove(roleConfig.linkResource, link.id))
        );
        const permissionIds = selectedRolePermissions
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        await Promise.all(
          permissionIds.map((permissionId) =>
            api.create(roleConfig.linkResource, {
              [roleConfig.roleKey]: roleId,
              [roleConfig.permissionKey]: permissionId
            })
          )
        );
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
    let baseRows = rows;
    if (isClient) {
      const merchantFilter = selectedMerchantId ? String(selectedMerchantId) : '';
      const branchFilter = selectedBranchId ? String(selectedBranchId) : '';
      if (resource.key === 'products') {
        baseRows = rows.filter((row) => {
          const branchOk = !branchFilter || String(row.branch_id) === branchFilter;
          if (!branchOk) {
            return false;
          }
          if (!merchantFilter) {
            return true;
          }
          const merchantId = branchMerchantMap[String(row.branch_id)];
          return merchantId && String(merchantId) === merchantFilter;
        });
        if (selectedCategoryId) {
          baseRows = baseRows.filter((row) =>
            (productCategoryMap[row.id] || []).some(
              (link) => String(link.category_id) === String(selectedCategoryId)
            )
          );
        }
      } else if (resource.key === 'categories') {
        const productIds = clientProducts
          .filter((row) => {
            const branchOk = !branchFilter || String(row.branch_id) === branchFilter;
            if (!branchOk) {
              return false;
            }
            if (!merchantFilter) {
              return true;
            }
            const merchantId = branchMerchantMap[String(row.branch_id)];
            return merchantId && String(merchantId) === merchantFilter;
          })
          .map((row) => row.id);
        const allowedCategories = new Set(
          Object.values(productCategoryMap)
            .flat()
            .filter((link) => productIds.includes(link.product_id))
            .map((link) => String(link.category_id))
        );
        baseRows = rows.filter((row) => allowedCategories.has(String(row.id)));
      } else {
        if (branchFilter) {
          baseRows = baseRows.filter(
            (row) => row.branch_id !== undefined && String(row.branch_id) === branchFilter
          );
        }
        if (merchantFilter) {
          baseRows = baseRows.filter((row) => {
            if (row.merchant_id !== undefined && row.merchant_id !== null) {
              return String(row.merchant_id) === merchantFilter;
            }
            if (row.branch_id !== undefined && row.branch_id !== null) {
              const merchantId = branchMerchantMap[String(row.branch_id)];
              return merchantId && String(merchantId) === merchantFilter;
            }
            return true;
          });
        }
      }
    }
    if (!query) {
      return baseRows;
    }
    const search = query.toLowerCase();
    return baseRows.filter((row) =>
      tableHeaders.some((key) => {
        if (key === 'permission_count') {
          return String((permissionMap[row.id] || []).length).includes(search);
        }
        return String(row[key] ?? '').toLowerCase().includes(search);
      })
    );
  }, [
    rows,
    query,
    tableHeaders,
    permissionMap,
    isClient,
    selectedMerchantId,
    selectedBranchId,
    selectedCategoryId,
    branchMerchantMap,
    resource.key,
    productCategoryMap,
    clientProducts
  ]);

  useEffect(() => {
    setPage(1);
  }, [query, resource.key, selectedMerchantId, selectedBranchId, selectedCategoryId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const permissionCount = (roleId) => (permissionMap[roleId] || []).length;

  const openInfo = (row) => {
    setInfoRole(row);
    setInfoPermissions(permissionMap[row.id] || []);
    setInfoOpen(true);
  };

  const categoryLabelMap = useMemo(() => {
    const map = {};
    categoryOptions.forEach((option) => {
      map[String(option.value)] = option.label;
    });
    return map;
  }, [categoryOptions]);

  const branchLabelMap = useMemo(() => {
    const options = refOptions.branch_id || [];
    const map = {};
    options.forEach((option) => {
      const value = option.value ?? option;
      const label = option.label ?? option;
      map[String(value)] = label;
    });
    return map;
  }, [refOptions]);

  const scopedProductIds = useMemo(() => {
    if (!isClient) {
      return [];
    }
    let items = resource.key === 'products' ? rows : clientProducts;
    if (selectedBranchId) {
      items = items.filter((row) => String(row.branch_id) === String(selectedBranchId));
    }
    if (selectedMerchantId) {
      items = items.filter((row) => {
        const merchantId = branchMerchantMap[String(row.branch_id)];
        return merchantId && String(merchantId) === String(selectedMerchantId);
      });
    }
    return items.map((row) => row.id);
  }, [rows, clientProducts, isClient, selectedBranchId, selectedMerchantId, branchMerchantMap, resource.key]);

  const visibleCategoryOptions = useMemo(() => {
    if (!isClient) {
      return [];
    }
    if (scopedProductIds.length === 0) {
      return categoryOptions;
    }
    const allowed = new Set();
    Object.values(productCategoryMap).flat().forEach((link) => {
      if (scopedProductIds.includes(link.product_id)) {
        allowed.add(String(link.category_id));
      }
    });
    return categoryOptions.filter((option) => allowed.has(String(option.value)));
  }, [categoryOptions, isClient, scopedProductIds, productCategoryMap]);

  const visibleBranchOptions = useMemo(() => {
    if (!selectedMerchantId) {
      return branchOptions;
    }
    return branchOptions.filter(
      (option) => String(option.merchant_id) === String(selectedMerchantId)
    );
  }, [branchOptions, selectedMerchantId]);

  const clientGateMessage = useMemo(() => {
    if (!isClient) {
      return '';
    }
    if (resource.key === 'merchants') {
      return '';
    }
    if (!selectedMerchantId) {
      return 'Select a merchant first.';
    }
    if (resource.key === 'branches') {
      return '';
    }
    if (!selectedBranchId) {
      return 'Select a branch first.';
    }
    if (resource.key === 'products' && !selectedCategoryId) {
      return 'Select a category first.';
    }
    return '';
  }, [isClient, resource.key, selectedMerchantId, selectedBranchId, selectedCategoryId]);

  const existingProductImages = useMemo(
    () => (editRow && editRow.id ? productImageMap[editRow.id] || [] : []),
    [editRow, productImageMap]
  );

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((item) => item !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const toggleRolePermission = (permissionId) => {
    setSelectedRolePermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((item) => item !== permissionId);
      }
      return [...prev, permissionId];
    });
  };

  const addProductImage = () => {
    productImageInputRef.current?.click();
  };

  const handleProductImageFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }
    const nextFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    setProductFiles((prev) => [...prev, ...nextFiles]);
    event.target.value = '';
  };

  const removeProductFile = (index) => {
    setProductFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const toggleRemoveExistingImage = (imageId) => {
    setRemovedImageIds((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((item) => item !== imageId);
      }
      return [...prev, imageId];
    });
  };

  const filteredRolePermissionOptions = useMemo(() => {
    if (!rolePermQuery) {
      return rolePermissionOptions;
    }
    const search = rolePermQuery.toLowerCase();
    return rolePermissionOptions.filter((option) =>
      String(option.label).toLowerCase().includes(search)
    );
  }, [rolePermissionOptions, rolePermQuery]);

  const getCarouselIndex = (id, length) => {
    const current = carouselIndex[id] ?? 0;
    if (!length) {
      return 0;
    }
    return current % length;
  };

  const setCarousel = (id, nextIndex) => {
    setCarouselIndex((prev) => ({
      ...prev,
      [id]: nextIndex
    }));
  };

  const statusPills = Object.entries(stats.statusCounts || {}).slice(0, 3);

  const handleAvatarSelect = () => {
    if (!editRow?.id || !avatarUploadEndpoint) {
      return;
    }
    avatarInputRef.current?.click();
  };

  const handleFlagSelect = () => {
    if (!editRow?.id || !flagUploadEndpoint) {
      return;
    }
    flagInputRef.current?.click();
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

  const handleFlagUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editRow?.id || !flagUploadEndpoint) {
      return;
    }
    try {
      setFlagUploading(true);
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE_URL}${flagUploadEndpoint}/${editRow.id}/flag`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to upload flag');
      }
      const data = await response.json().catch(() => null);
      const nextUrl = data?.flag_url || data?.url;
      if (nextUrl) {
        setForm((prev) => ({ ...prev, flag_url: String(nextUrl) }));
      }
    } catch (err) {
      window.alert(err.message || 'Failed to upload flag');
    } finally {
      setFlagUploading(false);
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
    <div className="flex h-full min-h-0 flex-col space-y-3">
      <div className="surface-panel rise-fade rounded-[24px] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl leading-tight">{resource.title}</h2>
            <p className="text-xs text-[var(--muted-ink)]">
              {stats.total} total • Highest ID {stats.maxId || '-'}
            </p>
          </div>
          {canWrite && (
            (isMerchant || !resource.permissions?.create ? (
              <Button size="sm" onClick={openCreate}>New</Button>
            ) : (
              permissions.includes(resource.permissions.create) && (
                <Button size="sm" onClick={openCreate}>New</Button>
              )
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Input
            type="text"
            placeholder="Search by any field..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-md h-9"
          />
          <Badge className="border border-[var(--border)] bg-[var(--surface)]">
            {loading ? 'Loading' : `${filteredRows.length} rows`}
          </Badge>
        </div>
        {isClient && (merchantOptions.length > 0 || branchOptions.length > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
              <span>Merchant</span>
              <select
                className="h-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                value={selectedMerchantId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedMerchantId(value);
                  const nextBranchOptions = branchOptions.filter(
                    (option) => !value || String(option.merchant_id) === String(value)
                  );
                  const nextBranchId =
                    selectedBranchId && nextBranchOptions.some((opt) => String(opt.value) === String(selectedBranchId))
                      ? selectedBranchId
                      : '';
                  if (nextBranchId !== selectedBranchId) {
                    setSelectedBranchId(nextBranchId);
                  }
                  if (!nextBranchId) {
                    setSelectedCategoryId('');
                  }
                  const params = new URLSearchParams(location.search);
                  if (value) {
                    params.set('merchant_id', value);
                  } else {
                    params.delete('merchant_id');
                  }
                  if (nextBranchId) {
                    params.set('branch_id', nextBranchId);
                  } else {
                    params.delete('branch_id');
                  }
                  if (!nextBranchId) {
                    params.delete('category_id');
                  }
                  navigate({ pathname: location.pathname, search: params.toString() });
                }}
              >
                <option value="">All</option>
                {merchantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
              <span>Branch</span>
              <select
                className="h-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                value={selectedBranchId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedBranchId(value);
                  if (!value) {
                    setSelectedCategoryId('');
                  }
                  const params = new URLSearchParams(location.search);
                  if (value) {
                    params.set('branch_id', value);
                  } else {
                    params.delete('branch_id');
                  }
                  if (!value) {
                    params.delete('category_id');
                  }
                  navigate({ pathname: location.pathname, search: params.toString() });
                }}
              >
                <option value="">All</option>
                {visibleBranchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {resource.key === 'products' && (
              <label className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
                <span>Category</span>
                <select
                  className="h-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                  value={selectedCategoryId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedCategoryId(value);
                    const params = new URLSearchParams(location.search);
                    if (value) {
                      params.set('category_id', value);
                    } else {
                      params.delete('category_id');
                    }
                    navigate({ pathname: location.pathname, search: params.toString() });
                  }}
                >
                  <option value="">All</option>
                  {visibleCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="soft-panel flex min-h-0 flex-1 flex-col rounded-[24px]">
        <div className="no-scrollbar min-h-0 flex-1 overflow-auto">
          {isClient && resource.key == 'products' ? (
            <div className="grid gap-4 p-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : clientGateMessage ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  {clientGateMessage}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  No products found.
                </div>
              ) : (
                paginatedRows.map((row) => {
                  const statusValue = row.status ? String(row.status).toLowerCase() : '';
                  const statusClass =
                    statusValue === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : statusValue === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : statusValue === 'suspended'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';
                  const categories = (productCategoryMap[row.id] || []).map((link) => {
                    const key = link.category_id ? String(link.category_id) : '';
                    return categoryLabelMap[key] || `#${link.category_id}`;
                  });
                  const images = productImageMap[row.id] || [];
                  const coverUrl = images[0]?.url ? String(images[0].url) : '';
                  const branchLabel =
                    row.branch_id !== undefined
                      ? branchLabelMap[String(row.branch_id)] || `#${row.branch_id}`
                      : 'Unassigned';

                  return (
                    <div
                      key={row.id}
                      className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-[var(--accent-soft)]">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={row.name || `Product ${row.id}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--accent-strong)]">
                              {getInitials(row.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-semibold text-[var(--ink)]">
                            {row.name || `Product #${row.id}`}
                          </div>
                          <div className="text-xs text-[var(--muted-ink)]">Slug: {row.slug || '-'}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <Badge className={`border ${statusClass}`}>
                              {formatValue(row.status)}
                            </Badge>
                            <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                              {row.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                              Branch: {branchLabel}
                            </Badge>
                            <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                              Images: {images.length}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-[var(--muted-ink)]">
                        {row.description || 'No description provided.'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.length === 0 ? (
                          <Badge className="border border-dashed border-[var(--border)] bg-transparent">
                            No categories
                          </Badge>
                        ) : (
                          categories.map((label) => (
                            <Badge key={`${row.id}-${label}`} className="border border-[var(--border)] bg-[var(--surface)]">
                              {label}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
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
              {clientGateMessage ? (
                <TableRow>
                  <TableCell colSpan={headers.length + 2}>{clientGateMessage}</TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={headers.length + 2}>Loading...</TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length + 2}>No data</TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
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
                  const isUserResource = resource.key === 'users';
                  const branchOption = isUserResource
                    ? refOptions.branch_id?.find((option) => String(option.value) === String(row.branch_id))
                    : null;
                  const compactOptionLabel = (label) =>
                    label ? String(label).replace(/\s*\(#\d+\)\s*$/, '') : '';
                  const branchLabel = compactOptionLabel(branchOption?.label);
                  const branchFlagUrl = branchOption?.flag_url || '';

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
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-ink)]">
                              <span>ID #{row.id}</span>
                              {isUserResource && branchLabel && (
                                <FlagChip title={branchLabel} url={branchFlagUrl} />
                              )}
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
                      <TableCell data-label="Actions" className="min-w-[160px]">
                        <div className="flex flex-col gap-2">
                          {isClient && resource.key === 'merchants' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center whitespace-nowrap px-4"
                              onClick={() =>
                                navigate(`/merchant/branches?merchant_id=${row.id}`)
                              }
                            >
                              View Branches
                            </Button>
                          )}
                          {isClient && resource.key === 'branches' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center whitespace-nowrap px-4"
                              onClick={() =>
                                navigate(
                                  `/merchant/categories?merchant_id=${row.merchant_id}&branch_id=${row.id}`
                                )
                              }
                            >
                              View Categories
                            </Button>
                          )}
                          {isClient && resource.key === 'categories' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center whitespace-nowrap px-4"
                              onClick={() => {
                                const params = new URLSearchParams(location.search);
                                const merchantId = params.get('merchant_id') || selectedMerchantId || '';
                                const branchId = params.get('branch_id') || selectedBranchId || '';
                                const nextParams = new URLSearchParams();
                                if (merchantId) {
                                  nextParams.set('merchant_id', merchantId);
                                }
                                if (branchId) {
                                  nextParams.set('branch_id', branchId);
                                }
                                nextParams.set('category_id', row.id);
                                navigate(`/merchant/products?${nextParams.toString()}`);
                              }}
                            >
                              View Products
                            </Button>
                          )}
                          {roleConfig && (
                            <Button size="sm" variant="outline" onClick={() => openInfo(row)}>
                              Info
                            </Button>
                          )}
                          {canWrite && (
                            <>
                              {(isMerchant ||
                                !resource.permissions?.update ||
                                permissions.includes(resource.permissions.update)) && (
                                <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                                  Edit
                                </Button>
                              )}
                              {(isMerchant ||
                                !resource.permissions?.delete ||
                                permissions.includes(resource.permissions.delete)) && (
                                <Button size="sm" variant="destructive" onClick={() => openDelete(row)}>
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-ink)]">
          <div className="flex items-center gap-2">
            <span>Page {currentPage} / {totalPages}</span>
            <button
              type="button"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
          <label className="flex items-center gap-2">
            <span>Rows</span>
            <select
              className="h-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
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
                const hasRoleOptions = options.some((option) => {
                  const label = option?.label || option;
                  return typeof label === 'string' && /manager|support/i.test(label);
                });
                const selectedOption =
                  options.find((option) => String(option.value ?? option) === String(form[field.key] ?? '')) || null;
                return (
                  <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)] md:col-span-2">
                    {field.label}
                    {hasRoleOptions ? (
                      <div className="relative">
                        <button
                          type="button"
                          className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-[var(--surface)] px-4 text-sm text-[var(--ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 ${
                            hasError
                              ? 'border-red-300 focus-visible:ring-red-200'
                              : 'border-[var(--border)] focus-visible:ring-[var(--accent)]'
                          }`}
                          onClick={() =>
                            setRoleSelectOpen((prev) => (prev === field.key ? '' : field.key))
                          }
                        >
                          <span className="flex items-center gap-2">
                            <FlagChip title={selectedOption?.label || 'Role flag'} url={selectedOption?.flag_url} />
                            <span>{selectedOption?.label || selectedOption || 'Select'}</span>
                          </span>
                          <span className="text-xs text-[var(--muted-ink)]">
                            {roleSelectOpen === field.key ? 'Hide' : 'Show'}
                          </span>
                        </button>
                        {roleSelectOpen === field.key && (
                          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                            <div className="max-h-60 overflow-y-auto">
                              {options.map((option) => {
                                const value = option.value || option;
                                const label = option.label || option;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--surface-soft)]"
                                    onClick={() => {
                                      handleChange(field.key, value);
                                      setRoleSelectOpen('');
                                    }}
                                  >
                                    <FlagChip title={label} url={option.flag_url} />
                                    <span>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
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
                    )}
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
              if (field.key === 'flag_url') {
                return (
                  <label key={field.key} className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    {'Flag'}
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={flagInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFlagUpload}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleFlagSelect}
                        disabled={!editRow?.id || !flagUploadEndpoint || flagUploading}
                      >
                        {flagUploading ? 'Uploading...' : 'Upload Flag'}
                      </Button>
                      {form.flag_url && (
                        <img
                          src={String(form.flag_url)}
                          alt="Branch flag"
                          className="h-5 w-5 rounded-[6px] border border-[var(--border)] object-cover"
                        />
                      )}
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
            {roleConfig && (
              <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                  Permissions
                </p>
                {rolePermissionOptions.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--muted-ink)]">No permissions available.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm"
                        onClick={() => setRolePermOpen((prev) => !prev)}
                      >
                        <span>
                          {selectedRolePermissions.length > 0
                            ? `${selectedRolePermissions.length} selected`
                            : 'Select permissions'}
                        </span>
                        <span className="text-xs text-[var(--muted-ink)]">{rolePermOpen ? 'Hide' : 'Show'}</span>
                      </button>
                      {rolePermOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                          <Input
                            type="text"
                            placeholder="Search permissions..."
                            value={rolePermQuery}
                            onChange={(event) => setRolePermQuery(event.target.value)}
                          />
                          <div className="mt-3 max-h-52 overflow-y-auto pr-1">
                            {filteredRolePermissionOptions.length === 0 ? (
                              <p className="text-sm text-[var(--muted-ink)]">No matches.</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {filteredRolePermissionOptions.map((option) => {
                                  const value = String(option.value);
                                  return (
                                    <label key={value} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                        checked={selectedRolePermissions.includes(value)}
                                        onChange={() => toggleRolePermission(value)}
                                      />
                                      {option.label}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedRolePermissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedRolePermissions.map((value) => {
                      const label = rolePermissionOptions.find((opt) => String(opt.value) === String(value))?.label || value;
                      return (
                        <Badge
                          key={value}
                          className="border border-[var(--border)] bg-[var(--surface)]"
                        >
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {isProduct && (
              <>
                <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                    Categories
                  </p>
                  {categoryOptions.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--muted-ink)]">No categories available.</p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {categoryOptions.map((option) => {
                        const value = String(option.value);
                        return (
                          <label key={value} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                              checked={selectedCategories.includes(value)}
                              onChange={() => toggleCategory(value)}
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {selectedCategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCategories.map((value) => (
                        <Badge
                          key={value}
                          className="border border-[var(--border)] bg-[var(--surface)]"
                        >
                          {categoryLabelMap[value] || value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                      Images
                    </p>
                    <Button type="button" size="sm" variant="secondary" onClick={addProductImage}>
                      Add Image
                    </Button>
                  </div>
                  <input
                    ref={productImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleProductImageFiles}
                  />
                  {existingProductImages.length === 0 && productFiles.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--muted-ink)]">No images added yet.</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {existingProductImages.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {existingProductImages.map((image) => {
                            const isRemoved = removedImageIds.includes(image.id);
                            return (
                              <div
                                key={`existing-${image.id}`}
                                className={`flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 ${isRemoved ? 'opacity-50' : ''}`}
                              >
                                <div className="h-12 w-12 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]">
                                  {image.url ? (
                                    <img src={image.url} alt="Product" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full" />
                                  )}
                                </div>
                                <div className="flex-1 text-xs text-[var(--muted-ink)]">
                                  Existing image #{image.id}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isRemoved ? 'secondary' : 'destructive'}
                                  onClick={() => toggleRemoveExistingImage(image.id)}
                                >
                                  {isRemoved ? 'Undo' : 'Remove'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {productFiles.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {productFiles.map((entry, index) => (
                            <div key={`new-${index}`} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
                              <div className="h-12 w-12 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]">
                                {entry.preview ? (
                                  <img src={entry.preview} alt={entry.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full" />
                                )}
                              </div>
                              <div className="flex-1 text-xs text-[var(--muted-ink)]">
                                {entry.name || 'New image'}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeProductFile(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
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

