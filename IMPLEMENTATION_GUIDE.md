# 🏗️ **Multi-Company Accounting SaaS - Complete Implementation Guide**

## **📊 What We've Built**

This is a comprehensive transformation of NeurallEmpire into an enterprise-grade multi-company accounting SaaS platform with advanced RBAC, dynamic menus, and full accounting capabilities.

---

## **✅ Completed Components**

### **1. Enhanced Database Schema** (`schema-multicompany.prisma`)

**New Tables Added:**
- `Company` - Multi-company support within organizations
- `UserCompanyAccess` - Many-to-many relationship for users accessing multiple companies
- `Role` - Organization-level roles with granular permissions
- `Permission` - Master permission registry (module:action:resource)
- `MenuItem` - Dynamic menu system with permission filtering
- `UserPreference` - User preferences and default company settings
- **Accounting Tables:**
  - `Account` - Chart of Accounts with hierarchy
  - `Transaction` - Financial transactions with approval workflow
  - `JournalEntry` - Double-entry bookkeeping entries
  - `Customer` - Customer management
  - `Vendor` - Vendor management

**Key Features:**
- ✅ Multi-company support (users can access multiple companies)
- ✅ Role-Based Access Control (RBAC) with granular permissions
- ✅ Dynamic menu system
- ✅ Full accounting module (COA, transactions, journal entries)
- ✅ Audit trail tracking with company context
- ✅ Super admin capabilities

### **2. Seed Data Files**

**`permissions.seed.ts`** - 60+ permissions across modules:
- Company Management (create, read, update, delete, switch)
- User Management (create, read, update, delete, invite)
- Role Management (create, read, update, delete, assign)
- Accounting (accounts, transactions, customers, vendors, reports)
- Agents & Workflows
- Analytics & Reports
- Settings & Audit Logs

**`menus.seed.ts`** - Comprehensive menu structure:
- Dashboard
- Companies
- Accounting (Chart of Accounts, Transactions, Customers, Vendors, Reports)
- AI Agents
- Workflows
- Analytics
- Team Management
- Settings (Profile, Organization, Billing, API, Audit)

**8 Default Roles:**
1. **Owner** - Full access (Priority: 100)
2. **Admin** - Administrative access (Priority: 90)
3. **Accountant** - Full accounting access (Priority: 70)
4. **Manager** - Managerial + accounting read (Priority: 65)
5. **Bookkeeper** - Basic accounting (Priority: 60)
6. **Analyst** - Reports and analytics (Priority: 50)
7. **Member** - Basic member (Priority: 40, Default)
8. **Viewer** - Read-only access (Priority: 30)

---

## **🚀 Implementation Steps**

### **Phase 1: Database Migration**

```bash
cd backend

# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Replace schema
cp prisma/schema-multicompany.prisma prisma/schema.prisma

# 3. Generate Prisma client
npx prisma generate

# 4. Create migration
npx prisma migrate dev --name "multi_company_rbac_accounting"

# 5. Seed permissions and menus
npx tsx prisma/seeds/permissions.seed.ts
npx tsx prisma/seeds/menus.seed.ts
```

### **Phase 2: Backend Services** (TO BUILD)

Create these service files:

#### **1. RBAC Service** (`services/rbac.service.ts`)

```typescript
class RBACService {
  // Get user permissions for a company
  async getUserPermissions(userId: string, companyId: string): Promise<string[]>

  // Check if user has permission
  hasPermission(userPermissions: string[], required: string | string[]): boolean

  // Get user roles
  async getUserRoles(userId: string, companyId: string): Promise<Role[]>

  // Assign role to user
  async assignRole(userId: string, companyId: string, roleId: string): Promise<void>

  // Create custom role
  async createRole(organizationId: string, roleData: CreateRoleDTO): Promise<Role>
}
```

#### **2. Company Service** (`services/company.service.ts`)

```typescript
class CompanyService {
  // Create new company
  async createCompany(organizationId: string, data: CreateCompanyDTO): Promise<Company>

  // Get companies user has access to
  async getUserCompanies(userId: string): Promise<Company[]>

  // Grant user access to company
  async grantAccess(userId: string, companyId: string, roleId: string): Promise<void>

  // Get company details
  async getCompany(companyId: string): Promise<Company>

  // Update company
  async updateCompany(companyId: string, data: UpdateCompanyDTO): Promise<Company>

  // Switch user's active company
  async switchCompany(userId: string, companyId: string): Promise<{ token: string, company: Company }>
}
```

