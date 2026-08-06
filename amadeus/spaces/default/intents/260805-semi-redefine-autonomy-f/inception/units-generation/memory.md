# Stage Memory — units-generation

## Interpretations

- 2026-08-05T08:30:00Z — proto-Unit P1〜P7 を 7 Unit へ写像した(P1+P2 → semi-authorization-core に統合 — 認可基体と質問解決コアは片側だけでは利用者価値を出荷できない境界のため `cid:units-generation:c1` (a) により単一 Unit 化。P3 → semi-policy-carrier、P4 → launch-autonomy-flag、P5 → autonomy-statusline、P6 → semi-docs-revision、P7 → advisory-auto-resolution、stop hook 面は独立の stop-question-carveout へ)。
- 2026-08-05T08:30:00Z — テストピンの反転(t431:313 / t121:1138-1150)は挙動変更 Unit(core / stop-question-carveout)へ移設した。反転が core の変更と同一 PR にないと CI green が保てないため(`cid:units-generation:c1` の統合条件)。

## Deviations

## Tradeoffs

- 2026-08-05T08:45:00Z — §12a reviewer(iteration 1)READY(BLOCKER 0 / FOLLOW-UP 4 / NIT 1)。FOLLOW-UP 4件を conductor 主導で是正: (1) story-map の FR 件数を列挙から機械再計算(33 → 31) (2) 上流 C13→C9 辺の消去を不在根拠表へ申告 (3) ADR-3 の production 層結線の宙吊りを core 所属と確定し、amadeus-intent-autonomy-production.ts の交差を「core + carrier 直列」へ訂正 (4) 辺の hard/soft 強度注記を追加(delivery-planning が soft 辺を並行機会として扱えるように)。

## Open questions

- 2026-08-05T08:45:00Z — compile 再実行で bolt_dag 非 null(7 units)を確認(`cid:units-generation:recompile-before-construction-bolt-dag`)。
- 2026-08-05T09:00:00Z — §13 選定はソロ選挙 E-SRA-UGS13 で確定(2-0 established、choice 1「0件」、GoA 2x2)。留保転記: (subagent-1) 不採用理由の cid 対応づけは FOLLOW-UP 4件中2件のみで残り2件は投票者が独立補完した / (両者収斂) hard/soft 辺強度注記は一般化の芽があるが対照実測がなく、後続 intent で強度未注記による並行機会喪失の実測が出たら §13 候補へ昇格を再検討する
- 2026-08-05T08:45:00Z — §13 学習候補: 0件(FR 件数の機械再計算は既存 cid:requirements-analysis:ledger-count-mechanical-recalc の適用実例、production 層結線の宙吊り検出は既存 cid:requirements-analysis:enumeration-completeness-review の適用実例。新規の一般化価値なし)。
