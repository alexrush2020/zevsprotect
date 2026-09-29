import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

/**
 * Есть SMTP_HOST — реальный SMTP. Иначе undefined: штатное поведение Payload без адаптера —
 * письмо не уходит, а печатается в консоль.
 */
export const mailAdapter = process.env.SMTP_HOST
  ? nodemailerAdapter({
      defaultFromAddress: process.env.SMTP_FROM || 'noreply@zevsprotect.ru',
      defaultFromName: 'зевспротект',
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      },
    })
  : undefined
