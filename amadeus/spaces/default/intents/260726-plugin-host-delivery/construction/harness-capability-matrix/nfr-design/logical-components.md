# 論理コンポーネント — U1 harness-capability-matrix

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

U1 はコードを搬送しない(business-logic-model の deployable 境界どおり record 文書 PR)。したがって本 Unit の「コンポーネント」は実装モジュールではなく **成果物文書の構成** である(全設計確定後に導出したインベントリ — performance / security / scalability / reliability 各設計の様式決定を反映)。

## 成果物構成(record 文書)

| 構成要素 | 位置(同一成果物内の節) | 由来設計 |
|---|---|---|
| 測定 ref 行(HEAD SHA 1 行) | 文書冒頭 | reliability-design |
| 能力マトリクス(7 行 × 6 面、固定列挙順) | 第 1 節 | scalability-design |
| クラス別確定集合(Bolt 3 / Bolt 6 の機械可読列挙 — BR-U1-7) | 第 2 節 | scalability-design |
| degrade 契約(manual-only 面ごとの手動床 1 コマンド+doctor 表示) | 第 3 節 | reliability-design |
| ProbeRecord(probe-id / command / evidence / preprocessing / isolation) | 第 4 節 | security-design |

セル → ProbeRecord は `P-<harness>-<面>` の参照 ID で trace する(reliability-design)。所要時間フィールドは意図的に持たない(performance-design)。

## 実装モジュール・テスト層配置(N/A)

- 実装モジュール: **なし**(新規の実行時コード・生成ツールを導入しない — nfr-requirements の技術決定どおり)。プローブ実施に用いるのは既存ツールの読み取り起動のみで、U1 が新設・変更するソースファイルは 0 件
- テスト層配置: **N/A**。検証は自動テストではなく §12a 成果物レビュー(security-design の機械走査層+目視照合層、scalability-design の count 照合、reliability-design の 3 値状態 grep)で行う。要件対応: 機械走査は security-requirements の合否、42 セル count 照合は scalability-requirements の固定境界、3 値状態 grep は reliability-requirements の silent skip 禁止、時間フィールドの不在は performance-requirements の N/A へそれぞれ trace する。fs を触るテストの integration 配置規律(fs-tests-integration-first)は、テスト自体が存在しないため適用対象がない

## 障害分離(failure domains / blast radius / isolation / shared resources)

N/A — U1 はコード非搬送(record 文書 PR のみ)であり、実行時障害領域を持たない(根拠: 同 unit の nfr-requirements における performance / scalability の N/A 判定と、本成果物「実装モジュール: なし — U1 が新設・変更するソースファイルは 0 件」)。ただし成果物ファイル自体の共有関係として: 書込は U1 の record 文書(能力マトリクス+ProbeRecord)のみで他 unit の成果物と非共有だが、第 2 節「クラス別確定集合(BR-U1-7 の機械可読列挙)」は U3(HarnessProjectionSpec 導出)・U4(HookWiring 導出)が読取消費する下流入力であり、その誤りは文書レビュー(§12a の機械走査・count 照合・3 値状態 grep)で遮断する。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
