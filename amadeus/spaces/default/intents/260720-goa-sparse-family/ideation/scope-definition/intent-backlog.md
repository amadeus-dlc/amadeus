# Intent Backlog — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

risk-first(scope-definition:c3)— 裁定依存を先行確定する順。

| ID | 項目 | 順序根拠 |
|---|---|---|
| B-1 | RA 選挙: #1254 方式 (a)/(b)/(c)(C-1)+圧縮形読み側後方互換・t238:102 の扱い(C-2) | 全実装の前提裁定 — 最優先 |
| B-2 | #1254 実装(裁定方式に従う)+corpus 14行 sweep 両側実証 | B-1 従属 |
| B-3 | #1255 実装(GoaLineCode 拡張・撤去)+t238 更新 | B-1(C-2 裁定)従属 |
| B-4 | #1257 実装(ECODE_RE 整合+count 不変対照テスト) | 独立(裁定不要)— B-2/B-3 と同一 PR 同乗可 |

単一 Unit 見込み(3 Issue は同根 regex ファミリで分割の並行効果なし — units-generation で確定)。
