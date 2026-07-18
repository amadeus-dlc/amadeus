上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

# External Dependency Map — test-pyramid-rebuild(#684)

RAID(Risks / Assumptions / Issues / Dependencies)の Dependencies 面を中心に、本 intent が外部へ持つ依存と、外部が本 intent 成果物へ持つ依存を分離して記録する。

## 本 intent → 外部への依存(このBoltが必要とするもの)

| 依存先 | 内容 | 影響を受ける Bolt | 状態 |
| --- | --- | --- | --- |
| `classifyTestSize`(`tests/lib/test-size.ts:49`) | size 唯一真実源。U1 台帳の全数値がこの決定的関数のスイープ出力の転記(ADR-04) | Bolt 1 | 実在確認済み(RE observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。変更されない前提(非破壊温存 ADR-05) |
| RE スイープ結果(`tpr-ledger.json`、scan-notes.md:57) | 442ファイル(tests/ 全域再帰)の決定的分類の scratch 保持データ | Bolt 1 | 既に保持済み(RE 実施済み)。construction 進入時に再スイープで鮮度確認(R2、risk-and-sequencing-rationale.md) |
| `test_pyramid` コレクタ(`scripts/metrics-snapshot.ts:97-104`) | `${tier}_${size}` キー形式。U1 台帳の出力契約が踏襲する既存契約 | Bolt 1 | 現状は自前で `classifyTestSize` を直呼び(R1)。台帳と exact 一致させる設計を Bolt 1 が担う |
| 既存 size ドリフトゲート(`tests/unit/t-test-size-drift.test.ts`) | U2 の tier-aware ゲート設計が非破壊温存すべき既存機構 | Bolt 2 | 実在確認済み。変更しない(触らない、ADR-05) |
| `detectWallClockDrift` / `WallClockDrift`(`tests/lib/test-size.ts:106-121`) | U2 の判定 IF 設計テンプレート | Bolt 2 | 実在確認済み。テンプレートとして参照のみ、既存関数は不変 |
| `run-tests.sh` の tier 実行 | U2 の tier 別実行時間実測手段 | Bolt 2 | 実在。実測手段として再利用のみ、実装変更なし |
| 既存 coverage lcov 経路(`ci.yml` の `coverage` ジョブ、`tests/run-tests.ts`) | U3 の #683 整合計画が突き合わせる既存経路 | Bolt 3 | 実在確認済み(component-inventory.md:150,153)。整合計画のみで配線変更なし |
| seam-export 系ノルム(team.md) | U3 の remediation(i) seam-to-small の適用手法参照 | Bolt 3 | 既存ノルムとして参照のみ |

## 外部 → 本 intent 成果物への依存(このBoltの成果物を必要とするもの)

| 依存元 | 依存内容 | 対応 Bolt 成果物 | スコープ境界 |
| --- | --- | --- | --- |
| 移設実装 intent(将来・別 intent) | U1 台帳(コレクタ設計含む)を母集団・データ源として消費。U3 選定台帳(163件・remediation 2区分)を移設順序の計画として消費 | Bolt 1 出力(SizeLedger)+ Bolt 3 出力(MigrationSelectionLedger) | **実移設・run-tests.sh 実装変更・新分類器実装は本 intent Out**(FR-7)。本 intent は台帳・計画の materialize までを提供する |
| tier-aware ゲート実装 intent(将来・別 intent) | U2 の判定 IF 設計(`TierSizeViolation` / `detectTierSizeViolation`)を実装のひな型として消費 | Bolt 2 出力(C3 設計) | **CI ジョブ配線・落ちる実証・exit code 契約は移設 intent(Out)**(unit-of-work.md:109) |
| #683(Codecov 層別カバレッジ整合、別 issue/intent) | U3 の #683 整合計画(C5、tier キー整合)を消費し、実際の CI 配線を担当 | Bolt 3 出力(CoverageIntegrationPlan) | **CI 配線・強制ゲート化は #683 スコープ(Out)**。本 intent は tier キー整合計画のみを提供 |
| #1157 | 本 intent は #1157 に **未接触**。着手禁止(delivery-planning のスコープ制約により明記) | なし | 本 intent の成果物は #1157 の実装判断材料にならない前提(接続点を作らない) |
| leader / CI 品質監視者(story-map.md 受益者) | U1 台帳の tier×size マトリクスを現状可視化のダッシュボード的入力として消費 | Bolt 1 出力 | 消費は読み取りのみ、本 intent は可視化 UI・自動更新配線を作らない |

## 外部依存のリスクとトリアージ手順の適用

外部 SaaS(#683 = Codecov)由来の未文書化挙動が絡む場合、team.md「外部 SaaS の未文書化挙動」cid:saas-undocumented-source-read に従い、docs で確定できない挙動は公開ソース(worker/クライアント等)の一次直読で確定するか、「実測で確定する条件」として明記する。ただし本 intent は #683 の CI 配線自体を持たないため(整合計画のみ)、この手続きの適用は #683 側実装 intent に譲る。

## トレーサビリティ

本マップの全依存は requirements.md の FR-1〜FR-7 および components.md の C1〜C5 の「消費者」節・「実装スコープ境界」節から導出した。新規の外部依存は追加していない(既存インフラ再利用棚卸し、unit-of-work.md 各ユニット「既存インフラ再利用棚卸し」節と同一集合)。
