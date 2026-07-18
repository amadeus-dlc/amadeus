<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T10:51Z — 設計3論点(比率目標/層境界/移設対象)は E-TPR-RA で Q1〜Q3 全 A・全会一致 4/4(GoA 1)。導出方法・グリーン維持・実移設 Out(Q4)は E-OC1 既決導出として leader 承認(10:52Z)。分類の数値材料はすべて RE の classifyTestSize 決定的スイープ(440ファイル)で計測導出 — ハードコードなし(検証劇場回避)。
- 2026-07-17T11:04Z — 宣言センサー3種(required-sections/upstream-coverage/answer-evidence)を produces(requirements.md/questions.md)へ手動発火し全 PASSED(audit 11:04:37-38Z 実測)。shard の1 SENSOR_FAILED(fire c2c316f5, 11:01Z)は scan-notes.md(RE 成果物)への stale/誤標的発火で本ステージ produces ではない — ゲートブロッカーではないと分類。

## Deviations
- 2026-07-17T11:00Z — 初稿 requirements.md が scope-document In-Scope 2 の承認済み項目「実行時間予算」を無申告で脱落させていた(product-lead Critical 指摘)。**逸脱ではなく承認済みスコープの回復**として FR-5 追加。値は既に units-generation U-2 選挙へ routing 済みのため requirements 段の新規選挙不要 — leader が「既決の執行」と裁定(11:01Z)。自律判断は即時報告済み(autonomous-decision-immediate-report)。
- 2026-07-17T11:05Z — 是正 diff 自身の欠陥: AC-5a に書いた「各 tier の wall-clock 実測」が record に不在(product-lead が2巡目で捕捉)。fix-diff-independent-reverify 該当 — 引用を除去し計測を U-2 の前提作業へ委ねる形に是正。3巡目 READY。

## Tradeoffs
- 2026-07-17 — 比率目標・実行時間予算・tier-aware ドリフトゲートはいずれも「ガイドライン目標/設計のみ」に留め、強制ゲート化と実移設は本 intent Out(移設 intent へ)。walking-skeleton 的に設計スライスを先に固め、実装拡張前に人間ゲートを置く方針と整合。

## Open questions
- 2026-07-17 — OQ-1: U1 台帳/U2 層設計・比率・実行時間予算値の選挙/U3 移設計画の Unit 境界(→ units-generation)。OQ-2: tier-aware ドリフトゲート実装・比率強制の是非(→ 移設 intent)。
