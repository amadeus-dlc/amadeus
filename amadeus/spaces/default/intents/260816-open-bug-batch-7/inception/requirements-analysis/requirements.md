# Requirements — 260816-open-bug-batch-7(open bug 3 件の修正)

## Intent 分析

open bug 3 件(#2363 / #2162 / #3097)を、1 Issue = 1 Unit = 1 PR の並行構成で修正し、オープンバグを削減する。3 件は相互独立でファイル交差がない(RE 実測: codekb `code-structure.md` の patch surface 配置)。いずれも「新機能」ではなく既存の合意済み契約への回復・整合であり scope = self-fix が適合する。要件の根拠は本 intent の RE が更新した codekb 3 面 — `business-overview.md`(業務影響)、`architecture.md`(3 バグの機序と RFC-0001 着地後の構造)、`code-structure.md`(patch surface 配置)— および各 Issue 本文と質問裁定(requirements-analysis-questions.md の Q1〜Q3、いずれも AUTO_DECIDED)。

前提知見(RE で確定、Issue 本文を上書きする 3 点): #2363 の実害は §12a reviewer read-only allowlist の未配布 1 点。#2162 は起票時 3 不整合中 2 つが台帳移行で消滅済みで現存欠陥は 2 点。#3097 の同期先は 14 でなく matches 宣言 13 件 + 値陳腐化 2 行。

## 機能要件

### FR-PI-1: pi を dogfood self-install 配布集合へ追加する

`scripts/promote-self.ts:64-71` の `managedDirs`、`scripts/plugin-projection.ts:59` の `SELF_INSTALL_HARNESSES`、`packages/framework/core/tools/data/self-install-allowlist.ts:12-19` の `GENERATED_SELF_INSTALL_ROOTS` の 3 面へ pi を追加する(Q1 裁定 = A)。
受け入れ確認: `bun run build` + promote-self 実行後、配送先ツリー `.pi/agents/` に charter 15 件が実在し、`amadeus-architecture-reviewer-agent.md` が `tools: read, grep, find, ls`(pi 形)を持つ(cid:requirements-analysis:c2-acceptance-at-delivery-tree — ソース断面でなく配送先の述語)。

### FR-PI-2: `.pi` ルートの ignore/attributes 生成を pi の vendor 例外と両立させる

`GENERATED_SELF_INSTALL_ROOTS` から導出される `.gitignore` / `.gitattributes` 面へ `.pi` を追加しつつ、pi の dot-gitignore が規定する `!/.pi/vendor/` 系の否定パターン(commit-visible 維持)と衝突させない。
受け入れ確認: `bun run source-only:check` green、かつ promote-self 後の `git status` に `.pi` 由来の追跡汚染が 0 件。

### FR-PI-3: 配布集合の固定件数ピンと docs を同一変更で同期する

固定件数ピンのテスト 3 本(`tests/integration/t-plugin-projection-packaging.test.ts:148-149`、`tests/unit/t-plugin-projection.test.ts:308`、`tests/unit/t209-promote-self-dangling-symlink.test.ts:143-150`)を新集合(6 ハーネス)へ更新し、`docs/reference/11-contributing.md:47` の 6 ルート列挙ほか関連 docs(en/ja)を同期する。
受け入れ確認: 3 本が pi 追加前に Red・追加後に Green であること(TDD の Red 実測点)。

### FR-NSD-1: `postRevision` へ git 到達性検査を追加する

`tests/no-silent-drop/bootstrap.ts` の provenance 検証で、`postRevision` に `preRevision` と対称の検査(`:352-356` の gitObjectExists + strict-ancestor 相当)を追加する(Q2 裁定 = A の (i)。現行は `:358`→`:283` の文字列等値のみで、dangling commit `fc49f8de` を検出できない)。現行 `bootstrap-provenance.json` の postRevision は到達不能のため、検査追加は provenance の再束縛または fallback 面の再設計と不可分 — 方式(修復 vs 退役)は application-design で裁定する。
受け入れ確認: 到達不能 postRevision の negative test が型付き診断 + 非 0 終了で fail-closed(落ちる実証つき)。

### FR-NSD-2: `baselineAtRevision` の死経路を除去する

`tests/no-silent-drop/ledger.ts:226-227` の `baselineAtRevision`(`git show <sha>:tests/no-silent-drop/baseline.json` — 不在ファイル参照)と `:301-302` の `CANONICAL_PATHS.baseline` を除去し、これを固定する negative test(`tests/integration/no-silent-drop-gate.test.ts:839`)を events 台帳前提の検査へ書き換える(Q2 裁定 = A の (ii))。
受け入れ確認: production 経路からの `baseline.json` 参照が 0 件(検索述語併記の grep 実測)、既存 suite green。

### FR-SEN-1: 07-sensor-system の matches 表を実在 13 件へ同期する

`docs/reference/07-sensor-system.md:199-207` / `.ja.md:199-207` の表を「`matches` 宣言を持つ 13 manifest」へ同期する — 欠落 4 行(`amadeus-nfr-budget.md` / `amadeus-pr-convergence-report-format.md` / `amadeus-question-budget.md` / `amadeus-scope-sizing.md`)の追加と、陳腐化 2 行(`amadeus-required-sections.md` / `amadeus-upstream-coverage.md` の `codekb` glob 欠落)の是正(Q3 裁定 = A)。`amadeus-git-drift.md`(matches 非宣言)は追加しない。
受け入れ確認: en/ja 同一変更、FR-SEN-2 の拡張検査が green。

### FR-SEN-2: t3028 の件数フリー検査対象へ 07 を追加する

`tests/integration/t3028-sensors-docs-sync.integration.test.ts` の検査対象(現行 `covers: docs/harness-engineering/06-sensors.md` + `.ja.md` のみ)へ 07(en/ja)の matches 表を追加する。対象集合は `derivedCorpus()` のうち matches 宣言を持つサブセット(13 件)を導出する件数フリー契約とする。
受け入れ確認: 落ちる実証 — 07 の表 1 行を注入的に崩して Red を実測 → revert(残渣ゼロ機械確認)→ 同期後 Green(cid:code-generation:falling-proof-injection-one-set)。

## 非機能要件

- 現行のブロッキングゲート全通過: `bun run typecheck` / `bun run lint` / フルスイート(`bash tests/run-tests.sh --ci`)/ Project Coverage Gate(絶対 AND 相対)/ Patch Coverage Gate / 生成物 drift 検査 / source-only 境界検査(project.md § Testing Posture)
- TDD 既定: 各 FR の実装は合意済み seam への失敗テスト 1 件の Red 実測から始める(team.md § Testing Posture)
- 検証順序は push-first / remote-first(cid:code-generation:push-first)

## 制約

- Bolt 実装は git worktree 分離(cid:code-generation:solo-bolt-worktree-required)。1 Issue = 1 Unit = 1 PR(units-generation / delivery-planning EXECUTE を recompose 済み — oq-singleton 回避)
- 3 Issue ともクロスレビュー 2 名未成立のため、実装バッチ組み込み前に成立させる(cid:requirements-analysis:issue-cross-review。スコープ裁定 cid:scope-definition:bugfix-scope-for-bug-intents の前提)
- FR-PI-* は `packages/framework/core/` 正本変更を含むため、build と再現性検査は manifest が発見する全ハーネスを対象とする(DECIDED: bt-dist-regen-seven-harnesses)

## 前提

- pi は candidate harness のまま dogfood 配布に加える(昇格の一般基準の明文化は本 intent では行わない — Issue #2363 論点 3 は残置)
- #2162 の「fallback 経路が実運用で必要か」は application-design の方式裁定の入力とする(通常 CI 経路は events/ 存在分岐で fallback を通らないことが RE で実測済み)

## Out of scope

- #2363: self-install 集合 3 重定義の単一正本化(別 enhancement 候補として残す)、外部 setup CLI 経路(無傷)、candidate harness 昇格基準の一般文書化
- #2162: adoption evidence 側(#2156 系)、no-silent-drop ゲート本体の意味論変更
- #3097: 06 側の変更(t3028 で同期済み)、07 の matches 表以外の節(48-49 行の例示表は網羅意図なしのため対象外)
- 07-sensor-system.md の例示表・散文列挙(:48-49, :380-386)の書き換え

## Open questions(後続ステージへ)

- application-design: FR-NSD-1 の方式裁定 — (a) provenance を到達可能 revision へ再束縛して修復 (b) legacy bootstrap fallback 面ごと退役(破壊的変更は許容される方針だが、`no-silent-drop-gate.test.ts` の fixture 群が fallback を検査しているため影響棚卸しが必要)
- units-generation: Unit 境界は Issue 単位(pi-distribution / nsd-provenance / sensor-docs-sync)を基本とし、source と test の ownership を同一境界へ揃える(cid:units-generation:c1)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-16T13:41:00Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md は stage 契約 Step 10 の必須7節を備え、FR 7件(Minimal帯 5-10 に適合)は全て安定id・受け入れ確認1行を持つ。Q1〜Q3(AUTO_DECIDED)の裁定は FR へ正しく反映され、既決事項の再質問はない。上流3面(business-overview/architecture/code-structure)との引用整合も逐一確認でき、捏造・矛盾は検出されなかった。BLOCKERなし。軽微な出典・テスト網羅性のギャップを FOLLOW-UP 2件、見出し言語の不統一を NIT 1件として記録する。

### Findings

- FOLLOW-UP | FR-PI-1 の受け入れ確認「配送先ツリー `.pi/agents/` に charter 15 件が実在」の「15」という数値が、レビュー対象の上流3面(business-overview.md / architecture.md / code-structure.md)のいずれにも出典が無い。Q1 の根拠は「RE実測(codekb `architecture.md` / `component-inventory.md` の #2363 節)」だが、`component-inventory.md` は本stageの `consumes:`(business-overview / architecture / code-structure のみ、brownfield条件)にも今回のレビュー範囲にも含まれず、検証不能。team.md cid:requirements-analysis:numbers-from-command-output-only に従い、実測コマンドまたは出典artifactを明記すべき。
- FOLLOW-UP | FR-PI-2 本文は「pi の dot-gitignore が規定する `!/.pi/vendor/` 系の否定パターンとの非衝突」を要求するが、受け入れ確認は「`bun run source-only:check` green かつ promote-self後の `git status` に `.pi` 由来の追跡汚染が0件」のみで、逆方向の失敗様式(既存vendor配下ファイルが誤ってignore対象になり追跡から脱落する)を検出できない。この facet の検証観点を application-design / code-generation で明示的に補うべき。
- NIT | requirements.md の見出し言語が不統一(「## Out of scope」「## Open questions」のみ英語のまま、他5節は日本語訳済み)。project.md Code Style の「markdown artifact は日本語で書く」原則に沿って統一するか、英語維持の理由(tool要求等)を明記されたい。

## 修正履歴(承認後の裁定による上書き)

- 2026-08-16(ユーザー裁定、実 HUMAN_TURN): #2162 のクロスレビュー(独立 2 名)が REFRAME_REQUIRED で収束 — 報告欠陥は台帳移行 PR #2353/#2338 で解消済み、fallback は現行で正常動作(両名の repo 外実走 exit 0)。ユーザー裁定 A により #2162 はクローズし、残余ギャップを **#3155** へ切り出した。**FR-NSD-1 / FR-NSD-2 は #3155 のスコープ(陳腐化 provenance 値の扱い・baselineAtRevision 死経路除去・実 artifact 非束縛 fixture / rebind 欠落の処遇)へ再束縛**し、旧文面の前提(「恒久 fail-closed」「到達性検査の不在が実害」)は失効。unit nsd-provenance の対象 Issue は #2162 → #3155 へ変更。方式は application-design の D1 が失効したため再裁定を要する
