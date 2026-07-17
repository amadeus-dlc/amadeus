# reverse-engineering scan-notes — 260716-s13-label-clarity（Developer scan）

Issue #609（§13 learn candidates の選択肢が内部 ID 単独表示になる問題）の bugfix intent。本スキャンはフォーカス面が **docs / プロトコル prose のみ**（コード欠陥ではない）という軽量指示に沿う。fix-diff-independent-reverify・ledger-count-mechanical-recalc を適用し、全 file:line と exit code を observed HEAD 直読で確定した。

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260716-s13-label-clarity` |
| Scope | `bugfix` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | 既存 CodeKB への diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則） |
| Base commit | `6495e03a12d9e7149c2e80b59f171a90607a2d2c`（リーダー割当） |
| Observed commit | `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75` |
| 距離 | 28 commits |
| 観測日時 | 2026-07-16 |
| Focus | §13 Step 3（stage-protocol.md）の learn-candidate option label 規定・同型面棚卸し・learnings.ts surface 出力契約・正本所在 |
| 実施体制 | Developer code scan → Architect synthesis の直列実行（cid:reverse-engineering:c3） |

## Base 選定と到達可能性（rescan-base-ancestry）

base=`6495e03a1` はリーダーから割当済み。E-L63 の rescan-base-ancestry に従い到達可能性を再実測した:

- `git merge-base --is-ancestor 6495e03a1 HEAD` → **exit 0**（祖先性確認）
- `git rev-list --count 6495e03a1..HEAD` → **28**（距離）
- `git rev-parse HEAD` → `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75`（observed 実測）

`6495e03a1` は直前 re-scan（`re-scans/260715-parser-checkbox-fixes.md`）の observed commit。より近い `d6b489772`（同 re-scan の「鮮度追補」に現れる landed-main SHA）は observed ではなく landed pointer のため base 不採用（rescan-base-ancestry: base の真実源は re-scans の observed であって freshness pointer ではない）。

## 区間フォーカス面の変更有無（区間28コミット）

`git diff --name-only 6495e03a1..HEAD -- .claude/amadeus-common/ .claude/skills/amadeus/ .claude/tools/amadeus-learnings.ts` → **出力 0行（フォーカス3面いずれも区間無変更）**。

したがって §13 Step 3 の label 規定・question-rendering annex・learnings.ts surface 出力契約は base 時点から不変であり、下記の現行結論は base→observed のいずれでも有効。

## フォーカス面所見（observed HEAD 直読）

### 1. §13 Step 3 の option label 規定（stage-protocol.md）

生成ツリー `.claude/amadeus-common/protocols/stage-protocol.md:960`（＝編集正本 `packages/framework/core/amadeus-common/protocols/stage-protocol.md:960`、label 文言は byte 同一）:

> 3. **Render the structured question + free-text channel.** For each candidate, render one option whose `label` is the candidate `summary` (verbatim) and whose `description` names the routed destination (e.g. `→ project.md ## Corrections`) plus a "promote to team?" affordance. After `multiSelect` returns, correlate each kept label back to its candidate `id` + `source_heading`. …

**要点**: 現行仕様は既に「option label = candidate `summary`（verbatim）」「description = routed destination」を明記済み。Issue #609 のスクリーンショット（`Persist c5 only`）は **ID 単独ラベルであり L960 の違反**。仕様上は準拠すれば発生しない表示で、欠陥は決定的機構ではなく orchestrator（LLM）のプロトコル逸脱の一事例（e1・e4 のクロスレビュー所見と一致）。

### 2. 同型面の棚卸し（列挙完全性 — option-label 規定の全域 grep）

`grep -n` で stage-protocol.md 内の option-label 規定を全数列挙:

- **L11** — annex 参照（`multiSelect`, `options[].label`, `options[].description` のハーネス別レンダリング annex への導入行）。規定本体ではない。
- **L19** — チェックリスト「**Never summarize User Input** — use exact option labels.（§2, §3）」。**ユーザーの選択（User Input）を要約せず verbatim 記録する**契約であり、候補を**どうラベルするか**の規定ではない（別関心事）。
- **L577** — 監査様式「**User Input**: "[Exact user selection — option label(s) as displayed …]"」。同じく**選択結果の verbatim 捕捉**面（別関心事）。
- **L960** — §13 Step 3。**learn-candidate の option を candidate summary verbatim でラベルする唯一の規定**。

**結論（enumeration-completeness）**: §13 learn-candidate の option label を規定するのは **L960 のみ**。L19/L577 は「ユーザー選択を要約しない（post-selection capture）」という別クラスタで、否定例（`❌ Persist c5 only`）を足すべき箇所ではない。よって修正方針(a)（否定例明記）の対象は §13 Step 3（L960）に閉じる。

### 3. learnings.ts surface の出力契約（`.claude/tools/amadeus-learnings.ts`）

- `interface SurfaceCandidate`（**:96-103**）: `id`（:97）/ `source_heading`（:98、"Interpretations"|"Deviations"|"Tradeoffs"）/ `ts`（:99）/ **`summary`（:100）** / **`context`（:101）** / `default_scope`（:102、"project"）。
- candidate 構築（**:244-249**）: memory.md エントリから `id: \`c${seq}\``（:245）・`source_heading`（:246）・`summary`（:248）・`context`（:249）を verbatim 抽出。
- surface 出力（**:262** `console.log(JSON.stringify(out))`、`SurfaceOutput.candidates`（:115））。

