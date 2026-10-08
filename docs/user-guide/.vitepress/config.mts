import { defineConfig } from 'vitepress'

// Документация пользователя: srcDir = docs/user-guide. README.md → главная страница.
export default defineConfig({
  lang: 'ru-RU',
  title: 'зевспротект® — справка',
  description: 'Инструкции для покупателей и менеджеров сайта zevsprotect.ru',
  base: process.env.DOCS_BASE_PATH ?? '/',
  srcExclude: ['**/node_modules/**', 'MAINTAINING.md'],
  rewrites: { 'README.md': 'index.md' },
  ignoreDeadLinks: [/ADMIN-GUIDE/], // справочник лежит вне srcDir (docs/ADMIN-GUIDE.md)
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Покупателям', link: '/buyers' },
      { text: 'Менеджерам', link: '/managers' },
    ],
    sidebar: [
      { text: 'Покупателям', link: '/buyers' },
      { text: 'Менеджерам', link: '/managers' },
    ],
    outline: { level: [2, 3], label: 'На этой странице' },
    docFooter: { prev: 'Назад', next: 'Дальше' },
    returnToTopLabel: 'Наверх',
    sidebarMenuLabel: 'Меню',
    darkModeSwitchLabel: 'Тема',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Поиск', buttonAriaLabel: 'Поиск' },
          modal: { noResultsText: 'Ничего не найдено', resetButtonTitle: 'Сбросить', footer: { selectText: 'выбрать', navigateText: 'перейти', closeText: 'закрыть' } },
        },
      },
    },
  },
})
