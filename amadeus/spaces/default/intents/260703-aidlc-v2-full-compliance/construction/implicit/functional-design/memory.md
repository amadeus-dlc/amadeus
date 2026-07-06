# Memory: functional-design

## Interpretations

- Application Design 未実行の縮退として、requirements.md と codekb 知識を設計材料に使った。
- aidlc-state.md の設計時セクション名は総称で書き、正確な見出しは vendored template を正とした。

## Deviations

- 逸脱なし。

## Tradeoffs

- audit の採用イベント集合は設計で固定せず、code generation で v2 原文から確定する判断にした。

## Open questions

- audit shard の構成（単一 audit.md か複数 shard か）は実装時に audit/audit.md を主 shard とする解釈で確定した。
