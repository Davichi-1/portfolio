/**
 * Single source of truth for identity, contact details and site metadata.
 * Change these values and they update everywhere — nav, footer, contact
 * section, structured data, sitemap and OG image all read from here.
 */

export const profile = {
  firstName: "David",
  lastName: "Chidera",
  fullName: "David Tobias Chidera",
  shortName: "David Tobias",
  initials: "DTC",

  // Kept generic on purpose — five disciplines resist a single job title.
  role: "Multidisciplinary creative",
  roleLong: "Graphics, software, sound, motion and stills",

  location: "Nigeria",
  locationLong: "Lagos, Nigeria",
  timezone: "WAT (UTC+1)",

  yearsExperience: 6,
  startYear: new Date().getFullYear() - 6,

  email: "tobiasdavidchidera@gmail.com",

  // Displayed local, dialled international.
  phoneDisplay: "0810 749 9410",
  phoneInternational: "+234 810 749 9410",
  phoneHref: "+2348107499410",

  availability: {
    open: true,
    label: "Open to commissions",
    detail: "Taking on new work — remote worldwide, on location across Nigeria.",
  },

  // Add or remove freely; anything with an empty href is skipped in the UI.
  socials: [
    { label: "Instagram", handle: "@davidtobias", href: "" },
    { label: "Behance", handle: "davidtobias", href: "" },
    { label: "GitHub", handle: "davidtobias", href: "" },
    { label: "X", handle: "@davidtobias", href: "" },
  ],
} as const;

export const siteMeta = {
  title: `${profile.fullName} — ${profile.role}`,
  shortTitle: `${profile.fullName}`,
  description:
    "David Tobias Chidera is a Nigerian multidisciplinary creative working across graphic design, software engineering, sound engineering, cinematography and mobile photography. Six years shaping signal — light, sound, form and logic.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://davidtobias.com",
  keywords: [
    "David Tobias Chidera",
    "Nigerian graphic designer",
    "software engineer Nigeria",
    "sound engineer Lagos",
    "cinematographer Nigeria",
    "mobile photography",
    "multidisciplinary creative",
    "brand identity",
    "colour grading",
    "audio mixing",
  ],
} as const;