#### **3. Menu Service** (`services/menu.service.ts`)

```typescript
class MenuService {
  // Get user's accessible menus
  async getUserMenus(userId: string, companyId: string): Promise<MenuItem[]>

  // Filter menus by permissions
  filterMenusByPermissions(menus: MenuItem[], permissions: string[]): MenuItem[]

  // Filter menus by roles
  filterMenusByRoles(menus: MenuItem[], roles: string[]): MenuItem[]
}
```

#### **4. Accounting Services**

**`services/accounting/chart-of-accounts.service.ts`**
```typescript
class ChartOfAccountsService {
  async getAccounts(companyId: string): Promise<Account[]>
  async createAccount(companyId: string, data: CreateAccountDTO): Promise<Account>
  async updateAccount(accountId: string, data: UpdateAccountDTO): Promise<Account>
  async deleteAccount(accountId: string): Promise<void>
  async getAccountHierarchy(companyId: string): Promise<AccountTree>
}
```

**`services/accounting/transaction.service.ts`**
```typescript
class TransactionService {
  async createTransaction(companyId: string, data: CreateTransactionDTO): Promise<Transaction>
  async getTransactions(companyId: string, filters: TransactionFilters): Promise<Transaction[]>
  async approveTransaction(transactionId: string, userId: string): Promise<Transaction>
  async postTransaction(transactionId: string): Promise<Transaction>
  async reverseTransaction(transactionId: string, userId: string): Promise<Transaction>
}
```

### **Phase 3: Enhanced Middleware**

#### **1. RBAC Middleware** (`middleware/rbac.ts`)

```typescript
// Check if user has required permission
export const requirePermission = (permission: string | string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const permissions = await rbacService.getUserPermissions(
      req.user.id,
      req.companyId
    );

    if (!rbacService.hasPermission(permissions, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Check if user has required role
export const requireRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRoles = await rbacService.getUserRoles(req.user.id, req.companyId);
    const hasRole = userRoles.some(r => roles.includes(r.code));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient role' });
    }

    next();
  };
};
```

#### **2. Company Context Middleware** (`middleware/company-context.ts`)

```typescript
export const companyContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Extract company from header, query, or session
  const companyId = req.headers['x-company-id'] ||
                    req.query.companyId ||
                    req.session?.companyId;

  if (companyId) {
    // Verify user has access
    const hasAccess = await companyService.verifyAccess(req.user.id, companyId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'No access to this company' });
    }

    req.companyId = companyId;
    req.company = await companyService.getCompany(companyId);
  }

  next();
};
```

### **Phase 4: API Routes**

#### **Company Routes** (`routes/companies.ts`)

```typescript
router.get('/', authenticate, async (req, res) => {
  // Get all companies user has access to
  const companies = await companyService.getUserCompanies(req.user.id);
  res.json(companies);
});

router.post('/', authenticate, requirePermission('company:create:companies'), async (req, res) => {
  const company = await companyService.createCompany(req.user.organizationId, req.body);
  res.json(company);
});

router.post('/switch', authenticate, async (req, res) => {
  const { companyId } = req.body;
  const result = await companyService.switchCompany(req.user.id, companyId);
  res.json(result);
});

router.get('/:id', authenticate, requirePermission('company:read:companies'), async (req, res) => {
  const company = await companyService.getCompany(req.params.id);
  res.json(company);
});
```

#### **Accounting Routes** (`routes/accounting/*.ts`)

```typescript
// Chart of Accounts
router.get('/accounts', authenticate, companyContext, requirePermission('accounting:read:accounts'), async (req, res) => {
  const accounts = await chartOfAccountsService.getAccounts(req.companyId);
  res.json(accounts);
});

// Transactions
router.post('/transactions', authenticate, companyContext, requirePermission('accounting:create:transactions'), async (req, res) => {
  const transaction = await transactionService.createTransaction(req.companyId, req.body);
  res.json(transaction);
});

router.post('/transactions/:id/approve', authenticate, companyContext, requirePermission('accounting:approve:transactions'), async (req, res) => {
  const transaction = await transactionService.approveTransaction(req.params.id, req.user.id);
  res.json(transaction);
});
```

### **Phase 5: Frontend Components**

#### **1. AppContext Provider** (`contexts/AppContext.tsx`)

