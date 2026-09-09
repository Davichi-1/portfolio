import type { MetadataRoute } from "next";
import { siteMeta } from "@/lib/profile";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteMeta.url}/sitemap.xml`,
  };
}
