# Requirements — 260730-skill-reviewer-fixes(#1736 / #1711)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 利用者影響と delivery boundary は business-overview.md 現在節、両バグの機構事実(file:line)と修正候補の制約は architecture.md 現在節(機構 A/B)、患部13ファイルの配置と投影経路・テスト面配置は code-structure.md 現在節から導出した。測定 ref: observed `278d61d8e`。

## Intent 分析

Amadeus ワークフローの進行を止める2つの欠陥を除去する。(1) #1736: 新規 Intent 開始という**入口**が SKILL の指示どおりだと必ず Usage エラーで止まる。(2) #1711: units-generation を SKIP する degrade スコープ(fix / self-fix 系ほか)で code-generation の **§12a レビューゲート**が構造的に拒否される。どちらも「壊れた指示・未解決テンプレート」という記述面の欠陥が実行面の停止として顕在化するクラスで、修正は正本の是正+全 harness 配布面の同期+再発をピンする regression テストで閉じる。1 Issue = 1 Bolt = 1 PR(ユーザー指示、計2 Bolt)。

## FR-1(#1736): SKILL の new-work 経路を正所有者の verb へ是正する

- **FR-1a**: SKILL 正本5ファイル(packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide}/skills/amadeus/SKILL.md — 患部行は claude/kimi = :116、codex = :112、kiro/kiro-ide = :118、全て同一文)の「On CONFIRM」の指示を `bun <harness-dir>/tools/amadeus-utility.ts next --new-intent ...` から `bun <harness-dir>/tools/amadeus-orchestrate.ts next --new-intent ...`(各 harness の実パス表記に従う)へ是正する。文の他の要素(--scope、--new-intent、説明)は不変。
- **FR-1b**: dist 5面+自己インストール3面(計13箇所、code-structure.md 現在節の患部表)は正本編集後の `bun scripts/package.ts`(7ハーネス全数)+ `bun run promote:self` の再生成で同期し、手編集しない。受け入れ基準: **tracked な SKILL.md 群(正本 `packages/framework/harness/*/skills/amadeus/SKILL.md`・dist 配下・自己インストール配下の同名面)に限定した** `git ls-files -z -- '*skills/amadeus/SKILL.md' | xargs -0 grep -ln "amadeus-utility\.ts next"` が 0 件(検査対象は FR-1c の述語と同一スコープ)。注: repo 全域では codekb 記録3ファイル(component-inventory.md:7、api-documentation.md:11、reverse-engineering-timestamp.md:12)が本バグの説明散文として同一文字列を恒久的に引用するため(修正後実測でも3件残存見込み)、全域 0 件は AC にしない — 履歴記録は修正対象外。
- **FR-1c**(regression): 誤指示の再発をピンする決定的テストを追加する。検査述語: 全 tracked SKILL.md(および将来の同型面)に対し「`amadeus-utility.ts next` を含む行が 0 件」かつ「`--new-intent` の指示行は `amadeus-orchestrate.ts next` を指す」を grep で検査する。既存 t176(tests/integration/t176-new-work-offer-second-intent.test.ts — assert は reg.length と label 形状のみで経路を見ない構造的盲点)は変更せず、この静的述語テストを別途新設する(落ちる実証: 正本1ファイルを旧文へ戻すと赤、を注入で確認してから完成扱い)。
- **FR-1d**: amadeus-utility.ts 側への `next` verb 追加(互換シム)は行わない(org.md Forbidden: 要求されない互換レイヤー禁止。正所有者は orchestrate — amadeus-orchestrate.ts:2405-2412 に `--new-intent` 実装済み)。

## FR-2(#1711): degrade 経路の `{unit-name}` を engine 側で解決する(裁定 A)

- **FR-2a**(裁定 A、ユーザー承認 2026-07-30T12:58:39Z — questions ファイル「裁定の記録」参照): units-generation SKIP スコープの per-unit ステージ directive 発行時(amadeus-orchestrate.ts:3050-3057 の degrade 分岐)、`{unit-name}` プレースホルダを**実在の unit ディレクトリ名へ解決してから** emit する。解決元は `<record>/construction/` 直下の実在ディレクトリとする。
- **FR-2b**(fail-closed): 実在 unit が一意に確定できない場合 — `construction/` 未作成・実在 unit 0 件・複数件で対象を特定できない — は、無音 fallback や placeholder のままの emit をせず、**明示エラー(error directive)で conductor へ差し戻す**。エラーメッセージは不足条件(未作成/複数)と、conductor が取るべき操作(unit ディレクトリの作成 or 特定)を名指しする。
- **FR-2c**(テスト契約の明示改訂): 現挙動をピンする t186 test 5(:351)/test 11(:492)と t116 test 9/10(:380-397)の期待値を新契約(解決済み unit 名 or fail-closed エラー)へ改訂する。改訂は「仕様裁定に基づく契約変更」としてコミットメッセージ・PR 本文に明記する(:3052 の「Zero behaviour change off this path」コメントも新契約の記述へ更新)。
- **FR-2d**(非対称の解消確認): produces の解決後、consumes 側の placeholder 逃がし(amadeus-orchestrate.ts:1771-1774)との整合を再点検する — degrade 経路で consumes にも `{unit-name}` が残る場合は同じ解決を適用し、対称性(cid:requirements-analysis:symmetric-pair-review)を回復する。
- **FR-2e**(regression): degrade スコープの code-generation directive が (i) 実在 unit 1件のとき解決済みパスで emit され、reviewer-runtime `scope` が exit 0 で通ること (ii) unit 0件/複数件のとき fail-closed エラーになること、の両側をテストで固定する(落ちる実証必須)。
- **FR-2f**(暫定ノルムの回収): 着地後、conductor 手作業回避を定めた暫定ノルム(project.md cid:code-generation:degrade-scope-unit-dir-layout の E-TPRCGS13 追補)へ「#1711 修正着地により手作業解決は不要」の追補を §13 経由で提案する(本 intent の build-and-test 完了後)。stage-protocol.md:898 の「unchanged directive JSON」契約は修正後そのまま成立する(engine が最初から解決済み JSON を渡すため)。

