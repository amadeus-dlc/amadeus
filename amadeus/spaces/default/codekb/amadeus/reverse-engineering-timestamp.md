# reverse-engineering-timestamp：amadeus

## 差分更新の記録（最新）

- 解析時刻: 2026-07-06T08:40:00Z（UTC）
- 対象コミット: 0075f931（origin/main = PR #564 merge 後）
- 解析方式: 差分更新（1aed7eb1..0075f931 = PR #564 model overlay のみ = component-inventory / architecture / api-documentation へ外科的追記、eval 数 31→32 実測補正。#566 分は下の 260706-doctor-guidance の 08:30 更新が、#561/#563/#565 分は 260706-feature-diff の 07:58 更新が反映済みのため対象外へ補正 = rebase 時の時系列 union）
- 実施 Intent: `260706-adr-vocab`（reverse-engineering、メイン直接処理）

## 前回（2026-07-06T09:06:00Z、b452f4fb..19662e50 = journal-logger。残差分のみ有効）の記録

- 実施 Intent: `260706-journal-logger`（reverse-engineering、conductor 直接処理）
- 当初 3 PR（#566/#564/#574）を対象に code-structure / component-inventory / api-documentation を更新したが、rebase 統合で #564 分の component-inventory / eval 数は 260706-adr-vocab の 08:40 更新（上の最新記録）を正とし当方分を破棄。有効な残差分は api-documentation.md の apply-model-overrides 行 1 件のみ（main に不在を確認して再適用）。

## 前回（2026-07-06T08:30:00Z、29f3122c..1aed7eb1 = doctor-guidance）の記録

- 解析時刻: 2026-07-06T08:30:00Z（UTC）
- 対象コミット: 1aed7eb1（origin/main = PR #566 merge 後）
- 解析方式: 差分更新（29f3122c..1aed7eb1。並行 Intent 260706-feature-diff の 07:58 更新 = 9dd93f50..b452f4fb と一部重複し、本更新の実質増分は #566 = runtime-compile の path alternation + surface 自己修復 → architecture の hooks 行と api-documentation の surface 行へ追記。#565 の architecture skills 行への追記も本更新で実施 = feature-diff 側は code-structure / component-inventory を更新しており相補）
- 実施 Intent: `260706-doctor-guidance`（reverse-engineering、メイン直接処理）

## 前回（2026-07-06T07:58:00Z、9dd93f50..b452f4fb = feature-diff）の記録
- 解析時刻: 2026-07-06T07:58:00Z（UTC）
- 対象コミット: b452f4fb（origin/main = PR #565 merge 後）
- 解析方式: 差分更新（9dd93f50..b452f4fb = PR #559/#561/#563/#565 の 4 PR、非 amadeus 変更 115 ファイル）
- 実施 Intent: `260706-feature-diff`（reverse-engineering ステージ、conductor 直接処理 = #565 の当事者知識と docs 中心差分のため）

### 差分の内容と codekb への影響

- PR #559（エンジン修正 3 件）: Intent 260706-runtime-graph-registrati の同時期増分（9dd93f50..29f3122c）が architecture / api-documentation へ反映済み（下の前回記録を参照）。本増分では追加更新なし。
- PR #561（lifecycle 契約の I/O 記法定義 + 全ステージ Inputs 実測整合）、PR #563（steering/guide の docs i18n）: docs のみで codekb 記述対象に乖離なし。
- PR #565（harness/codex 新設 + openai.yaml 38 件 + scanRoots 追加 = #552）: 新しいトップレベル層 harness/ が誕生。更新 2 docs = code-structure.md（harness/codex/ 行の新設）、component-inventory.md（Codex guard 行の新設）。
- 変更なし 7 docs: business-overview / architecture / api-documentation / technology-stack / dependencies / code-quality-assessment（#559 の修正は既存の記述粒度で吸収済み）/ timestamp（本更新の対象）。

## 前回（2026-07-06T07:50:00Z、9dd93f50..3366cd69）の記録

- 解析時刻: 2026-07-06T07:50:00Z（UTC）
- 対象コミット: 3366cd69（origin/main = PR #563 merge 後）
- 解析方式: 差分更新（9dd93f50..3366cd69 = PR #559 / #561 / #563 の 3 PR。#561 / #563 は docs-only）
- 実施 Intent: `260706-guide-intro`（reverse-engineering ステージ）

