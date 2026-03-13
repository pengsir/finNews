import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createUnavailablePrismaClient(reason: string) {
  const throwUnavailable = () => {
    throw new Error(reason);
  };

  return new Proxy({} as PrismaClient, {
    get() {
      return throwUnavailable;
    }
  });
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return createUnavailablePrismaClient(
      "DATABASE_URL is required to create PrismaClient."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
