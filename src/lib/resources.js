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
          refLabel: 'name'
        },
        { key: 'first_name', label: 'First Name', type: 'text', required: true },
        { key: 'last_name', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['active', 'inactive', 'suspended']
        },
        { key: 'last_login_at', label: 'Last Login At', type: 'datetime-local' }
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
      key: 'platform-permissions',
      title: 'Platform Permissions',
      permissions: {
        read: 'view-platform-permission',
        create: 'create-platform-permission',
        update: 'update-platform-permission',
        delete: 'delete-platform-permission'
      },
      fields: [
        { key: 'key_name', label: 'Key', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'group_name', label: 'Group', type: 'text' }
      ]
    },
    {
      key: 'platform-role-permissions',
      title: 'Platform Role Permissions',
      permissions: {
        read: 'view-platform-role-permission',
        create: 'create-platform-role-permission',
        update: 'update-platform-role-permission',
        delete: 'delete-platform-role-permission'
      },
      fields: [
        {
          key: 'platform_role_id',
          label: 'Role',
          type: 'select',
          ref: 'platform-roles',
          refLabel: 'name',
          required: true
        },
        {
          key: 'platform_permission_id',
          label: 'Permission',
          type: 'select',
          ref: 'platform-permissions',
          refLabel: 'key_name',
          required: true
        }
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
        { key: 'first_name', label: 'First Name', type: 'text', required: true },
        { key: 'last_name', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blocked'] },
        { key: 'last_login_at', label: 'Last Login At', type: 'datetime-local' }
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
      key: 'branch-role-permissions',
      title: 'Branch Role Permissions',
      permissions: {
        read: 'view-branch-role-permission',
        create: 'create-branch-role-permission',
        update: 'update-branch-role-permission',
        delete: 'delete-branch-role-permission'
      },
      fields: [
        {
          key: 'branch_role_id',
          label: 'Role',
          type: 'select',
          ref: 'branch-roles',
          refLabel: 'name',
          required: true
        },
        {
          key: 'permission_id',
          label: 'Permission',
          type: 'select',
          ref: 'permissions',
          refLabel: 'key_name',
          required: true
        }
      ]
    }
  ]
};

export default resources;
