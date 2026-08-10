# Stakeholder Map — 260810-swarm-directive-fixes

上流入力（consumes 全数）: なし。本ステージの入力はユーザー指示と [Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833) / [Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834) の本文・全コメントである。

## Key Stakeholders

| ステークホルダー | 関心事 | 役割 |
|---|---|---|
| ユーザー（j5ik2o） | 単一 intent、self-feature/full、仕様裁定、PR マージ承認 | 最終意思決定者 |
| leader セッション（親 worktree） | Issue / PR 管理、マージ承認の中継と承認後執行 | ガバナンス責任者 |
| conductor（本セッション） | Amadeus forwarding loop、成果物品質、Unit / swarm 編成 | workflow 実行責任者 |
| Construction builder | 隔離 worktree での TDD 実装と検証、Bolt PR 作成 | 実装責任者 |
| reviewer / PR reviewer | per-unit input の完全性、停止遷移、要件・設計逸脱の検出 | 独立品質確認者 |
| Amadeus harness 利用者 | 全 harness で一貫した directive と安全停止 | 主要受益者 |

## Decision-makers vs. Influencers

- **意思決定者:** ユーザーは仕様変更、明文契約改訂、PR マージを裁定する。`full` grant は可逆な workflow gate / question を自動決定できるが、禁止 effect と no-AI-merge を越えない。
- **実行決定者:** engine は stage routing と state transition を所有し、conductor は directive の内側の成果物品質を所有する。
- **影響者:** #2833 / #2834 のクロスレビュー2名、leader のトリアージ記録、既存の契約テストと norm が、要件・設計の証拠を提供する。

## Communication Requirements

- 節目ごとに Orca worktree comment を更新し、現在 stage、検証結果、PR / 承認待ちを可視化する。
- Unit / Bolt ごとに PR を作成し、PR URL、reviewer、CI / review の収束状態を leader セッションへ報告する。
- マージ承認は複数 PR をまとめて leader セッションからユーザーへ提示し、承認前に自発マージしない。
- 要件または設計からの逸脱が必要になった時点で、実装せず停止し、影響範囲と選択肢を報告する。

## 主要な関心の対応表

| 関心 | 主な所有者 | 完了証拠 |
|---|---|---|
| 7 stage の per-unit consume 完全性 | conductor / builder / reviewer | directive integration tests と reviewer scope tests |
| Retry / Skip / Abort の遷移 | engine owner / builder | engine-owned transition tests |
| autonomous の安全停止 | engine owner / conductor | `next` と Stop hook の end-to-end evidence |
| TDD と横断検証 | builder / conductor | Red 記録、対象 suite、フル suite、build |
| PR の可読性と収束 | PR reviewer / leader | Bolt 単位 PR、未解決 thread 0、required checks green |
| マージの不可逆境界 | ユーザー / leader | 明示承認と承認後の leader 執行 |

