import dbConnect from "@/lib/db";
import { getSiteConfig } from "@/lib/models/SiteConfig";
import { ContactPageClient } from "@/app/(storefront)/contact/ContactPageClient";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  await dbConnect();

  const config = await getSiteConfig();

  const address = config.address
    ? {
        street: config.address.street ?? "",
        city: config.address.city ?? "",
        state: config.address.state ?? "",
        postalCode: config.address.postalCode ?? "",
        country: config.address.country ?? "",
      }
    : undefined;

  const socialLinks = Array.isArray(config.socialLinks)
    ? config.socialLinks.map((social) => ({
        platform: social.platform,
        url: social.url,
      }))
    : [];

  return (
    <ContactPageClient
      contactEmail={config.contactEmail ?? "hello@keesdeen.com"}
      contactPhone={config.contactPhone ?? undefined}
      address={address}
      socialLinks={socialLinks}
    />
  );
}
