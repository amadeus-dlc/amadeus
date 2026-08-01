# Domain Entities — U6 docs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U6 の責務は unit-of-work.md U6 行(docs ~200行、全実装 Unit 依存)から、章構成の対象面は requirements.md の FR 系列と components.md の実装目録から、公開 API 面は component-methods.md から、掲載しない面(Relay 改修なし・常駐なし)は services.md から導出した。

## 成果物の構造(docs/reference/ 新章「Telemetry Schema」)

- **ファイルは日英対訳ペアで新設**: `docs/reference/21-telemetry-schema.md`(en)+`docs/reference/21-telemetry-schema.ja.md`(ja)— 既存 docs/reference は 22/22 章が完全対訳ペア(実測・例外ゼロ)であり、project.md Mandated「paired English/Japanese documentation in the same change」に従う。t174 系ゲートは新規ペア要否を強制しないため本 FD で確定(章番号 21 は空き実測のうえ実装時に最終確認)

| 節 | 内容 | 正本 |
|---|---|---|
| Resource attributes | 14属性の閉集合(中立8+vcs2+supplier4)、供給元、fail-open 規則 | #1868 §1+U1 実装 |
| Span attributes | resolver 6キー、merge 優先度、意図的相違(journal フォールバック vs span 省略) | #1868 §2+U2 実装 |
| Exception events | 3属性、stacktrace redaction 規則(repo 相対 / home / external) | #1868 §4+U3 実装 |
| Subagent observability | started/completed、lifetime 合成の決定的突合規則 | #1868 §5+U4 実装 |
| Metrics instruments | 5計器の name/kind/属性、cardinality 統制 | #1868 §6+U5 実装 |
| Redaction layers | 二層(write-time / export boundary)の面別対応表 | 実装横断 |

## 不変条件

- 対応表の各行は実装の定数/registry から**転記**(記憶起草禁止 — compilation-stage-source-first)
- 件数語は隣接列挙原則(c3-adjacent-enum-numerals)— 表に隣接しない散文の硬数値を置かない
