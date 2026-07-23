# Team Practices — チーム機能のコア昇格(2026-07-23 再確認)

> 上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview(同日 RE codekb を証跡スキャンの代用として消費 — practices-discovery:c1)

## Way of Working

変更なし。`main` 中心の短命ブランチ+PR、Bolt はスカッシュで線形履歴(affirm 済み team.md の現行内容を維持)。本 intent の昇格作業も「正本編集(packages/framework/)→ dist 再生成 → drift guard green → PR」の既存フローの枠内で実施する(technology-stack.md の配布投影構造と一致)。

## Walking Skeleton

変更なし。amadeus スコープの greenfield 要素(配布経路の新設面)は最初の Construction Bolt を小さな end-to-end スライスとしてゲートする既定を維持(business-overview.md の昇格境界 B1-B5 に整合)。

## Testing Posture

変更なし。tests/ 配下の Bun ランナー4層(smoke/unit/integration/e2e)+既存 CI ゲート(typecheck/lint/dist:check/promote:self:check/coverage)を維持。本 intent は既存資産(選挙系 t234〜t244、fake-herdr パターン、pty e2e)へ追加する形をとる(code-structure.md のテスト資産配置と一致)。

## Deployment

変更なし。リリースは release.yml の workflow_dispatch 一本、PR からバージョンを上げない。昇格資産も同一のリリース経路に乗る(dependencies.md の配布依存節と一致)。

## Code Style

変更なし。TypeScript/ESM+Bun 直接実行、Biome lint、strict tsc、core 中立層/harness 表層の境界(code-quality-assessment.md の import 衛生観測と一致 — 選挙エンジンの昇格はこの境界規約への正常化)。
