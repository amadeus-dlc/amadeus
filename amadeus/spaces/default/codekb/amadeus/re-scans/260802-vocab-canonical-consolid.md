# re-scan: 260802-vocab-canonical-consolid

## メタデータ

- Date: `2026-08-02T10:14:34Z`
- Base commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`（`re-scans/` 中で最新の observed = 260801-tla-multi-model のもの。祖先性実測: `git merge-base --is-ancestor 33e196b80 HEAD` exit 0 — `cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `689c38744cb9f4fcf2eb517e490cb66b3bb58ce8`（origin/main tip、作業 HEAD と完全一致。`git rev-parse HEAD` = observed、`git diff --name-only 689c38744..HEAD` の非 `amadeus/spaces` ヒット 0 件）
- Distance: `55 commits`（`git rev-list --count 33e196b80..689c38744`）
- 区間規模: `1294 files changed, 74567 insertions(+), 10737 deletions(-)`（`git diff --shortstat 33e196b80..689c38744`）。dist 投影と metrics スナップショットを除く正本面は `318 files, +23125/-3158`。
- Scope: `self-fix` → `self-document`、Brownfield、単一 repo `amadeus`
- Focus: Issue #2030 用語定義の正本一本化
- Scan mode: Developer scan 2部（read-only）+ Architect synthesis の verbatim 再実測。#2030 の SHA 刻印付きクロスレビュー2件（issuecomment-5156594879 / issuecomment-5156594946、いずれも `689c38744` で検証）は `cid:reverse-engineering:c1-xrev-scan-mode` 追補の免除条件（引用が observed と一致する SHA で検証済み）を満たすため行番号の再解決は不要 — 本 RE では独立再実測で二重化した。
- 測定 ref: 本ファイルのコード面 file:line・件数はすべて observed `689c38744` のワーキングツリー実測（`cid:reverse-engineering:measurement-ref-in-artifacts`）。codekb 自身への行参照は本 RE 更新後の状態。

## 患部 file:line 全数（用語定義8面）

| # | ファイル | 行数 | 定義語数（実測コマンド） | 区間 touch | 引用再確認 |
|---|---|---|---|---|---|
| ① | `CONTEXT.md` | 25 | 4（`**Term**:` 段落形、表ではない） | なし | ✔ |
| ② | `docs/guide/glossary.md` | 67 | **57**（`grep -c '^| \*\*'`） | なし | ✔ |
| ③ | `docs/guide/glossary.ja.md` | 80 | **57**（同上） | なし | ✔ |
| ④ | `amadeus/spaces/default/knowledge/amadeus-shared/domain-language.md` | 129 | 0（箇条書き、表なし） | なし | ✔ |
| ⑤ | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` §9（`:750`） | 1,181 | **17**（`:756`–`:772`） | なし | ✔ |
| ⑥ | `docs/reference/04-stage-protocol.md` Terminology Glossary（`:774`） | 1,000 | 17（表本体 `:780`–`:797`。ファイル全体の `^| **` は37で他表を含む） | なし | ✔ |
| ⑦ | `docs/reference/04-stage-protocol.ja.md` Terminology Glossary（`:661`） | 848 | 17（同上、全体37） | なし | ✔ |
| ⑧ | `packages/framework/core/knowledge/amadeus-operations-agent/slo-sli-patterns.md:5` | 99 | 4（`## Key Terminology` の箇条書き）+ SLI カタログ表 `:20`–`:25` | なし | ✔ |

区間 touch 判定はすべて `git log --oneline 33e196b80..689c38744 -- <file>` で実施 — **8ファイルすべて出力ゼロ = 区間内で一度も触られていない**。

## 引用再確認（verbatim、全件一致）

