# Security Requirements — U1: otel-walking-skeleton

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`（参照済み）

## 機微情報の非流出（FR-DST-3/4/5）

- prompt・argv・credential・無許可パスを attrs・Signal Stores に含めない
- redaction は write-time と export 境界の二層で適用（新 Mandated: export-boundary-redaction）
- `command` safe-key の見直しと `redactionOptIn` の値スクラブは U4 の本番化で適用。U1 では policy の最小形（deny list ＋ default-deny）を実装
- telemetry 成果物の credential-free を検査するゲート（VER-2）の原型を U1 で作り、U4 で配線

## 依存のサプライチェーン

- `@opentelemetry/api` ファミリーの追加は version pin し、bun.lock を更新（`--frozen-lockfile` の CI 規則と整合）
- 追加理由を ADR に文書化（FR-DST-1）

## 監査の完全性

- fatal latch の set・参照は process-local で完結し、改ざん経路を持たない（同一 process 内の値）
- Journal health 検証の probe は canonical Journal を変更しない（FR-EVT-5）
