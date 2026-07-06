# D005：Operation phase の完全採用

## 判断

Operation phase（4.1〜4.7）を完全採用し、「Operation は Amadeus 対象外」契約を撤廃する。
実行条件は本家と同じ CONDITIONAL とする。

## 根拠

- 対応漏れ 15 skill に Operation 系 7 個が含まれ、パリティ完成に必要である。
- 条件が偽の Intent では従来どおり SKIP されるため、既存 scope の挙動は変わらない。

## 影響

- stage catalog、AMADEUS.md、state 初期化（Operation を一律 `[S]` にする処理）を改定する。

## 由来

G001 の GD005。
