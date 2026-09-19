<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Reply in Russian; the user writes in Russian and expects Russian-language updates.
- Change only the requested UI or copy; when told «больше ничего не меняй», leave surrounding layout and text alone.
- Verify visual work in the browser; the user iterates from screenshots and wants photorealistic rugged industrial imagery with the glove as the focal point, not stylized, cartoon, robotic, or bland corporate layouts.
- Generated glove photos must use the official zevsprotect cuff mark, centered on the cuff — not a similar or invented logo, and not a different mitt.
- Keep the metallic shimmer logo animation on brand marks (about page and home), matching the about-page treatment.
- Do not mention the factory founding year (2005) or invent earlier «берут с 2019/2020» customer dates; the company is from 2025.
- Work only in the main `sandra85` tree and preview on port 43127; do not start a second prototype or a worktree copy that drops photorealistic assets.
- Borrow catalog, reviews, and live-consultant interaction from the Sharteks prototype, restyled to zevsprotect; do not copy Sharteks branding.
- Review cards show the city under the company name so text lines align; do not label the block «Проходная» or use «Арсеналтрейдинг» (that slot is «Прибой»).
- Blog and article preview images should not be cropped — use contain, not 16:9 cover.

## Learned Workspace Facts

- This is a Next.js prototype of zevsprotect® (зевспротект), a Taganrog PPE / work-glove brand; slogan is «Сила в ваших руках»; live reference site is https://zevsprotect.ru.
- Geography: 85 Russian regions plus Belarus and Kazakhstan.
- Hero product shot is the orange «Феникс» glove, not the blue Atlant.
- Contact messenger is MAX only (use the official MAX mark, cropped and styled to the site); do not mention WhatsApp or Telegram or show their logos. Header icons should not float as a right-side cluster.
- The back-to-top control is the photorealistic orange Феникс glove (`/hero/glove-point-up.png`) with the index finger pointing up, on the right side; do not replace it with an SVG or cardboard mitt.
- The about page keeps the workshop reel at `/about/workshop.mp4` (not a stock clip), a metallic shimmering logo, and in-use work-scene photos rather than a lone product glove in the hero.
- The catalog purchase guide («Гид закупщика») opens as an in-page modal, not a separate route.
- Contacts page keeps a two-column layout: directory on the left, feedback form on the right; messenger buttons sit above the inquiry CTA.
- Private GitHub remote: https://github.com/merovingen-kein/sandra85.
- Stable Vercel production URL: https://zevsprotect-prototype.vercel.app (project `zevsprotect-prototype`, team VZR).
- Sharteks prototype at https://sharteks-prototype.vercel.app is the UX reference for catalog hover (side actions: избранное, быстрый заказ, отзывы, заказать образцы), product reviews, and «уточнить у менеджера» live chat.
- Batch/product documents keep the declaration, not «Протокол испытаний».
