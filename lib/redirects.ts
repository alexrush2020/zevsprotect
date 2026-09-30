/** 301 со старого WordPress (zevsprotect.ru) на новые маршруты. Источник: sitemap старого сайта (SEO-2). */
export type Redirect = { source: string; destination: string; permanent: true };

export const redirects: Redirect[] = [
  { source: "/privacy-policy", destination: "/privacy", permanent: true },
];
