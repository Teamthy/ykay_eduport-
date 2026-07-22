import { prisma } from "@/lib/prisma";

const schoolSlug = process.env.SCHOOL_SLUG || "ykay-college";

export async function getSchool() {
  return prisma.school.upsert({
    where: { slug: schoolSlug },
    update: {},
    create: {
      slug: schoolSlug,
      name: process.env.SCHOOL_NAME || "Ykay College & Leadership Academy",
      address: process.env.SCHOOL_ADDRESS || "Sango Ota, Ogun State, Nigeria",
      phone: process.env.SCHOOL_PHONE || "+2347015374411",
      email: process.env.SCHOOL_EMAIL || "info@ykaycollege.com",
      motto: process.env.SCHOOL_MOTTO || "Excellence in Education",
    },
  });
}
