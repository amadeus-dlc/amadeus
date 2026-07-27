# Security Test Instructions — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

## 判定

**N/A(反証可能な非適用根拠)** 本 intent はドキュメント文言と定数参照の変更のみで、認証・入力検証・シークレット・外部サービス境界に触れない(code-summary.md の変更ファイル一覧で確認可能)。承認済みセキュリティ NFR は存在しない。
## 全体 audit との分離

repository 全体の dependency audit は本 intent の対象外(cid:build-and-test:c1-doctor-seam — 対象変更の security regression と全体 audit は別判定)。
