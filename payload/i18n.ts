import type { DefaultTranslationsObject } from '@payloadcms/translations'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

// Штатные шаблоны Payload склеивают текст с названием коллекции в именительном падеже
// («Создать новый Страница», «Вы собираетесь удалить Заказ»). Род и падеж названия заранее неизвестны,
// поэтому формулировки не склоняют его: название стоит после двоеточия, в скобках или в кавычках.
// Слово «запись» (женский род) согласует остальную фразу.
export const ruOverrides: DeepPartial<DefaultTranslationsObject> = {
  error: {
    unableToDeleteCount: 'Не удалось удалить записей: {{count}} из {{total}} ({{label}}).',
    unableToUpdateCount: 'Не удалось обновить записей: {{count}} из {{total}} ({{label}}).',
  },
  fields: {
    addLabel: 'Добавить: {{label}}',
    addNewLabel: 'Добавить: {{label}}',
    chooseLabel: 'Выбрать: {{label}}',
    editLabelData: 'Редактировать данные: {{label}}',
    labelRelationship: 'Связь: {{label}}',
    linkedTo: 'Связано: <0>{{label}}</0>',
    selectExistingLabel: 'Выбрать существующее: {{label}}',
    uploadNewLabel: 'Загрузить: {{label}}',
    newLabel: 'Новая запись: {{label}}',
  },
  general: {
    newLabel: 'Новая запись: {{label}}',
    showAllLabel: 'Показать все: {{label}}',
    createNewLabel: 'Создать: {{label}}',
    creatingNewLabel: 'Создание: {{label}}',
    editLabel: 'Редактировать: {{label}}',
    deleteLabel: 'Удалить: {{label}}',
    editingLabel_one: 'Редактирование записей: {{count}} ({{label}})',
    editingLabel_many: 'Редактирование записей: {{count}} ({{label}})',
    editingLabel_other: 'Редактирование записей: {{count}} ({{label}})',
    aboutToDelete: 'Вы собираетесь удалить запись ({{label}}) <1>{{title}}</1>. Вы уверены?',
    aboutToDeleteCount_one: 'Вы собираетесь удалить записи ({{label}}): {{count}}',
    aboutToDeleteCount_many: 'Вы собираетесь удалить записи ({{label}}): {{count}}',
    aboutToDeleteCount_other: 'Вы собираетесь удалить записи ({{label}}): {{count}}',
    aboutToPermanentlyDelete: 'Вы собираетесь навсегда удалить запись ({{label}}) <1>{{title}}</1>. Вы уверены?',
    aboutToPermanentlyDeleteTrash:
      'Вы собираетесь навсегда удалить из корзины записи (<1>{{label}}</1>): <0>{{count}}</0>. Вы уверены?',
    aboutToRestore: 'Вы собираетесь восстановить запись ({{label}}) <1>{{title}}</1>. Вы уверены?',
    aboutToRestoreAsDraft:
      'Вы собираетесь восстановить запись ({{label}}) <1>{{title}}</1> как черновик. Вы уверены?',
    aboutToRestoreAsDraftCount: 'Вы собираетесь восстановить записи ({{label}}) как черновики: {{count}}',
    aboutToRestoreCount: 'Вы собираетесь восстановить записи ({{label}}): {{count}}',
    aboutToTrash: 'Вы собираетесь переместить запись ({{label}}) <1>{{title}}</1> в корзину. Вы уверены?',
    aboutToTrashCount: 'Вы собираетесь переместить записи ({{label}}) в корзину: {{count}}',
    documentIsTrashed: 'Эта запись ({{label}}) находится в корзине и доступна только для чтения.',
    emptyTrashLabel: 'Очистить корзину: {{label}}',
    moveConfirm: 'Вы собираетесь переместить записи ({{label}}): {{count}} в <1>{{destination}}</1>. Вы уверены?',
    moveCount: 'Переместить записи: {{count}} ({{label}})',
    movingCount: 'Перемещение записей: {{count}} ({{label}})',
    noResults: 'Ничего не найдено. Возможно, записей ({{label}}) ещё нет или они не соответствуют фильтрам.',
    noTrashResults: 'В корзине нет записей ({{label}}).',
    deletedCountSuccessfully: 'Удалено записей: {{count}} ({{label}}).',
    permanentlyDeletedCountSuccessfully: 'Навсегда удалено записей: {{count}} ({{label}}).',
    restoredCountSuccessfully: 'Восстановлено записей: {{count}} ({{label}}).',
    trashedCountSuccessfully: 'Перемещено в корзину записей: {{count}} ({{label}}).',
    updatedCountSuccessfully: 'Обновлено записей: {{count}} ({{label}}).',
    updatedLabelSuccessfully: 'Запись обновлена: {{label}}.',
    selectAll: 'Выбрать все записи: {{count}}',
    selectedCount: 'Выбрано записей: {{count}}',
    selectLabel: 'Выбрать: {{label}}',
    successfullyCreated: 'Запись создана: {{label}}.',
    successfullyDuplicated: 'Запись продублирована: {{label}}.',
    titleDeleted: 'Запись ({{label}}) «{{title}}» удалена.',
    titleRestored: 'Запись ({{label}}) «{{title}}» восстановлена.',
    titleTrashed: 'Запись ({{label}}) «{{title}}» перемещена в корзину.',
  },
  version: {
    aboutToPublishSelection: 'Вы собираетесь опубликовать все выбранные записи ({{label}}). Вы уверены?',
    aboutToUnpublishSelection: 'Вы собираетесь снять с публикации выбранные записи ({{label}}). Вы уверены?',
    noRowsFound: 'Записей не найдено: {{label}}',
    noRowsSelected: 'Записи не выбраны: {{label}}',
  },
  validation: {
    requiresAtLeast: 'Минимум записей ({{label}}): {{count}}',
    requiresNoMoreThan: 'Максимум записей ({{label}}): {{count}}',
  },
}
