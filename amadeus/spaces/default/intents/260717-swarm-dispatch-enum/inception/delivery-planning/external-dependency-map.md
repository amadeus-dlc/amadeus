# External Dependency Map — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## 判定方針

新規の外部依存は導入しない。N/A 判定には反証可能根拠を併記する(environment-provisioning:c3 準拠)。

## 外部依存一覧

| 依存 | 判定 | 根拠 |
|---|---|---|
| AWS account/service/resource/IaC | N/A | C-21(constraint-register)— 追加・変更なしを requirements 制約で承継 |
| 外部 SaaS(Codecov 等 CI 既存連携) | 既存のみ | 新規連携なし。PR は既存 coverage patch gate の対象(運用は既決ノルム) |
| Codex CLI ランタイム | 既存前提 | project minimum 0.139.0(C-20、probe 実測 0.144.5)。バージョン要求の変更なし |
| npm レジストリ/リリース | N/A(本 intent 範囲外) | リリースは release.yml workflow_dispatch 一本(project.md 既決)— 本 intent はリリースを含まない |
| gh CLI | scripts 境界のみ | gh-scripts-boundary 既決 — 配布フレームワークへ持ち込まない。本 intent の実装面に gh 依存なし |
| 人間承認 | 必須(内部) | Construction 進入=ユーザー決定 / PR マージ=ユーザー承認 / stage gate=グラント f8f6b049(〜03:05Z、phase boundary 個別) |
