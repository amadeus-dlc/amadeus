# Intent Backlog — semi 再定義と --autonomy 起動宣言(#2253)

上流入力(consumes 全数): intent-statement.md

## プロト Unit(MoSCoW、依存順)

`intent-statement.md` の Success Metrics を分解した proto-Unit。すべて Must(nice-to-have を置かない — scope-definition-questions.md Q2 裁定)。

| # | proto-Unit | MoSCoW | 依存 | 概要 |
|---|---|---|---|---|
| P1 | semi 認可基体の確定 | Must | なし(requirements 段の裁定が前提) | 質問裁定権限を grant 実在から切り離す設計 — scope・effect 認可・basisFingerprint の非 grant 担体(候補: modeProvenance 拡張)。FR-GRT-004 維持 |
| P2 | semi 質問無人解決コア | Must | P1 | `resolveAutoDecision:702` / `createGateAutoDecision:667` の両改訂、`amadeus-stop.ts` `isFullyAutonomousIntent` 系述語の分割、`t121:1138` / `t431:313` のピン改訂 |
| P3 | 事前裁定方針の semi 受付 | Must | P1 | `HumanAutonomyCommand` 判別ユニオン拡張・非 full 用確認 digest・`--policies-file` 無音破棄の loud 化 |
| P4 | `--autonomy` 起動宣言 | Must | P2(semi 分)/ full 分は独立 | `/amadeus --autonomy semi\|full` — semi 即時設定、full は grant 実在チェック+不在時 preview 表示 fail-closed。落ちる実証込み |
| P5 | 表示の同一語彙 | Must | P4 | statusline への Autonomy 描画追加、`--status` Policies 行の grant 非依存化、directive `intent_autonomy_mode` 消費側棚卸し |
| P6 | docs / canonical 改訂 | Must | P2〜P5 | docs 11 ファイル(日英同時)+ #2067 canonical 表の改訂記録。走行単位の主張限定 |

| P7 | advisory choice の無人解決 | Must | P1(認可基体)/ P2(質問解決コア) | `await-advisory-choice` を full/semi の無人解決経路へ載せる。`applyPendingAdvisoryGuard`(`amadeus-orchestrate.ts:781-800`)の横取りと `amadeus-advisory-choice.ts` の `humanTurn` 必須契約の改訂。ユーザー裁定 2026-08-05T06:03Z による追加(scope-document 承認系譜を参照) |

## シーケンシング

dependency-first(Q4 裁定): P1 → P2 → (P3, P4, **P7** 並行可) → P5 → P6。P7 は P1/P2 の認可基体と質問解決コアに依存する(advisory の受理を grant 非依存の認可基体へ載せ替えるため)。walking skeleton 候補は P2 の最小スライス(semi 質問1件が**5段**で解決されるエンドツーエンド — 段数は RE 実測により 4→5 訂正、confirmed-policy を含む)。

## 除外(Won't)

- walking skeleton / phase 境界 / Intent 終端の semi 自動化
- 互換シム・旧挙動温存
- ワンショット full 発行
- stop 継続予算の変更
