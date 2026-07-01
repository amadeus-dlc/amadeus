# Notes

## 実行方針

B002 は `.amadeus/development.md` を主対象にし、`.amadeus/steering/policies.md` は重複確認だけを行う。
machine-readable evidence 形式は、この Bolt では導入しない。

## 対象タスク

| Task | 対象 | 方針 |
|---|---|---|
| T001 | `.amadeus/development.md` | workspace 対応記録の置き場所を開発手順に追加する。 |
| T002 | `.amadeus/development.md`、`.amadeus/steering/policies.md` | 検証証拠を PR 準備条件から追跡できるようにする。 |

## 作業順序

1. B001 の stage 方針記録を先に完了する。
2. T001 で workspace 対応記録の置き場所を追加する。
3. T002 で検証証拠の記録条件を追加する。
4. Validator と標準検証で、成果物契約と差分を確認する。

## 未確認事項

- machine-readable evidence 形式の導入要否は後続 Intent で判断する。

## 実装記録

- `.amadeus/development.md` に `stage と workspace 対応記録` を追加した。
- `.amadeus/steering/policies.md` の provenance 最低記録項目に host environment と target artifacts を追加した。
