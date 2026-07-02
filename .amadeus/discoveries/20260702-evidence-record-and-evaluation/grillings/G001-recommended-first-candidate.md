# G001: 最初に Intent 化する候補の選定

## 概要

- 状態: completed
- 対象: Discovery
- 反映先: [20260702-evidence-record-and-evaluation.md](../20260702-evidence-record-and-evaluation.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 新規 Intent 候補のうち、最初に Ideation へ進める recommended 候補を #296（provenance 記録の生成と検証の機械化）にする。依存順は #296 → #297 → #240 とする。 | active | [20260702-evidence-record-and-evaluation.md](../20260702-evidence-record-and-evaluation.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: epic #315 の子 Issue 3 件（#240、#296、#297）のうち、最初に Intent 化して進める recommended 候補をどれにするか。
- 確認が必要な理由: `multi_intent` 判定では recommended を 1 件だけ選ぶことが Gate 条件である。Issue #315 は「先に #296 と #297 で記録形式を確定してから #240」と依存順を定めているが、#296 と #297 のどちらを先に進めるかは確定していない。
- 推奨回答: #296（provenance 記録の生成と検証の機械化）を先にする。
- 推奨理由: #240 の評価軸は主に #296 の機械可読記録の形式に依存し、Issue #315 が指摘する初期スコープの重なり（`provenance:check` と #240）も #296 の確定で解消される。#297 は knowledge 契約の文書変更が中心で規模が小さく、#296 と独立に後続できる。
- ユーザー回答: #296 を先にする。
