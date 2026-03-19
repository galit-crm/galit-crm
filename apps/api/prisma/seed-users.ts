import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus, ProjectStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    {
      email: 'admin@galit.local',
      name: 'Admin',
      role: UserRole.ADMIN,
    },
    {
      email: 'billing@galit.local',
      name: 'Billing',
      role: UserRole.BILLING,
    },
    {
      email: 'technician@galit.local',
      name: 'Technician',
      role: UserRole.TECHNICIAN,
    },
    {
      email: 'sales@galit.local',
      name: 'Sales',
      role: UserRole.SALES,
    },
    {
      email: 'manager@galit.local',
      name: 'Manager',
      role: UserRole.MANAGER,
    },
    {
      email: 'expert@galit.local',
      name: 'Expert',
      role: UserRole.EXPERT,
    },
  ] as const;

  const password = '1234';

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: password,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash: password,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  const tech = await prisma.user.findFirst({ where: { role: UserRole.TECHNICIAN } });
  const projects = [
    { id: 'P-3001', name: 'בדיקת קרינה - אתר עזריאלי', client: 'אפקון', status: ProjectStatus.SCHEDULED, progress: 72, city: 'תל אביב', dueDate: new Date('2026-03-17'), siteVisitDate: new Date('2026-03-17'), siteVisitTime: '09:00', assignedTechnicianId: tech?.id ?? null },
    { id: 'P-3002', name: 'בדיקת אקוסטיקה - מגדל חיפה', client: 'שיכון ובינוי', status: ProjectStatus.ON_THE_WAY, progress: 35, city: 'חיפה', dueDate: new Date('2026-03-22'), siteVisitDate: new Date('2026-03-22'), siteVisitTime: '10:30', assignedTechnicianId: tech?.id ?? null },
    { id: 'P-3003', name: 'בדיקת ראדון - בית פרטי', client: 'שרה לוי', status: ProjectStatus.SCHEDULED, progress: 10, city: 'רעננה', dueDate: new Date('2026-03-28'), siteVisitDate: new Date('2026-03-28'), siteVisitTime: '14:00', assignedTechnicianId: null },
  ];
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { name: p.name, client: p.client, status: p.status, progress: p.progress, city: p.city, dueDate: p.dueDate, siteVisitDate: p.siteVisitDate, siteVisitTime: p.siteVisitTime, assignedTechnicianId: p.assignedTechnicianId },
      create: p,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });