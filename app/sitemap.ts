import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ykaycollege.com";
  const pages = [
    "",
    "/about",
    "/director",
    "/academics",
    "/admissions",
    "/campus-life",
    "/gallery",
    "/news-events",
    "/contact",
    "/portal",
    "/faq",
    "/testimonials",
    "/alumni",
    "/careers",
    "/privacy-policy",
  ];
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
}
