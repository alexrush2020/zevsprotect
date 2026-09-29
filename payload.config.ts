import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { ru } from '@payloadcms/translations/languages/ru'
import { seoPlugin } from '@payloadcms/plugin-seo'

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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      Nav: '/payload/components/AdminNav#AdminNav',
      actions: ['/payload/components/ThemeToggle#ThemeToggle'],
      views: { dashboard: { Component: '/payload/components/Dashboard#Dashboard' } },
    },
    meta: { titleSuffix: ' · зевспротект®' },
  },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  collections: [Users, Customers, Categories, Products, Media, Reviews, Orders, Leads, PostCategories, Posts, Pages],
  globals: [Home, About, Delivery, Navigation, Settings],
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['categories', 'products', 'posts', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
    }),
  ],
})
