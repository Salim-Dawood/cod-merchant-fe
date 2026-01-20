const resources = {
  platform: [
    {
      key: 'platform-admins',
      title: 'Platform Admins',
      fields: [
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
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'is_system', label: 'System Role', type: 'boolean' }
      ]
    },
    {
      key: 'platform-permissions',
      title: 'Platform Permissions',
      fields: [
        { key: 'key_name', label: 'Key', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'group_name', label: 'Group', type: 'text' }
      ]
    },
    {
      key: 'platform-role-permissions',
      title: 'Platform Role Permissions',
      fields: [
        { key: 'platform_role_id', label: 'Role ID', type: 'number', required: true },
        { key: 'platform_permission_id', label: 'Permission ID', type: 'number', required: true }
      ]
    }
  ],
  merchant: [
    {
      key: 'merchants',
      title: 'Merchants',
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
      fields: [
        { key: 'merchant_id', label: 'Merchant ID', type: 'number', required: true },
        { key: 'parent_branch_id', label: 'Parent Branch ID', type: 'number' },
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
      fields: [
        { key: 'merchant_id', label: 'Merchant ID', type: 'number', required: true },
        { key: 'branch_id', label: 'Branch ID', type: 'number', required: true },
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
      fields: [
        { key: 'key_name', label: 'Key', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'group_name', label: 'Group', type: 'text' }
      ]
    },
    {
      key: 'branch-roles',
      title: 'Branch Roles',
      fields: [
        { key: 'branch_id', label: 'Branch ID', type: 'number', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'is_system', label: 'System Role', type: 'boolean' }
      ]
    },
    {
      key: 'branch-role-permissions',
      title: 'Branch Role Permissions',
      fields: [
        { key: 'branch_role_id', label: 'Role ID', type: 'number', required: true },
        { key: 'permission_id', label: 'Permission ID', type: 'number', required: true }
      ]
    }
  ]
};

export default resources;
