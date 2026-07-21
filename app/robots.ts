import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/teacher/", "/student/", "/parent/"] },
    ],
    sitemap: "https://ykaycollege.com/sitemap.xml",
    host: "https://ykaycollege.com",
  };
}
