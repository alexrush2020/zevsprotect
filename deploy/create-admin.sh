#!/usr/bin/env bash
# Первый администратор по loopback — ДО запуска caddy (пока сайт снаружи недоступен).
# Email и пароль спрашиваются интерактивно и передаются в контейнер через stdin, не аргументами.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
env_file="$here/.env.production"
files=(-f "$here/docker-compose.prod.yml")
grep -qx 'DEPLOY_PROXY=traefik' "$env_file" && files+=(-f "$here/docker-compose.traefik.yml")
dc() { docker compose --env-file "$env_file" "${files[@]}" "$@"; }

read -r -p "Email администратора: " email
read -r -s -p "Пароль (от 12 символов): " password; echo
read -r -s -p "Пароль ещё раз: " password2; echo
[[ $password == "$password2" ]] || { echo "пароли не совпадают" >&2; exit 1; }
(( ${#password} >= 12 )) || { echo "пароль короче 12 символов" >&2; exit 1; }

# node внутри app: JSON собирается без экранирования в shell; токен из ответа не печатается
printf '%s\n%s\n' "$email" "$password" | dc exec -T app node -e '
let s = ""
process.stdin.on("data", (c) => (s += c)).on("end", async () => {
  const [email, password] = s.split("\n")
  const base = "http://127.0.0.1:3000/api/users"
  const init = await (await fetch(base + "/init")).json()
  if (init.initialized) { console.error("пользователи уже есть — первый админ не создаётся"); process.exit(1) }
  const r = await fetch(base + "/first-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Администратор" }),
  })
  if (!r.ok) { console.error("ошибка " + r.status + ": " + (await r.text()).slice(0, 300)); process.exit(1) }
  const after = await (await fetch(base + "/init")).json()
  console.log(after.initialized ? "администратор создан, /api/users/init → initialized:true" : "не подтверждено /api/users/init")
  process.exit(after.initialized ? 0 : 1)
})'
