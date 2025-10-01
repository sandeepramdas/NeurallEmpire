import { PrismaClient, UserRole, PlanType, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin Organization
  const superAdminOrg = await prisma.organization.upsert({
    where: { slug: 'neurallempire' },
    update: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      name: 'NeurallEmpire Admin',
      slug: 'neurallempire',
      domain: 'www.neurallempire.com',
      customDomain: 'www.neurallempire.com',
      customDomainVerified: true,
      planType: PlanType.ENTERPRISE,
      maxUsers: 1000,
      maxAgents: 10000,
      maxWorkflows: 10000,
    },
  });

  console.log('✅ Created Super Admin Organization:', superAdminOrg.id);

  // Create Super Admin User
  const superAdminPassword = await bcrypt.hash('NeurallEmpire2024!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@neurallempire.com' },
    update: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      email: 'admin@neurallempire.com',
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      organizationId: superAdminOrg.id,
      role: UserRole.OWNER,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      canCreateAgents: true,
      canManageWorkflows: true,
      canViewAnalytics: true,
    },
  });

  console.log('✅ Created Super Admin User:', superAdmin.email);

  // Create Regular Admin User
  const adminPassword = await bcrypt.hash('Admin2024!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'support@neurallempire.com' },
    update: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      email: 'support@neurallempire.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Support',
      organizationId: superAdminOrg.id,
      role: UserRole.ADMIN,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      canCreateAgents: true,
      canManageWorkflows: true,
      canViewAnalytics: true,
    },
  });

  console.log('✅ Created Admin User:', admin.email);

  // Create Demo Organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      name: 'Demo Company',
      slug: 'demo',
      planType: PlanType.GROWTH,
      maxUsers: 50,
      maxAgents: 100,
      maxWorkflows: 50,
    },
  });

  console.log('✅ Created Demo Organization:', demoOrg.id);

  // Create Demo User
  const demoPassword = await bcrypt.hash('Demo2024!', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@neurallempire.com' },
    update: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      email: 'demo@neurallempire.com',
      passwordHash: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      organizationId: demoOrg.id,
      role: UserRole.OWNER,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      canCreateAgents: true,
      canManageWorkflows: true,
      canViewAnalytics: true,
    },
  });

  console.log('✅ Created Demo User:', demoUser.email);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📋 Login Credentials:');
  console.log('━'.repeat(50));
  console.log('SUPER ADMIN:');
  console.log('  Email: admin@neurallempire.com');
  console.log('  Password: NeurallEmpire2024!');
  console.log('━'.repeat(50));
  console.log('ADMIN:');
  console.log('  Email: support@neurallempire.com');
  console.log('  Password: Admin2024!');
  console.log('━'.repeat(50));
  console.log('DEMO USER:');
  console.log('  Email: demo@neurallempire.com');
  console.log('  Password: Demo2024!');
  console.log('━'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
