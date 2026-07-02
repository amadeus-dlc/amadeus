# U001 Bolt wave 実行契約

## ユニット

bolts の依存グラフからの wave 導出、wave 単位の並行実行（worktree 分離）、wave 完了時の統合と検証、wave 内のまとめ承認を、公開入口 `amadeus-construction` の実行契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004

## 価値境界

この Unit は、`amadeus-construction` SKILL.md への wave 実行契約の定義（導出規則、実行と統合と検証の手順、まとめ承認の運用、直列実行との整合）、promote 同期、既存検証の非破壊確認を扱う。

複数人での Bolt 分担、リモート実行基盤、新しい phase やゲートの追加、内部 skill の契約変更、wave 導出の機械化（解析スクリプト）は扱わない。

## 検証観点

- wave の導出規則、実行と統合と検証の手順、まとめ承認の運用、直列実行の既定が SKILL.md から読める。
- 同じ依存表からの wave 導出が決定論的である（契約の記述として矛盾がない）。
- 既存の Task Generation Gate 契約と内部プロセスの順序が変更されていない。
- 標準検証（e2e mock eval を含む）が pass を維持する。
- source skill と昇格先が promote 手順で同期されている。

## 未確認事項

- wave 契約の文言と挿入位置は Construction Functional Design で確定する。
- e2e eval（mock）の期待出力への影響の有無は Construction で確認する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-construction/SKILL.md` と `.agents/skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-bolt-wave-execution-contract/design.md)
