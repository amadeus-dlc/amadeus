# B001 実行メモ

## 実行方針

- skill 文書の契約定義が中心であり、コード変更とテストコード変更を含まない。検証は標準検証（e2e mock eval を含む）、validator、skill-forge 確認（PR で記録）で行う。
- 契約は Functional Design の BR001〜BR008 の規則に従い、観察済みの実例（#334 の並行可能性とまとめ承認、並行運用ポリシー）に根拠がない規則を書かない。
- 内部 skill の SKILL.md と Task Generation Gate の契約は変更しない（INV002）。
- e2e mock eval への影響確認と必要な調整は B002 で行う。B001 は source と昇格先の契約定義までを完了条件にする。

## 対象タスク

- T001: SKILL.md への wave 契約の定義。
- T002: promote 同期。

## 作業順序

1. T001 で `Bolt の wave 実行` の章を書く。
2. T002 で昇格先を同期する。

## 未確認事項

- e2e eval（mock）の期待出力への影響の有無は B002 で確認する。