| artifact | 変更内容 |
|---|---|
| architecture.md | 検証（reference-resolution）行へ #548（PR #559）の RE produces 共有 codekb 直接解決を追記（stub 必須の前提が変わったため。同旨は並行 Intent 260706-runtime-graph-registrati の 06:52 更新にも反映され、現行本文は両者の統合） |
| その他 8 docs | 影響なし（PR #559 の残り = log-subagent 完了ガードと agent_type 既定（#555）、complete-workflow の Scope 二重読み解消は hooks / エンジン内部の細部で、codekb の記述粒度では既存記述が引き続き正確。#561 / #563 は docs-only） |

## 前回（2026-07-06T06:52:00Z、9dd93f50..29f3122c）の記録

- 解析時刻: 2026-07-06T06:52:00Z（UTC）
- 対象コミット: 29f3122c（origin/main = PR #559 merge 後）
- 解析方式: 差分更新（9dd93f50..29f3122c = PR #559 エンジン整合 3 bug のみ。complete-workflow の末尾 skip 整合と next の none 解決 = api-documentation、hooks 完了ガードと validator codekb 直接解決 = architecture を外科的に更新）
- 実施 Intent: `260706-runtime-graph-registrati`（reverse-engineering、メイン直接処理）

## 前回（2026-07-06T06:05:00Z、c50a0fe5..9dd93f50）の記録

- 解析時刻: 2026-07-06T06:05:00Z（UTC）
- 対象コミット: 9dd93f50（origin/main = PR #553 merge 後）
- 解析方式: 差分更新（c50a0fe5..9dd93f50 = PR #553 の全面 rename のみ。codekb 自体は #553 内で rename 反映済み）
- 実施 Intent: `260706-docs-i18n`（reverse-engineering ステージ）

| artifact | 変更内容 |
|---|---|
| architecture.md | 旧名残存 1 件を修正（docs-only 宣言の説明「aidlc/ 内文書」→「amadeus/ 内文書」） |
| その他 8 docs | 影響なし（#553 の codekb への rename 反映は同 PR 内で実施済み。本 timestamp の過去記録内の「非 aidlc 変更」等の表現は歴史的記述として維持） |

## 前回（2026-07-06T05:44:48Z、c50a0fe5..9dd93f50）の記録

- 解析時刻: 2026-07-06T05:44:48Z（UTC）
- 対象コミット: 9dd93f50（origin/main = PR #553 merge 後）
- 解析方式: 差分更新（c50a0fe5..9dd93f50 = PR #553 全面 rename のみ。挙動不変のため、名前空間再定義 1 行と rename-leftovers の役割記述だけを更新。path 表記は #553 内で更新済み）
- 実施 Intent: `260706-engine-consistency`（reverse-engineering、メイン直接処理）

## 前回（2026-07-06T04:04:37Z、33c40271..c50a0fe5）の記録

- 解析時刻: 2026-07-06T04:04:37Z（UTC）
- 対象コミット: c50a0fe5（origin/main = PR #550 merge 後）
- 解析方式: 差分更新（33c40271..c50a0fe5 の非 aidlc 変更 17 ファイル = PR #544/#545/#546/#549/#550）
- 実施 Intent: `260706-full-rename`（reverse-engineering ステージ、Maintainer 指示によるメイン直接処理）

| artifact | 変更内容 |
|---|---|
| code-structure.md | evals 29→31（rename-leftovers / linter-sensor 追記） |
| component-inventory.md | evals 29→31、sensors 行を新設（linter sensor の 2 段検出 #538） |
| code-quality-assessment.md | eval 数 29→31 |
| その他 6 docs | 影響なし（#545/#546/#549 は knowledge 文書・README の追加更新で、codekb の記述対象に乖離を生じない） |

## 前回（2026-07-06T01:53:29Z、2a0a784b..33c40271）の記録

- 解析時刻: 2026-07-06T01:53:29Z（UTC）
- 対象コミット: 33c40271（HEAD、branch: eng1/issue-537-538-540-bugfix）
- 解析方式: 差分更新（2a0a784b..33c40271 の非 aidlc 変更 = PR #536/#539/#542 の 3 PR）
- 実施 Intent: `260706-rename-lint-fixes`（reverse-engineering ステージ）

