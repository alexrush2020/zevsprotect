// Логотип (страница входа) и знак (шапка, меню) вместо графики Payload.
// Рисуются маской: цвет берётся из темы, один файл на светлую и тёмную.
export function Logo() {
  return <span className="zp-logo" role="img" aria-label="зевспротект®" />
}

export function Icon() {
  return <span className="zp-mark" aria-hidden="true" />
}
