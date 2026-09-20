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
- Borrow catalog, reviews, live-consultant, account, and cart/checkout interaction from the Sharteks prototype, restyled to zevsprotect; do not copy Sharteks branding. Login and registration share one page (default: login, with password recovery on the same card); login is a Yandex stub (not Google); registration is private individual or legal entity.
- Catalog product cards should show wholesale unit price vs volume on an integrated tracker (slider checkpoints, ₽/смену) — not a leftover «опт от…» badge or a separate widget; extra specs reveal on hover so rest-state cards stay equal height; sizes are chips even when only one size exists, left-aligned, with coating as a click-dropdown on the right of the same row; order qty uses a visible minimum and a hidden packing step (50 pairs fabric/PVC, 12 coated/облив), rounding up on manual input; keep the model comparison on the product page.
- Cart lines use the same visual volume/discount tracker as catalog cards; size and coating are separate stacked sections (not one row); do not repeat size/coating labels on the qty stepper when those blocks are already above.
- Review cards show the city under the company name so text lines align, with photos and company/footer rows on one level across cards; overflowing quotes use «прочитать полностью» to the reviews page with that review’s anchor; do not label the block «Проходная» or use «Арсеналтрейдинг» (that slot is «Прибой»).
- Blog and article preview images should not be cropped — use contain, not 16:9 cover.

## Learned Workspace Facts

- This is a Next.js prototype of zevsprotect® (зевспротект), a Taganrog PPE / work-glove brand; slogan is «Сила в ваших руках»; live reference site is https://zevsprotect.ru.
- Geography: 85 Russian regions plus Belarus and Kazakhstan.
- Hero product shot is the orange «Феникс» glove, not the blue Atlant.
- Contact messenger is MAX only (use the official MAX mark, cropped and styled to the site); do not mention WhatsApp or Telegram or show their logos. Header icons should not float as a right-side cluster.
- The back-to-top control is the photorealistic orange Феникс glove (`/hero/glove-point-up.png`) with the index finger pointing up, stacked immediately above the live-chat control (including when the chat panel is open); do not replace it with an SVG or cardboard mitt.
- The about page keeps the workshop reel at `/about/workshop.mp4` (not a stock clip), a metallic shimmering logo, and in-use work-scene photos rather than a lone product glove in the hero.
- The catalog purchase guide («Гид закупщика») opens as an in-page modal, not a separate route; catalog filters include model length, pair weight, tex, and knitting class in addition to base, coating, color, and size.
- Contacts page keeps a two-column layout: directory on the left, feedback form on the right; messenger buttons sit above the inquiry CTA.
- Private GitHub remote: https://github.com/merovingen-kein/sandra85.
- Stable Vercel production URL: https://zevsprotect-prototype.vercel.app (project `zevsprotect-prototype`, team VZR).
- Sharteks prototype at https://sharteks-prototype.vercel.app is the UX reference for catalog hover (side actions: избранное, быстрый заказ, отзывы, заказать образцы — отзывы orange like избранное, образцы blue like быстрый заказ), product reviews, «уточнить у менеджера» live chat, the account cabinet, and cart (заявка to a manager vs заказ to checkout with saved addresses).
- Batch/product documents keep the declaration, not «Протокол испытаний».
