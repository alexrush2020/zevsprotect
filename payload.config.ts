import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { ru } from '@payloadcms/translations/languages/ru'
import { ruOverrides } from './payload/i18n'
import { seoPlugin } from '@payloadcms/plugin-seo'

import { mailAdapter } from './lib/mail/adapter'
import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Customers } from './payload/collections/Customers'
import { Categories } from './payload/collections/Categories'
import { Products } from './payload/collections/Products'
import { Reviews } from './payload/collections/Reviews'
import { Orders } from './payload/collections/Orders'
import { Leads } from './payload/collections/Leads'
import { PostCategories } from './payload/collections/PostCategories'
import { Posts } from './payload/collections/Posts'
import { Pages } from './payload/collections/Pages'
import { Home } from './payload/globals/Home'
import { About } from './payload/globals/About'
import { Delivery } from './payload/globals/Delivery'
import { Navigation } from './payload/globals/Navigation'
import { Settings } from './payload/globals/Settings'
import { b24RetryEndpoint, b24SyncTask } from './payload/jobs/b24'
import { hasRole, isAdmin } from './payload/access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: { Logo: '/payload/components/Brand#Logo', Icon: '/payload/components/Brand#Icon' },
      Nav: '/payload/components/AdminNav#AdminNav',
      actions: ['/payload/components/ThemeToggle#ThemeToggle'],
      views: { dashboard: { Component: '/payload/components/Dashboard#Dashboard' } },
    },
    meta: { titleSuffix: ' · зевспротект®' },
    // штатный формат даёт «сентября 30-е 2026, 1:54 ДП»
    dateFormat: 'd MMMM yyyy, HH:mm',
  },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru', translations: { ru: ruOverrides } },
  collections: [Users, Customers, Categories, Products, Media, Reviews, Orders, Leads, PostCategories, Posts, Pages],
  globals: [Home, About, Delivery, Navigation, Settings],
  endpoints: [b24RetryEndpoint],
  jobs: {
    tasks: [b24SyncTask],
    enableConcurrencyControl: true,
    // по умолчанию queue/run/cancel доступны любому вошедшему, включая клиентов ЛК
    access: { queue: hasRole('admin', 'manager'), cancel: hasRole('admin', 'manager'), run: isAdmin },
    // воркер — в процессе Next (next start/dev), раз в минуту; на serverless не работает — там cron на /api/payload-jobs/run
    autoRun: [{ cron: '* * * * *', limit: 10, queue: 'default' }],
  },
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  editor: lexicalEditor(),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  email: mailAdapter,
  sharp,
  plugins: [
    seoPlugin({
      collections: ['categories', 'products', 'posts', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
    }),
  ],
})