```typescript
interface AppContextType {
  currentCompany: Company | null;
  companies: Company[];
  permissions: string[];
  roles: Role[];
  menus: MenuItem[];
  switchCompany: (companyId: string) => Promise<void>;
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const AppProvider: React.FC = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);

  const switchCompany = async (companyId: string) => {
    const response = await api.post('/api/companies/switch', { companyId });

    setCurrentCompany(response.data.company);
    setPermissions(response.data.permissions);
    setRoles(response.data.roles);
    setMenus(response.data.menus);

    // Update axios headers
    axios.defaults.headers.common['X-Company-Id'] = companyId;

    // Store in localStorage
    localStorage.setItem('currentCompanyId', companyId);

    // Redirect to dashboard
    router.push('/dashboard');
  };

  const hasPermission = (permission: string | string[]) => {
    const required = Array.isArray(permission) ? permission : [permission];
    return required.every(p => permissions.includes(p));
  };

  const hasRole = (role: string | string[]) => {
    const required = Array.isArray(role) ? role : [role];
    return required.some(r => roles.some(userRole => userRole.code === r));
  };

  return (
    <AppContext.Provider value={{
      currentCompany,
      companies,
      permissions,
      roles,
      menus,
      switchCompany,
      hasPermission,
      hasRole,
    }}>
      {children}
    </AppContext.Provider>
  );
};
```

#### **2. Company Switcher Component** (`components/CompanySwitcher.tsx`)

```typescript
export const CompanySwitcher: React.FC = () => {
  const { currentCompany, companies, switchCompany } = useAppContext();

  return (
    <Listbox value={currentCompany} onChange={(company) => switchCompany(company.id)}>
      <Listbox.Button>
        <div className="flex items-center">
          <BuildingOfficeIcon className="w-5 h-5 mr-2" />
          <span>{currentCompany?.name || 'Select Company'}</span>
        </div>
      </Listbox.Button>

      <Listbox.Options>
        {companies.map((company) => (
          <Listbox.Option key={company.id} value={company}>
            {company.name}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
};
```

#### **3. Dynamic Menu Component** (`components/DynamicMenu.tsx`)

```typescript
export const DynamicMenu: React.FC = () => {
  const { menus, permissions, roles, hasPermission, hasRole } = useAppContext();

  const filterMenus = (items: MenuItem[]) => {
    return items.filter(item => {
      // Check permissions
      if (item.permissionsRequired.length > 0) {
        if (!hasPermission(item.permissionsRequired)) return false;
      }

      // Check roles
      if (item.rolesRequired.length > 0) {
        if (!hasRole(item.rolesRequired)) return false;
      }

      return item.isActive;
    });
  };

  const visibleMenus = filterMenus(menus);

  return (
    <nav className="space-y-1">
      {visibleMenus.map((item) => (
        <div key={item.id}>
          {item.isSeparator ? (
            <hr className="my-2" />
          ) : (
            <Link to={item.route} className="menu-item">
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge && (
                <Badge color={item.badgeColor}>{item.badge}</Badge>
              )}
            </Link>
          )}

          {item.children && item.children.length > 0 && (
            <div className="ml-4">
              {filterMenus(item.children).map((child) => (
                <Link key={child.id} to={child.route}>
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};
```

#### **4. Permission HOC** (`components/hoc/WithPermission.tsx`)

```typescript
export const withPermission = (permission: string | string[]) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    return (props: P) => {
      const { hasPermission } = useAppContext();

      if (!hasPermission(permission)) {
        return <AccessDenied />;
      }

      return <Component {...props} />;
    };
  };
};

// Usage
const ManageUsersPage = withPermission('users:update:users')(UsersPage);
```

#### **5. Permission Hook** (`hooks/usePermission.ts`)

```typescript
export const usePermission = (permission: string | string[]) => {
  const { hasPermission } = useAppContext();
  return hasPermission(permission);
};

// Usage in components
const canCreateTransaction = usePermission('accounting:create:transactions');

{canCreateTransaction && (
  <Button onClick={createTransaction}>Create Transaction</Button>
)}
```

---

## **📁 File Structure**