- `docs/guide/glossary.md:64` — `| **Unit of work** | An independently implementable piece of the solution, decomposed during stage 2.7 (Units Generation). One or more Units are bundled into a Bolt for Construction. |`
- `docs/reference/04-stage-protocol.md:785` — `| **Unit of Work** | An independently implementable package of features; the Construction iteration unit. One pass through stages 3.1-3.7. |`
- `docs/reference/04-stage-protocol.ja.md:672` — `| **Unit of Work** | 独立して実装可能な機能パッケージ。Construction のイテレーション単位。ステージ 3.1-3.7 を1回通過する。 |`
- `stage-protocol.md:759` — `| **Bolt** | One execution of Construction stages 3.1–3.5 for a Unit … Stages 3.6 (Build and Test) and 3.7 (CI Pipeline) run **once** after all Bolts complete, not per-Bolt. …|` → ⑥⑦ と**正面矛盾**。⑥⑦ は `(Protocol Section 9)` の投影と自称するが ⑤ に該当文言はなく、**投影を自称する独立編集ファイル**であることを確認。
- `docs/guide/glossary.md:30` Guardrail = `The body sections inside a Rule file (…). The container is a Rule; "guardrail" names the prescriptive content within it.` vs `stage-protocol.md:771` Guardrail = `A learned behavioral rule (org-level or project-level) stored in `{{HARNESS_DIR}}/rules/`` → **相互排他**。⑤ の所在記述は退役済み（現行正本は `amadeus/spaces/<space>/memory/`）で、`docs/reference/04-stage-protocol.md:792` は既に `stored in the space memory layer (`amadeus/spaces/<space>/memory/`)` へ更新済み — **⑤ だけが取り残されている**。
- 件数ドリフト: `domain-language.md:128`「ほか全55語」vs ② 実測57語 / `glossary.md:55`「One of 10 named configurations」・`stage-protocol.md:758`「Ten built-in scopes」vs `ls .claude/scopes/ | wc -l` = **15**。
- 語彙集合（機械照合）: `comm -13`（② の語集合 vs ⑤ §9 の語集合、ともに小文字化・sort -u）の出力は **6語** — `aidlc` / `component` / `generation` / `module` / `planning` / `service`。#2030 本文の「7語不在」は当該コメント時点の数え方で、機械照合では6語（要件段で数値を再確定すべき箇所）。
- EN/JA: ②③ ともに `grep -c '^| \*\*'` = 57 で語数一致。JA は `| **Agent（エージェント）** |` 形式で英語トークンが機械ペアリングキーになる。JA のみ `## 表記規則` 節を持つため 67 vs 80 行の非対称があり、ペア照合の対象は用語表本体に限定する要件明示が必要。

## 投影・ロード経路の実測

- `scripts/package.ts`（959 行）`buildTree()`（`:340`）Step 1（`:362`–）が `m.coreDirs` を `walk` → `transform()`。許された変換クラスは `{{HARNESS_DIR}}` 置換（+ rules-dir リネーム）のみ（`:24`–`:28` に「THE TRANSFORM CLASS (T5 — the only permitted text transform)」）。`frontmatterAdditions` の typo ガードは `:384`–`:390` で throw。
- `packages/framework/harness/claude/manifest.ts` `coreDirs`（`:52`–）に `{ src: "amadeus-common", dst: "amadeus-common" }`（`:58`）/ `{ src: "knowledge", dst: "knowledge" }`（`:59`）。
- md-from-md 生成の唯一の先例 = Step 2b（`package.ts:410`–`:419`、`renderOnboarding(...)` の結果を同一 `transform()` に通す）。設計意図は `scripts/onboarding.ts:1`–`:17` に逐語。完全生成物の型は `writeGeneratedPluginSources()`（`:816`）/ `writeNeutralBundle()`（`:854`）。
- self-install 面は `SELF_INSTALL_HARNESSES = ["claude","codex","cursor","opencode","kimi"]`（`scripts/plugin-projection.ts:56`）の5面。`find` 実測で `stage-protocol.md` は **13コピー**（core 1 + dist 7 + self-install 5）。`packages/framework/core/knowledge/amadeus-shared/` は9ファイル。
- knowledge ロード経路（`stage-protocol.md:636`–`:642`）は**実測6段**（6段目 = `Prior stage artifacts as required by the current stage`）。経路2は実在、**経路4の `amadeus/knowledge/` は本リポジトリに不在**（実体は `amadeus/spaces/default/knowledge/`）。
- 着地点候補: A = core knowledge（`coreDirs:59` によりロード順2へ、追加配線ゼロ、**推奨**）/ B = workspace knowledge（出荷されず現状問題の再生産）/ C = amadeus-common（到達性は A と同等だが engine が parse する method tree で責務がずれる）。

## ゲート景観・消費者棚卸し

