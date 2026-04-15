import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../lib/api';
import { auth } from '../lib/auth';
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

function compactOptionLabel(label) {
  return label ? String(label).replace(/\s*\(#\d+\)\s*$/, '') : '';
}

function isEmptyValue(value) {
  return value === '' || value === null || value === undefined;
}

function getFieldDefaultValue(field) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.type === 'boolean') {
    return false;
  }
  return '';
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return `$${amount.toFixed(2)}`;
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
  const isClient = authType === 'client' || (isMerchant && roleName === 'client');
  const isBuyerAuth = authType === 'client';
  const canRead = isMerchant || authType === 'client'
    ? true
    : resource.permissions?.read
    ? permissions.includes(resource.permissions.read)
    : true;
  const canWrite = !isClient;
  const canCreate =
    canWrite && (isMerchant || !resource.permissions?.create || permissions.includes(resource.permissions.create));
  const canUpdate =
    canWrite && (isMerchant || !resource.permissions?.update || permissions.includes(resource.permissions.update));
  const canDelete =
    canWrite && (isMerchant || !resource.permissions?.delete || permissions.includes(resource.permissions.delete));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
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
  const [saveLoading, setSaveLoading] = useState(false);
  const productImageInputRef = useRef(null);
  const [merchantOptions, setMerchantOptions] = useState([]);
  const [clientMerchantRows, setClientMerchantRows] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [branchMerchantMap, setBranchMerchantMap] = useState({});
  const [clientProducts, setClientProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [buyerCart, setBuyerCart] = useState({
    cart_id: null,
    status: 'active',
    items: [],
    item_count: 0,
    total_quantity: 0,
    total_amount: 0
  });
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

  const loadRolePermissions = useCallback(async () => {
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
  }, [roleConfig]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (!canRead) {
        setRows([]);
        return;
      }
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
        setClientMerchantRows(merchantItems);
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
        setClientMerchantRows([]);
        setMerchantOptions([]);
        setBranchOptions([]);
        setBranchMerchantMap({});
      }
      if (isBuyerAuth) {
        try {
          const [methods, orders, cart] = await Promise.all([
            api.list('buyer/payment-methods'),
            api.list('buyer/orders'),
            api.list('buyer/cart')
          ]);
          const methodItems = Array.isArray(methods) ? methods : [];
          setPaymentMethods(methodItems);
          setBuyerOrders(Array.isArray(orders) ? orders : []);
          setBuyerCart(
            cart && typeof cart === 'object'
              ? cart
              : { cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 }
          );
          if (methodItems.length > 0) {
            const defaultMethod = methodItems.find((method) => Boolean(method.is_default));
            setSelectedPaymentMethodId(String((defaultMethod || methodItems[0]).id));
          } else {
            setSelectedPaymentMethodId('');
          }
        } catch {
          setPaymentMethods([]);
          setBuyerOrders([]);
          setBuyerCart({ cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 });
          setSelectedPaymentMethodId('');
        }
      } else {
        setPaymentMethods([]);
        setBuyerOrders([]);
        setBuyerCart({ cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 });
        setSelectedPaymentMethodId('');
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
      } else if (resource.key === 'dashboard') {
        const [products, branches] = await Promise.all([
          api.list('products'),
          api.list('branches')
        ]);
        setRows(Array.isArray(products) ? products : []);
        const branchItems = Array.isArray(branches) ? branches : [];
        if (!isClient) {
          setBranchOptions(
            branchItems.map((branch) => ({
              value: String(branch.id),
              merchant_id: String(branch.merchant_id ?? ''),
              label: branch.name || `Branch #${branch.id}`
            }))
          );
        }
        setCategoryOptions([]);
        setProductCategoryMap({});
        setProductImageMap({});
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
        if (resource.key === 'cart' || resource.key === 'checkout' || resource.key === 'dashboard') {
          setRows([]);
        } else {
          const data = await api.list(resource.key);
          setRows(Array.isArray(data) ? data : []);
        }
        setCategoryOptions([]);
        setProductCategoryMap({});
        setProductImageMap({});
        setClientProducts([]);
      }
    } catch (err) {
      setRows([]);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [resource.key, isClient, isBuyerAuth, canRead]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const merchantId = params.get('merchant_id') || '';
    const branchId = params.get('branch_id') || '';
    setSelectedMerchantId(merchantId);
    setSelectedBranchId(branchId);
    if (isClient) {
      const categoryId = params.get('category_id') || '';
      setSelectedCategoryId(categoryId);
      return;
    }
    setSelectedCategoryId('');
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
                option.merchant_id = item.merchant_id;
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
    loadRolePermissions();
  }, [loadRolePermissions]);

  const resetForm = () => {
    const initial = {};
    fields.forEach((field) => {
      initial[field.key] = getFieldDefaultValue(field);
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
      if (field.type === 'password') {
        next[field.key] = '';
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
      if (editRow && field.type === 'password') {
        return;
      }
      if (!field.required || field.type === 'boolean') {
        return;
      }
      const value = form[field.key];
      if (isEmptyValue(value)) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (saveLoading) {
      return;
    }
    try {
      setSaveLoading(true);
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
        if (isEmptyValue(value)) {
          if (!editRow && field.defaultValue !== undefined) {
            payload[field.key] = field.defaultValue;
          }
          if (field.ref && editRow) {
            payload[field.key] = null;
          }
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

      if (!editRow && resource.key === 'products' && !Object.prototype.hasOwnProperty.call(payload, 'is_active')) {
        payload.is_active = true;
      }
      if (resource.key === 'users' && !Object.prototype.hasOwnProperty.call(payload, 'branch_id')) {
        payload.branch_id = null;
      }
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
      await loadRolePermissions();
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
      window.alert(err.message || 'Failed to save');
    } finally {
      setSaveLoading(false);
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

  const handleSendResetPassword = async (row) => {
    const email = row?.email ? String(row.email).trim() : '';
    if (!email) {
      setError('Selected record does not have an email.');
      return;
    }
    const actor =
      resource.key === 'platform-admins'
        ? 'platform'
        : resource.key === 'users'
        ? 'merchant'
        : resource.key === 'platform-clients'
        ? 'buyer'
        : '';
    if (!actor) {
      return;
    }
    try {
      setError('');
      await auth.forgotPassword(actor, email);
      window.alert(`Password reset link sent to ${email} (or logged by backend if SMTP is not configured).`);
    } catch (err) {
      setError(err?.message || 'Failed to send reset password link');
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

  const headers = useMemo(() => {
    const base = ['id', ...fields.map((field) => field.key)];
    const hiddenByResource = {
      users: ['avatar_url', 'password', 'merchant_id', 'branch_id'],
      'platform-clients': ['password'],
      branches: ['merchant_id', 'parent_branch_id', 'flag_url'],
      'branch-roles': ['branch_id', 'is_system'],
      permissions: ['group_name'],
      products: ['created_by', 'updated_by', 'created_at', 'updated_at', 'slug', 'is_active'],
      categories: ['created_by', 'updated_by', 'created_at', 'updated_at', 'slug', 'is_active']
    };
    const hidden = new Set(hiddenByResource[resource.key] || []);
    const filtered = base.filter((key) => !hidden.has(key));
    return filtered;
  }, [fields, resource.key]);
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

  const branchLabelMap = useMemo(() => {
    const options = refOptions.branch_id || [];
    const map = {};
    options.forEach((option) => {
      const value = option.value ?? option;
      const label = compactOptionLabel(option.label ?? option);
      map[String(value)] = label;
    });
    return map;
  }, [refOptions]);

  const branchIdFlagMap = useMemo(() => {
    const options = refOptions.branch_id || [];
    const map = {};
    options.forEach((option) => {
      const value = option.value ?? option;
      map[String(value)] = option.flag_url || '';
    });
    return map;
  }, [refOptions]);
  const branchIdMerchantMap = useMemo(() => {
    const options = refOptions.branch_id || [];
    const map = {};
    options.forEach((option) => {
      const value = option.value ?? option;
      if (option?.merchant_id !== undefined && option?.merchant_id !== null) {
        map[String(value)] = String(option.merchant_id);
      }
    });
    return map;
  }, [refOptions]);
  const filteredUserBranchOptions = useMemo(() => {
    const options = refOptions.branch_id || [];
    const merchantId = String(form.merchant_id ?? '');
    if (!merchantId) {
      return options;
    }
    return options.filter(
      (option) => String(option?.merchant_id ?? branchIdMerchantMap[String(option.value ?? option)] ?? '') === merchantId
    );
  }, [refOptions, form.merchant_id, branchIdMerchantMap]);
  const filteredUserRoleOptions = useMemo(() => {
    const options = refOptions.merchant_role_id || [];
    const branchId = String(form.branch_id ?? '');
    if (branchId) {
      return options.filter((option) => String(option?.branch_id ?? '') === branchId);
    }
    const merchantId = String(form.merchant_id ?? '');
    if (!merchantId) {
      return options;
    }
    return options.filter((option) => {
      const roleBranchId = String(option?.branch_id ?? '');
      const roleMerchantId = branchIdMerchantMap[roleBranchId];
      return roleMerchantId && String(roleMerchantId) === merchantId;
    });
  }, [refOptions, form.branch_id, form.merchant_id, branchIdMerchantMap]);
  useEffect(() => {
    if (resource.key !== 'users') {
      return;
    }
    const nextBranchOptions = filteredUserBranchOptions;
    const nextRoleOptions = filteredUserRoleOptions;
    const branchValue = String(form.branch_id ?? '');
    const roleValue = String(form.merchant_role_id ?? '');
    const branchAllowed =
      !branchValue || nextBranchOptions.some((option) => String(option.value ?? option) === branchValue);
    const roleAllowed =
      !roleValue || nextRoleOptions.some((option) => String(option.value ?? option) === roleValue);
    if (branchAllowed && roleAllowed) {
      return;
    }
    setForm((prev) => {
      const next = { ...prev };
      if (!branchAllowed) {
        next.branch_id = '';
      }
      if (!roleAllowed) {
        next.merchant_role_id = '';
      }
      return next;
    });
  }, [resource.key, form.branch_id, form.merchant_role_id, filteredUserBranchOptions, filteredUserRoleOptions]);

  const filteredRows = useMemo(() => {
    let baseRows = [...rows].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
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
    if (!isClient && resource.key === 'users' && selectedMerchantId) {
      baseRows = baseRows.filter((row) => String(row.merchant_id) === String(selectedMerchantId));
    }
    if (!isClient && resource.key === 'products' && selectedBranchId) {
      baseRows = baseRows.filter((row) => String(row.branch_id) === String(selectedBranchId));
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
        if (key === 'flag_display') {
          if (resource.key === 'branches') {
            return String(row.name || row.code || row.id || '').toLowerCase().includes(search);
          }
          if (resource.key === 'branch-roles' || resource.key === 'users') {
            const label = branchLabelMap[String(row.branch_id)] || '';
            return String(label).toLowerCase().includes(search);
          }
          return false;
        }
        if (resource.key === 'users' && key === 'merchant_role_id') {
          return String(row.role_name ?? '').toLowerCase().includes(search);
        }
        return String(row[key] ?? '').toLowerCase().includes(search);
      })
    );
  }, [
    rows,
    query,
    tableHeaders,
    permissionMap,
    branchLabelMap,
    isClient,
    selectedMerchantId,
    selectedBranchId,
    selectedCategoryId,
    branchMerchantMap,
    resource.key,
    productCategoryMap,
    clientProducts
  ]);

  const filteredClientMerchantRows = useMemo(() => {
    const items = [...clientMerchantRows].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    if (!query) {
      return items;
    }
    const search = query.toLowerCase();
    return items.filter((row) =>
      ['name', 'legal_name', 'merchant_code', 'email', 'address', 'city', 'country']
        .some((key) => String(row[key] ?? '').toLowerCase().includes(search))
    );
  }, [clientMerchantRows, query]);

  useEffect(() => {
    setPage(1);
  }, [query, resource.key, selectedMerchantId, selectedBranchId, selectedCategoryId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);
  const clientMerchantTotalPages = Math.max(1, Math.ceil(filteredClientMerchantRows.length / pageSize));
  const clientMerchantCurrentPage = Math.min(page, clientMerchantTotalPages);
  const paginatedClientMerchantRows = useMemo(() => {
    const start = (clientMerchantCurrentPage - 1) * pageSize;
    return filteredClientMerchantRows.slice(start, start + pageSize);
  }, [filteredClientMerchantRows, clientMerchantCurrentPage, pageSize]);
  const showBuyerMerchantCards =
    isClient && (resource.key === 'branches' || resource.key === 'categories' || resource.key === 'products') && !selectedMerchantId;
  const visibleResultCount = showBuyerMerchantCards ? filteredClientMerchantRows.length : filteredRows.length;
  const visibleCurrentPage = showBuyerMerchantCards ? clientMerchantCurrentPage : currentPage;
  const visibleTotalPages = showBuyerMerchantCards ? clientMerchantTotalPages : totalPages;

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

  const merchantLabelMap = useMemo(() => {
    const map = {};
    clientMerchantRows.forEach((merchant) => {
      map[String(merchant.id)] = merchant.name || merchant.legal_name || `Merchant #${merchant.id}`;
    });
    merchantOptions.forEach((option) => {
      map[String(option.value)] = option.label;
    });
    return map;
  }, [clientMerchantRows, merchantOptions]);

  const buyerBranchLabelMap = useMemo(() => {
    const map = {};
    branchOptions.forEach((option) => {
      map[String(option.value)] = compactOptionLabel(option.label);
    });
    return map;
  }, [branchOptions]);

  const visibleBranchOptions = useMemo(() => {
    if (!isClient && resource.key === 'products') {
      return (refOptions.branch_id || []).map((option) => ({
        ...option,
        label: compactOptionLabel(option.label)
      }));
    }
    if (!selectedMerchantId) {
      return branchOptions;
    }
    return branchOptions.filter(
      (option) => String(option.merchant_id) === String(selectedMerchantId)
    );
  }, [branchOptions, isClient, refOptions, resource.key, selectedMerchantId]);

  const clientGateMessage = useMemo(() => {
    if (!isClient) {
      return '';
    }
    if (resource.key === 'merchants') {
      return '';
    }
    if (resource.key === 'dashboard' || resource.key === 'branches' || resource.key === 'categories' || resource.key === 'products' || resource.key === 'cart' || resource.key === 'checkout') {
      return '';
    }
    if (!selectedMerchantId) {
      return 'Select a merchant first.';
    }
    if (!selectedBranchId) {
      return 'Select a branch first.';
    }
    return '';
  }, [isClient, resource.key, selectedMerchantId, selectedBranchId]);

  const buyerHeaderTitle = useMemo(() => {
    if (!isClient) {
      return resource.title;
    }
    if (resource.key === 'merchants') {
      return 'Choose a merchant';
    }
    if (resource.key === 'dashboard') {
      return 'Main overview';
    }
    if (resource.key === 'branches') {
      return 'Choose a branch';
    }
    if (resource.key === 'products') {
      return 'Browse items';
    }
    if (resource.key === 'cart') {
      return 'Your cart';
    }
    if (resource.key === 'checkout') {
      return 'Checkout';
    }
    if (resource.key === 'categories') {
      return 'Browse categories';
    }
    return resource.title;
  }, [isClient, resource.key, resource.title]);

  const buyerHeaderDescription = useMemo(() => {
    if (!isClient) {
      return '';
    }
    if (resource.key === 'merchants') {
      return 'Start by selecting the merchant you want to shop from.';
    }
    if (resource.key === 'dashboard') {
      return 'Quick access to products, branches, and cart status.';
    }
    if (resource.key === 'branches') {
      return selectedMerchantId
        ? `Showing branches for ${merchantLabelMap[String(selectedMerchantId)] || 'the selected merchant'}.`
        : 'Choose a merchant first to continue.';
    }
    if (resource.key === 'products') {
      return selectedBranchId
        ? `Showing the available items for ${buyerBranchLabelMap[String(selectedBranchId)] || 'the selected branch'}.`
        : 'Choose a branch first to see its products.';
    }
    if (resource.key === 'categories') {
      return 'Category filters are available if you want to narrow the product list.';
    }
    if (resource.key === 'cart') {
      return 'Review quantities and totals before checkout.';
    }
    if (resource.key === 'checkout') {
      return 'Confirm payment method and place your order.';
    }
    return '';
  }, [isClient, resource.key, selectedMerchantId, selectedBranchId, merchantLabelMap, buyerBranchLabelMap]);

  const goBuyerHome = useCallback(() => {
    setSelectedMerchantId('');
    setSelectedBranchId('');
    setSelectedCategoryId('');
    navigate('/merchant/merchants');
  }, [navigate]);

  const goBuyerBack = useCallback(() => {
    if (!isClient) {
      return;
    }
    if (resource.key === 'branches') {
      goBuyerHome();
      return;
    }
    if (resource.key === 'categories' || resource.key === 'products') {
      if (selectedMerchantId) {
        navigate(`/merchant/branches?merchant_id=${selectedMerchantId}`);
      } else {
        goBuyerHome();
      }
      return;
    }
    if (resource.key === 'cart') {
      navigate('/merchant/products');
      return;
    }
    if (resource.key === 'checkout') {
      navigate('/merchant/cart');
      return;
    }
    goBuyerHome();
  }, [goBuyerHome, isClient, navigate, resource.key, selectedMerchantId]);

  const hasBuyerBackAction = isClient && resource.key !== 'merchants';

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

  const refreshBuyerCommerceData = useCallback(async () => {
    if (!isBuyerAuth) {
      return;
    }
    try {
      const [methods, orders, cart] = await Promise.all([
        api.list('buyer/payment-methods'),
        api.list('buyer/orders'),
        api.list('buyer/cart')
      ]);
      const methodItems = Array.isArray(methods) ? methods : [];
      setPaymentMethods(methodItems);
      setBuyerOrders(Array.isArray(orders) ? orders : []);
      setBuyerCart(
        cart && typeof cart === 'object'
          ? cart
          : { cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 }
      );
      if (methodItems.length > 0) {
        const currentExists = methodItems.some((method) => String(method.id) === String(selectedPaymentMethodId));
        if (!currentExists) {
          const defaultMethod = methodItems.find((method) => Boolean(method.is_default));
          setSelectedPaymentMethodId(String((defaultMethod || methodItems[0]).id));
        }
      } else {
        setSelectedPaymentMethodId('');
      }
    } catch {
      // ignore silently in UI
    }
  }, [isBuyerAuth, selectedPaymentMethodId]);

  const addPaymentMethod = async () => {
    const typeInput = window.prompt('Payment type: credit_card / bank_transfer / paypal / manual', 'credit_card');
    if (!typeInput) {
      return;
    }
    const type = String(typeInput).trim();
    const payload = { type, is_default: paymentMethods.length === 0 };
    if (type === 'credit_card') {
      const brand = window.prompt('Card brand (optional)', 'VISA') || '';
      const last4 = window.prompt('Card last 4 digits', '') || '';
      const expiry = window.prompt('Expiry (MM/YY, optional)', '') || '';
      if (!/^\d{4}$/.test(String(last4).trim())) {
        window.alert('Card last4 must be exactly 4 digits.');
        return;
      }
      payload.card_brand = String(brand).trim() || null;
      payload.card_last4 = String(last4).trim();
      payload.expiry_date = String(expiry).trim() || null;
    }
    try {
      const created = await api.create('buyer/payment-methods', payload);
      await refreshBuyerCommerceData();
      if (created?.id) {
        setSelectedPaymentMethodId(String(created.id));
      }
      window.alert('Payment method added.');
    } catch (err) {
      window.alert(err.message || 'Failed to add payment method.');
    }
  };

  const addToCart = async (row) => {
    try {
      const cart = await api.create('buyer/cart/items', {
        product_id: row.id,
        quantity: 1
      });
      setBuyerCart(cart || { cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to add item to cart.');
    }
  };

  const updateCartQuantity = async (itemId, nextQuantity) => {
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return;
    }
    try {
      const cart = await api.update('buyer/cart/items', itemId, { quantity: nextQuantity });
      setBuyerCart(cart || { cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to update quantity.');
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const cart = await api.remove('buyer/cart/items', itemId);
      setBuyerCart(cart || { cart_id: null, status: 'active', items: [], item_count: 0, total_quantity: 0, total_amount: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to remove item.');
    }
  };

  const clearBuyerCart = async () => {
    try {
      const items = Array.isArray(buyerCart.items) ? buyerCart.items : [];
      if (items.length === 0) {
        return;
      }
      await Promise.all(items.map((item) => api.remove('buyer/cart/items', item.id)));
      await refreshBuyerCommerceData();
    } catch (err) {
      window.alert(err.message || 'Failed to clear cart.');
    }
  };

  const confirmCheckout = async () => {
    if (!buyerCart.items?.length) {
      window.alert('Your cart is empty.');
      return;
    }
    if (!selectedPaymentMethodId) {
      window.alert('Please choose a payment method before confirming the order.');
      return;
    }
    try {
      const payload = {
        payment_method_id: Number(selectedPaymentMethodId)
      };
      const order = await api.create('buyer/checkout', payload);
      await refreshBuyerCommerceData();
      window.alert(`Order confirmed: ${order?.order_number || order?.id || 'success'}`);
      navigate('/merchant/products');
    } catch (err) {
      window.alert(err.message || 'Failed to checkout.');
    }
  };

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
    <div className="flex h-full min-h-0 flex-col space-y-0">
      <div className="surface-panel rise-fade rounded-[24px] px-4 py-3 sm:px-5 sm:py-4">
        {isClient ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
              <span>{resource.title}</span>
            </div>
            <div>
              <h2 className="font-display text-2xl leading-tight sm:text-3xl">{buyerHeaderTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted-ink)]">{buyerHeaderDescription}</p>
            </div>
          </div>
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl leading-tight">{resource.title}</h2>
            <p className="text-xs text-[var(--muted-ink)]">
              {stats.total} total • Highest ID {stats.maxId || '-'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
            <Input
              type="text"
              placeholder="Search by any field..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full max-w-md md:w-72"
            />
            <span className="text-xs text-[var(--muted-ink)]">
              {loading ? 'Loading' : String(visibleResultCount)}
            </span>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>New</Button>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="surface-panel flex flex-col gap-4 rounded-[20px] px-4 py-3 md:flex-row md:items-center md:justify-between">
        {isClient && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-3 md:max-w-xl">
                <Input
                  type="text"
                  placeholder="Search merchants, branches, or products..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-10 w-full"
                />
                {resource.key === 'products' && isBuyerAuth && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => navigate('/merchant/cart')} className="h-10">
                      Cart ({buyerCart.total_quantity || 0})
                    </Button>
                    <span className="text-xs text-[var(--muted-ink)]">Orders: {buyerOrders.length}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button variant="secondary" onClick={goBuyerHome} className="h-10 min-w-[110px]">Home</Button>
                <Button variant="outline" onClick={goBuyerBack} className="h-10 min-w-[110px]" disabled={!hasBuyerBackAction}>Back</Button>
              </div>
            </div>
          </div>
        )}
        {!isClient && resource.key === 'products' && visibleBranchOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
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
                    {compactOptionLabel(option.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="soft-panel flex min-h-0 flex-1 flex-col rounded-[24px] p-0">
        <div className="flex min-h-0 flex-1 flex-col">
          {isClient && resource.key === 'merchants' ? (
            <div className="grid gap-4 p-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  No merchants found.
                </div>
              ) : (
                <>
                  {paginatedRows.map((row) => {
                    const statusValue = row.status ? String(row.status).toLowerCase() : '';
                    const statusClass =
                      statusValue === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : statusValue === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : statusValue === 'suspended'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';

                    return (
                      <div
                        key={row.id}
                        className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                            {getInitials(row.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-semibold text-[var(--ink)] break-words">
                              {row.name || `Merchant #${row.id}`}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-ink)]">
                              ID #{row.id} {row.merchant_code ? `• ${row.merchant_code}` : ''}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <Badge className={`border ${statusClass}`}>
                                {formatValue(row.status)}
                              </Badge>
                              {row.city && (
                                <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                  {row.city}
                                </Badge>
                              )}
                              {row.country && (
                                <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                  {row.country}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 text-sm text-[var(--muted-ink)]">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em]">Email</div>
                            <div className="mt-1 break-words text-[var(--ink)]">{row.email || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em]">Address</div>
                            <div className="mt-1 text-[var(--ink)]">{row.address || '-'}</div>
                          </div>
                        </div>
                        <div className="mt-auto pt-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full justify-center"
                            onClick={() => navigate(`/merchant/branches?merchant_id=${row.id}`)}
                          >
                            View Branches
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : isClient && resource.key === 'branches' ? (
            <div className="grid gap-4 p-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : !selectedMerchantId ? (
                filteredClientMerchantRows.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                    No merchants found.
                  </div>
                ) : (
                  <>
                    {paginatedClientMerchantRows.map((row) => {
                      const statusValue = row.status ? String(row.status).toLowerCase() : '';
                      const statusClass =
                        statusValue === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : statusValue === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : statusValue === 'suspended'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';

                      return (
                        <div
                          key={row.id}
                          className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                              {getInitials(row.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-semibold text-[var(--ink)] break-words">
                                {row.name || `Merchant #${row.id}`}
                              </div>
                              <div className="mt-1 text-xs text-[var(--muted-ink)]">
                                ID #{row.id} {row.merchant_code ? `• ${row.merchant_code}` : ''}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <Badge className={`border ${statusClass}`}>
                                  {formatValue(row.status)}
                                </Badge>
                                {row.city && (
                                  <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                    {row.city}
                                  </Badge>
                                )}
                                {row.country && (
                                  <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                    {row.country}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-3 text-sm text-[var(--muted-ink)]">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.24em]">Email</div>
                              <div className="mt-1 break-words text-[var(--ink)]">{row.email || '-'}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.24em]">Address</div>
                              <div className="mt-1 text-[var(--ink)]">{row.address || '-'}</div>
                            </div>
                          </div>
                          <div className="mt-auto pt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center"
                              onClick={() => navigate(`/merchant/branches?merchant_id=${row.id}`)}
                            >
                              View Branches
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )
              ) : clientGateMessage ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  {clientGateMessage}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  No branches found.
                </div>
              ) : (
                <>
                  {paginatedRows.map((row) => {
                    const statusValue = row.status ? String(row.status).toLowerCase() : '';
                    const statusClass =
                      statusValue === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : statusValue === 'inactive'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';

                    return (
                      <div
                        key={row.id}
                        className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)]">
                            <FlagChip title={row.name || `Branch #${row.id}`} url={row.flag_url || ''} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-semibold text-[var(--ink)] break-words">
                              {row.name || `Branch #${row.id}`}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-ink)]">
                              ID #{row.id} {row.code ? `• ${row.code}` : ''}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <Badge className={`border ${statusClass}`}>
                                {formatValue(row.status)}
                              </Badge>
                              {row.type && (
                                <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                  {row.type}
                                </Badge>
                              )}
                              <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                Main: {row.is_main ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto pt-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full justify-center"
                            onClick={() =>
                              navigate(`/merchant/products?merchant_id=${row.merchant_id}&branch_id=${row.id}`)
                            }
                          >
                            View Items
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : isClient && resource.key === 'categories' ? (
            <div className="grid gap-4 p-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : !selectedMerchantId ? (
                filteredClientMerchantRows.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                    No merchants found.
                  </div>
                ) : (
                  <>
                    {paginatedClientMerchantRows.map((row) => {
                      const statusValue = row.status ? String(row.status).toLowerCase() : '';
                      const statusClass =
                        statusValue === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : statusValue === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : statusValue === 'suspended'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';

                      return (
                        <div
                          key={row.id}
                          className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                              {getInitials(row.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-semibold text-[var(--ink)] break-words">
                                {row.name || `Merchant #${row.id}`}
                              </div>
                              <div className="mt-1 text-xs text-[var(--muted-ink)]">
                                ID #{row.id} {row.merchant_code ? `• ${row.merchant_code}` : ''}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <Badge className={`border ${statusClass}`}>
                                  {formatValue(row.status)}
                                </Badge>
                                {row.city && (
                                  <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                    {row.city}
                                  </Badge>
                                )}
                                {row.country && (
                                  <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                    {row.country}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-3 text-sm text-[var(--muted-ink)]">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.24em]">Email</div>
                              <div className="mt-1 break-words text-[var(--ink)]">{row.email || '-'}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.24em]">Address</div>
                              <div className="mt-1 text-[var(--ink)]">{row.address || '-'}</div>
                            </div>
                          </div>
                          <div className="mt-auto pt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center"
                              onClick={() => navigate(`/merchant/branches?merchant_id=${row.id}`)}
                            >
                              View Branches
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )
              ) : clientGateMessage ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  {clientGateMessage}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  No categories found.
                </div>
              ) : (
                <>
                  {paginatedRows.map((row) => {
                    const linkedProducts = Object.values(productCategoryMap)
                      .flat()
                      .filter((link) => String(link.category_id) === String(row.id)).length;
                    return (
                      <div
                        key={row.id}
                        className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                            {getInitials(row.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-semibold text-[var(--ink)] break-words">
                              {row.name || `Category #${row.id}`}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-ink)]">
                              ID #{row.id}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                {row.slug || '-'}
                              </Badge>
                              <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                Products: {linkedProducts}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto pt-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full justify-center"
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
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : resource.key === 'dashboard' ? (
            <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-ink)]">Products</div>
                <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{rows.length}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-ink)]">Branches</div>
                <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">
                  {branchOptions.length || (refOptions.branch_id || []).length}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-ink)]">Cart Items</div>
                <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{buyerCart.total_quantity || 0}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:col-span-2">
                <div className="text-sm font-semibold text-[var(--ink)]">General Overview</div>
                <p className="mt-2 text-sm text-[var(--muted-ink)]">
                  View products, branches, and cart status from one place.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate('/merchant/products')}>Browse Products</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/merchant/branches')}>Branches</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/merchant/cart')}>Cart</Button>
                </div>
              </div>
            </div>
          ) : resource.key === 'cart' ? (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              {!isBuyerAuth ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Cart is available for buyer accounts.
                </div>
              ) : (buyerCart.items || []).length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Your cart is empty.
                </div>
              ) : (
                <>
                  {(buyerCart.items || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-[var(--ink)]">
                            {item.name} x{item.quantity}
                          </div>
                          <div className="mt-1 text-sm text-[var(--muted-ink)]">
                            {formatCurrency(item.unit_price)} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, Math.max(1, Number(item.quantity || 1) - 1))}>-</Button>
                          <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, Number(item.quantity || 1) + 1)}>+</Button>
                          <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.id)}>Remove</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-ink)]">Total</span>
                      <span className="text-xl font-semibold text-[var(--ink)]">{formatCurrency(buyerCart.total_amount)}</span>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-[var(--ink)]">Payment Method</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          className="h-10 min-w-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                          value={selectedPaymentMethodId}
                          onChange={(event) => setSelectedPaymentMethodId(event.target.value)}
                        >
                          <option value="">Choose payment method</option>
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={method.id}>
                              {method.type}{method.card_last4 ? ` **** ${method.card_last4}` : ''}{method.is_default ? ' (default)' : ''}
                            </option>
                          ))}
                        </select>
                        <Button variant="outline" onClick={addPaymentMethod}>Add Payment Method</Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={confirmCheckout} disabled={(buyerCart.items || []).length === 0}>
                        Confirm Order
                      </Button>
                      <Button size="sm" variant="outline" onClick={clearBuyerCart}>Clear Cart</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : resource.key === 'checkout' ? (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              {!isBuyerAuth ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Checkout is available for buyer accounts.
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Checkout is handled from cart. Choose payment method and confirm order there.
                  <div className="mt-4">
                    <Button size="sm" variant="secondary" onClick={() => navigate('/merchant/cart')}>
                      Go to Cart
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : isClient && resource.key === 'products' ? (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : !selectedMerchantId ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Select a merchant first.
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
                <div className="grid gap-3">
                  {paginatedRows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-[var(--ink)]">{row.name || `Product #${row.id}`}</div>
                          <div className="mt-1 text-sm text-[var(--muted-ink)]">{row.description || 'No description'}</div>
                          <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{formatCurrency(row.base_price)}</div>
                        </div>
                        {isBuyerAuth && (
                          <Button size="sm" variant="secondary" onClick={() => addToCart(row)}>
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : resource.key === 'platform-clients' ? (
            <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
              {clientGateMessage ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  {clientGateMessage}
                </div>
              ) : loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  Loading...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-ink)]">
                  No buyers found.
                </div>
              ) : (
                <>
                  {paginatedRows.map((row) => {
                    const statusValue = row.status ? String(row.status).toLowerCase() : '';
                    const statusClass =
                      statusValue === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : statusValue === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : statusValue === 'blocked' || statusValue === 'inactive'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[var(--surface)] text-[var(--muted-ink)] border-[var(--border)]';
                    const roleOption = refOptions.platform_client_role_id?.find(
                      (option) => String(option.value) === String(row.platform_client_role_id)
                    );
                    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
                    const displayName = fullName || row.email || `Buyer #${row.id}`;
                    const avatarUrl = row.avatar_url ? String(row.avatar_url) : '';
                    const roleLabel = compactOptionLabel(roleOption?.label) || 'No role';

                    return (
                      <div
                        key={row.id}
                        className="flex h-full flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(displayName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-semibold text-[var(--ink)] break-words">
                              {displayName}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-ink)]">
                              ID #{row.id}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <Badge className={`border ${statusClass}`}>
                                {formatValue(row.status)}
                              </Badge>
                              <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                {roleLabel}
                              </Badge>
                              <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                                {row.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 text-sm text-[var(--muted-ink)]">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted-ink)]">Email</div>
                            <div className="mt-1 break-words text-[var(--ink)]">{row.email || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted-ink)]">Phone</div>
                            <div className="mt-1 text-[var(--ink)]">{row.phone || '-'}</div>
                          </div>
                        </div>

                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                          {row.email && (
                            <Button size="sm" variant="outline" onClick={() => handleSendResetPassword(row)}>
                              Reset Password
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
                      </div>
                    );
                  })}
                </>
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
                    {header === 'branch_id'
                      ? 'Branch'
                      : header === 'merchant_role_id'
                      ? 'Role'
                      : header === 'is_main'
                      ? 'Main'
                      : header === 'permission_count'
                      ? 'Permissions'
                      : header === 'flag_display'
                      ? 'flag'
                      : header}
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
                <>
                {paginatedRows.map((row) => {
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
                  const isBranchResource = resource.key === 'branches';
                  const isBranchRoleResource = resource.key === 'branch-roles';
                  const branchOption = isUserResource
                    ? refOptions.branch_id?.find((option) => String(option.value) === String(row.branch_id))
                    : null;
                  const branchLabel = compactOptionLabel(branchOption?.label);
                  const branchFlagUrl = branchOption?.flag_url || '';
                  const branchRoleLabel = isBranchRoleResource
                    ? compactOptionLabel(branchLabelMap[String(row.branch_id)] || `#${row.branch_id}`)
                    : '';
                  const branchFlagFromRow = isBranchResource ? String(row.flag_url || '') : '';
                  const branchFlagFromRole = isBranchRoleResource ? (branchIdFlagMap[String(row.branch_id)] || '') : '';
                  const flagLabel = isBranchResource
                    ? (row.name || row.code || `#${row.id}`)
                    : isBranchRoleResource
                    ? branchRoleLabel
                    : branchLabel;
                  const flagUrl = isBranchResource ? branchFlagFromRow : isBranchRoleResource ? branchFlagFromRole : branchFlagUrl;
                  const branchFlagCell = (
                    <div className="flex items-center gap-2">
                      <FlagChip title={flagLabel || 'Branch'} url={flagUrl} />
                      <span className="text-xs text-[var(--muted-ink)]">{flagLabel || '-'}</span>
                    </div>
                  );

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
                          {header === 'flag_display' ? (
                            (isUserResource || isBranchResource || isBranchRoleResource)
                              ? branchFlagCell
                              : <span className="cell-clamp">-</span>
                          ) : header === 'permission_count' ? (
                            <Badge className="border border-[var(--border)] bg-[var(--surface)]">
                              {permissionCount(row.id)}
                            </Badge>
                          ) : header === 'branch_id' && resource.key === 'products' ? (
                            <span className="cell-clamp">{branchLabelMap[String(row.branch_id)] || '-'}</span>
                          ) : header === 'merchant_role_id' && resource.key === 'users' ? (
                            <span className="cell-clamp">{formatValue(row.role_name || row.merchant_role_id)}</span>
                          ) : header === 'is_main' && resource.key === 'branches' ? (
                            <span className="cell-clamp">{row.is_main ? 'Yes' : 'No'}</span>
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
                          {!isClient && resource.key === 'merchants' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full justify-center whitespace-nowrap px-4"
                              onClick={() => navigate(`/merchant/users?merchant_id=${row.id}`)}
                            >
                              View Users
                            </Button>
                          )}
                          {canWrite && (
                            <>
                              {(resource.key === 'users' || resource.key === 'platform-admins' || resource.key === 'platform-clients') && row.email && (
                                <Button size="sm" variant="outline" onClick={() => handleSendResetPassword(row)}>
                                  Reset Password
                                </Button>
                              )}
                              {canUpdate && (
                                <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
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
                })}
                </>
              )}
            </TableBody>
          </Table>
          )}
        </div>
        {!isClient && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-ink)] sm:px-6">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
              <span>Page {visibleCurrentPage} / {visibleTotalPages}</span>
              <button
                type="button"
                className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={visibleCurrentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={visibleCurrentPage >= visibleTotalPages}
                onClick={() => setPage((prev) => Math.min(visibleTotalPages, prev + 1))}
              >
                Next
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
              <span>Rows</span>
              <select
                className="h-7 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-xs text-[var(--muted-ink)]"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>
        )}
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
              if (editRow && field.type === 'password') {
                return null;
              }
              if (!editRow && (field.key === 'status' || field.key === 'is_active') && field.defaultValue !== undefined) {
                return null;
              }
              if (resource.key === 'products' && field.key === 'is_active') {
                return null;
              }
              if (field.type === 'select' || field.ref) {
                let options = field.ref ? refOptions[field.key] || [] : field.options || [];
                if (resource.key === 'users' && field.key === 'branch_id') {
                  options = filteredUserBranchOptions;
                }
                if (resource.key === 'users' && field.key === 'merchant_role_id') {
                  options = filteredUserRoleOptions;
                }
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
                          {compactOptionLabel(option.label || option)}
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
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRolePermissions(rolePermissionOptions.map((option) => String(option.value)))}
                      >
                        All Permissions
                      </Button>
                    </div>
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
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saveLoading}>
              {saveLoading ? 'Saving...' : editRow ? 'Save' : 'Create'}
            </Button>
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



