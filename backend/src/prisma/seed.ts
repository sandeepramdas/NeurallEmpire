import { PrismaClient, UserRole, PlanType, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seed...');

  // Create Super Admin Organization
  const superAdminOrg = await prisma.organization.upsert({
    where: { slug: 'neurallempire' },
    update: {
      status: 'ACTIVE',
    },
    create: {
      name: 'NeurallEmpire Admin',
      slug: 'neurallempire',
      domain: 'www.neurallempire.com',
      customDomain: 'www.neurallempire.com',
      customDomainVerified: true,
      status: 'ACTIVE',
      planType: PlanType.ENTERPRISE,
      maxUsers: 1000,
      maxAgents: 10000,
      maxWorkflows: 10000,
    },
  });

  logger.info('✅ Created Super Admin Organization:', superAdminOrg.id);

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

  logger.info('✅ Created Super Admin User:', superAdmin.email);

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

  logger.info('✅ Created Admin User:', admin.email);

  // Create Demo Organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {
      status: 'ACTIVE',
    },
    create: {
      name: 'Demo Company',
      slug: 'demo',
      status: 'ACTIVE',
      planType: PlanType.GROWTH,
      maxUsers: 50,
      maxAgents: 100,
      maxWorkflows: 50,
    },
  });

  logger.info('✅ Created Demo Organization:', demoOrg.id);

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

  logger.info('✅ Created Demo User:', demoUser.email);

  logger.info('\n🎉 Database seeded successfully!\n');
  logger.info('📋 Login Credentials:');
  logger.info('━'.repeat(50));
  logger.info('SUPER ADMIN:');
  logger.info('  Email: admin@neurallempire.com');
  logger.info('  Password: NeurallEmpire2024!');
  logger.info('━'.repeat(50));
  logger.info('ADMIN:');
  logger.info('  Email: support@neurallempire.com');
  logger.info('  Password: Admin2024!');
  logger.info('━'.repeat(50));
  logger.info('DEMO USER:');
  logger.info('  Email: demo@neurallempire.com');
  logger.info('  Password: Demo2024!');
  logger.info('━'.repeat(50));
}

main()
  .catch((e) => {
    logger.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
