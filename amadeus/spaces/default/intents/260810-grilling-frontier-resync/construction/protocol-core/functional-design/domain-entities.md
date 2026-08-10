# Domain Entities — U1 protocol-core

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: protocol-core (spec)

上流入力(consumes 全数): `requirements.md`(用語の正本 — frontier/design tree/枝刈り等)、`components.md`(C1 の所有物 = 本書のエンティティが住む文書)、`component-methods.md`(C1 文書契約の様式)、`services.md`(ラウンドループの実行時語彙)、`unit-of-work.md`(U1 境界 — エンティティは protocol 文書上の概念でありコード実体を持たない)、`unit-of-work-story-map.md`(利用者から見た概念の現れ方)。

## 概念エンティティ(protocol 文書上の定義対象)

本 Unit は spec(文書)であり、エンティティはコード型ではなく protocol が定義する概念。U2 のセンサーが機械消費する様式(マーカー・記録行)のみ verbatim 契約を持つ。

| 概念 | 定義(overlay に書く内容) | 機械契約 |
|---|---|---|
| design tree | 決定が子決定に分岐する木。骨格(上流逐語)が定義 | なし(会話上の構造) |
| frontier | 前提が揃い今聞ける質問の集合。骨格が定義 | なし |
| round | frontier の一括提示単位。回答後にツリー再計算 | questions ファイル上は1問1行の既存様式(ラウンド境界は監査に現れない) |
| materiality 閾値(depth) | M/S/C の枝刈り基準表+standalone 専用 Free | workflow depth は既存3値 wire のまま(VALID_DEPTH_VALUES 非変更) |
| 刈りノード(deferred node) | 閾値未満で ツリーに入れなかった決定。合意サマリに列挙 | U2 センサーが列挙節の存在を検査(空明示可) |
| 回路遮断器 | depth 指定時の目安×3 上界。発火 = 「ツリー未完走」の明示開示+停止 | 発火様式は prose(会話)。事後検査は U2(超過記録の有無) |
| grilling モードマーカー | `<!-- amadeus-grilling:v1 mode=grilling -->`(questions ファイル1行目) | U2 センサーの検知対象(verbatim) |
| 超過記録行 | `<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->` | U2 センサーの verbatim 照合対象。`[Answer]:`・「承認」と非交差 |
| 合意サマリ | 全決定の表+deferred 列挙+未解決点。確認まで行動しない(骨格) | なし(人間確認が終端) |

## 様式の正本性

- マーカー2種と記録行の**唯一の正本は grilling-protocol.md(C1)**。U2(センサー)・SKILL.md(C5)・stage-protocol(C2)は C1 を参照し再定義しない(canonical 1定義)。
- 固定トークンは `amadeus-grilling` 接頭辞で統一し、既存 questions 様式のトークン(`[Answer]:`、「承認」、`## Q`)と語彙非交差(vocabulary-collision-vacuity-guard — U2 の vacuity guard テストで固定)。
