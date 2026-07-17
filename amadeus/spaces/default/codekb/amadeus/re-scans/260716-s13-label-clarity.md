# 260716-s13-label-clarity 再スキャン記録

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260716-s13-label-clarity` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | 既存 CodeKB に対する diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則） |
| Base commit | `6495e03a12d9e7149c2e80b59f171a90607a2d2c` |
| Observed commit | `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75` |
| 距離 | 28 commits |
| 観測日時 | 2026-07-16 |
| Focus | Issue #609 — §13 learn candidates の option label 規定（stage-protocol.md §13 Step 3）の docs 現存確認・同型面棚卸し |
| 実施体制 | Developer code scan → Architect synthesis の直列実行（cid:reverse-engineering:c3） |

## Base 選定と到達可能性（rescan-base-ancestry）

base=`6495e03a1` はリーダー割当（直前 re-scan `260715-parser-checkbox-fixes.md` の observed commit）。E-L63 の rescan-base-ancestry に従い到達可能性を再実測した:

- `git merge-base --is-ancestor 6495e03a1 HEAD` → **exit 0**（祖先性確認）
- `git rev-list --count 6495e03a1..HEAD` → **28**（距離）
- `git rev-parse HEAD` → `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75`（observed 実測一致）

`260715-parser-checkbox-fixes.md` の「鮮度追補」に現れる `d6b489772` は当該スキャン後の landed-main pointer（metrics snapshot 前進）であって observed ではないため、base の真実源には採らない。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer に限り、差分 base の真実源には使用しない。

## 引用元様式との照合（citation-semantics-check）

本記録は直前 `re-scans/260715-parser-checkbox-fixes.md` の E-L63 様式（メタデータ表 → Base 選定と到達可能性 → 差分の焦点所見）に倣う。引用元との相違点を意図的相違として明記する:

- **相違1**: 引用元の Focus は **コード欠陥2件の現存確認**が主眼だが、本 intent は **docs / プロトコル prose 面（§13 Step 3 の label 規定）の現行仕様確認**が主眼(軽量指示)。よって「差分の焦点所見」は tools のコード欠陥ではなく、プロトコル文の規定所在と同型面棚卸しを file:line で確定する記述にした。
- **相違2**: 引用元は編集正本 `packages/framework/core/tools/*.ts` と `.claude/tools/*` の byte 同一を主眼としたが、本 intent の正本 `packages/framework/core/amadeus-common/protocols/stage-protocol.md` は `{{HARNESS_DIR}}` プレースホルダ形で生成ツリー `.claude/…` と **byte 非同一**（置換差のみ）。この相違を明記し、§13 label 本文が同一であることを grep で個別裏取りした。
- **前提一致**: 「非祖先 observed の除外」「共有 timestamp を base 真実源にしない」という E-L63 の前提は忠実に踏襲した。

## Source 等価性

- **編集正本 = `packages/framework/core/amadeus-common/protocols/stage-protocol.md`**（`{{HARNESS_DIR}}` プレースホルダ形）。`.claude/` ・ `.codex/` ・ `dist/<harness>/…` は生成ツリー。
- `diff -q .claude/…/stage-protocol.md packages/framework/core/…/stage-protocol.md` → **differ（exit 1）**。差分は `{{HARNESS_DIR}}` → `.claude` 置換行（L18 / L130 / L153 / L966 等）**のみ**。**§13 Step 3（L960）の label 文言は両者 byte 同一**（`diff | grep -i "verbatim\|candidate summary\|render one option"` は置換行のみを返し、label 本文は返さない）。
- `diff -q .claude/tools/amadeus-learnings.ts packages/framework/core/tools/amadeus-learnings.ts` → **IDENTICAL（exit 0）**。
- **dist 再生成**: L960 を修正する場合、正本編集 → `bun scripts/package.ts` + `bun run promote:self` が必須、`bun run dist:check` / `bun run promote:self:check` で検証（.claude/ 直編集は Forbidden）。

## 差分の焦点所見

### 区間交差（区間28コミット）

`git diff --name-only 6495e03a1..HEAD -- .claude/amadeus-common/ .claude/skills/amadeus/ .claude/tools/amadeus-learnings.ts` → **出力 0行**。フォーカス3面（stage-protocol 系プロトコル / skills annex / learnings.ts）は区間無変更。§13 label 規定・question-rendering annex・surface 出力契約は base 時点から不変。

### §13 Step 3 の label 規定（現存確認）

`stage-protocol.md:960`（正本・生成とも同文）: 「render one option whose `label` is the candidate `summary` (verbatim) and whose `description` names the routed destination …」。現行仕様は **option label = candidate summary verbatim** を既に明記。Issue #609 のスクリーンショット `Persist c5 only` は ID 単独ラベルで **L960 違反** — 欠陥は決定的機構でなく orchestrator(LLM) のプロトコル逸脱の一事例。blame: 文言は afdbdc623（2026-07-07 bootstrap）から存在。

### 同型面棚卸し（enumeration-completeness）

stage-protocol.md 内の option-label 規定を全数 grep:

- L11 = annex 参照（規定本体でない）
- L19 = 「Never summarize User Input — use exact option labels」（**ユーザー選択の verbatim 記録**契約 — 別関心事）
- L577 = 監査様式の User Input verbatim 捕捉（別関心事）
- **L960 = §13 learn-candidate option を summary verbatim でラベルする唯一の規定**

**結論**: 否定例（`❌ Persist c5 only`）を足すべきは **L960 単独**。L19/L577 は「post-selection capture(選択結果を要約しない)」の別クラスタで対象外。

### learnings.ts surface 出力契約（材料の充足）

`SurfaceCandidate`（:96-103）は `id`/`source_heading`/`ts`/**`summary`(:100)**/**`context`(:101)**/`default_scope` を持ち、:244-249 で memory.md から verbatim 抽出、:262 で JSON 出力。**意味あるラベルの材料はツール側に揃っており**、欠陥はレンダリング層の遵守のみ。

### question-rendering.md

`.claude/skills/amadeus/question-rendering.md` に `§13`・`candidate`・`verbatim`・`summary` の言及 **0件**。`options[].label` フィールドマッピング（:19）と選択結果 verbatim 捕捉（:62-63）のみで、候補ラベル中身は規定しない。§13 label 規定は stage-protocol.md L960 に一元化。

### 修正方針(Issue #609 / e4 クロスレビュー)

bug / P3 / S4-MINOR 妥当。(a) §13 Step 3(L960) に否定例明記 = docs 強化(本 intent スコープ内・クローズ条件) / (b) レンダリング前 `label ⊇ summary` 検査ガード = 新機構・bugs-only スコープ外。

## Always-rerun-for-freshness の充足

区間28コミットの diff 実測（フォーカス3面 0行）＋現行 file:line（L960 / learnings.ts :96-103, :244-249, :262）の observed HEAD 直読で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および本ファイル。
