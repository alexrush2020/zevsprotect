/** 301 со старого WordPress (zevsprotect.ru) на новые маршруты. Источник: sitemap старого сайта (SEO-2). */
export type Redirect = { source: string; destination: string; statusCode: 301 };

export const redirects: Redirect[] = [
  { source: "/privacy-policy", destination: "/privacy", statusCode: 301 },
];
