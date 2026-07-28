# Domain Entities — U4 u4-skill-docs

上流入力(consumes 全数): component-methods.md(C3/C5)、components.md(C3/C5)、requirements.md(FR-3/FR-5)、services.md(入口契約)、unit-of-work.md(U4)、unit-of-work-story-map.md

## エンティティ(U4 は文書・配線面のみ — 新規コード型なし)

| 概念 | 表現 | 備考 |
|---|---|---|
| スキル正本 | `packages/framework/core/skills/amadeus-plugin/SKILL.md` | 単一ファイル(mirror 同型) |
| Canonical command contract | SKILL.md 内 text fence の固定 verb 形列挙(status/compose/drop/doctor/install × `--project-root`/`--force` の許容組合せ) | スキルはこの列挙外を組み立てない |
| 投影配線(7面・**3系統**) | (a) literal `{src,dst}` entry(kimi 様式) (b) helper registry(claude/cursor/kiro/kiro-ide — `mirrorCoreSkillDirectory` 等、projections.ts の registry 追加を伴う) (c) emit.ts 配列編集(codex/opencode — codex/emit.ts:339-345 同型) | mirror の実配線を grep 再列挙し同一系統で追随。**U4 の変更面は docs+SKILL に加え harness 配線 .ts を含む**(「文書面のみ」ではない — reviewer it.1 指摘の反映) |
| docs 入口節 | 19-plugins EN/JA の操作導入部 | 3系統の入口(スキル/ハンドラ/raw)+面区別の明記 |

## 不変条件

- スキル本文は判断ロジックを持たない(判断はすべて plugin CLI 側 — スキルは導線とガードの提示のみ)
- SKILL.md に `--stage`+`--single` の両マーカー同時出現なし(BR-U4-2)
- 正本1箇所 → 投影は生成のみ(dist/self-install の手編集なし)
