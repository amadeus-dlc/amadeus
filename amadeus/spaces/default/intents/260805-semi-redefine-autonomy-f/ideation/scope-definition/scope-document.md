# Scope Document — semi 再定義と --autonomy 起動宣言(#2253)

上流入力(consumes 全数): intent-statement.md

## In / Out 境界

`intent-statement.md` の Problem Statement(headless 起動宣言の不在・semi の不定形走行)と Success Metrics を境界の導出元とする。scope は `self-feature`(birth 時ユーザー既決)。

### In(本 intent で出荷する)

1. **semi の再定義(canonical 改訂)** — 質問を full と同一の無人解決4段(方針なしは3段縮退)で処理。`resolveAutoDecision:702` の full ハードゲートと `createGateAutoDecision:667` の question-throw の両改訂、`amadeus-stop.ts` の質問 carve-out 述語の grant 非依存化
2. **`--autonomy semi|full` 起動宣言** — semi は即時設定(HUMAN_TURN provenance 必須)、full は grant 実在時走行・不在時 preview 表示の fail-closed 停止(FR-GRT-006 不変)
3. **semi の事前裁定方針受付** — 任意入力。担体・確認 digest は requirements 段の裁定事項。`--policies-file` 非 full 無音破棄の loud 化
4. **表示の同一語彙** — `--status` に加え statusline への Autonomy 表示追加(#2067 旧本文の残余)
5. **旧仕様ピンの明示改訂** — テスト(`t431:313`、`t121:1138`)+ docs 11 ファイル(日英対訳同時)。走行単位の主張は「質問で止まらない」に限定(stop 継続予算 cap 8 は不変)
6. **落ちる実証** — grant 不在 `--autonomy full` の fail-closed 停止を回帰テストで固定

### Out(明示的にやらない)

- walking skeleton / phase 境界 / Intent 終端の semi 自動化(ユーザー裁定 2026-08-05: semi = full − 節目)
- 旧 semi 挙動の互換モード・フォールバック・移行シム(後方互換なし — 置き換えのみ)
- `--autonomy full --confirmed-display-digest` によるワンショット発行(#2253 代替案5で非採用)
- FR-GRT-004 の変更(semi は current grant = null を維持)
- stop 継続予算(AUTONOMOUS_BLOCK_CAP)の変更
- #1647(approve-batch の human-presence guard)・#1241(外部人間ゲート待ち)は別 Issue のまま

## バリューストリーム

headless 起動(`claude -p '/amadeus --autonomy semi'`)→ 起動宣言が監査記録 → phase 内を質問込みで無人前進(AUTO_DECIDED + unreviewed)→ phase 境界で人間が裁定+unreviewed 検収 → 次 phase。full は同じ流れが Intent 終端まで。

## スコープ確定の根拠

- Issue #2253(クロスレビュー2名成立、ESTABLISHED_WITH_REFINEMENTS、指摘反映済み)
- ユーザー裁定 2026-08-05(semi=full−節目 / walking skeleton 除外 / 後方互換なし / full grant 許可)
- 裁定 ID: scope-definition-questions.md の Q1〜Q5(いずれも unreviewed queue で事後検収可能)
