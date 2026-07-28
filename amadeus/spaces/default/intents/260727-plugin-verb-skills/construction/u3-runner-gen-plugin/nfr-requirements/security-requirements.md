# Security Requirements — U3 u3-runner-gen-plugin

上流入力(consumes 全数): business-logic-model.md(生成の入力 = compiled graph)、business-rules.md(BR-U3-1)、requirements.md(FR-4)、technology-stack.md

## SR-U3-1: 実行導線は検証済み graph からのみ導出

runner 生成の入力は compose の trust 検証**後**に compile された stage-graph.json のみ(business-logic-model.md — ADR-1 の Security 節と同旨)。未検証の plugin 素材から直接スキル面を作らない。識別も compile 焼き込みが正で path 推測をしない(business-rules.md BR-U3-1)。

## SR-U3-2: 書込面の限定

runner dir の生成・除去は runner-gen のみが行い、plugin CLI は spawn するだけ(business-logic-model.md 配線層、requirements.md FR-4 の観測可能契約)。生成物はホストのスキル面(skills/amadeus-<slug>/)に限定(technology-stack.md のローカル FS 境界のまま — ネットワーク・認証情報なし)。
