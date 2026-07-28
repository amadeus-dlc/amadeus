# Logical Components — u5-docs-and-distribution

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

U5 スライスの論理コンポーネント目録。すべて既存資産(ビルドスクリプト・ガード・テスト・文書体系)の実行と追記(tech-stack-decisions の新規依存ゼロ)で、新しい実行面・永続面を作らない。

## コンポーネント目録(U5 スライス)

| 論理コンポーネント | U5 での責務 | 適用される NFR 設計 |
|---|---|---|
| docs 4文書(en/ja 対訳) | 設定・認証・診断節の追記(business-logic-model のドキュメント更新フロー) | 秘匿記述規約(security-design) |
| 契約台帳(USER_CONTRACT・TOPICS) | 文書追記と同一変更での closed 追記(business-logic-model) | parity 機械固定(reliability-design) |
| dist 再生成(7ハーネス+self-install) | 既存スクリプトの機械的実行(business-logic-model の配布同期フロー) | 固定集合の全数照合(scalability-design)、drift guard(reliability-design) |
| 検収実行 | 全テスト・coverage の1回実行+exit code 実測転記(business-logic-model の検収フロー) | 既存枠実行(performance-design)、実測記録規律(reliability-design) |
| 台帳不変検収 | MIRROR_TOOL_FILES / t285 件数の不変機械確認(business-logic-model) | 逸脱シグナル停止(security-design の検出器) |

## 障害ドメインと blast radius

- U5 は新しい障害ドメインを追加しない — すべて決定的なローカル検査で、赤は「不整合の検出」であって障害ではない(reliability-requirements の回復設計: 正本修正 → 再生成の一方向)。
- docs 追記の blast radius は parity テストが封じ込める(security-requirements の乖離防止)。

## 共有リソース

- **正本(packages/framework/core)**: 唯一の編集面 — 生成物は派生(security-requirements の完全性契約)。
- **既存4層テストランナー・coverage ゲート**: 検収の実行基盤(performance-requirements の既存枠 — 新基盤ゼロ)。
- **契約台帳・docs 体系**: 追記のみの共有面(scalability-requirements の固定集合)。

## 分離戦略

- N/A — U5 の全コンポーネントは決定的検査と静的成果物であり、分離すべき実行時障害面が存在しない(scalability-requirements の規模非適用と同根)。
