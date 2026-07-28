# Evidence — 260727-plugin-verb-skills practices-discovery

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 証跡ソース(practices-discovery:c1 — 同日 RE codekb を代用)

| 面 | 証跡 | 所見 |
|---|---|---|
| CI・テスト | code-quality-assessment.md(t341 E2E+blocking CI job 着地、残存リスク4件) | 既存 Testing Posture と整合。新規慣行なし |
| コードスタイル | code-structure.md(判別 union・in-process seam・エントリ3層の既習様式が #1596 でも維持) | 既存 Code Style と整合 |
| 依存・境界 | dependencies.md(promote-self→plugin-projection 新設エッジ、core/harness 境界維持) | harness-tools-placement 準拠を確認 |
| セキュリティ/trust | architecture.md(compose 三層 trust 不変、FS baseline 実測化 #1586) | 検証劇場 Forbidden と整合(FS 実測化はむしろ準拠方向の是正) |
| バージョン運用 | technology-stack.md(v0.1.6 は release.yml 経由) | リリース一本化 Mandated と整合 |

## 結論

新規 Mandated/Forbidden 0 件、既存規則の是正提案 0 件。
