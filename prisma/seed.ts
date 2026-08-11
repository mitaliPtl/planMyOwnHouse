import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, RoleName } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Dimensions in feet (matches the plot unit examples in the spec and common Indian
// residential norms). Admin CRUD for these lands in Phase 8 — for now this seed is
// the only source, and the Requirements/Room Settings step reads it read-only.
const ROOM_TYPES = [
  { name: "Bedroom", slug: "bedroom", minWidth: 10, minLength: 10, defaultWidth: 12, defaultLength: 12, sortOrder: 10 },
  { name: "Master Bedroom", slug: "master-bedroom", minWidth: 12, minLength: 12, defaultWidth: 14, defaultLength: 14, sortOrder: 20 },
  { name: "Bathroom", slug: "bathroom", minWidth: 5, minLength: 7, defaultWidth: 6, defaultLength: 8, sortOrder: 30 },
  { name: "Kitchen", slug: "kitchen", minWidth: 8, minLength: 8, defaultWidth: 10, defaultLength: 10, sortOrder: 40 },
  { name: "Living Room", slug: "living-room", minWidth: 12, minLength: 14, defaultWidth: 15, defaultLength: 18, sortOrder: 50 },
  { name: "Dining Room", slug: "dining-room", minWidth: 10, minLength: 10, defaultWidth: 12, defaultLength: 12, sortOrder: 60 },
  { name: "Parking", slug: "parking", minWidth: 10, minLength: 18, defaultWidth: 12, defaultLength: 20, sortOrder: 70 },
  { name: "Wash Area", slug: "wash-area", minWidth: 4, minLength: 5, defaultWidth: 5, defaultLength: 6, sortOrder: 80 },
  { name: "Puja Room", slug: "puja-room", minWidth: 4, minLength: 4, defaultWidth: 5, defaultLength: 5, sortOrder: 90 },
  { name: "Balcony", slug: "balcony", minWidth: 4, minLength: 6, defaultWidth: 5, defaultLength: 8, sortOrder: 100 },
  { name: "Store Room", slug: "store-room", minWidth: 5, minLength: 5, defaultWidth: 6, defaultLength: 6, sortOrder: 110 },
  { name: "Utility", slug: "utility", minWidth: 5, minLength: 5, defaultWidth: 6, defaultLength: 6, sortOrder: 120 },
  { name: "Study", slug: "study", minWidth: 8, minLength: 8, defaultWidth: 10, defaultLength: 10, sortOrder: 130 },
  { name: "Guest Room", slug: "guest-room", minWidth: 10, minLength: 10, defaultWidth: 12, defaultLength: 12, sortOrder: 140 },
] as const;

async function main() {
  for (const name of [RoleName.SUPER_ADMIN, RoleName.CUSTOMER]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const roomType of ROOM_TYPES) {
    await prisma.roomType.upsert({
      where: { slug: roomType.slug },
      update: roomType,
      create: roomType,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
