上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — kimi-harness-definition

> 上流入力の使用箇所: tech-stack-decisions.md §選択(manifest=DATA・runner-gen 既定・`.kimi-code` 配置)と business-logic-model.md §生成フローを構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「宣言(manifest) → 生成(packager) → 検査(--check・smoke)」の3段。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| manifest | 宣言的なハーネス定義(DATA のみ) | `packages/framework/harness/kimi/manifest.ts` |
| authored surfaces | orchestrator・annex・onboarding fills・snippet | 同ディレクトリ配下 |
| 生成物 | dist/kimi(`.kimi-code/` + AGENTS.md + workspace shell) | `dist/kimi/`(生成) |
| 検査 | byte-parity・dist 構造 smoke | `package.ts --check`・t145・FR-7b の smoke |

## 関係

- manifest --(packager が投影)--> 生成物 --(byte-parity)--> 検査。logical-components の変更は全て manifest 宣言を正とし、生成物を直接編集しない(security-requirements.md §脅威モデルの byte-parity による改ざん検出の前提)
