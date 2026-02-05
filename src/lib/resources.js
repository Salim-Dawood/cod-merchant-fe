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
          options: ['active', 'inactive', 'suspended']
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
    }
  ],
  merchant: [
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
          options: ['pending', 'active', 'suspended', 'closed']
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
        { key: 'code', label: 'Code', type: 'text', required: true },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          options: ['hq', 'office', 'warehouse', 'factory', 'store', 'department']
        },
        { key: 'is_main', label: 'Main', type: 'boolean' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] }
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
          refLabel: 'name',
          required: true
        },
        {
          key: 'merchant_role_id',
          label: 'Merchant Role',
          type: 'select',
          ref: 'branch-roles',
          refLabel: 'name'
        },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'avatar_url', label: 'Photo URL', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blocked'] }
      ]
    },
    {
      key: 'permissions',
      title: 'Permissions',
      permissions: {
        read: 'view-permission',
        create: 'create-permission',
        update: 'update-permission',
        delete: 'delete-permission'
      },
      fields: [
        { key: 'key_name', label: 'Key', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'group_name', label: 'Group', type: 'text' }
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
        { key: 'moq', label: 'MOQ', type: 'number' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['draft', 'active', 'hidden', 'out_of_stock', 'archived']
        },
        { key: 'is_active', label: 'Active', type: 'boolean' },
        { key: 'created_by', label: 'Created By', type: 'number', readOnly: true },
        { key: 'created_at', label: 'Created At', type: 'text', readOnly: true },
        { key: 'updated_by', label: 'Updated By', type: 'number', readOnly: true },
        { key: 'updated_at', label: 'Updated At', type: 'text', readOnly: true }
      ]
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
        { key: 'is_active', label: 'Active', type: 'boolean' },
        { key: 'created_by', label: 'Created By', type: 'number', readOnly: true },
        { key: 'created_at', label: 'Created At', type: 'text', readOnly: true },
        { key: 'updated_by', label: 'Updated By', type: 'number', readOnly: true },
        { key: 'updated_at', label: 'Updated At', type: 'text', readOnly: true }
      ]
    }
  ]
};

export default resources;
