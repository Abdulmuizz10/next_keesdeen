import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || "https://keesdeen.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/account/",
          "/checkout",
          "/order-confirmation",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
