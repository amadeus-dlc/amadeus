# External Dependency Map — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

## 外部依存と Bolt の対応

| 外部依存 | 依存する Bolt | 状態(実測)| 遮断時の影響と手当て |
|---|---|---|---|
| GitHub GraphQL API(ProjectV2 照会・mutation) | 1〜4 | 照会系は feasibility で実測済み。mutation は Bolt 1 で実証(requirements A 系) | retryable → pending、構成起因 → safety-blocked(FR-7)。workflow は継続 |
| gh CLI(認証済み・`project` scope) | 1〜4 | 現行環境で実測済み(scope 保有)。配布先は未保証 | 不在・未認証は loud fail+診断(FR-7e/FR-10b)。docs は Bolt 5 |
| 実 Project #5(選択肢構成) | 1(実証面) | 期待選択肢は不存在(実測 — A-4)。ユーザーが再構成予定 | 不存在でも Bolt 1 は safety-blocked 正観測で検収可能(bolt-plan の完了条件) |
| GitHub REST(既存 Issue 面) | 全 Bolt | 既存実装で運用中 | 既存分類のまま(変更なし) |
| CI(GitHub Actions の既存 workflow) | 全 Bolt の PR | 既存(ci-pipeline:c2 — 新規 workflow 不要) | PR ごとの green が Bolt 完了条件(components/team-practices の検証群) |

## 人間依存(外部承認点)

- 各ステージゲート・Bolt 1 ゲート・ラダープロンプト・PR マージ(no-AI-merge)・Project #5 の選択肢再構成(運用作業)はユーザーの手にある。承認待ちはブロッカー扱いしない(merge-approval-latency)。
