# Security Design — eoc1-gate-guard

## 上流入力(consumes 全数)

`../nfr-requirements/security-requirements.md`(SR-1〜3)、`../functional-design/business-rules.md`、`../nfr-requirements/reliability-requirements.md`(RR-1)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(直列3段フロー)。

## 設計(層別保証 — c4)

| モジュール | 保証機構 |
|-----------|---------|
| checkQuestionsEvidence | ポート不保持(fs 読みのみ・書き込み API 非 import)。入力は正規表現データ照合のみ(eval なし — SR-2) |
| パス構成 | stage 解決由来の join のみ(ユーザー入力連結なし — SR-3)。record 外への到達経路なし |
| fail 経路 | 既存 error()(loud・fail-closed)— 無音 fail-open なし(RR-1) |