| artifact | 変更内容 |
|---|---|
| architecture.md | audit イベント総数 70→71（RECOMPOSED 追加）、Adaptive Workflows（composer agent dispatch / recompose / validate-grid / composed scope 共存規約）の 1 文を scope 体系節に追記 |
| component-inventory.md | agents 13→14（amadeus-composer-agent）、scope skill 行に amadeus-compose（packaging）追記、parity 基準 commit fde1e1af→b67798c3 |
| api-documentation.md | amadeus-utility.ts に detect --json / recompose 追記、amadeus-graph.ts に validate-grid 追記、/amadeus compose 入口行を新設 |
| dependencies.md | 上流基準 fde1e1af→b67798c3（2.2.0 Adaptive Workflows）へ更新 |
| code-structure.md | skills 数（42/45）と amadeus-compose 追記、docs/amadeus 言語方針（英語正 + ja 併置）を追記 |
| code-quality-assessment.md | 強み行に parity-baseline 再生成と C11 provenance gap 解消（#542）を追記 |
| technology-stack.md | 影響なし（変更なし） |
| business-overview.md | 影響なし（変更なし） |
| timestamp.md | 更新履歴へ 1 行追記 |

## 前回（2026-07-06T01:20:00Z、2a0a784b..7829d99a）の記録

- 解析時刻: 2026-07-06T01:20:00Z（UTC）
- 対象コミット: 7829d99a（origin/main = PR #536 merge 後）
- 解析方式: 差分更新（2a0a784b..7829d99a の非 aidlc 変更 = PR #536 のみ。8 ファイル、+186 行）
- 実施 Intent: `260706-readme-refresh`（reverse-engineering ステージ）

| artifact | 変更内容 |
|---|---|
| 全 9 docs | 影響なし（PR #536 は docs-only: `docs/amadeus/language-policy.md` / `extension-guide.md` とその `.ja.md` の新設、AMADEUS.md / README.md / steering.md / skill-language-policy.md へのポインタ追記。エンジン・tools・evals・skill 実装に変更がなく、codekb の記述対象に乖離は生じない） |

## 前回（2026-07-06T00:25:00Z、616d063e..2a0a784b）の記録

- 解析時刻: 2026-07-06T00:25:00Z（UTC）
- 対象コミット: 2a0a784b（origin/main = eng3/issue-509-532-docs 分岐点）
- 解析方式: 差分更新（616d063e..2a0a784b の非 aidlc 変更 = PR #531 のみ。9 ファイル）
- 実施 Intent: `260706-docs-lang-guide`（reverse-engineering ステージ）

| artifact | 変更内容 |
|---|---|
| component-inventory.md | eval 数 28→29（persist-cid-metamain 追加。新規 4 種の列挙へ更新） |
| code-structure.md | eval 数 28→29 |
| code-quality-assessment.md | eval 数 28→29、強み 2 項目追加（#504 = cid 新形式 + 戻り値分離、#507 = import 副作用ゼロ + 回帰走査） |
| その他 6 docs | 影響なし（変更なし。PR #531 の変更は learnings persist 内部と tools 末尾ガードで、architecture の seam 記述・API 表・依存関係の粒度では既存記述が引き続き正確） |

## 前回（2026-07-05T23:25:37Z、3049eadf..616d063e）の記録

- 解析時刻: 2026-07-05T23:25:37Z
- 対象コミット: 616d063e（origin/main）
- 解析方式: 増分更新（差分駆動。フル再解析ではない）
- 旧解析基準: 3049eadf（2026-07-05T12:25:00Z、PR #496 で全面再解析を反映した基準）
- 差分規模: 39 files changed, +2700/-56（`aidlc/` 配下を除く。`git diff --stat 3049eadf..616d063e -- . ':(exclude)aidlc/'`）

## 本更新の実施経緯

Intent `260705-persist-cid-metamain`（scope: bugfix）の reverse-engineering ステージから実行した。
本更新自体が、PR #505（#498 修正）による codekb produces 解決の正規経路の初実走である。
修正前は、linked worktree（本 worktree = `engineer3`）から実行すると `codekbRepoName` が `basename(projectDir)` にフォールバックし、`amadeus/spaces/<space>/codekb/engineer3/` のような worktree 名ディレクトリへ produces が分裂しうる欠陥があった。
`.agents/amadeus/tools/amadeus-lib.ts` の `gitMainRepoName`（`git rev-parse --git-common-dir` 由来の主リポジトリ名解決）により、この worktree からの実行でも `amadeus/spaces/default/codekb/amadeus/`（本ディレクトリ）へ正しく解決されることを、`dev-scripts/evals/docs-codekb-guards/check.ts` の回帰検査で確認済みの状態から実施した。

