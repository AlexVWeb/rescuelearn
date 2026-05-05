import { prisma } from "../src/lib/prisma";

async function migrate() {
  console.log("🚀 Starting migration to organizations...");

  // 1. Update Organismes with slugs
  const organismes = await prisma.organisme.findMany();
  for (const org of organismes) {
    if (!org.slug) {
      let slug = org.name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with -
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing -

      // Ensure unique slug
      let uniqueSlug = slug;
      let counter = 1;
      while (
        await prisma.organisme.findUnique({ where: { slug: uniqueSlug } })
      ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      await prisma.organisme.update({
        where: { id: org.id },
        data: { slug: uniqueSlug },
      });
      console.log(`✅ Updated slug for ${org.name}: ${uniqueSlug}`);
    }
  }

  // 2. Create Member records for each User
  const users = await prisma.user.findMany({
    where: {
      organismeId: { not: null },
    },
  });

  for (const user of users) {
    if (user.organismeId) {
      // Check if already a member
      const existingMember = await prisma.member.findFirst({
        where: {
          organizationId: user.organismeId,
          userId: user.id,
        },
      });

      if (!existingMember) {
        // Determine role for better-auth organization
        // Map current roles to organization roles
        let role = "member";
        try {
          const roles =
            typeof user.roles === "string"
              ? JSON.parse(user.roles)
              : user.roles;
          if (Array.isArray(roles)) {
            if (
              roles.includes("ADMIN_ORGANISME") ||
              roles.includes("SUPER_ADMIN")
            ) {
              role = "admin";
            }
          }
        } catch (e) {
          console.error(`Error parsing roles for ${user.email}:`, e);
        }

        await prisma.member.create({
          data: {
            organizationId: user.organismeId,
            userId: user.id,
            role,
          },
        });
        console.log(
          `✅ Created membership for ${user.email} in org ${user.organismeId} as ${role}`
        );
      }
    }
  }

  console.log("🏁 Migration finished!");
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
