# 信頼性要件 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 決定性(同一入力 → 同一判定)

business-rules の BR-U6-1(決定性)を継承する。business-logic-model のフロー 1 のとおり、同一のファイル集合・内容に対する ActivationJudgment は常に同一(changed | current | never-run)である。requirements FR-7(c)(policy は決定的で、発動条件・非発動時の挙動が文書化される)に対応する、本 Unit の中心的信頼性要件である。

- 合否: 同一 fixture への 2 回判定が一致する(BR-U6-1 の検証: 一致 assert)。spec-hash は入力ファイルの内容のみに依存し、時刻・環境変数・実行順に依存しない

## 状態の単方向(発火の冪等性)

business-rules の BR-U6-6(状態の単方向)を継承する。business-logic-model のフロー 4 のとおり、SpecHashState の書込は verdict 記録時のみで、advisory・doctor 経路は read-only である。advisory 発火では状態を書かない(発火の冪等性 — domain-entities 不変条件)ため、判定を何度観測しても状態が単調に汚染されない。

- 合否: 発火経路(advisory / doctor)での state ファイルの mtime / bytes が不変(BR-U6-6)
- 合否(verdict 記録): run-model-check 完了時のみ `writeActivationState({ lastVerdictHash, recordedAt })` が実行される(フロー 4)

## 0-plugin ゼロ影響と stdout 純度による整合

business-rules の BR-U6-4(0-plugin ゼロ影響)/ BR-U6-3(stdout 純度)を継承する。plugin 未 compose 時は engine の挙動・出力が現行と byte 同一で、advisory は stderr のみに出て stdout の directive JSON を破壊しない。これにより、activation policy の追加が既存 engine の通常経路(通常 scope 実行)の信頼性を退行させないことを構造的に固定する。

- 合否(0-plugin ゼロ影響): 0-plugin baseline での next 出力比較が byte 同一(BR-U6-4)
- 合否(stdout 純度): advisory 発火時の stdout parse 成功+既存 next 消費テスト green(BR-U6-3)

## 独自設計(上流機構への非依存)

business-rules の BR-U6-9(独自設計 — FR-7(d))を継承する。判定は spec-hash 独自機構のみで構成し、上流の `when:` 述語評価・plugin scope 機構に依存しない。requirements FR-7(d)(上流の `when:` 未評価・plugin scope 未実装を前提にした Amadeus 独自設計)のとおり、未実装の上流機構への依存という脆い前提を排除することが信頼性に寄与する。

- 合否: 実装に `when:` パーサ・scope 生成への参照が無いこと(BR-U6-9 の grep 検証)
- 合否(advisory 回数): advisory は指令発行 1 回につき最大 1 行(BR-U6-8。呼出し点が複数なら実装時にラッチで 1 行化 — guard-announcement-callsite-count)

## `--single` 撤廃の範囲限定(ゲート整合)

business-rules の BR-U6-5(`--single` 撤廃の範囲)を継承する。撤廃は compose 済み plugin stage の明示 `--stage` 起動に限り、stock scope への自動編入・auto-select はしない。business-logic-model のフロー 3 / 実行順(spec-hash 判定+テスト green を先に確定してから撤廃を適用)のとおり、「ゲートなし到達可能」窓を作らない順序制御で、認可境界の退行を防ぐ。

- 合否: scope grid に formal-model-check が現れないこと+`--stage formal-model-check`(--single なし)の受理(BR-U6-5)。technology-stack のとおり中立正本 `plugins/formal-model-check/stages/formal-model-check.md` を編集し投影経由で配布する(dist 手編集禁止)
