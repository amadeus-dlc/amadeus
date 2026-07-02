# U001 phase gate の skill 契約

## ユニット

phase skill の人間ゲート（Task Generation 承認）と grilling 起動を、エージェントの自己判断に依存しない決定論的な契約にする Unit である。

## 対象要求

- R001
- R002
- R003
- R005

## 価値境界

この Unit は、実装ゲートの前提強化（implementation-execution と bolt-preparation）、decision review への決定論的 grilling トリガーの追加（ideation、inception、construction）、scaffold-only 許可条件の限定（ideation）、および対象 skill の promote 同期を扱う。

承認内容の妥当性判断、Task Generation 以外の新しい人間ゲート、validator の検査実装は扱わない。

## 検証観点

- implementation-execution の前提が `passed` だけを許可することが skill 本文から読める。
- bolt-preparation の停止と承認待ちの行動が肯定形で読める。
- 3 つの phase skill の decision review に同じ文言規約トリガーが定義されている。
- ideation の auto 判定の scaffold-only 条件が、確定判断の記録 3 種への参照の実在になっている。
- source skill と昇格先成果物が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。
- 対象 Intent が validator で pass する。

## 未確認事項

- decision review のトリガーを `amadeus-decision-review` の判断ノード表に統合するか、各 phase skill の Decision Review 節だけに書くかは Construction で判断する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-construction-implementation-execution/SKILL.md`, `.agents/skills/amadeus-construction-implementation-execution/**` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-construction-bolt-preparation/SKILL.md`, `.agents/skills/amadeus-construction-bolt-preparation/**` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` と各昇格先 | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md`, `.agents/skills/amadeus-decision-review/**` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-phase-gate-skill-contract/design.md)
