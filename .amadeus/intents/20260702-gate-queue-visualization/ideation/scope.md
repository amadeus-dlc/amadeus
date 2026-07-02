# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | 複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を 1 回の実行で一覧できるようにする。 | [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) | 採用 |
| SC-IN-002 | 承認待ちが 0 件の場合も、その旨が一覧から分かるようにする。 | [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) | 採用 |
| SC-IN-003 | 一覧の実行入口は配布先ユーザー環境（repo root の開発用スクリプトなし）で実行できる形にする。 | [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) | 採用 |
| SC-IN-004 | 対象の並行運用は、1 人の人間と複数エージェント（複数 worktree）の範囲に限定する。 | [G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | 承認そのものを自動化する。承認は人間ゲートのまま残すため。 | [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) | 採用 |
| SC-OUT-002 | 通知基盤を作る。一覧は実行時のスキャン結果に限定するため。 | [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) | 採用 |
| SC-OUT-003 | 並行実行の他候補（並行運用ポリシー、Bolt の依存 wave 並行実行）を扱う。 | [Discovery](../../../discoveries/20260702-parallel-execution.md) | 採用 |
| SC-OUT-004 | 複数人チームでの並行と、複数 workspace での組織利用を扱う。 | [G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | feature | 承認待ちキューを一覧する新しい手段を追加するため。 |
| 省略 stage | なし | 承認待ち判定の条件と一覧の出力契約を Inception で分解し、Construction でスキャン手段の実装と検証を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 承認待ち判定の条件、ゲート語彙との対応、一覧の出力契約を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | 承認待ち判定の決定論的検証（RED → GREEN）、複数 Intent を含む workspace での一覧確認、承認待ち 0 件時の表示確認、標準検証が必要であるため。 |

## Inception への引き継ぎ

- 「承認待ち」と判定する `state.json` の条件（各 phase の gate 値、Task Generation Gate の `ready_for_approval` など）を、Intent 20260702-phase-gate-approval-contract のゲート語彙に合わせて確定する。
- 待ち理由として一覧に表示する情報の出どころ（`state.json` のどのフィールドを根拠にするか）を確定する。
- 実行入口の配置先（どの skill に同梱するか）を確定する。先例 `amadeus-construction` 同梱の `list-unfinalized-intents.ts` との関係も確認する。
- 一覧の出力形式と列（Intent、phase、ゲート、待ち理由）を確定する。
- 既存の examples snapshot への影響の有無を確認する。
