# Units Generation — 分割計画質問(260816-open-bug-batch-7)

Intent Autonomy Mode = `full` のため decide-question 梯子で裁定(E-AD-<hex8> = AUTO_DECIDED 裁定 ID 参照、grant `intent-grant-f3cd750783eded708416acde804af0b5`)。unit 境界(1 Issue = 1 Unit = 1 PR)は intent 起票文と requirements.md 制約で既決のため再質問せず、Step 5 の分割計画承認のみを裁定対象とした。

## Q1. 分割計画の承認(Step 5)

計画: Issue 単位の 3 unit — `pi-distribution`(kind: packaging、複雑度 M)/ `nsd-provenance`(kind: library、M)/ `sensor-docs-sync`(kind: spec、S)。unit 間依存なし(RE 実測でファイル交差ゼロ)。各 unit は単独で価値を出荷可能(それぞれ 1 Issue を閉じる)。source と test の ownership は unit 境界に一致。

A. 計画を承認する
B. 計画を修正する
X. Other (please specify)

[Answer]: A — 裁定 E-AD-24D2644A(= AUTO_DECIDED `auto-decision-24d2644a5b459810e7bb6015eaf20d84`)。根拠: 境界は上流で既決、独立実装可能性は codekb `code-structure.md` の patch surface 実測で担保、cid:units-generation:c1(独立実装可能性の事前検証・ownership 同一境界)に適合。
