# Code Generation Plan — u001-journal-logger（B001）

## 上流入力

[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)。

## 実行計画（bolt-plan の順序）

| 段 | 作業 | 対応 FR |
|---|---|---|
| 1 | journal/README.md（契約 doc = 形式の正）新設 | FR-1 |
| 2 | 既存 amadeus-validator eval へ J1〜J5 追加（実データ fixture + 変異 3 種）→ RED 確認 → checkSpaceLayers へ checkJournal（optional）実装 → promote → GREEN | FR-2 |
| 3 | #556（本文 + コメント 3 件）を journal/260706.md へ移行（9 エントリ、実投稿時刻、出自明記） | FR-4.1 |
| 4 | knowledge/journal-logger-runbook.md（spawn.sh 実測に基づく手順 + 役割 prompt 全文）と #556 参照コメント文面 | FR-3、FR-4.2 |
| 5 | knowledge/journal-logger-verification-checklist.md（条件 2〜3 の合否基準 + 記入欄） | FR-5 |
| 6 | git add 後に test:all / validator / 新 eval / promote eval | NFR-1 |
