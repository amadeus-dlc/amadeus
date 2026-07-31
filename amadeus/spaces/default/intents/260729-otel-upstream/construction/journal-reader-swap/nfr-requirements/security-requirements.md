# Security Requirements — U6: journal-reader-swap

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 方針

reader 差替えは機密面に新たな面を導入しないが、読取経路の防御性を明文化する。redaction policy 本体（write-time／export 境界の二層、FR-DST-3〜5）は writer 側 Unit の所有であり、本 Unit は読取側の非破壊性と機微情報の非転記のみを負う。

## 要件

- **読取専用・非破壊**: 共通 reader は書込・probe を行わない（BR-9、FR-EVT-5 の非破壊性と整合）。Journal 物理配置（per-clone shard、mkdir lock）を変更しない（BR-10）
- **機微情報の非転記**: reader の正規化 record は tool が依存する属性のみに写像し、無許可の追加属性（未検証の v2 属性等）を tool へ転記しない。reader 層に tool 独自のフィルタ解釈を移さない（BR-15）
- **silently skip 禁止**: 判別不能行は判別可能なエラーとして返す（BR-4）。v2-only 構成で v1 shard に遭遇した場合も同様（BR-18）。破損・未移行 shard を見落とさないための防御であり、セキュリティ上の安全性側（fail-noisy）設計
- **rollback 手段の限定**: 撤回手段は git revert と差替え前 backup に限定し、特別な権限・外部操作を要しない（BR-6）
- **新規 credential・network I/O なし**: 差替えはローカル FS 読取のみで完結し、外部境界を追加しない（technology-stack.md：HTTP server・database なしの構成を維持）

## 検証

- BR-4/BR-18 のエラー経路は doctor の破損行検出テストで固定する
- 既存の telemetry credential-free ゲート（VER-2）の配線に本 Unit は変更を加えない（reader 差替えで検査対象が変わらないこと）
