# Security Design — U1: otel-walking-skeleton

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（FR-DST-3/4/5 の非流出・サプライチェーン・監査完全性）に対する U1 での設計。U1 は policy の最小形を実装し、本番化は U4 に委譲する。

## redaction policy の最小形

- 二層構造（write-time／export 境界）の Interface を U1 で確立し、U1 時点の実装は deny list＋default-deny の最小ポリシーとする。`command` safe-key 見直し・`redactionOptIn` 値スクラブの本番語彙は U4 が拡張する（security-requirements.md、FR-DST-4/5）
- RedactionPolicy は bootstrap で 1 インスタンス構築し、Exporter 層へ注入する。policy の未適用経路（Exporter の直接呼出しで層を素通りする形）を型上作らない

## credential-free ゲート原型（VER-2）

- telemetry 成果物（audit JSONL・Span/Log/Metric Stores）を走査し credential パターンを検出する検査スクリプトの原型を U1 で作る。パターン語彙は redaction policy と同一源とし、U4 で CI ゲートへ配線する
- 検査対象は Store 実データとし、mock のみの検査で完了宣言しない

## サプライチェーンと監査完全性

- `@opentelemetry/api` ファミリーは version pin で追加し `bun.lock` を更新（CI の `--frozen-lockfile` 規則と整合）。追加理由は ADR に文書化（tech-stack-decisions.md、FR-DST-1）
- FatalLatch は process-local の値として実装し、外部から set/解除する API・ファイル経路を持たせない（改ざん経路なし、FR-EVT-4）
- Journal health 検証の probe は読取専用とし、canonical Journal への書込を行わない（非破壊、FR-EVT-5）
