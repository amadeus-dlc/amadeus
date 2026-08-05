# Functional Design 質問記録 — `launch-autonomy-flag`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: 1 問様式(Q1 のみ)。他の設計分岐はすべて既決規範・承認済み上流からの機械導出であり §機械導出の記録 に列挙する。
- **E-OC1 判定**: Q1 は真に未決の設計判断(複数の妥当解が残る)であり、Intent autonomy `full` の正規経路 `amadeus-bolt decide-question` で無人裁定した(下記 §裁定の記録)。Q1 以外は「既決規範の機械的執行」であり選挙・質問の対象にしない(`cid:requirements-analysis:always-elect` の執行条項、`cid:requirements-analysis:no-election-for-decided-norms`)。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。full grant が質問の無人裁定を Intent 完了まで認可する)

---

## Q1 — active intent 不在時(birth 経路)の `--autonomy` の挙動

上流(`component-methods.md` §C13 の判定表 1〜8、`decisions.md` ADR-8)は **active intent が在る場合**のみを確定しており、fresh workspace の birth 経路・cursor 未設定で `/amadeus --autonomy <mode> <自由文>` が invoke されたときの挙動は未確定である。

- A. **loud-error-no-active-intent** — `stateContent === null` なら `errorDirective` で loud 停止し、「birth を先に行い、その後 `/amadeus --autonomy <mode>` または `amadeus-bolt set-autonomy` で宣言する」を案内する(fail-closed — ADR-12 整合。birth directive 無改変で C-3 / Unit 境界を守る。FR-CLI-3 受け入れ基準 (0) の「birth 直後の Intent へ宣言」二段フローと一致)
- B. **thread-through-birth-directive** — `birthPrintDirective` へ autonomy を通し birth+宣言を一手で成立させる(「起動の一手」に最も忠実だが birth print 契約の改変が Unit 境界を超え、provenance 順序の未実測リスク)
- C. **silent-drop** — birth 経路では flag を黙って落とす(loud 原則に反するため不適)

[Answer]: A(loud-error-no-active-intent)— AUTO_DECIDED auto-decision-7bb5f69976f0c87168e4fa57ffb01bf6

## 裁定の記録

- **経路**: Intent autonomy `full` に基づく `amadeus-bolt decide-question`(2026-08-05T10:14 頃実行、conductor が carrier JSON を作成)
- **結果**: `kind: "decided"`、`selectedOptionId: "loud-error-no-active-intent"`(= 候補 A)、`decisionId: auto-decision-7bb5f69976f0c87168e4fa57ffb01bf6`、`occurrenceId: interaction-67c32f81d258e850a98ca46e41260a1d`、`grantId: intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7`、`reviewState: unreviewed`(検収キュー積載済み)
- **basis**: `agent-recommendation`(`degradedCapability: { capability: "solo-election", reason: "native-solo-election-result-unavailable" }` — native solo-election 結果不在の loud degradation を Core が記録したうえで推奨案を採用。stage-protocol.md §Intent-scoped autonomy の規定経路)
- **帰結**: C13 の判定表に判定 0(active intent 不在 → loud error)を前置する。§機械導出の記録 D5 と business-logic-model.md §判定順 に反映済み

---

## 機械導出の記録(Q1 以外の設計分岐)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | parser の分岐形状 | `--report` 同形の値 consume 分岐+ladder 末尾の値なし捕捉分岐の 2 分岐。値域検査は parser でしない | `component-methods.md` §C12 の逐語コード 2 片(引用の意味論適合照合済み — consume は `--report`、値域検査所在は `--scope`/Branch 3b の様式) |
| D2 | 判定順 1〜8 と error 文言 | `component-methods.md` §C13 の判定表を逐語で採用(本 FD で改変しない) | 同表は FR-CLI-1〜5 の受け入れ基準へ 1:1 で trace 済み(承認済み application-design) |
| D3 | C13 の呼び出し位置 | `handleNext` の state 読込(`:2540`)と Branch 3b/4(scope 検証 `:2632-2638`)の後、birth 分岐(`:2707`)より**前**に新 Branch として置く(`flags.autonomy \|\| flags.autonomyMissingValue` のとき発火) | ADR-8 Consequences「既存の Branch 群(Branch 3b の `--scope` 検証)と同じ様式に置く」+ Q1 裁定 A(birth 分岐より前でなければ no-active-intent の loud 化が構造的に成立しない) |
| D4 | 判別子・fail-closed・grant 保護 | `declared = (modeProvenance.kind === "human-command")`(ADR-13)/ projection unreadable → 拒否(ADR-12)/ 判定 5・6 が判定 8 より先(revoke-full 到達不能) | `decisions.md` ADR-12 / ADR-13、`component-methods.md` §C13(いずれも承認済み裁定の転記) |
| D5 | 判定 0(Q1 裁定の位置づけ) | 判定 1(値なし)より前に「active intent 不在 → loud error + 案内」を置く。案内文は `Use /amadeus "<description>" to birth an intent first, then declare autonomy with /amadeus --autonomy <mode> or amadeus-bolt set-autonomy.` の趣旨 | Q1 裁定 A(§裁定の記録) |
| D6 | テスト層と seam | t446(C12 parser)/ t447(C13 ハンドラ)を予約どおり使用。`amadeus-orchestrate.ts` は in-process import 実績あり(実測: `tests/unit/t-batch3-orchestrate-seam.test.ts` ほか 4 ファイル、`handleNext:2440` は export 済み)。`applyLaunchAutonomyDeclaration` / `readLaunchAutonomyContext` を export し in-process で駆動、`parseNextFlags`(現状非 export、`:1008`)は export を追加して t446 で直接駆動する | `unit-of-work.md` §テスト番号の予約 / `cid:code-generation:seam-export-handler-amend`(handler の argv パラメータ化 export)/ `cid:code-generation:bun-coverage-spawn-blindspot` |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(Q1 は AUTO_DECIDED の裁定 ID 付きで記入済み)
- 未解決の設計判断: **なし**(Q1 は裁定済み、D1〜D6 は機械導出)
- 後続へ委ねる判断: `unit-of-work.md` §未確定事項の引き取り のうち本 Unit 引き取りは U-6(allowlist 行ピン — 自 PR で機械 remap+span 検査)のみで、これは code-generation の実装時実測事項
- 上流との矛盾: **なし**(D2 は §C13 判定表の逐語採用。Q1 裁定 A は判定表の前置であり既存判定 1〜8 を改変しない)
