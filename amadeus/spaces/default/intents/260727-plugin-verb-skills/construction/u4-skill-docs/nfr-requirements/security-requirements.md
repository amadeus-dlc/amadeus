# Security Requirements — U4 u4-skill-docs

上流入力(consumes 全数): business-logic-model.md(Step 1-3)、business-rules.md(BR-U4-1/BR-U4-2)、requirements.md(FR-3d)、technology-stack.md

## SR-U4-1: 固定 verb のみの導線

スキルは Canonical command contract の固定形以外を組み立てない(business-rules.md BR-U4-1、business-logic-model.md Step 3)。任意コマンド・シェル文字列合成・認証情報の扱いなし(technology-stack.md のローカル CLI 境界のまま)。

## SR-U4-2: 不可逆操作の明示

drop / install --force は Step 2 で影響を明示してから実行(business-logic-model.md — 人間の確認を挟む導線)。runner drift guard への誤干渉は両マーカー不含で構造回避(requirements.md FR-3d、business-rules.md BR-U4-2)。
