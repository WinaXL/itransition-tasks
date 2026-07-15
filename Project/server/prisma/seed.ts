import { PrismaClient, AttributeType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Personal Information",
  "Certification",
  "Domain Knowledge",
  "Soft Skills",
  "Technical Skills",
  "Languages",
];

// Built-in "Me" attributes: always exist, cannot be deleted.
const BUILT_IN: { name: string; type: AttributeType; description: string }[] = [
  { name: "First Name", type: "STRING", description: "Given name" },
  { name: "Last Name", type: "STRING", description: "Family name" },
  { name: "Location", type: "STRING", description: "City, Country" },
  { name: "Personal Photo", type: "IMAGE", description: "Profile photo" },
];

const LIBRARY: { name: string; type: AttributeType; category: string; description: string; options?: string[] }[] = [
  { name: "English Level", type: "SELECT", category: "Languages", description: "CEFR level", options: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  { name: "IELTS Score", type: "NUMERIC", category: "Languages", description: "IELTS band score (0-9)" },
  { name: "GPA", type: "NUMERIC", category: "Personal Information", description: "Grade point average" },
  { name: "Remote Work Availability", type: "BOOLEAN", category: "Personal Information", description: "Available for remote work" },
  { name: "Presentation Skills", type: "SELECT", category: "Soft Skills", description: "Self-assessed level", options: ["Basic", "Intermediate", "Advanced"] },
  { name: "About Me", type: "TEXT", category: "Personal Information", description: "Short bio, Markdown supported" },
  { name: "CAP", type: "SELECT", category: "Certification", description: "Certified Analytics Professional level", options: ["None", "Essentials", "Pro", "Expert"] },
  { name: "Python", type: "BOOLEAN", category: "Technical Skills", description: "Knows Python" },
  { name: "Apache Hadoop", type: "BOOLEAN", category: "Technical Skills", description: "Knows Hadoop" },
  { name: "Available From", type: "DATE", category: "Personal Information", description: "Earliest start date" },
  { name: "Last Employment", type: "PERIOD", category: "Personal Information", description: "Most recent employment period" },
];

async function main() {
  for (const name of CATEGORIES) {
    await prisma.attributeCategory.upsert({ where: { name }, update: {}, create: { name } });
  }
  const cats = await prisma.attributeCategory.findMany();
  const catId = (name: string) => cats.find((c) => c.name === name)!.id;

  for (const a of BUILT_IN) {
    await prisma.attribute.upsert({
      where: { name: a.name },
      update: {},
      create: { ...a, builtIn: true, categoryId: catId("Personal Information") },
    });
  }
  for (const a of LIBRARY) {
    const { category, options, ...rest } = a;
    await prisma.attribute.upsert({
      where: { name: a.name },
      update: {},
      create: { ...rest, options: options ?? [], categoryId: catId(category) },
    });
  }

  const password = await bcrypt.hash("Passw0rd!", 10);
  const users: { email: string; name: string; role: Role }[] = [
    { email: "admin@example.com", name: "Ada Admin", role: "ADMIN" },
    { email: "recruiter@example.com", name: "Rita Recruiter", role: "RECRUITER" },
    { email: "candidate@example.com", name: "Carl Candidate", role: "CANDIDATE" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }

  console.log("Seed complete. Demo logins (password: Passw0rd!):");
  users.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
}

main().finally(() => prisma.$disconnect());
