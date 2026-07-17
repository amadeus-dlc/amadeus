# Team Practices — 現行確認(変更なし)

intent: `260715-opencode-cursor-harness`(Issue #626)。affirm 済み memory 層(team.md / project.md)と同日 RE codekb 6点 — architecture.md / business-overview.md / code-structure.md / technology-stack.md / dependencies.md / code-quality-assessment.md(evidence.md 参照)の照合結果、**5領域すべて変更なし**。以下は現行 affirm 内容の確認要約であり、promote 対象の変更セクションは存在しない(cid:practices-discovery:c2 — 無変更セクションの live 温存)。

## Way of Working

GitHub Flow / トランクベース。短命ブランチ+PR、Bolt ごとにスカッシュマージ、工程記録はチェックポイントコミット、record-sync は単独 PR。本 intent でも変更なし。

## Walking Skeleton

greenfield 要素を含む intent は最初の Bolt を最小 end-to-end スライスとして単独ゲート(org.md 既決)。本 intent は B-1(opencode 最小スライス)で適用済み。変更なし。

## Testing Posture

TypeScript / bun test 4層ランナー。CI 基準は typecheck / lint / dist:check / promote:self:check / tests --ci。ユーザー可視契約(配布物ドリフト・セルフインストール互換)は該当変更で必ずカバー。新 dist ツリーは既存ガードの宇宙へ編入する(姿勢の変更ではなく適用)。変更なし。

## Deployment

リリースは release.yml(workflow_dispatch → release-it)一本。新ハーネス配布物も同一経路に乗る。変更なし。

## Code Style

functional-domain-modeling-ts スタイル、Biome(フォーマッタ無効)、tsc --noEmit、amadeus- prefix、core/harness 境界(実配置は packages/framework/)。新 harness surface にも同一様式を適用。変更なし。
