# Business Rules

## 目的

`dry-run` 契約の同期と検証を、source skill、昇格先成果物、eval、validator の証拠で追跡するための規則を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 昇格先成果物への反映は `dev-scripts/promote-skill.ts` を使う。 | R005 | accepted |
| BR002 | `.agents/skills/amadeus-discovery/SKILL.md` を手動同期しない。 | R005 | accepted |
| BR003 | text contract は `dry-run` mode、出力項目、副作用禁止、`scaffold-only` 差分、consumer 境界を検出する。 | R005 | accepted |
| BR004 | 先に text contract を更新し、未実装状態で失敗することを確認する。 | R005 | accepted |
| BR005 | validator の `pass` は構造検出であり、内容承認として扱わない。 | R005 | accepted |
| BR006 | PR URL がない場合は `pr.md` を作らない。 | R005 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| text contract で読み取り専用性を十分に検出できない。 | 後続 Issue 候補または検証メモとして記録する。 | R005 |
| promote-skill が失敗する。 | 昇格先成果物を手動同期せず、失敗原因を修正する。 | R005 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | source skill に `dry-run` 契約を反映する対象がある。 | R005 | accepted |
| INV001 | 不変条件 | 昇格先成果物は promote-skill で反映する。 | R005 | accepted |
| INV002 | 不変条件 | 実行していない検証を成功として記録しない。 | R005 | accepted |
| POST001 | 事後条件 | text contract、validator、必要な標準検証の結果を記録できる。 | R005 | accepted |

## 未確認事項

なし。