## NFR / 制約

- **N-1**: 変更は surgical に保つ(P5)。FR-1 は SKILL 5ファイルの当該行+新規テスト、FR-2 は degrade 分岐周辺+当該テスト改訂に限定し、無関係リファクタを同乗させない。
- **N-2**: 正本→dist 7ハーネス→自己インストールの3面同期を各 PR 内で完結する(cid:build-and-test:bt-dist-regen-seven-harnesses、Mandated: dist:check / promote:self:check green)。
- **N-3**: PR/CI 基準は `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` 相当の関連プロファイル+push 前 lcov で diff 追加行の未カバー 0(cid:code-generation:local-lcov-pre-push)。
- **N-4**: 本 intent 自身が self-fix スコープ = #1711 の直撃経路で code-generation を実行する(business-overview.md 現在節)。Bolt 2(#1711)の §12a レビューは、修正着地前は暫定ノルムどおり conductor が実 unit 名で解決した directive を渡して実施し、その事実を stage diary に記録する。

## 前提

- #1736 の正所有者判断(utility に verb 追加せず SKILL を直す)は Issue #1736 の「期待する動作」および本セッションでのライブ再現(diary Deviations 2026-07-30T12:49:04Z — select-intent 後に utility 経路が Usage エラー、orchestrate 経路で birth 成功)に基づく。
- cursor / opencode は SKILL.md を持たず command 面は orchestrate を指しており患部外(architecture.md 現在節)。

## Out of scope

- amadeus-utility.ts への `next` verb 追加(FR-1d で明示排除)。
- t176 のライブ経路 assert 強化(構造的盲点の恒久対策は FR-1c の静的述語で足りる。ライブ側の強化が必要なら別 Issue)。
- #1711 候補 B/C(reviewer-runtime 側解決・存在検査免除)— 裁定 A で棄却。
- per-unit ループ本体(bolt_dag あり経路)の挙動変更。

## Open questions(後続ステージへ)

- FR-2b の「複数 unit から特定できない」ケースで、state(Current Bolt 等)から一意化できる情報があるなら fail-closed の前に使ってよいか — code-generation の設計時に実装可否を実測して確定する(使う場合も無音 fallback ではなく決定的規則として文書化)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T13:04:21Z
- **Iteration:** 1
- **Scope decision:** none

FR-1a/1c/2a-2e/citationsは実測で正確だが、FR-1bの受け入れ基準(repo全域grep=0件)が正しい修正後でも恒久的に偽になる未検証の欠陥がある。

### Findings

- Major: requirements.md:12 FR-1b の受け入れ基準「git ls-files -z | xargs -0 grep -ln "amadeus-utility\.ts next" が 0 件」は、正しく修正した後も常に非0件になる — codekb 記録3ファイル(amadeus/spaces/default/codekb/amadeus/component-inventory.md:7、api-documentation.md:11、reverse-engineering-timestamp.md:12)が本バグを説明する散文として同一文字列を引用しており、これらは本 intent の修正対象外(codekb は履歴記録)のため恒久的に残る。実測: `git ls-files -z | xargs -0 grep -l "amadeus-utility\.ts next"` = 16件(SKILL.md正本5+dist5+self-install3=13 に加え上記codekb3件)。QA がこの AC を字義どおりテスト化すると常に失敗するゲートになる。FR-1c の述語(「全 tracked SKILL.md に対し…」)は同じ対象を正しくスコープしており矛盾する — FR-1b の AC を SKILL.md 13ファイルへ明示的にスコープするか、FR-1c の述語で代替する形へ訂正が必要。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T13:06:38Z
- **Iteration:** 2
- **Scope decision:** none

FR-1b のAC を tracked SKILL.md 群へスコープした是正を実測検証済み(scoped grep=13件、repo全域=16件、codekb3件の恒久残存も実測一致)。FR-1c との整合も回復し新規矛盾なし。

### Findings

- None