## 差分の主な内容（3049eadf..616d063e、非 aidlc）

- PR #489: `pdm` scope 新設（`.agents/amadeus/scopes/amadeus-pdm.md`、`scope-grid.json` / `stage-graph.json` の再コンパイル、Ideation 6 stage + Inception 3 stage の frontmatter 更新、validator の `scopeValues` 追加、`docs/amadeus/lifecycle/scopes.md` 更新、`dev-scripts/evals/pdm-scope/`）。企画・要求定義止まりで Construction / Operation を持たない Amadeus 独自 scope（上流に対応なし、parity 例外宣言 = #429）。
- PR #505: `workspace_requires` ガードの docs-only 免除機構（Issue #499 — `amadeus-lib.ts` の `setIntentDocsOnly` / `docsOnlyDeclaration`、`amadeus-state.ts` の `declare-docs-only` サブコマンドと `verifyStageArtifacts` の免除分岐、`GUARD_EXEMPTED` イベント新設で audit event registry が 69→70 件、`audit-format.md` 更新）。あわせて codekb repo キー解決の修正（Issue #498 — `gitMainRepoName`）と、validator の codekb-adoption reference-stub 参照解決検査（Issue #501 — `skills/amadeus-validator/**`、`.agents/skills/amadeus-validator/**`）、新規 eval `dev-scripts/evals/docs-codekb-guards/`、`package.json` の `test:it:docs-codekb-guards`。
- PR #508: 配布インストーラ新設（`scripts/amadeus-install.ts`、`npm run amadeus:install`、`dev-scripts/evals/installer/`、`package.json` / `tsconfig.json` 更新、README.md / README.ja.md の Install セクション追加）。

## 更新した codekb doc（9 件中 7 件）

- `component-inventory.md`: installer entry point、`pdm` scope 定義ファイル、eval 数（25→28）を追記。
- `architecture.md`: docs-only ガード免除seam（`GUARD_EXEMPTED`）と validator の reference-resolution 検査（codekb stub、#501）を追記。
- `code-structure.md`: 未記載だった `scripts/` トップレベル dir を追加、eval 数を更新。
- `api-documentation.md`: `amadeus-state.ts declare-docs-only` サブコマンドと `npm run amadeus:install` を追記。
- `code-quality-assessment.md`: eval 数更新、パス解決の固定深度仮定の再発実例に #498 を追加、codekb 鮮度検査の弱みに #501 の部分的緩和（参照実在チェックのみ）を追記。
- `dependencies.md`: registry docsOnly → workspace_requires ガードの依存、reverse-engineering 成果物 → codekb 正準ファイルの依存（#501）を追加。
- `business-overview.md`: 外部 workspace への配布インストール（#451）を中核の運用モデルに 1 行追記。

## 変更しなかった codekb doc（9 件中 2 件）

- `technology-stack.md`: 差分に含まれる `mise.toml`（node バージョン pin）と `tsconfig.json` の include 追加は、ビルド設定の細部でありスタック判断（Bun + TypeScript 全面採用、npm 依存を増やさない方針）自体は不変のため変更なし。
- `timestamp.md`: 本更新の対象そのもの（このファイル）。

## 並行更新の統合記録

engineer1 の Intent `260705-upstream-sync`（Issue #428、commit 503a7aa9）が同時期に同じ 7 docs を差分更新していたため、leader 調整（codekb は生成物として「再生成を正とする」、先行 merge PR が現行 main 分を運ぶ）に基づき、両者の内容差を本 branch へ統合した。統合で取り込んだ engineer1 側デルタ: architecture.md の scope 体系節、code-structure.md の mise.toml 行、technology-stack.md の mise 行、code-quality-assessment.md の強み 2 項目、本ファイル（reverse-engineering-timestamp.md）の新設方式、timestamp.md の追記型履歴の維持。engineer1 は本 PR の merge 後に rebase して自分の codekb 変更を落とし、2.2.0 取り込みで新たに必要になる分だけを更新する。

更新履歴の正は [timestamp.md](timestamp.md) を参照する。