```
backend/
├── prisma/
│   ├── schema.prisma (replaced with schema-multicompany.prisma)
│   ├── schema-multicompany.prisma ✅ CREATED
│   └── seeds/
│       ├── permissions.seed.ts ✅ CREATED
│       └── menus.seed.ts ✅ CREATED
├── src/
│   ├── services/
│   │   ├── rbac.service.ts (TO CREATE)
│   │   ├── company.service.ts (TO CREATE)
│   │   ├── menu.service.ts (TO CREATE)
│   │   └── accounting/
│   │       ├── chart-of-accounts.service.ts (TO CREATE)
│   │       ├── transaction.service.ts (TO CREATE)
│   │       ├── customer.service.ts (TO CREATE)
│   │       └── vendor.service.ts (TO CREATE)
│   ├── middleware/
│   │   ├── rbac.ts (TO CREATE)
│   │   └── company-context.ts (TO CREATE)
│   ├── routes/
│   │   ├── companies.ts (TO CREATE)
│   │   ├── roles.ts (TO CREATE)
│   │   └── accounting/
│   │       ├── accounts.ts (TO CREATE)
│   │       ├── transactions.ts (TO CREATE)
│   │       ├── customers.ts (TO CREATE)
│   │       └── vendors.ts (TO CREATE)
│   └── types/
│       ├── company.types.ts (TO CREATE)
│       └── accounting.types.ts (TO CREATE)

frontend/
├── src/
│   ├── contexts/
│   │   └── AppContext.tsx (TO CREATE)
│   ├── components/
│   │   ├── CompanySwitcher.tsx (TO CREATE)
│   │   ├── DynamicMenu.tsx (TO CREATE)
│   │   ├── hoc/
│   │   │   └── WithPermission.tsx (TO CREATE)
│   │   └── accounting/
│   │       ├── ChartOfAccounts.tsx (TO CREATE)
│   │       ├── TransactionForm.tsx (TO CREATE)
│   │       └── JournalEntries.tsx (TO CREATE)
│   ├── hooks/
│   │   ├── usePermission.ts (TO CREATE)
│   │   ├── useRole.ts (TO CREATE)
│   │   └── useCompany.ts (TO CREATE)
│   └── pages/
│       ├── companies/ (TO CREATE)
│       ├── accounting/ (TO CREATE)
│       └── team/ (TO CREATE)
```

---

## **🧪 Testing Checklist**

### **Backend Tests**
- [ ] RBAC Service - Permission checking
- [ ] Company Service - Multi-company access
- [ ] Menu Service - Permission filtering
- [ ] Accounting Services - Transaction creation, approval, posting
- [ ] Middleware - Company context, RBAC enforcement

### **Frontend Tests**
- [ ] AppContext - Company switching
- [ ] Permission hooks - Access control
- [ ] Dynamic menus - Rendering based on permissions
- [ ] Company switcher - UI/UX flow
- [ ] Accounting forms - Data validation

### **Integration Tests**
- [ ] User can access multiple companies
- [ ] Permissions properly restrict actions
- [ ] Menus dynamically update based on role
- [ ] Company switching updates context
- [ ] Accounting workflows (create → approve → post)

---

## **🔐 Security Considerations**

1. **Row-Level Security**: All database queries MUST filter by `companyId`
2. **Permission Validation**: Both frontend AND backend must validate permissions
3. **Audit Logging**: All company switches and accounting actions must be logged
4. **Company Context**: Always verify user has access to requested company
5. **Role Hierarchy**: Higher priority roles inherit lower role permissions

---

## **📈 Next Steps (Priority Order)**

1. **Immediate** (Week 1):
   - Run database migration
   - Seed permissions and menus
   - Create RBAC service
   - Create Company service

2. **High Priority** (Week 2):
   - Build company management UI
   - Implement company switcher
   - Create dynamic menu system
   - Build RBAC middleware

3. **Medium Priority** (Week 3):
   - Build accounting services (COA, transactions)
   - Create accounting UI components
   - Implement approval workflows

4. **Enhancement** (Week 4):
   - Advanced reporting
   - Super admin dashboard
   - Audit log viewer
   - Performance optimization

---

## **💡 Key Decisions Made**

1. **Multi-company at Organization Level**: Each organization can have multiple companies
2. **Separate User-Company Access**: Users can access multiple companies with different roles
3. **Permission Code Format**: `module:action:resource` (e.g., `accounting:create:transactions`)
4. **Role Hierarchy**: Priority-based system for role inheritance
5. **Dynamic Menus**: Stored in database, filtered by permissions in real-time
6. **Accounting Method**: Support both Accrual and Cash basis
7. **Transaction Workflow**: Draft → Pending Approval → Approved → Posted
8. **Double-Entry**: Enforced at journal entry level

---

**Ready to build the next phase? Let me know which component to tackle first!** 🚀
