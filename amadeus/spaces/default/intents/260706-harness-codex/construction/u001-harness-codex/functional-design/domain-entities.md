# Domain Entities — u001-harness-codex

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 実体と関係

| 実体 | 位置 | 役割 | 関係 |
|---|---|---|---|
| 上流 openai.yaml（38 件） | 上流 dist/codex（読み取りのみ、b67798c3） | 取り込み元（Codex の implicit invocation guard） | FR-1 で照合 → FR-3 の内容を確定 |
| 写像表 | harness/codex/provenance.md | 上流 skill ↔ amadeus skill の対応と取り込み判定（3 区分） | prefix 規則 + 両側実在交差で生成。FR-3 の対象を確定 |
| source yaml | skills/amadeus-<x>/agents/openai.yaml | 取り込み先の正準（promote 単位の内数） | provenance コメントで上流と写像へ遡及可能 |
| 昇格 yaml | .agents/skills/amadeus-<x>/agents/openai.yaml | 実行時配置（Codex が発見する位置） | promote-skill.ts が source から全置換で生成 |
| ハーネス契約 | harness/codex/README.md | Codex ハーネスの契約と Phase 1/2 の役割宣言 | Phase 2 で差分層ソースの正準がここへ移る予定 |
| 検出器宣言 | dev-scripts/evals/rename-leftovers/allowlist.json（scanRoots） | harness/ を旧名検出の対象に含める | FR-6.5。#553 検出器追従規範 |

## ライフサイクル

Phase 1（本 Intent）: 上記実体の新設。Phase 2（後続 Intent）: harness/codex への正準化 + build.ts 化で source yaml の生成元が harness 側へ移る（README に予定を明記して drift を防ぐ = engineer2/5 の付帯条件）。
