# Code Generation Plan — sensor-docs-sync(#3097)

方式 = D3 + クロスレビュー refinement(値照合述語が必須、06 側の陳腐値も対象)。traceability: 全 step → FR-SEN-1/2。depth Minimal。クロスレビュー成立済み(ESTABLISHED_WITH_REFINEMENTS)。

- [ ] Step 1: TDD Red — t3028 を拡張: (a) 07 en/ja の matches 表を検査対象へ追加(期待集合 = `derivedCorpus()` の matches 宣言サブセット 13 件 — 第 2 コーパス定義を作らない) (b) **名前集合だけでなく matches 値の一致まで照合する述語**(refinement: 既存 `tableRows()` は名前のみで値陳腐化を検出できない)。拡張後の Red を実測(現行 07 は欠落 4 + 陳腐 2)(FR-SEN-2)
- [ ] Step 2: `docs/reference/07-sensor-system.md:199-207` / `.ja.md` の表を 13 件へ同期(欠落 4 行追加 + `amadeus-required-sections` / `amadeus-upstream-coverage` の 2 行へ `codekb` glob 是正)。en/ja 同一変更(FR-SEN-1)→ Step 1 が Green
- [ ] Step 3: 06 側の陳腐値(reviewer-2 実測: `docs/harness-engineering/06-sensors.md` en:80 / ja:45 に同一の `codekb` 欠落)を再実測のうえ是正し、値照合の射程に 06 の該当面を含められるか確認(含められない構造なら根拠を code-summary へ記録)
- [ ] Step 4: 落ちる実証 — 07 の表 1 行を注入的に崩して Red 実測 → revert(競合マーカー・残渣ゼロを機械確認)→ 同期後 Green(FR-SEN-2 AC)
- [ ] Step 5: 台帳 resync(t3028 変更 → coverage-registry regen 要否確認)
- [ ] Step 6: typecheck / lint / t3028 → commit → push → PR 作成(push-first)

申し送り(スコープ外): git-drift の PostToolUse 非発火仮説(`amadeus-sensor-fire.ts:225`)は別トリアージ候補(§13 / 完了時に起票判断)。
