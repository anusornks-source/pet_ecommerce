import { cache } from "react";
import { prisma } from "./prisma";

const DEFAULT_SETTINGS = {
  id: "default",
  storeName: "CartNova",
  logoUrl: null as string | null,
  adminEmail: null as string | null,
  updatedAt: new Date(),
};

export const getSettings = cache(async () => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", storeName: "CartNova" },
      update: {},
    });
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
});
