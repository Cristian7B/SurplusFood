import { PrismaClient, Role, SurplusStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // 1. Clean existing database
  console.log('🧹 Cleaning existing data...');
  await prisma.surplus.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash common password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 3. Create Users
  console.log('👤 Creating users...');
  
  // Donors
  const donor1 = await prisma.user.create({
    data: {
      email: 'donor1@foodbridge.com',
      password: passwordHash,
      name: 'Restaurante Central UD',
      role: Role.DONOR,
      latitude: 4.6355,
      longitude: -74.0700,
    },
  });

  const donor2 = await prisma.user.create({
    data: {
      email: 'donor2@foodbridge.com',
      password: passwordHash,
      name: 'Panadería La Estación',
      role: Role.DONOR,
      latitude: 4.6380,
      longitude: -74.0680,
    },
  });

  // Beneficiaries
  const beneficiary1 = await prisma.user.create({
    data: {
      email: 'beneficiary1@foodbridge.com',
      password: passwordHash,
      name: 'Carlos Estudiante',
      role: Role.BENEFICIARY,
      latitude: 4.6340,
      longitude: -74.0715,
      reliabilityScore: 0.95,
      noShowCount: 0,
    },
  });

  // const beneficiary2 = await prisma.user.create({
  //   data: {
  //     email: 'beneficiary2@foodbridge.com',
  //     password: passwordHash,
  //     name: 'María Vecina',
  //     role: Role.BENEFICIARY,
  //     latitude: 4.6320,
  //     longitude: -74.0750,
  //     reliabilityScore: 0.8,
  //     noShowCount: 1,
  //   },
  // });

  // // Charity (Verified)
  // const charity1 = await prisma.user.create({
  //   data: {
  //     email: 'charity1@foodbridge.com',
  //     password: passwordHash,
  //     name: 'Comedor Comunitario San José',
  //     role: Role.CHARITY,
  //     latitude: 4.6360,
  //     longitude: -74.0650,
  //     isVerifiedCharity: true,
  //     reliabilityScore: 1.0,
  //     noShowCount: 0,
  //   },
  // });

  // // Admin
  // await prisma.user.create({
  //   data: {
  //     email: 'admin@foodbridge.com',
  //     password: passwordHash,
  //     name: 'Administrador FoodBridge',
  //     role: Role.ADMIN,
  //     latitude: 4.6351,
  //     longitude: -74.0703,
  //   },
  // });

  // console.log(`✅ Created 6 users.`);

  console.log(`✅ Created 3 users.`);
  // 4. Create Surplus Posts
  console.log('🍕 Creating surplus items...');

  const now = new Date();

  // Surplus 1: 12.5 kg of cooked food (Big batch, should prioritize Charity if matched)
  const surplus1 = await prisma.surplus.create({
    data: {
      title: 'Almuerzos gourmet del día',
      description: 'Porciones de arroz con pollo y ensalada fresca empacadas al vacío.',
      quantityKg: 12.5,
      quantityUnits: 15,
      foodType: 'cooked',
      pickupStartAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 mins from now
      pickupEndAt: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
      expirationAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
      status: SurplusStatus.PUBLISHED,
      donorId: donor1.id,
      latitude: 4.6355,
      longitude: -74.0700,
    },
  });

  // Surplus 2: 5.0 kg of bakery items (Small batch, will rank based on distance/reliability)
  const surplus2 = await prisma.surplus.create({
    data: {
      title: 'Pan integral y cruasanes',
      description: 'Bolsas de pan horneado esta mañana en perfecto estado.',
      quantityKg: 5.0,
      quantityUnits: 25,
      foodType: 'bakery',
      pickupStartAt: now,
      pickupEndAt: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now
      expirationAt: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours from now
      status: SurplusStatus.PUBLISHED,
      donorId: donor2.id,
      latitude: 4.6380,
      longitude: -74.0680,
    },
  });

  // Surplus 3: 15.0 kg of produce (Large batch)
  const surplus3 = await prisma.surplus.create({
    data: {
      title: 'Cajas de manzanas y naranjas',
      description: 'Fruta fresca que no se vendió, ideal para jugos o consumo inmediato.',
      quantityKg: 15.0,
      quantityUnits: null,
      foodType: 'produce',
      pickupStartAt: now,
      pickupEndAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours from now
      expirationAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
      status: SurplusStatus.PUBLISHED,
      donorId: donor1.id,
      latitude: 4.6355,
      longitude: -74.0700,
    },
  });

  console.log(`✅ Created 3 surplus items.`);

  // 5. Update PostGIS geography columns
  console.log('🗺️ Updating PostGIS geography columns...');
  const surplusItems = [surplus1, surplus2, surplus3];
  
  for (const item of surplusItems) {
    await prisma.$executeRaw`
      UPDATE "Surplus"
      SET location = ST_SetSRID(ST_MakePoint(${item.longitude}, ${item.latitude}), 4326)::geography
      WHERE id = ${item.id}
    `;
  }

  console.log('✅ Geography columns successfully updated with PostGIS points!');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