- `tests/integration/t34-stage-protocol-structure.test.ts` — `REQUIRED_SECTIONS`（`:120`–）に `[9, "Terminology"]`（`:128`）、アサーションは `:136`–`:139` の見出し実在のみ。`:310` の `§5: knowledge loading order has >= 6 numbered steps` は実測6段で**閾値ちょうどの green**（追加は安全、削除・番号振り直しは赤）。
- `tests/unit/t174-docs-legacy-refs-gate.test.ts` — allowlist は exact file + line text ピン + `ceiling` の二段（`:16`–`:20`）。`core/amadeus-common/**` は明示除外（`:43`）で、用語ガードが ⑤ を走査するなら走査範囲の独立宣言が要る。
- `scripts/mirror-docs-contract.ts`（192 行、`TOPICS:15` / `expected:35` / `FORBIDDEN_CONTRACT_CLAIMS:57` / `validateDocument:69` / `validateHelpContracts:104` / `validateMirrorDocs:130` / `mirrorDocsOkMessage:180`）+ `tests/integration/t291-mirror-docs-parity.integration.test.ts:12`・`:28` — doc ↔ ランタイム定数 parity の正準パターン。
- `tests/integration/t48-audit-event-emitters.test.ts`（4面の集合相互照合）/ `tests/unit/t132-hooks-doc-count-sync.test.ts`（件数語 count-free 化 + 隣接列挙の集合等価）/ `tests/integration/t199-generated-prefix-contract.test.ts`（tracked ファイルのパス+バイト検査と allowlist 運用）。
- テスト空白: `grep -rn 'glossary\|domain-language\|CONTEXT\.md' tests/` → **0件**。
- 新規テスト番号: `ls tests/unit tests/integration` の tNNN 実測で最大 **412**、**t413 が最初の空き番号**。層は `tests/integration/`（同型先例 t34 / t48 / t287 / t291 が全て integration）。
- 削除対象の消費者（dual-key grep）: ④ `domain-language.md` は record dir 外で **`.coderabbit.yaml:83` の1件のみ**（`code_guidelines.filePatterns` の一要素）。① `CONTEXT.md` は現 intent の record 以外の参照ゼロ（完全孤立）。

## 区間の構造変化（患部外だが codekb 引用に影響）

- **#2017（区間の最終コミット）**: `packages/framework/core/tools/amadeus-layered-config.ts` → **`amadeus-config.ts`** へ改名、`amadeus-mirror-config.ts` エイリアス削除。テストも `t257-amadeus-config.test.ts` / `t257-amadeus-config.integration.test.ts` へ改名済み（`ls packages/framework/core/tools/ | grep config` → `amadeus-config.ts` のみ）。
- 他クラスタ: #2016 mirror ラベル同期（新規 t412 — 現時点の最大 tNNN）、audit fatal-latch 系（#1959/#1961/#1966/#2000、t404/t405/t408/t409）、plugin graph 検証（#1964/#1996/#2005/#1970、t406/t407/t410/t411）、formal-model-check / cg-plan-guard（#2012/#1928/#1939/#1948）。

## 降格確認（`cid:reverse-engineering:c3-relabel`）

本 RE 更新後の実測（コマンド出力からの転記）:

- `grep -n '260802-vocab-canonical-consolid、現在' *.md` → 本体8成果物の `:3` に各1件（architecture / code-structure / code-quality-assessment / dependencies / component-inventory / business-overview / api-documentation / technology-stack）。
- `grep -c '、現在、observed' *.md` → 本体8成果物すべて **1**（多重現在マーカーなし）。
- `grep -rn '260801-tla-multi-model、現在' *.md | wc -l` → **0**（前 intent の現在マーカーは残存なし）。
- `grep -c '260801-tla-multi-model、履歴' *.md` → 本体8成果物すべて **1**（全文保存のまま履歴へ降格）。
- `grep -n '^## 実行メタデータ' reverse-engineering-timestamp.md` → `:3` が `（現在: 260802-vocab-canonical-consolid）`、`:18` が `（履歴: 260801-tla-multi-model）`。
- 履歴節の file:line は当時の observed 断面を指すため**一切変更していない**（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。#2017 で失効した旧ファイル名の引用は `grep -n 'amadeus-layered-config\|amadeus-mirror-config'` の全域実測で **13行**、いずれも履歴節に所在（`architecture.md:524`/`:587`/`:589`/`:1901`、`code-structure.md:384`/`:466`/`:1168`、`api-documentation.md:409`、`component-inventory.md:284`/`:292`、`dependencies.md:336`/`:437`、`technology-stack.md:261`）— verbatim 保持し、現行節には旧名を持ち込んでいない（現行節での言及は改名事実の記述のみ）。

## Developer scan からの訂正

- scan §4 / リスク8 は knowledge loading order を「実測5段なのに `t34:310` の `>= 6` が green」と記録したが、本 synthesis の再実測で **6段**（`stage-protocol.md:637`–`:642`）と確定。`t34:310` は閾値ちょうどで truthful green であり、「green である機序の確認」という未決事項は解消した。ロード経路の**追加は安全**、削除・番号振り直しは赤になる。
