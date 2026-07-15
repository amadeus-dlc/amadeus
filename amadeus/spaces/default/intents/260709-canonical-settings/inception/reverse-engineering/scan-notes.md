# Reverse Engineering — Developer コードスキャン結果

intent: `260709-canonical-settings`(Issue #623: Amadeus 共通設定を型付き canonical settings として定義する)
ステージ: reverse-engineering(2.1)/ Developer code scan
実施日: 2026-07-16

> 本ファイルは Developer のスキャン所見(すべて実コード直読の file:line)。Architect が合成に使用する一次材料。

---

## 手法(diff-refresh)

- base = `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`(前 intent 260713-swarm-driver-migration の observed)
- observed = `e55cc25143717d84b3e7f1a543151f0b7c99b96f`(現 HEAD、`git rev-parse HEAD` で一致確認済み)
- 祖先性: `git merge-base --is-ancestor base HEAD` = 真(base は HEAD の祖先)
- 距離: `git rev-list --count base..HEAD` = **58 commits**
- フルスキャンは行わず、区間 diff で本 intent 観測面に触れた変化だけを深掘りした(project.md cid:reverse-engineering:c1 準拠)

## 区間 diff の要約(本 intent 関連の変化)

- 区間規模は大きい(519 files, +98136/-1659)。主因は upstream-v2 移行(`amadeus-migrate.ts` +3823 行の新規、`t224/t225/t226/t227` などの移行テスト大量追加)であり、**本 intent(canonical settings)に直接関係する新規機構は区間内に存在しない**。
- 本 intent 観測面に関わる区間内変化で意味があるもの:
  - `.claude/tools/amadeus-utility.ts`(+275/-）— doctor に health-check row が増加(移行 doctor `AMADEUS_MIGRATION_DOCTOR` 分岐など)。`handleDoctor` の行構造・exit code 方針自体は不変。
  - `.claude/tools/amadeus-stage-schema.ts`(+69/-)— parse/validation の様式は不変(REQUIRED/OPTIONAL/RESERVED の三分・discriminated union `ValidationResult`)。
  - `.gitignore` は区間内で amadeus 関連パターンの意味変化なし(設定ファイル配置に影響する変更なし)。
- 結論: 設定ローダを新設する土台(既存 parse 様式・JSON ロード様式・doctor 行様式・env 読み様式)は base 時点で確立済みで、区間内で破壊的変化なし。

---

## フォーカス面1: 設定配置面(ディレクトリ構造・.gitignore)

- `amadeus/spaces/default/` 直下の実ディレクトリ(`ls`): `codekb/`、`intents/`、`knowledge/`、`memory/` の4つのみ。**`settings.json` 相当の設定ファイルは現状存在しない**。`memory/` は `org.md`/`team.md`/`project.md`/`phases/`/`templates/`(ルール層。手編集正本)。
- `.gitignore`(`.gitignore:47-58`)の amadeus 関連 ignore パターン:
  - `amadeus/active-space`(:50)
  - `amadeus/spaces/*/intents/active-intent`(:51)
  - `amadeus/.amadeus-clone-id`(:52)、`amadeus/.amadeus-sessions/`(:53)
  - `amadeus/spaces/*/intents/*/runtime-graph.json`(:54)
  - `amadeus/spaces/*/intents/*/.amadeus-*`(:55)、`amadeus/spaces/*/intents/.amadeus-*`(:58)
- **重要**: これらはすべて cursor / machine-local runtime / intent 配下の `.amadeus-*` に限定される。`amadeus/spaces/<space>/settings.json` や `amadeus/spaces/<space>/memory/` 配下、あるいは workspace ルート `amadeus/settings.json` に設定ファイルを置いても **どのパターンにも一致せず ignore されない**(コミット対象になる)。設定を version-controlled にする(org.md の「amadeus/ ワークスペースはバージョン管理」方針)なら追加の gitignore 変更は不要。

## フォーカス面2: doctor 統合面(`amadeus-utility.ts` handleDoctor)

- health-check row の型: `interface DoctorCheck { pass: boolean; label: string; fix?: string }`(`amadeus-utility.ts:407-411`)。個別チェック関数(`hookHeartbeatDoctorCheck` :527、`checkPhaseProgressConsistency` :653 等)はこの型を返す。
- `handleDoctor(projectDir: string): void`(:676)は内部で `results: Array<{pass, label, fix?}>`(:677)を組み立て、各チェックを **inline に `results.push({...})`** するか、`DoctorCheck` 返却関数の結果を push する二方式。
- 追加方法: `results.push({ pass, label, fix })` を handleDoctor 本体に足すか、`DoctorCheck` を返す純関数を書いて push する。**副作用のない純関数化(`export function xxxCheck(projectDir): DoctorCheck`)が in-process テスト可能な既習様式**(spawn-only の handleDoctor 盲点回避。:568,:599 のコメント参照)。
- exit code 方針: 集計は `passed`/`failed` カウント(:1926-1937)、最後に `process.exit(failed > 0 ? 1 : 0)`(:1958)。**どの row が fail でも exit 1**。stdout に全診断を出す(exit code とは独立、:1954-1957)。
- 既存の設定検証 row の実例(→ 面7と直結): `AMADEUS_DEFAULT_SCOPE` の検証 row(:875-892)。unset=pass / valid=pass / invalid=fail+fix。canonical settings の doctor 統合はこの row をそのまま拡張する形が自然。

## フォーカス面3: 既存 parse/validation パターン

2つの明確に異なる posture が併存する:

- **厳格(Result 型)様式** — `amadeus-stage-schema.ts`:
  - discriminated union: `type ValidationResult = { valid: true; data: StageFrontmatter } | { valid: false; errors: string[] }`(:55-57)。
  - フィールド集合を定数化: `REQUIRED_FIELDS`(:103-116)、`OPTIONAL_FIELDS`(:118)、`KNOWN_FIELDS = new Set([...REQUIRED, ...OPTIONAL])`(:120)。
  - **未知キーは errors に集約**(throw しない): `errors.push(\`unknown key: ${key}\`)`(:163)。
  - 予約キーは理由付き map `RESERVED_KEYS: Readonly<Record<string,string>>`(:95-101)で一貫拒否。
  - 型チェックヘルパ群 `checkString`/`checkPositiveInteger`/`checkStringArray`/`checkEnum`/`checkSlugPattern`(:455-513)。
  - `validateStageFrontmatter(...): ValidationResult`(:136)がエントリ。
- **寛容(throw)様式** — `amadeus-rule-schema.ts`:
  - `parseRuleFrontmatter(raw): RuleFrontmatter`(:46)は**未知キーを許容(forward-compat additive)**(:39 コメント)。
  - `validateRuleFrontmatter(...)`(:63)は不正時に **`throw new Error(...)`**(:69,:72)。
- 設計含意: canonical settings ローダは、ユーザー編集ファイルの「未知キーをどう扱うか」で stage-schema 型(errors 集約・fail-soft)か rule-schema 型(throw)かを選ぶ必要がある。doctor へ流すなら **stage-schema の discriminated-union `{valid,data}|{valid,errors[]}` が最も接続容易**(errors をそのまま fail row に写せる)。

## フォーカス面4: 既存 JSON 読み込み実装(設定ローダが従うべき既習様式)

- intents.json 読み(`amadeus-lib.ts`):
  - `readIntentRegistry(...): IntentRegistryEntry[]`(:1496-1509)。`JSON.parse(readFileSync(path,"utf-8")) as unknown`(:1503)→ `Array.isArray` 構造チェック(:1504)→ **try/catch で absent/malformed は `[]` へ寛容フォールバック**(:1505-1507)。
  - 書き込みは `writeFileAtomic(path, JSON.stringify(list, null, 2) + "\n")`(:1481,:1832,:1874)。
  - `appendIntentToRegistry`(:1466)、`intentsRegistryPath`(:1462-1464)。
- runtime-graph.json / scope-grid.json 読み(`amadeus-graph.ts`):
  - path 解決は env-seam 経由: `scopeGridPath()` = `process.env.AMADEUS_SCOPE_GRID ?? join(DATA_DIR, "scope-grid.json")`(:307)。stage-graph も同型 `AMADEUS_STAGE_GRAPH`。
  - グリッドは load 後キャッシュ(:326- コメント)。
  - `runtime-graph.json` は #849 self-heal 対象(gitignored・machine-local 生成物、`amadeus-learnings.ts:151`)。not-found 時は再コンパイル→なお無ければ `fail(...)`(:173,:180)。
- 様式の要点: **(a) `JSON.parse(readFileSync) as unknown` + 構造ガード、(b) 欠損の扱いは用途で二分**(registry=`[]` 寛容 / compiled graph=再生成 or fail)、**(c) 書きは `writeFileAtomic` + 末尾改行 + 2-space**、**(d) path は `AMADEUS_*` env-seam で override 可能にする**。canonical settings ローダはこの4点を踏襲すべき。

## フォーカス面5: ハーネス別設定の現状(重複記述の棚卸し材料)

- リポジトリルートに実在する harness engine dir: **`.claude` と `.codex` のみ**(`.kiro` はルートに存在しない)。ただし `dist/kiro/`・`packages/framework/harness/{claude,codex,kiro,kiro-ide}` は存在(4 harness)。
- `.claude/settings.json.example`(6745B): `permissions.allow`、`statusLine`、`hooks`(UserPromptSubmit/SessionStart/SessionEnd/PostToolUse 各ブロック)、`companyAnnouncements`。**Amadeus の挙動設定(depth/test-strategy/autonomy 等)は一切持たない**。model/provider も未 pin(コメント通り)。
- `.claude/settings.local.json.example`: `env` に `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` のみ(個人 override 用)。
- `.codex/config.toml.example`: `[shell_environment_policy] set = { AMADEUS_RULES_DIR = "amadeus/spaces/default/memory" }`(active space への rules seam)、`sandbox_mode`、statusline。ここにも **depth/test-strategy/autonomy キーは無い**(`grep -c` = 0)。
- 棚卸し結論: **Amadeus 共通挙動設定は現状どのハーネス設定ファイルにも重複記述されていない**。挙動は3系統に分散している:
  1. **CLI フラグ** — `--depth` / `--test-strategy`(`amadeus-orchestrate.ts:396-400`、:448-449 で born intent へ伝播)
  2. **env var** — `AMADEUS_DEFAULT_SCOPE`(settings.json の `env` 由来、面7)
  3. **state ファイルのフィールド** — `Construction Autonomy Mode`(`amadeus-orchestrate.ts:722`、`amadeus-bolt.ts:807` が `setFieldStrict` で書く)
  canonical settings intent はこの分散した「1プロジェクトの既定挙動」を型付き1正本へ集約するのが狙いと読める。

## フォーカス面6: dist/self-install 同期面(`scripts/package.ts` / promote:self)

- **正本の実配置**: `packages/framework/core/`(= `CORE_ROOT`、`package.ts:56-57`)と `packages/framework/harness/<name>/`。root の `core/`・`harness/` は**存在しない**(base 時点で既に `packages/framework/` へ移設済み。区間内の移動ではない — base tree に `packages/framework` 実在を確認)。
- 新規 tool ファイルが dist に入る条件: `buildTree` が `core/<src>` を `dist/<name>/<harnessDir>/<dst>` へコピー(`package.ts:11-14`、:336 `srcDir = join(CORE_ROOT, src)`)。`.ts`/`.json` はトークン置換なしでコピー、`.md` はトークン置換(:76-78)。harness は `manifest.ts` 行から**発見**される(:64-71)。→ **新設 `amadeus-<x>.ts` を `packages/framework/core/tools/` に置けば自動で全 dist に載る**(手動 dist 編集は Forbidden)。
- コンパイル済みデータは dist のみに存在: `COMPILED_DATA = ["tools/data/stage-graph.json", "tools/data/scope-grid.json"]`(:157)。設定を「コンパイル済みデータ」にする設計なら同様の扱い、「手編集正本」なら core/memory 相当の verbatim copy 経路(:227-255 emitMemory/seed)を参照。
- promote:self: `scripts/promote-self.ts`。`promoteSelfMain(argv, repoRoot)`(:300)、`--check`/`--apply`/`--no-build`(:142)。Claude/Codex の project-local self-install を同期(codekb architecture.md:13 と一致)。正本(core/harness)を触ったら `bun run promote:self` 必須(project.md Mandated)。
- 検証コマンド: `bun run dist:check`(package.ts --check、byte 差分ガード :31-34)+ `bun run promote:self:check`。

## フォーカス面7: env var 読み込み(設定との責務境界の材料)

- `packages/framework/core/tools/*.ts` が読む distinct `AMADEUS_*` env var は約40種(全列挙は下記分類)。用途で分類:
  - **path-seam(テスト isolation 用が大半)**: `AMADEUS_RULES_DIR`、`AMADEUS_STAGE_GRAPH`、`AMADEUS_SCOPE_GRID`、`AMADEUS_SCOPE_MAPPING`、`AMADEUS_SENSORS_DIR`、`AMADEUS_STAGES_DIR`、`AMADEUS_SCOPES_DIR`、`AMADEUS_TEMPLATES_DIR`、`AMADEUS_FRAMEWORK_TEMPLATES_DIR`、`AMADEUS_MEMORY_SEED_DIR`、`AMADEUS_HARNESS_DIR`、`AMADEUS_RULES_SUBDIR`、`AMADEUS_SKILL_MD_PATH`、`AMADEUS_PLAN_PATH`、`AMADEUS_SENSOR_SCRIPT_DIR`、`AMADEUS_GRAPH_RESOLVE`。
  - **挙動トグル/既定値**: `AMADEUS_DEFAULT_SCOPE`(プロジェクト既定スコープ)、`AMADEUS_SKIP_ARTIFACT_GUARD`、`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`、`AMADEUS_MIGRATION_DOCTOR`。
  - **lock チューニング**: `AMADEUS_AUDIT_LOCK_RETRIES`、`AMADEUS_AUDIT_LOCK_RETRY_MS`、`AMADEUS_LOCK_BASE_DIR`、`AMADEUS_LOCK_STALE_MS`、`AMADEUS_LOCK_UNSTAMPED_GRACE_MS`。
  - **テスト注入専用**: `AMADEUS_DOCTOR_TEST_SWAP_*`、`AMADEUS_MIGRATE_TEST_*`、`AMADEUS_EXPORT_FIXTURE`。
- **最重要の既存 precedent**: `AMADEUS_DEFAULT_SCOPE`。
  - 読み: `amadeus-orchestrate.ts:574`(`const envScope = process.env.AMADEUS_DEFAULT_SCOPE`)、resolve 順は「引数 → env → 既定」(:560,:574)。不正時は canonical validator が `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...` を出す(:1532-1534、`amadeus-utility.ts:3925-3931`)。
  - **由来コメントが決定的**: `amadeus-utility.ts:871`「project-default scope from **settings.json env**」、:875 で読取、:872-874「settings.json env が Bash に露出する Claude セッション内でのみ観測可能」。
  - → **既に「settings.json の `env` ブロック → `AMADEUS_*` env var → ツールが読む」というチャネルが1本存在する**。canonical settings はこの単発チャネルを、型付き設定ファイル(1正本)から複数の既定値を供給する形へ一般化する intent と整合する。
- 責務境界の材料: depth/test-strategy には **env var が無い**(CLI フラグと state のみ)。autonomy も env でなく state field。よって「env var は現状スコープ既定にしか使われていない」= canonical settings が新たに設定を持つ余地が明確にある。

---

## codekb の stale 記述チェック(本 intent 観測面)

- `architecture.md:13,:175,:179-180`、`business-overview.md:37`、`api-documentation.md` 各所は既に `packages/framework/core/` / `packages/framework/harness/<name>/` の3層構造を正しく反映しており、本 intent 観測面(設定配置・doctor・parse・JSON・env)に関する **codekb の stale 記述は検出されなかった**。
- 参考(codekb ではなくルール層の注意): `memory/project.md` の "Way of Working" と Mandated は依然 `core/` / `harness/<name>/` を編集正本と表記しているが、実配置は `packages/framework/core/` / `packages/framework/harness/<name>/`。この不整合は **base より前**に生じた既存事項で本 intent の range 外・codekb 外(memory ルールの保守事項)。本スキャンでは事実記録に留める(修正判断は intent スコープ外)。

---

## フォーカス面ごとの1行結論

1. 設定配置: `spaces/default/` 直下に設定ファイルは無く、gitignore はどのパターンでも新設 settings を ignore しない(コミット可能)。
2. doctor: row 型は `DoctorCheck {pass,label,fix?}`、`results.push` で追加、`process.exit(failed>0?1:0)`。既存 `AMADEUS_DEFAULT_SCOPE` row(:875-892)が拡張の雛形。
3. parse: 厳格 = stage-schema の discriminated union `{valid,data}|{valid,errors[]}` + KNOWN_FIELDS + `unknown key:` errors(throw せず)/ 寛容 = rule-schema の throw + 未知キー許容。
4. JSON ロード: `JSON.parse(readFileSync) as unknown` + 構造ガード + `writeFileAtomic`(2-space+改行)、欠損は用途で「[] 寛容 / 再生成 / fail」、path は `AMADEUS_*` env-seam。
5. ハーネス設定: 共通挙動設定はどの settings/config にも重複記述されておらず、挙動は CLI フラグ・`AMADEUS_DEFAULT_SCOPE` env・state の `Construction Autonomy Mode` の3系統に分散。
6. dist 同期: 正本は `packages/framework/core/tools/`、そこに置けば `package.ts` の manifest 発見で全 dist に自動搭載、`promote:self` で self-install 同期、`dist:check`/`promote:self:check` でガード。
7. env var: 約40の `AMADEUS_*` は大半が path-seam/テスト用。挙動既定に使う実例は `AMADEUS_DEFAULT_SCOPE`(settings.json env 由来)のみで、これが canonical settings チャネルの唯一の既存 precedent。
