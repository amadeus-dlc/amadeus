# Code Summary — fix-1750-intent-initialized

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 結果
- PR: https://github.com/amadeus-dlc/amadeus/pull/1791 — **マージ済み**、#1750 クローズ(着地 grep: intent-initialized ×2 in mirror-lifecycle)。
- 実装: 第5 boundary 種別+birth 後最初の next での初回 create 評価+`Mirror Initial Create Receipt`(別軸 receipt)+initialCreateIsOutstanding 決着条件。allowlist は内容一致アンカーで機械 remap(3エントリ直読判断+新規2件理由付き)、complexity-baseline は main 37→38 のみ手編集。
- 検証: full coverage:ci 672 files 0 fail、mirror 契約 9-10 files 214-215 pass、落ちる実証2回(base checkout 7赤 / pending 緩和 revert 1赤 → 復元 green)。docs 4面(guide/reference × ja/en)同期。
- CI: attempt 1 の digestMatrix 分散はレプリカ実測(39.78/637.99/95.91)でランナー負荷フレークと確定、attempt 2 全 green。
