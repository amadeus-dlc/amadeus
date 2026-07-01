# Notes

## 実行方針

B001 は `.amadeus/glossary.md` と `.amadeus/steering/policies.md` だけを対象にする。
`CONTEXT.md` への stage 語彙追加は、この Bolt では扱わない。

## 対象タスク

| Task | 対象 | 方針 |
|---|---|---|
| T001 | `.amadeus/glossary.md` | 既存の stage 語彙を維持し、stage0 採用判断に必要な語が不足する場合だけ追加する。 |
| T002 | `.amadeus/steering/policies.md` | stage2 を次回 stage0 として扱う条件と Maintainer 判断を明示する。 |

## 作業順序

1. T001 で用語の不足を確認する。
2. T002 で方針を補強する。
3. Validator と標準検証で、成果物契約と差分を確認する。

## 未確認事項

- `CONTEXT.md` への stage 語彙昇格は後続 Intent の判断に残す。

## 実装記録

- `.amadeus/glossary.md` に `stage0 採用条件` と `stage0 採用判断` を追加した。
- `.amadeus/steering/policies.md` に Maintainer 判断と証拠項目を追加した。
