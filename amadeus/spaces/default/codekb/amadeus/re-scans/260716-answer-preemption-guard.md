# Re-scan — 260716-answer-preemption-guard(2026-07-16)

| 項目 | 値 |
|------|----|
| 手法 | diff-refresh(c1、rescan-base-ancestry) |
| base | `f0f4e0ca4e6`(直前 re-scan 260716-eoc1-gate-check の observed。祖先性 exit 0・距離124) |
| observed | `e530fc4b13f`(`git rev-parse HEAD` 実測一致) |
| 区間 | 124コミット — checkQuestionsEvidence 群 + gate-start ガード配線(#1101/#1106)は着地済み、sensor 機構(sensor.ts/sensor-*.ts/graph.ts/hook/sensors/*.md)は未変更 |

## フォーカス面(Issue #922 — [Answer] 先取り記入の sensor 発火点追加)

checkQuestionsEvidence 純関数(`amadeus-lib.ts:1173`、export 済み・判別ユニオン `QuestionsEvidence` :1144-1146)、gate-start 消費側(`amadeus-state.ts:1710-1733`、cutoff `GUARD_CUTOFF_YYMMDD=260716` :1721)、sensor dispatcher の id-agnostic fire 契約(`amadeus-sensor.ts`、pass/findings_count 汎用読み :576/:693-699)、manifest frontmatter(`sensors/amadeus-required-sections.md:1-24`)、`sensors:`→`sensors_applicable` 解決(`amadeus-graph.ts:704-728`)、PostToolUse hook 発火経路(`.claude/hooks/amadeus-sensor-fire.ts`、Write|Edit matcher・`Bun.Glob(entry.matches).match` :193-194)。

## 結論

**A1 = YES**: PostToolUse hook は questions ファイル書込みで発火可能。questions 絶対パスは既存 required-sections の matches `**/{amadeus-docs,intents}/**` に `Bun.Glob` で match=true(実測)、producing stage が Current Stage の時点(gate 前)に書込みが起きるため発火経路は既に成立。先取り検知本体は純関数として抽出・export 済みで sensor から再利用可能 — 新 sensor 追加は「manifest 1枚 + script 1本 + stage の `sensors:` へ id 追加」で完結し **hook 側改修は不要**。gate-start ブロッキングガードと sensor advisory はタイミングが異なり相補。詳細は intent record の scan-notes.md。
