import type { SiteContent } from "@/lib/types";
import { l10n } from "@/lib/utils";
import type { FieldDef } from "./schema-editor";

type T = (key: string) => string;
const e = () => l10n();

export type PageKey = keyof SiteContent;

export interface PageSchema {
  key: PageKey;
  viewHref: string;
  icon: string;
  fields: FieldDef[];
}

/** Declarative CMS definitions — one per legacy admin “Kompass Website” form. */
export function pageSchemas(t: T): PageSchema[] {
  const f = (k: string) => t(`fields.${k}`);
  const step = (): FieldDef[] => [
    { type: "icon", key: "icon", label: f("icon") },
    { type: "text", key: "title", label: f("title") },
    { type: "textarea", key: "description", label: f("description"), rows: 2 },
  ];
  return [
    {
      key: "general",
      viewHref: "/contact",
      icon: "MapPin",
      fields: [
        { type: "plain", key: "phone", label: f("phone"), ltr: true },
        { type: "plain", key: "email", label: f("email"), ltr: true },
        { type: "text", key: "address", label: f("address") },
        { type: "text", key: "hours", label: f("hours") },
        { type: "textarea", key: "footerAbout", label: f("footerAbout") },
        {
          type: "group",
          key: "socials",
          label: "Social",
          fields: [
            { type: "plain", key: "facebook", label: f("facebook"), ltr: true },
            { type: "plain", key: "instagram", label: f("instagram"), ltr: true },
            { type: "plain", key: "linkedin", label: f("linkedin"), ltr: true },
            { type: "plain", key: "youtube", label: f("youtube"), ltr: true },
          ],
        },
      ],
    },
    {
      key: "home",
      viewHref: "/",
      icon: "House",
      fields: [
        { type: "text", key: "heroEyebrow", label: f("heroEyebrow") },
        { type: "text", key: "heroTitle", label: f("heroTitle") },
        { type: "textarea", key: "heroDescription", label: f("heroDescription") },
        { type: "text", key: "heroCta", label: f("heroCta") },
        { type: "image", key: "heroImage", label: f("heroImage") },
        {
          type: "list",
          key: "stats",
          label: f("stats"),
          make: () => ({ value: "", label: e() }),
          itemTitle: (i) => String(i.value || "—"),
          fields: [
            { type: "plain", key: "value", label: f("value"), ltr: true },
            { type: "text", key: "label", label: f("label") },
          ],
        },
        { type: "text", key: "servicesTitle", label: f("servicesTitle") },
        { type: "text", key: "servicesSubtitle", label: f("servicesSubtitle") },
        { type: "text", key: "howTitle", label: f("howTitle") },
        { type: "text", key: "howSubtitle", label: f("howSubtitle") },
        { type: "list", key: "steps", label: f("steps"), make: () => ({ icon: "ClipboardList", title: e(), description: e() }), fields: step() },
        { type: "text", key: "testimonialsTitle", label: f("testimonialsTitle") },
        { type: "text", key: "testimonialsSubtitle", label: f("testimonialsSubtitle") },
        { type: "text", key: "faqTitle", label: f("faqTitle") },
        { type: "text", key: "faqSubtitle", label: f("faqSubtitle") },
        { type: "text", key: "trustedTitle", label: f("trustedTitle") },
        { type: "text", key: "partnerCtaTitle", label: f("partnerCtaTitle") },
        { type: "textarea", key: "partnerCtaDescription", label: f("partnerCtaDescription"), rows: 2 },
        { type: "text", key: "partnerCtaButton", label: f("partnerCtaButton") },
      ],
    },
    {
      key: "offerForm",
      viewHref: "/#offer-form",
      icon: "ClipboardList",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "text", key: "step1", label: f("step1") },
        { type: "text", key: "step2", label: f("step2") },
        { type: "text", key: "successTitle", label: f("successTitle") },
        { type: "textarea", key: "successMessage", label: f("successMessage") },
        { type: "text", key: "note", label: f("note") },
      ],
    },
    {
      key: "about",
      viewHref: "/about",
      icon: "Users",
      fields: [
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "text", key: "title", label: f("title") },
        { type: "textarea", key: "body", label: f("body"), rows: 4 },
        { type: "image", key: "image", label: f("image") },
        { type: "textarea", key: "mission", label: f("mission"), rows: 2 },
        { type: "textarea", key: "vision", label: f("vision"), rows: 2 },
        { type: "list", key: "values", label: f("values"), make: () => ({ icon: "ShieldCheck", title: e(), description: e() }), fields: step() },
        {
          type: "list",
          key: "numbers",
          label: f("numbers"),
          make: () => ({ value: "", label: e() }),
          itemTitle: (i) => String(i.value || "—"),
          fields: [
            { type: "plain", key: "value", label: f("value"), ltr: true },
            { type: "text", key: "label", label: f("label") },
          ],
        },
      ],
    },
    {
      key: "contact",
      viewHref: "/contact",
      icon: "Inbox",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "text", key: "formTitle", label: f("formTitle") },
        { type: "image", key: "image", label: f("image") },
      ],
    },
    {
      key: "companiesPage",
      viewHref: "/companies",
      icon: "Building2",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "image", key: "image", label: f("image") },
      ],
    },
    {
      key: "blogsPage",
      viewHref: "/blogs",
      icon: "FileText",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "image", key: "image", label: f("image") },
      ],
    },
    {
      key: "faqPage",
      viewHref: "/faqs",
      icon: "LifeBuoy",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "text", key: "subtitle", label: f("subtitle") },
        { type: "text", key: "askTitle", label: f("askTitle") },
      ],
    },
    {
      key: "partnerPage",
      viewHref: "/partner",
      icon: "HeartHandshake",
      fields: [
        { type: "text", key: "title", label: f("title") },
        { type: "textarea", key: "subtitle", label: f("subtitle"), rows: 2 },
        { type: "list", key: "benefits", label: f("benefits"), make: () => ({ icon: "Target", title: e(), description: e() }), fields: step() },
        { type: "list", key: "steps", label: f("steps"), make: () => ({ icon: "FileText", title: e(), description: e() }), fields: step() },
        { type: "text", key: "ctaTitle", label: f("ctaTitle") },
        { type: "text", key: "ctaDescription", label: f("ctaDescription") },
      ],
    },
    {
      key: "legal",
      viewHref: "/imprint",
      icon: "Scale",
      fields: [
        { type: "richtext", key: "imprint", label: f("imprint") },
        { type: "richtext", key: "privacy", label: f("privacy") },
        { type: "richtext", key: "terms", label: f("terms") },
      ],
    },
    {
      key: "popup",
      viewHref: "/",
      icon: "Sparkles",
      fields: [
        { type: "boolean", key: "enabled", label: f("enabled") },
        { type: "text", key: "title", label: f("title") },
        { type: "textarea", key: "body", label: f("body"), rows: 2 },
        { type: "text", key: "cta", label: f("cta") },
        { type: "plain", key: "href", label: f("href"), ltr: true },
        { type: "number", key: "delaySec", label: f("delaySec") },
      ],
    },
  ];
}
