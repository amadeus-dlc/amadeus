# Design System Mapping — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../../ideation/rough-mockups/wireframes.md`(モック1〜3)、`../../ideation/rough-mockups/user-flow.md`、`../user-stories/stories.md`(US-1.1〜3.1)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../practices-discovery/team-practices.md`(既存実践)。

## 既習様式への写像(新規発明ゼロ)

| 出力要素 | 既習様式(単一ソース) |
| --- | --- |
| usage 文字列 | reporter.ts renderHelp(:19-27 — 実在確認済み、buildUsage は不在)— 列挙のみ更新 |
| plan 行 | ACTION_LABELS(reporter.ts)— 非接触 |
| invalid エラー | UsageError.invalidHarness 経路(:137 文言)— 列挙のみ更新 |
| wizard 選択肢 | HarnessName.all 駆動(wizard.ts:17)— 非接触 |

CLI に UI デザインシステムは存在しない — 本表が「既習様式 = デザインシステム」の写像に相当(ui-less 充足形)。

## 逸脱条件

新規文言・新規様式が必要になった場合は既習様式写像の枠外として実装前に停止し報告する(deviation-stop)。
