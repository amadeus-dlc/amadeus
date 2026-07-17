# Practices Discovery — 証跡記録

intent: `260715-opencode-cursor-harness`(Issue #626)/ 実施: 2026-07-16 conductor e3(amadeus-pipeline-deploy-agent ペルソナ、quality / developer / devsecops 支援観点)

## スキャン代用の宣言(cid:practices-discovery:c1)

同日(2026-07-16)完了の reverse-engineering codekb が本ステージの証跡スキャン面をカバーしているため、4エージェント並列スキャンは実施せず codekb を代用した:

| 支援観点 | 代用ソース(consumes) | カバー面 |
| --- | --- | --- |
| pipeline-deploy(branching/CI/deploy) | architecture.md・business-overview.md(GitHub Flow・release.yml 一本のリリース・CI ジョブ構成) | Way of Working / Deployment |
| quality(テスト姿勢) | code-quality-assessment.md・technology-stack.md(bun test 4層ランナー・カバレッジ CI ゲート) | Testing Posture |
| developer(コード様式) | code-structure.md(packages/framework 3層構造・amadeus- prefix・harness port 開放性の観測面 = 本 intent の新節)・dependencies.md | Code Style |
| devsecops(lint/セキュリティ) | technology-stack.md(Biome 2.4 フォーマッタ無効・tsc --noEmit)・code-quality-assessment.md | Code Style / CI ガード |

## 差分ギャップ分析(affirm 済み memory 層との照合)

affirm 済み `amadeus/spaces/default/memory/team.md` / `project.md`(いずれも本日 16:40Z 台まで更新継続中の live 状態)と codekb 実測を5プラクティス領域で照合した:

- **Way of Working**: 差分なし — GitHub Flow / Bolt=PR 1:1 / record-sync PR の既決が本 intent にそのまま適用可
- **Walking Skeleton**: 差分なし — org.md 既決(greenfield 要素は skeleton 先行)を scope-definition で既に適用済み(B-1)
- **Testing Posture**: 差分なし — project.md の CI 基準(typecheck / lint / dist:check / promote:self:check / tests --ci)が新 dist ツリーにも適用される。新規に必要なのは smoke/drift の「宇宙への編入」であり姿勢の変更ではない
- **Deployment**: 差分なし — release.yml 一本の既決に変更なし(新ハーネスも npm 配布物の一部として同一経路)
- **Code Style**: 差分なし — functional-domain-modeling-ts 採用・Biome・amadeus- prefix の既決が新 harness surface にも適用

**結論: 新規プラクティス・是正の発見 0件。** 質問すべきギャップ(証跡から判定できない未決のチーム判断)も 0件のため、インタビューは実施しない(質問ファイル不作成 — E-OC1 の申告対象となる質問自体が不在)。

## 鮮度トレイル

- 代用した codekb の鮮度: reverse-engineering-timestamp.md の最新節(observed = 本 intent RE の HEAD、2026-07-16)
- memory 層の鮮度: 本日マージのノルム PR #1010/#1014/#1016 を含む live 状態を読了済み(読了 ack 済み)
