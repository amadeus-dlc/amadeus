# Code Generation Plan — u001-harness-codex（B001）

## 上流入力

[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（u001-harness-codex、規模 S）。

## 実行計画（7 段パイプライン、設計どおり）

| 段 | 作業 | 対応 FR |
|---|---|---|
| 1 | scratchpad へ awslabs/aidlc-workflows を fresh clone、b67798c3 を checkout | FR-1.1 |
| 2 | dist/codex の openai.yaml 全列挙 + sha256 全件照合（A-1 検証） | FR-1.2 |
| 3 | skillNameMapping prefix 規則の機械適用 + 両側実在交差で写像を生成 | FR-2 |
| 4 | 取り込み対象 skill へ skills/amadeus-*/agents/openai.yaml を生成（provenance コメント 4 行 + 上流実体） | FR-3 |
| 5 | harness/codex/README.md（契約 + Phase 2 正準化予定 + 言語再判定条件）と provenance.md（照合結果 + 写像表 38 行 + 再取り込み手順） | FR-4 |
| 6 | allowlist.json の postRenameScan.scanRoots へ "harness" を外科的 1 行挿入 | FR-6.5 |
| 7 | promote-skill --replace を 38 skill ループ実行 → git add → 検証一式 | FR-5、FR-6 |
