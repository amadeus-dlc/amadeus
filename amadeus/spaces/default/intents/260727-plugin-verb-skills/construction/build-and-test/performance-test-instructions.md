# Performance Test Instructions — 260727-plugin-verb-skills

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## 選定(NFR trace — 比例選定)

承認済み NFR(各 Unit の performance-requirements)は全て「専用予算なし/N/A(強制メカニズム不在)」— 性能専用テストは生成しない(bt-proportional-selection: 戦略名だけで機械追加しない)。code-summary.md の実装は追加機構ゼロ(spawn 1回・素朴コピー・全再生成)で、既存ランナーのタイムアウトが暗黙上限。

## 監視面

既存の t341 journey wall-clock(実測 0.86s)と CI の実行時間が回帰指標。専用閾値は設けない。
