import "server-only";

import { prisma } from "@/lib/prisma";
import type { ProjectStatus, Project, Prisma } from "@/generated/prisma/client";
import type { CreateProjectInput, UpdateProjectInput } from "@/validators/project.validators";

function normalizeOptionalFields<T extends Record<string, unknown>>(input: T) {
  const result: Record<string, unknown> = { ...input };
  for (const key of Object.keys(result)) {
    if (result[key] === "") result[key] = null;
  }
  return result;
}

export const projectRepository = {
  // Every read/write here is scoped by customerId — ownership is enforced at the
  // data-access layer, not left to callers to remember. A project id that exists but
  // belongs to someone else resolves to `null`, identically to a nonexistent id.
  findManyByCustomer(customerId: string, search?: string) {
    return prisma.project.findMany({
      where: {
        customerId,
        status: { not: "ARCHIVED" },
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  findByIdForCustomer(customerId: string, id: string) {
    return prisma.project.findFirst({ where: { id, customerId } });
  },

  countByCustomer(customerId: string) {
    return prisma.project.count({ where: { customerId, status: { not: "ARCHIVED" } } });
  },

  create(customerId: string, input: CreateProjectInput) {
    return prisma.project.create({
      data: {
        ...(normalizeOptionalFields(input) as Prisma.ProjectUncheckedCreateInput),
        customerId,
      },
    });
  },

  async update(customerId: string, id: string, input: UpdateProjectInput) {
    const { count } = await prisma.project.updateMany({
      where: { id, customerId },
      data: normalizeOptionalFields(input) as Prisma.ProjectUpdateManyMutationInput,
    });
    if (count === 0) return null;
    return prisma.project.findFirst({ where: { id, customerId } });
  },

  async updateStatus(customerId: string, id: string, status: ProjectStatus) {
    const { count } = await prisma.project.updateMany({
      where: { id, customerId },
      data: { status },
    });
    return count > 0;
  },

  async delete(customerId: string, id: string) {
    const { count } = await prisma.project.deleteMany({ where: { id, customerId } });
    return count > 0;
  },

  duplicate(customerId: string, source: Project) {
    return prisma.project.create({
      data: {
        customerId,
        name: `${source.name} (Copy)`,
        description: source.description,
        location: source.location,
        state: source.state,
        city: source.city,
        country: source.country,
        address: source.address,
        notes: source.notes,
        status: "DRAFT",
      },
    });
  },
};
