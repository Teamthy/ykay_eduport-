import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/teacher/", "/student/", "/parent/"],
      },
    ],
    // Was ykaycollege.com. Pointing robots.txt and the sitemap at a domain you
    // do not control tells search engines to index someone else's site.
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ykaycollege.edu.ng"}/sitemap.xml`,
    host: process.env.NEXT_PUBLIC_SITE_URL || "https://ykaycollege.edu.ng",
  };
}
