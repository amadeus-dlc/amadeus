# Re-scan 記録 — 260710-kiro-stale-hooks

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `24197d755a51712c1bfd6fa405f709c070c61f0d`(2026-07-10 06:25:32 +0900)
  - 理由: 本 intent `260710-kiro-stale-hooks` に prior re-scan 記録が存在しないため、直近 observed(前 intent `260709-dynamic-test-size` の記録に残る observed)を差分ベースに採用。#707 契約の「該当 intent の記録が無いときは直近 observed を base とする」に該当。
- **observed**: `e1a07fada340bb4691d8ce8d576cbf96345f9395`(2026-07-10 09:35:46 +0900)
  - `git rev-parse HEAD` 実測(現 HEAD)。
- **date**: 2026-07-10
- **intent**: `260710-kiro-stale-hooks`(bug #719 / P3 — Kiro CLI が unshipped な stale `.kiro.hook` を source に保持し、orphan 免除がそれをマスクしている)
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。焦点領域は現行コードを実コード直読で file:line 確定。

## focus(スキャンスコープ)

bug #719 の理解基盤として、Kiro ハーネスの hook 出荷経路・orphan 検査機構・2層マスキング構造を実コードで直読確定。

### 1. `packages/framework/harness/kiro/hooks/` の目録(7 `.kiro.hook` + adapter)

ソースに 7 件の `.kiro.hook` + 1 件の adapter(計 8 ファイル):

| ファイル | `then.command` |
|---|---|
| `amadeus-audit-logger.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts audit-and-sensors` |
| `amadeus-log-subagent.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts log-subagent` |
| `amadeus-runtime-compile.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts runtime-compile` |
| `amadeus-session-end.kiro.hook` | `bun .kiro/hooks/amadeus-session-end.ts` ← **adapter を経由しない(stale)** |
| `amadeus-session-start.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts session-start` |
| `amadeus-stop.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts stop` |
| `amadeus-sync-statusline.kiro.hook` | `bun .kiro/hooks/amadeus-kiro-adapter.ts state-sync` |
| `amadeus-kiro-adapter.ts` | (authored stdin shim、CLI が実際に出荷する唯一の hook 系ファイル) |

`amadeus-session-end.kiro.hook` の command が `amadeus-session-end.ts` 直呼び(adapter 非経由)である点が、CLI/IDE 分離前の旧世代表記の残骸であることを端的に示す(§対照 3 の kiro-ide 版は adapter 経由)。

### 2. `packages/framework/harness/kiro/manifest.ts`(kiro CLI)

- **harnessFiles**: `:46-65`。hooks 由来は **`{ src: "hooks/amadeus-kiro-adapter.ts", dst: "hooks/amadeus-kiro-adapter.ts" }`(`:55`)の 1 件のみ**。`.kiro.hook` を1つも列挙しない → CLI は `.kiro.hook` を dist に出荷しない(hook 登録は agent JSON 経由、§6)。
- **authoredExempt**: `:81`
  ```
  [/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/, /^hooks\/[^/]+\.kiro\.hook$/]
  ```
  - regex1 `/^agents\/[^/]+\.json$/` — authored agent JSON 免除
  - regex2 `/^hooks\/amadeus-kiro-[^/]+\.ts$/` — adapter(`amadeus-kiro-adapter.ts`)免除
  - regex3 `/^hooks\/[^/]+\.kiro\.hook$/` — **全 `.kiro.hook` を免除(=2層マスキングの2層目)**。CLI は `.kiro.hook` を 0 件しか出荷しないため、この免除が守っている実体は無く、万一 stale な `.kiro.hook` が dist に混入しても orphan 検査を素通りさせる純粋なマスクとして機能する。
- コメント `:76-80` は「authored agent .json と kiro adapter は core-copy された agents/・hooks/ 内に居るため orphan scan から免除する」と説明するが、regex3(`.kiro.hook`)の正当化根拠は記述されていない。

### 3. `packages/framework/harness/kiro-ide/manifest.ts`(対照: `.kiro.hook` を正当に出荷)

- **harnessFiles**: `:41-71`。`.kiro.hook` を **9 件**明示列挙(`:51-59`): audit-logger / mint / block / log-subagent / runtime-compile / session-end / session-start / stop / sync-statusline。ソース `harness/kiro-ide/hooks/` の 9 件と一致。→ kiro-ide は IDE が読む `.kiro.hook` を正当に出荷する(agent JSON の `hooks` フィールドは持たない、§6)。
- kiro-ide の `amadeus-session-end.kiro.hook` command は **`bun .kiro/hooks/amadeus-kiro-adapter.ts session-end`**(adapter 経由 = 現行正)。CLI 版(§1)との差分が #719 の「parity/hygiene バグ」の直接証拠。
- **authoredExempt**: `:96`(CLI と同一 3 regex)。kiro-ide では `.kiro.hook` が harnessFiles で宣言され build 出力(`builtFiles`)に含まれるため orphan にならず、regex3 は実質冗長だが、出荷対象という文脈があるため防御的に妥当。

### 4. `scripts/package.ts` の orphan スキャン(走査対象・authoredExempt 消費・判定ロジック)

`checkHarness(name)` `:554-633`。全走査は **dist ツリー(`dist/<name>/` の committed)と tmp build 出力**のみを対象とし、**source(`harness/<name>/`)を walk する経路は存在しない**。

- `walk()` ジェネレータ `:147-151`(再帰列挙)。
- **built → committed(MISSING / DIFFERS)**: `:564-573`。
- **committed → built(harness-dir subtree の ORPHAN)**: `:575-582`。`authoredExempt` の唯一の消費箇所が `:579`(`if (m.authoredExempt.some((re) => re.test(rel))) continue;`)、ORPHAN 判定は `:580`。走査対象は `dist/<name>/<harnessDir>`(`:556`, `:576`)。
- **whole-tree orphan scan(#701 修正)**: `:605-628`。`dist/<name>/` ルート全体を walk し `<harnessDir>/` 配下は harness-dir pass に委譲(`:624`)、expected set(`:614-619`)非該当を ORPHAN 判定(`:626`)。
- **2層マスキングの1層目 =「ソース側の manifest 未参照ファイルを検査する機構が存在しない」を確認**: checkHarness は `dist/kiro/`(=出荷実体、§5 で `.kiro.hook` 0 件)しか見ない。source の 7 件の stale `.kiro.hook` は dist に投影されないため、どの walk(`:565` built / `:576` harness-dir / `:622` whole-tree)にも一切載らない。結果 `bun run dist:check` は exit 0 で通過し(#719 Evidence で実測)、stale source を検出できない。**2層目**(§2 regex3)は仮に dist に混入した場合の第二の網であり、1層目の欠落が主因、2層目の免除が補助的マスク、という二段構え。

### 5. dist の出荷実態

- `dist/kiro/.kiro/hooks/`: `.kiro.hook` **0 件**(`ls dist/kiro/.kiro/hooks/*.kiro.hook` → no matches)。出荷は `.ts`(core hook body)12 件 + `amadeus-kiro-adapter.ts`。設計どおり CLI は `.kiro.hook` を出荷しない。
- `dist/kiro-ide/.kiro/hooks/`: `.kiro.hook` 9 件(audit-logger / block / log-subagent / mint / runtime-compile / session-end / session-start / stop / sync-statusline)+ `.ts` 群。IDE 用に正当出荷。

### 6. Kiro CLI の hook 登録経路(agent JSON)

`packages/framework/harness/kiro/agents/amadeus.json` の `hooks` オブジェクト(`:55` 付近〜)がすべての seam を登録し、全 command が `amadeus-kiro-adapter.ts` を経由:
- `agentSpawn` → `... session-start`
- `userPromptSubmit` → `... verb-intercept`(timeout 30000)
- `preToolUse`(matcher `execute_bash`)→ `... pretool-block`(15000)
- `postToolUse`: `fs_write`→`audit-and-sensors`(120000) / `execute_bash`→`runtime-compile`(45000) / `todo_list`→`state-sync` / `subagent`→`log-subagent`
- `stop` → `... stop`(30000)

`dist/kiro/.kiro/agents/amadeus.json` の hooks も同一(出荷確認済み)。対照的に `packages/framework/harness/kiro-ide/agents/amadeus.json` は **`hooks` フィールドを持たない**(IDE は `.kiro.hook` で登録)。→ CLI の hook 登録は agent JSON が唯一の経路であり、source の 7 件の `.kiro.hook` は登録上も出荷上も完全に冗長(dead)。

### 7. 関連テスト(stale 削除で壊れないかの判断材料)

- `tests/smoke/t148-kiro-file-structure.test.ts`: **SHIPPED `dist/kiro` ツリーのみ**を読む(`:18-19` で `dist/kiro/.kiro`)。hooks は `["hooks", 10]`(`:34`)= dist の `.ts` ≥10 件を数える。source `.kiro.hook` を一切参照しない。
- `tests/unit/t147-kiro-hook-adapter.test.ts`: `bun dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts <target>` を subprocess 起動(`:8`)、fixture は `tests/fixtures/kiro-hook-payloads/`(`:50`)。source `.kiro.hook` を参照しない。
- リポ全体 grep(`kiro.hook` を tests/・scripts/ で検索)でも、source `harness/kiro/hooks/*.kiro.hook` を直接参照するテスト/スクリプトは**皆無**(ヒットは kiro-ide 出荷物・fixture・adapter コメントのみ)。
- **結論**: 7 件の stale source `.kiro.hook` 削除は t147/t148 を含む既存テストを破壊しない(#719 でも `bun test t148 t147` が exit 0 / 23 pass と実測)。

### 8. Base→HEAD 差分(13 ファイル)のフォーカス影響

`git diff --name-status 24197d75..HEAD -- ':!amadeus/' ':!dist/'` = 13 ファイル:
`.claude/tools/amadeus-audit.ts` / `.codex/tools/amadeus-audit.ts` / `.github/workflows/ci.yml` / `packages/framework/core/tools/amadeus-audit.ts` / `packages/setup/src/domain/plan.ts` / `tests/helpers/arbitraries/manifest.ts`(A) / `tests/lib/test-size.ts` / `tests/run-tests.ts` / `tests/unit/setup-manifest.pbt.test.ts`(A) / `tests/unit/setup-plan-decisions.test.ts`(A) / `tests/unit/t-test-size-dynamic.test.ts`(A) / `tests/unit/t204-audit-escape.pbt.test.ts`(A) / `tests/unit/t205-audit-escape-seams.test.ts`(A)。

- `harness/kiro*` / `scripts/package.ts` / harness `manifest.ts` を触るものは **0 件**。
- `manifest` を含む 2 ファイル(`tests/helpers/arbitraries/manifest.ts`・`tests/unit/setup-manifest.pbt.test.ts`)は **`packages/setup` の Manifest ドメイン(plan.ts)** の PBT であり、harness manifest とは無関係(ファイル冒頭コメントで確認)。
- **フォーカス面(1-7)への影響: 無し**。差分は監査エスケープ(#204/#205)とテストサイズ動的計測系であり、前回スキャン理解と現行直読がそのまま有効。

## codekb アーティファクトの更新提案(9 件)

Architect 合成担当への引き継ぎ。#719 は bugfix scope・P3・source hygiene であり、影響面は狭い。

| アーティファクト | 提案 | 根拠 |
|---|---|---|
| `reverse-engineering-timestamp.md` | **更新**(鮮度ポインタを observed `e1a07fad` へ) | 差分ベース更新の慣例。ベース点は本 re-scan が真実源。 |
| `code-quality-assessment.md` | **更新(追記)** | 既に #701(orphan scan の dist ルート盲点)を `:48-53` で記述。#719 の「source 側 orphan 機構の不在(1層目)+ kiro CLI authoredExempt regex3 のマスク(2層目)」は同種の drift-guard 穴として本ファイルに1エントリ追加が自然。あわせて `:50` の #701 記述(`for (const sub of [".agents","amadeus"])` を `:611` と参照)は現行 HEAD では whole-tree 化(`:605-628`)済みで**行番号・状態が stale** — 合成時に是正候補。 |
| `component-inventory.md` | **温存でよい**(任意で微修正) | kiro CLI hooks の構成要素目録に「source の 7 `.kiro.hook` は unshipped/dead」を注記する余地はあるが、bugfix 対象そのものなので修正 PR 側で消える。合成判断に委ねる。 |
| `architecture.md` | **温存**(必要なら1行) | ハーネス投影アーキの記述に kiro CLI=agent JSON 登録 / kiro-ide=`.kiro.hook` 登録の非対称が既載なら追補不要。未載なら §3/§6 の対照を1行補える。 |
| `code-structure.md` | **温存** | ディレクトリ構造の記述。7 件削除後に再スキャンで自然反映。今回は差分リフレッシュのため温存。 |
| `dependencies.md` | **温存** | 依存グラフに影響なし(hook 削除は依存を減らさない)。 |
| `api-documentation.md` | **温存** | adapter の CLI 契約(`<target>` サブコマンド)に変更なし。stale `.kiro.hook` は API 面に非関与。 |
| `technology-stack.md` | **温存** | 技術スタック不変。 |
| `business-overview.md` | **温存** | 事業/機能概要に非関与。 |

**要点**: 実質更新が必要なのは `reverse-engineering-timestamp.md`(鮮度)と `code-quality-assessment.md`(drift-guard 穴の1エントリ追加 + #701 記述の行番号是正)の 2 件。残り 7 件は差分リフレッシュ方針により温存で足りる。
