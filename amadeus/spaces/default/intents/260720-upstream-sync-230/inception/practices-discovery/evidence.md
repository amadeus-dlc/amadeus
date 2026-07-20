# Practices Discovery — Evidence（260720-upstream-sync-230）

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 証跡スキャンの代用（practices-discovery:c1）

同日 RE diff-refresh（`re-scans/260720-upstream-sync-230.md`、base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`）がテスト、コードスタイル、CI、配布・リリース境界を走査済みのため、その実測を本ステージの証跡として代用する。

## 実測証跡（RE 由来 + 本ステージ照合）

| 面 | 証跡（実測） | affirm 済みルールとの対応 |
| --- | --- | --- |
| Way of Working | 現行は `main` へ統合済みの observed を基準に、24項目を MISSING 19 / PARTIAL 4 / EQUIVALENT候補 1へ分解。工程記録と実装対象を分離している | team.md の GitHub Flow、Bolt 単位 Pull Request と一致 |
| Walking Skeleton | plugin の依存順は schema + Unit kind → packager → compose → reference plugin/docs。新しい配布面であることを RE が明示 | project.md Walking Skeleton の greenfield 要素契約が直接適用可能 |
| Testing Posture | `tests/` は461ファイル（unit 216 / integration 159 / e2e 70 / smoke 14）。`package.ts --check` 6/6、`promote-self.ts --check --no-build`、lint は exit 0。typecheck は `tsc` 不在で exit 127、full tests は未実施 | project.md の Bun テスト層、dist/self-install drift guard、包括テスト契約に一致。未実施値は成功へ読み替えない |
| Deployment | `.github/workflows/release.yml` の手動 release 契約を変更する項目はなく、承認済み scope でも production release を除外 | team/project の Deployment（workflow_dispatch → release-it → GitHub Release/npm publish）を温存 |
| Code Style | core tools 30、hooks 11、agents 14、stages 32、sensors 5、6 harness の TypeScript/ESM 構成。plugin は core schema と harness 投影の境界を跨ぐ | project.md の TypeScript/ESM、Result 型、core/harness adapter 境界と一致 |

## 差分ギャップ判定

5面すべて既決ルールで被覆され、新しいチーム practice を必要とする差分は0件。したがって追加質問0件、新規ルール候補0件、practices-promote なしとする。
