#!/usr/bin/env bun
/**
 * wf.mjs — хелпер доски docs/workflow.html (спека 2026-07-21-workflow-board-skill).
 * Zero-deps, без eval: только текстовый парсинг блока `const TRACKS = [ … ];`.
 * Команды: get | add | set | list | lint | audit-quick | test
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const BOARD = resolve(import.meta.dirname, "..", "workflow.html");

// ── Парсер ────────────────────────────────────────────────────────────────
const CARD_RE = /^\s*\{ ?id:'([^']+)'/; // старт карточки
const TRACK_RE = /^\s*id:'([^']+)', name:'((?:[^'\\]|\\.)*)'/; // шапка трека

export function parseBoard(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith("const TRACKS"));
  if (start < 0) throw new Error("wf: не найден `const TRACKS` в " + BOARD);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\];?\s*$/.test(lines[i])) { end = i; break; }
  }
  const tracks = [], cards = [];
  let cur = null, curTrack = null;
  const close = (i) => { if (cur) { cur.end = i - 1;
    cur.block = lines.slice(cur.start, i).join("\n"); cards.push(cur); cur = null; } };
  for (let i = start + 1; i < end; i++) {
    const t = TRACK_RE.exec(lines[i]);
    // Шапка трека — строка `id:'x', name:'…'` БЕЗ открывающей `{ id:` карточки
    if (t && !CARD_RE.test(lines[i])) { close(i); curTrack = t[1];
      tracks.push({ id: t[1], name: t[2], startLine: i }); continue; }
    const c = CARD_RE.exec(lines[i]);
    if (c) { close(i); cur = { id: c[1], track: curTrack, start: i }; }
  }
  close(end);
  return { lines, start, end, tracks, cards };
}

export function getField(block, name) {
  const m = new RegExp("\\b" + name + ":'((?:[^'\\\\]|\\\\.)*)'").exec(block);
  return m ? m[1] : null;
}
export function getNum(block, name) {
  const m = new RegExp("\\b" + name + ":(\\d+)").exec(block);
  return m ? Number(m[1]) : null;
}
export function getList(block, name) {
  const m = new RegExp("\\b" + name + ":\\[((?:\\s*'(?:[^'\\\\]|\\\\.)*'\\s*,?)*)\\s*\\]").exec(block);
  if (!m) return null;
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
}

export function cardInfo(card) {
  return {
    id: card.id, track: card.track,
    st: getField(card.block, "st"), pr: getField(card.block, "pr"),
    t: getField(card.block, "t"), pg: getNum(card.block, "pg"),
    own: getField(card.block, "own"),
    deps: getList(card.block, "deps") ?? [],
    anchors: getList(card.block, "anchors") ?? [],
    hasRes: /\bres:'/.test(card.block),
    hasBlockedField: /\bblocked:'/.test(card.block),
  };
}

const CLOSED = new Set(["done", "wont", "superseded"]);
export function isReady(info, byId) {
  if (info.st !== "todo") return false;
  return info.deps.every((d) => byId.get(d) && CLOSED.has(byId.get(d).st));
}

// ── Команды ───────────────────────────────────────────────────────────────
function loadInfos(text) {
  const b = parseBoard(text);
  const infos = b.cards.map(cardInfo);
  const byId = new Map(infos.map((i) => [i.id, i]));
  return { board: b, infos, byId };
}

function cmdGet(id) {
  const { board } = loadInfos(readFileSync(BOARD, "utf8"));
  const card = board.cards.find((c) => c.id === id);
  if (!card) { console.error(`wf get: карточка ${id} не найдена`); process.exit(1); }
  console.log(JSON.stringify({ ...cardInfo(card), block: card.block }, null, 2));
}

const PR_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
function cmdList(args) {
  const { infos, byId } = loadInfos(readFileSync(BOARD, "utf8"));
  let out = infos;
  const stArg = argOf(args, "--st");
  if (stArg) out = out.filter((i) => i.st === stArg);
  if (args.includes("--ready")) out = out.filter((i) => isReady(i, byId));
  const ownArg = argOf(args, "--own");
  if (ownArg) out = out.filter((i) => (i.own ?? "agent") === ownArg);
  out = [...out].sort((a, b) =>
    (PR_ORDER[a.pr] ?? 9) - (PR_ORDER[b.pr] ?? 9) || a.id.localeCompare(b.id));
  if (args.includes("--json")) { console.log(JSON.stringify(out, null, 2)); return; }
  for (const i of out)
    console.log(`${i.id.padEnd(12)} ${(i.st ?? "?").padEnd(10)} ${(i.pr ?? "").padEnd(3)} own=${(i.own ?? "-").padEnd(8)} ${(i.t ?? "").slice(0, 80)}`);
  console.log(`— всего: ${out.length}`);
}
function argOf(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

// ── Точечные правки ───────────────────────────────────────────────────────
const SCALARS = new Set(["st", "pr", "own"]);
const NUMS = new Set(["pg", "h"]);
const HTMLS = new Set(["res", "left", "blocked", "acc", "d", "t"]);
const LISTS = new Set(["deps", "anchors"]);
const escQ = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export function setFields(text, id, patch) {
  const b = parseBoard(text);
  const card = b.cards.find((c) => c.id === id);
  if (!card) throw new Error(`wf set: карточка ${id} не найдена`);
  let block = card.block;
  const setOne = (key, render) => {
    const re = new RegExp("\\b" + key + (NUMS.has(key) ? ":\\d+" :
      LISTS.has(key) ? ":\\[(?:\\s*'(?:[^'\\\\]|\\\\.)*'\\s*,?)*\\s*\\]" : ":'(?:[^'\\\\]|\\\\.)*'"));
    if (re.test(block)) block = block.replace(re, render());
    else {
      // нового поля нет — вставляем сразу после st:'…' (есть у каждой карточки)
      const anchor = /\bst:'[a-z]+'/.exec(block);
      if (!anchor) throw new Error(`wf set: у ${id} не найден st для вставки ${key}`);
      block = block.slice(0, anchor.index + anchor[0].length) +
        ", " + render() + block.slice(anchor.index + anchor[0].length);
    }
  };
  for (const [key, val] of Object.entries(patch)) {
    if (val === null) { // удаление поля (напр. blocked)
      const re = new RegExp("\\n?\\s*" + key + ":'(?:[^'\\\\]|\\\\.)*',?", "g");
      const n = (block.match(re) ?? []).length;
      if (n !== 1) throw new Error(`wf set: удаление ${key} у ${id} — найдено ${n} вхождений`);
      block = block.replace(re, "");
      continue;
    }
    if (NUMS.has(key)) setOne(key, () => `${key}:${Number(val)}`);
    else if (LISTS.has(key)) setOne(key, () => `${key}:[${val.map((v) => `'${escQ(v)}'`).join(",")}]`);
    else if (SCALARS.has(key) || HTMLS.has(key)) setOne(key, () => `${key}:'${escQ(String(val))}'`);
    else throw new Error(`wf set: неизвестное поле ${key}`);
  }
  const lines = text.split("\n");
  const out = [...lines.slice(0, card.start), ...block.split("\n"), ...lines.slice(card.end + 1)];
  return out.join("\n");
}

export function addCard(text, trackId, cardSrc) {
  const b = parseBoard(text);
  const inTrack = b.cards.filter((c) => c.track === trackId);
  if (!inTrack.length) throw new Error(`wf add: в треке ${trackId} нет карточек-якорей (пустой трек — добавить первую вручную)`);
  const last = inTrack[inTrack.length - 1];
  const lines = text.split("\n");
  // Вставка перед строкой `]`, закрывающей items-массив трека: блок последней
  // карточки может включать хвостовые скобки — ищем закрывашку от её старта.
  let closeAt = -1;
  for (let i = last.start; i <= Math.min(last.end + 1, lines.length - 1); i++) {
    if (/^\s*\]\s*$/.test(lines[i])) { closeAt = i; break; }
  }
  if (closeAt < 0) throw new Error(`wf add: не найдена закрывающая ] items-массива трека ${trackId}`);
  const out = [...lines.slice(0, closeAt), "", ...cardSrc.split("\n"), ...lines.slice(closeAt)];
  const joined = out.join("\n");
  parseBoard(joined); // битую вставку парсер не съест — бросит
  return joined;
}

function cmdSet(rest) {
  const id = rest[0];
  const patch = {};
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--res-html-file") patch.res = readFileSync(rest[++i], "utf8").trim();
    else if (a === "--deps") patch.deps = rest[++i].split(",").filter(Boolean);
    else if (a === "--anchors") patch.anchors = rest[++i].split(",").filter(Boolean);
    else if (a === "--del") patch[rest[++i]] = null;
    else if (a.includes("=")) { const [k, ...v] = a.split("="); patch[k] = v.join("="); }
    else throw new Error(`wf set: непонятный аргумент ${a}`);
  }
  const text = readFileSync(BOARD, "utf8");
  const next = setFields(text, id, patch);
  const lint = lintBoard(next);
  writeFileSync(BOARD, next);
  console.log(`wf set: ${id} обновлена (${Object.keys(patch).join(", ")}); lint: ${lint.errors.length} ошибок`);
  if (lint.errors.length) { lint.errors.forEach((e) => console.log("ERROR " + e)); process.exit(1); }
}

function cmdAdd(rest) {
  const track = rest[0];
  const ji = rest.indexOf("--json");
  if (ji < 0) throw new Error("wf add: нужен --json '{…}'");
  const o = JSON.parse(rest[ji + 1]);
  for (const req of ["id", "t", "d", "st", "pr"])
    if (!o[req]) throw new Error(`wf add: обязательное поле ${req} отсутствует`);
  const parts = [`  { id:'${escQ(o.id)}', t:'${escQ(o.t)}', d:'${escQ(o.d)}', pr:'${o.pr}', st:'${o.st}'`];
  if (o.h != null) parts.push(`h:${Number(o.h)}`);
  if (o.pg != null) parts.push(`pg:${Number(o.pg)}`);
  if (o.own) parts.push(`own:'${escQ(o.own)}'`);
  if (o.deps?.length) parts.push(`deps:[${o.deps.map((d) => `'${escQ(d)}'`).join(",")}]`);
  let src = parts.join(", ") + ",";
  if (o.req?.length) src += `\n    req:[${o.req.map((r) => `'${escQ(r)}'`).join(",\n         ")}],`;
  src += `\n    acc:'${escQ(o.acc ?? "—")}' },`;
  const text = readFileSync(BOARD, "utf8");
  writeFileSync(BOARD, addCard(text, track, src));
  console.log(`wf add: ${o.id} → трек ${track}`);
}

// ── Линтер ────────────────────────────────────────────────────────────────
export function lintBoard(text) {
  const b = parseBoard(text);
  const errors = [], warnings = [];
  const seen = new Map();
  const infos = b.cards.map(cardInfo);
  const byId = new Map(infos.map((i) => [i.id, i]));
  for (const c of b.cards) {
    const i = byId.get(c.id);
    // 1. дубль id
    if (seen.has(c.id)) errors.push(`${c.id}: дубль id (треки ${seen.get(c.id)} и ${c.track})`);
    seen.set(c.id, c.track);
    // 1б. дубль ключа внутри карточки — последний затирает первый при рендере
    for (const key of ["st", "res", "blocked", "pr", "left", "acc", "own"]) {
      const n = (c.block.match(new RegExp("\\b" + key + ":'", "g")) ?? []).length;
      if (n > 1) errors.push(`${c.id}: ключ ${key} встречается ${n} раза — последний затирает первый`);
    }
    // 2–4. статусные инварианты
    if (i.st === "done") {
      if (!i.hasRes) errors.push(`${c.id}: done без res`);
      if (i.hasBlockedField) errors.push(`${c.id}: done с полем blocked — снять хвост`);
    }
    if (i.st === "blocked" && !i.hasBlockedField)
      errors.push(`${c.id}: blocked без текста причины`);
    if ((i.st === "wont" || i.st === "superseded") && !i.hasRes &&
        !/поглощ|перекрыт|снят|заменя/i.test(getField(c.block, "d") ?? ""))
      warnings.push(`${c.id}: ${i.st} без причины в res/d`);
    // 5. deps: существование + подсказка о разблокировке
    for (const d of i.deps) if (!byId.has(d)) errors.push(`${c.id}: deps → несуществующий id ${d}`);
    if (i.st === "blocked" && i.deps.length &&
        i.deps.every((d) => byId.has(d) && CLOSED.has(byId.get(d).st)))
      warnings.push(`${c.id}: blocked, но все deps закрыты — кандидат на разблокировку`);
    // 7. done с коммитом в res — рекомендованы anchors
    if (i.st === "done" && /\b[0-9a-f]{7,40}\b/.test(getField(c.block, "res") ?? "") && !i.anchors.length)
      warnings.push(`${c.id}: done с коммитом в res, но без anchors`);
  }
  // 5б. циклы deps (DFS)
  const state = new Map();
  const dfs = (id, path) => {
    if (state.get(id) === 1) { errors.push(`цикл deps: ${[...path, id].join(" → ")}`); return; }
    if (state.get(id) === 2 || !byId.has(id)) return;
    state.set(id, 1);
    for (const d of byId.get(id).deps) dfs(d, [...path, id]);
    state.set(id, 2);
  };
  for (const i of infos) dfs(i.id, []);
  // 6. links → существующие файлы (относительно docs/)
  const docsDir = dirname(BOARD);
  // Путь в карточке допустим и относительно docs/, и относительно корня репозитория:
  // audit-quick резолвит якоря-пути от корня, lint обязан понимать ту же запись.
  const repoRoot = resolve(docsDir, "..");
  const existsAny = (p) => existsSync(resolve(docsDir, p)) || existsSync(resolve(repoRoot, p));
  for (const c of b.cards) {
    for (const lm of c.block.matchAll(/\[(?:S|SP|BL)\+'((?:[^'\\]|\\.)*)'/g)) {
      const prefix = lm[0].startsWith("[S+") ? "plans/" : lm[0].startsWith("[SP") ? "superpowers/specs/" : "backlog/";
      if (!existsAny(prefix + lm[1]))
        warnings.push(`${c.id}: битая ссылка ${prefix}${lm[1]}`);
    }
    for (const lm of c.block.matchAll(/\['((?:[^'\\]|\\.)*\.(?:md|html))'/g))
      if (!existsAny(lm[1]))
        warnings.push(`${c.id}: битая ссылка ${lm[1]}`);
  }
  return { errors, warnings };
}

// ── Аудит якорей живости ──────────────────────────────────────────────────
export function auditQuick(text, repoRoot) {
  const b = parseBoard(text);
  const dead = {};
  for (const c of b.cards) {
    const i = cardInfo(c);
    if (i.st !== "done" || !i.anchors.length) continue;
    for (const a of i.anchors) {
      let alive;
      if (a.includes("/")) alive = existsSync(resolve(repoRoot, a)); // путь
      else {
        try { // символ: git grep по репо (быстро, уважает .gitignore);
          // --untracked — иначе в свежеразвёрнутом проекте (init до git add)
          // якоря «мертвы» и self-test детерминированно красный
          execFileSync("git", ["grep", "-l", "--untracked", "--fixed-strings", a], { cwd: repoRoot, stdio: "pipe" });
          alive = true;
        } catch { alive = false; }
      }
      if (!alive) (dead[c.id] ??= []).push(a);
    }
  }
  return dead;
}

function cmdAuditQuick() {
  const repoRoot = resolve(import.meta.dirname, "..", "..");
  const dead = auditQuick(readFileSync(BOARD, "utf8"), repoRoot);
  const out = { generatedAt: new Date().toISOString(), dead };
  writeFileSync(resolve(dirname(BOARD), "workflow-audit.json"), JSON.stringify(out, null, 2));
  const n = Object.keys(dead).length;
  for (const [id, list] of Object.entries(dead))
    console.log(`DEAD  ${id}: ${list.join(", ")}`);
  console.log(`audit-quick: ${n} карточек с мёртвыми якорями → docs/workflow-audit.json`);
  if (n) process.exit(1);
}

function cmdLint() {
  const text = readFileSync(BOARD, "utf8");
  const { errors, warnings } = lintBoard(text);
  // синтаксис скрипта доски: битая строка карточки (например, после правки списка) обнуляет всю страницу, а разбор в lintBoard этого не видит
  const script = /<script>([\s\S]*?)<\/script>/.exec(text);
  if (script) { try { new Function(script[1]); } catch (e) { errors.push("скрипт доски не парсится: " + e.message); } }
  for (const w of warnings) console.log("warn  " + w);
  for (const e of errors) console.log("ERROR " + e);
  console.log(`lint: ${errors.length} ошибок, ${warnings.length} предупреждений`);
  if (errors.length) process.exit(1);
}

// ── Self-test на встроенной мини-доске ────────────────────────────────────
const MINIBOARD = `<script>
const TRACKS = [
{
  id:'t1', name:'Трек один',
  items:[
  { id:'A-1', t:'Готовая', d:'.', pr:'P1', st:'done',
    res:'сделано, коммит abc1234', anchors:['someSymbol','docs/workflow/wf.mjs'] },
  { id:'A-2', t:'Открытая', d:'.', pr:'P0', st:'todo', deps:['A-1'], own:'agent' },
  ]
},
{
  id:'t2', name:'Трек два',
  items:[
  { id:'B-1', t:'Заблокированная', d:'.', pr:'P2', st:'blocked',
    blocked:'ждём ответ', own:'business' },
  { id:'B-2', t:'Зависит от блокированной', d:'.', pr:'P1', st:'todo', deps:['B-1'] },
  { id:'B-3', t:'Битая', d:'.', pr:'P1', st:'done',
    blocked:'хвост у done', deps:['NO-SUCH'] },
  ]
}
];
const KEY=1;
</script>`;

function assertEq(got, want, label) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.error(`FAIL ${label}: получено ${g}, ожидалось ${w}`); process.exit(1); }
  console.log(`ok  ${label}`);
}

export function runSelfTest() {
  const b = parseBoard(MINIBOARD);
  assertEq(b.tracks.map((t) => t.id), ["t1", "t2"], "треки");
  assertEq(b.cards.map((c) => c.id), ["A-1", "A-2", "B-1", "B-2", "B-3"], "карточки");
  const infos = b.cards.map(cardInfo);
  const byId = new Map(infos.map((i) => [i.id, i]));
  assertEq(infos[0].st, "done", "st A-1");
  assertEq(infos[0].anchors, ["someSymbol", "docs/workflow/wf.mjs"], "anchors A-1");
  assertEq(infos[1].deps, ["A-1"], "deps A-2");
  assertEq(isReady(infos[1], byId), true, "A-2 ready (deps done)");
  assertEq(isReady(infos[3], byId), false, "B-2 не ready (deps blocked)");
  assertEq(isReady(infos[2], byId), false, "B-1 не ready (blocked)");
  const lint = lintBoard(MINIBOARD);
  assertEq(lint.errors.length >= 3, true, "lint: B-3 даёт ≥3 ошибки");
  assertEq(lint.errors.some((e) => e.includes("B-3") && e.includes("blocked")), true, "lint: done+blocked");
  assertEq(lint.errors.some((e) => e.includes("NO-SUCH")), true, "lint: битый deps");
  assertEq(lint.errors.some((e) => e.includes("res")), true, "lint: done без res");
  // set: смена статуса + добавление нового поля + удаление blocked
  const t2 = setFields(MINIBOARD, "B-1", { st: "todo", blocked: null, own: "agent" });
  const i2 = new Map(parseBoard(t2).cards.map((c) => [c.id, cardInfo(c)]));
  assertEq(i2.get("B-1").st, "todo", "set: st заменён");
  assertEq(i2.get("B-1").hasBlockedField, false, "set: blocked удалён");
  assertEq(i2.get("B-1").own, "agent", "set: own добавлен");
  // set: несуществующая карточка — ошибка
  let threw = false;
  try { setFields(MINIBOARD, "NOPE", { st: "done" }); } catch { threw = true; }
  assertEq(threw, true, "set: неизвестный id бросает");
  // add: карточка встаёт в конец трека
  const t3 = addCard(MINIBOARD, "t1",
    `  { id:'A-3', t:'Новая', d:'.', pr:'P2', st:'todo', own:'agent' },`);
  const b3 = parseBoard(t3);
  assertEq(b3.cards.map((c) => c.id), ["A-1", "A-2", "A-3", "B-1", "B-2", "B-3"], "add: порядок");
  assertEq(lintBoard(t3).errors.length, lintBoard(MINIBOARD).errors.length, "add: не добавил ошибок");
  // audit-quick: живой и мёртвый якоря
  const repoRoot = resolve(import.meta.dirname, "..", "..");
  const audit = auditQuick(MINIBOARD, repoRoot);
  assertEq(audit["A-1"] ?? [], [], "audit: якоря A-1 живы (someSymbol есть в wf.mjs, файл существует)");
  // Мёртвый символ собран конкатенацией — иначе git grep нашёл бы его литерал в самом wf.mjs
  const deadSym = "noSuchSym" + "bol_zz" + "9q";
  const t4 = setFields(MINIBOARD, "A-1", { anchors: [deadSym] });
  const audit2 = auditQuick(t4, repoRoot);
  assertEq(audit2["A-1"], [deadSym], "audit: мёртвый якорь пойман");
  console.log("self-test: OK");
}

// ── CLI ───────────────────────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "get": cmdGet(rest[0]); break;
  case "list": cmdList(rest); break;
  case "set": cmdSet(rest); break;
  case "add": cmdAdd(rest); break;
  case "lint": cmdLint(); break;
  case "audit-quick": cmdAuditQuick(); break;
  case "test": runSelfTest(); break;
  default:
    console.log("wf.mjs: get <id> | add <track> --json '{…}' | set <id> k=v … | list [--st X] [--ready] [--own X] [--json] | lint | audit-quick | test");
    if (cmd) process.exit(1);
}