**意味のあるラベルを作る材料（`summary` / `context`）はツール側に最初から揃っている** — 欠陥はツール出力ではなくレンダリング層のプロトコル遵守にのみ存在する。surface の実挙動検証の最短路は `bun .claude/tools/amadeus-learnings.ts surface --slug <slug>` の JSON 直読（summary 存在はツールで決定的に確認できる）。

### 4. question-rendering.md（AskUserQuestion レンダリング annex）

`.claude/skills/amadeus/question-rendering.md`（ハーネス別 annex、2478 bytes）。`§13`・`learn`・`candidate`・`verbatim`・`summary` を grep → **§13 への言及は 0件**。内容は `questions[0].options[].label` へのフィールドマッピング（:19）と、選択結果の verbatim 捕捉「never summarize User Input」（:62-63）のみ。**候補ラベルの中身を規定しない** annex であり、#609 の修正面ではない（＝ §13 label 規定は stage-protocol.md L960 に一元化されている）。

## 正本の所在と dist 再生成の要否

- **編集正本 = `packages/framework/core/amadeus-common/protocols/stage-protocol.md`**（`{{HARNESS_DIR}}` プレースホルダ形）。`.claude/` ・ `.codex/` ・ `dist/<harness>/` は生成ツリー。
- `diff -q .claude/…/stage-protocol.md packages/framework/core/…/stage-protocol.md` → **differ（exit 1）**。ただし差分は `{{HARNESS_DIR}}` → `.claude` の置換行のみ（L18 log コマンド / L130 worktree info / L966 learnings persist 等）。**§13 Step 3（L960）の label 文言は両者 byte 同一**（`diff | grep -i "verbatim\|candidate summary\|render one option"` は HARNESS_DIR 置換行のみを返し、label 本文は返さない）。
- `diff -q .claude/tools/amadeus-learnings.ts packages/framework/core/tools/amadeus-learnings.ts` → **IDENTICAL（exit 0）**。
- **dist 再生成の要否**: L960 を修正する場合、正本 `packages/framework/core/…` を編集 → `bun scripts/package.ts`（dist 再生成）+ `bun run promote:self`（self-install ツリー = `.claude/` ・ `.codex/` 等へ反映）が必須。生成面の一致は `bun run dist:check` / `bun run promote:self:check` で検証（project.md Mandated）。手書き .claude/ 直編集は Forbidden。

## Issue #609 と e4（2人目）クロスレビューの修正方針（転記）

Issue #609（labels: **bug / P3 / S4-MINOR**）。症状: `requirements-analysis` の learn candidates 確認で選択肢 `Persist c5 only (Recommended)` が表示され、`c5` の候補内容・根拠・保存 memory 文面が不明で推奨選択の可否を判断しづらい。

- **e1（2026-07-11）**: 現行 §13(L960) は summary verbatim を既定化済み — 現行仕様上は準拠すれば発生しない表示。残る作業はレンダリング準拠の強化。P2→P3 降格を提案。origin:bootstrap は対象外（当初 enhancement 見立て）。
- **e4（2人目・本スキャナ）**: 症状の実在は確認。仕様は既に正しく、欠陥は決定的機構でなく LLM のプロトコル逸脱の一事例。bug（P3/S4-MINOR）妥当。blame: L960 文言は afdbdc623（2026-07-07 bootstrap）から存在 — 起票時点で仕様は正しかった。再発防止面は未解消（label=summary を強制する決定的ガードは grep 0件）。
- **決定的に閉じる修正方針（トリアージ向け、e4 §4）**:
  - **(a)** §13 Step 3 に**否定例（`❌ Persist c5 only`）を明記するプロトコル強化** — 低コスト・docs 修正・本 Issue のクローズ条件になりうる。**本 intent（bugfix / docs-only）のスコープ内**。対象は L960 単独（同型面棚卸しの結論）。
  - **(b)** AskUserQuestion レンダリング前に `label ⊇ summary` を検査する軽量ガード — 確実だが新機構であり **bugs-only スコープ外の判断**。

## Always-rerun-for-freshness の充足（c1）

区間28コミットの `git diff --name-only`（フォーカス3面）実測が 0行で、フォーカス面は base→observed 不変であることを確定。加えて現行 file:line（L960 / learnings.ts :96-103, :244-249, :262）を observed HEAD で直読して裏取り。base/observed の真実源は本ファイルおよび `re-scans/260716-s13-label-clarity.md`。

## 検証コマンドと exit code

- `git merge-base --is-ancestor 6495e03a1 HEAD` → exit 0
- `git rev-list --count 6495e03a1..HEAD` → 28
- `git rev-parse HEAD` → `e97fdb6fc…`（一致）
- `git diff --name-only 6495e03a1..HEAD -- .claude/amadeus-common/ .claude/skills/amadeus/ .claude/tools/amadeus-learnings.ts` → 0行
- `diff -q .claude/…/stage-protocol.md packages/framework/core/…/stage-protocol.md` → exit 1（HARNESS_DIR 置換行のみ、L960 同一）
- `diff -q .claude/tools/amadeus-learnings.ts packages/framework/core/tools/amadeus-learnings.ts` → exit 0（IDENTICAL）
- `grep -n "§13\|learn\|candidate\|verbatim\|summary" .claude/skills/amadeus/question-rendering.md` → §13 言及 0件
