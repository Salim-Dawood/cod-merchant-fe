const resources = {
  platform: [
    {
      key: 'platform-admins',
      title: 'Platform Admins',
      permissions: {
        read: 'view-platform-admin',
        create: 'create-platform-admin',
        update: 'update-platform-admin',
        delete: 'delete-platform-admin'
      },
      fields: [
        {
          key: 'platform_role_id',
          label: 'Platform Role',
          type: 'select',
          ref: 'platform-roles',
          refLabel: 'name',
          required: true
        },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'avatar_url', label: 'Photo URL', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['active', 'inactive', 'suspended'],
          defaultValue: 'active'
        }
      ]
    },
    {
      key: 'platform-roles',
      title: 'Platform Roles',
      permissions: {
        read: 'view-platform-role',
        create: 'create-platform-role',
        update: 'update-platform-role',
        delete: 'delete-platform-role'
      },
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'is_system', label: 'System Role', type: 'boolean' }
      ]
    },
    {
      key: 'platform-client-roles',
      title: 'Platform Client Roles',
      permissions: {
        read: 'view-platform-client-role',
        create: 'create-platform-client-role',
        update: 'update-platform-client-role',
        delete: 'delete-platform-client-role'
      },
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'is_active', label: 'Active', type: 'boolean', defaultValue: true }
      ]
    },
    {
      key: 'platform-clients',
      title: 'Platform Clients',
      permissions: {
        read: 'view-platform-client',
        create: 'create-platform-client',
        update: 'update-platform-client',
        delete: 'delete-platform-client'
      },
      fields: [
        {
          key: 'platform_client_role_id',
          label: 'Client Role',
          type: 'select',
          ref: 'platform-client-roles',
          refLabel: 'name'
        },
        { key: 'first_name', label: 'First Name', type: 'text', required: true },
        { key: 'last_name', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blocked'], defaultValue: 'active' },
        { key: 'is_active', label: 'Active', type: 'boolean', defaultValue: true }
      ]
    }
  ],
  merchant: [
    {
      key: 'dashboard',
      title: 'Dashboard',
      permissions: {
        read: 'view-merchant'
      },
      fields: []
    },
    {
      key: 'merchants',
      title: 'Merchants',
      permissions: {
        read: 'view-merchant',
        create: 'create-merchant',
        update: 'update-merchant',
        delete: 'delete-merchant'
      },
      fields: [
        { key: 'merchant_code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'legal_name', label: 'Legal Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'address', label: 'Address', type: 'text' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['active', 'pending', 'suspended', 'closed'],
          defaultValue: 'active'
        }
      ]
    },
    {
      key: 'branches',
      title: 'Branches',
      permissions: {
        read: 'view-branch',
        create: 'create-branch',
        update: 'update-branch',
        delete: 'delete-branch'
      },
      fields: [
        {
          key: 'merchant_id',
          label: 'Merchant',
          type: 'select',
          ref: 'merchants',
          refLabel: 'name',
          required: true
        },
        {
          key: 'parent_branch_id',
          label: 'Parent Branch',
          type: 'select',
          ref: 'branches',
          refLabel: 'name'
        },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'flag_url', label: 'Flag', type: 'text' },
        { key: 'code', label: 'Code', type: 'text', required: true },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          options: ['hq', 'office', 'warehouse', 'factory', 'store', 'department']
        },
        { key: 'is_main', label: 'Main', type: 'boolean' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
      ]
    },
    {
      key: 'users',
      title: 'Users',
      permissions: {
        read: 'view-user',
        create: 'create-user',
        update: 'update-user',
        delete: 'delete-user'
      },
      fields: [
        {
          key: 'merchant_id',
          label: 'Merchant',
          type: 'select',
          ref: 'merchants',
          refLabel: 'name',
          required: true
        },
        {
          key: 'branch_id',
          label: 'Branch',
          type: 'select',
          ref: 'branches',
          refLabel: 'name'
        },
        {
          key: 'merchant_role_id',
          label: 'Role',
          type: 'select',
          ref: 'branch-roles',
          refLabel: 'name',
          required: true
        },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'avatar_url', label: 'Photo URL', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blocked'], defaultValue: 'active' }
      ]
    },
    {
      key: 'branch-roles',
      title: 'Branch Roles',
      permissions: {
        read: 'view-branch-role',
        create: 'create-branch-role',
        update: 'update-branch-role',
        delete: 'delete-branch-role'
      },
      fields: [
        {
          key: 'branch_id',
          label: 'Branch',
          type: 'select',
          ref: 'branches',
          refLabel: 'name',
          required: true
        },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'is_system', label: 'System Role', type: 'boolean' }
      ]
    },
    {
      key: 'products',
      title: 'Products',
      permissions: {
        read: 'view-product',
        create: 'create-product',
        update: 'update-product',
        delete: 'delete-product'
      },
      fields: [
        {
          key: 'branch_id',
          label: 'Branch',
          type: 'select',
          ref: 'branches',
          refLabel: 'name',
          required: true
        },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'slug', label: 'Slug', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'provider_name', label: 'Provider / Supplier', type: 'text' },
        { key: 'base_price', label: 'Price', type: 'number', required: true },
        { key: 'moq', label: 'MOQ', type: 'number' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['active', 'draft', 'hidden', 'out_of_stock', 'archived'],
          defaultValue: 'active'
        },
        { key: 'is_active', label: 'Active', type: 'boolean', defaultValue: true },
        { key: 'created_by', label: 'Created By', type: 'number', readOnly: true },
        { key: 'created_at', label: 'Created At', type: 'text', readOnly: true },
        { key: 'updated_by', label: 'Updated By', type: 'number', readOnly: true },
        { key: 'updated_at', label: 'Updated At', type: 'text', readOnly: true }
      ]
    },
    {
      key: 'cart',
      title: 'Cart',
      permissions: {
        read: 'view-product'
      },
      fields: []
    },
    {
      key: 'checkout',
      title: 'Checkout',
      permissions: {
        read: 'view-product'
      },
      fields: []
    },
    {
      key: 'categories',
      title: 'Categories',
      permissions: {
        read: 'view-category',
        create: 'create-category',
        update: 'update-category',
        delete: 'delete-category'
      },
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'slug', label: 'Slug', type: 'text', required: true },
        { key: 'is_active', label: 'Active', type: 'boolean', defaultValue: true },
        { key: 'created_by', label: 'Created By', type: 'number', readOnly: true },
        { key: 'created_at', label: 'Created At', type: 'text', readOnly: true },
        { key: 'updated_by', label: 'Updated By', type: 'number', readOnly: true },
        { key: 'updated_at', label: 'Updated At', type: 'text', readOnly: true }
      ]
    }
  ]
};

export default resources;
