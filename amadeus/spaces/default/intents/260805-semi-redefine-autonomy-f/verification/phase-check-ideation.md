# Phase Boundary Verification — IDEATION → INCEPTION

対象 Intent: `260805-semi-redefine-autonomy-f`(#2253)
方法論: `.claude/knowledge/amadeus-shared/verification.md`、`.claude/amadeus-common/protocols/stage-protocol-governance.md`

## 1. 検証対象

| 成果物 | 状態 | 用途 |
|---|---|---|
| `ideation/intent-capture/intent-statement.md` | 存在・承認済み(2026-08-05T05:00:46Z) | 問題定義、対象顧客、成功指標6件、初期 scope |
| `ideation/intent-capture/stakeholder-map.md` | 存在・承認済み | 利害関係者、意思決定者、証拠要求 |
| `ideation/scope-definition/scope-document.md` | 存在・センサー PASSED | In 6件 / Out 6件、バリューストリーム、確定根拠 |
| `ideation/scope-definition/intent-backlog.md` | 存在・センサー PASSED | proto-Unit P1〜P6(全件 Must)、依存順、walking skeleton 候補 |
| `ideation/scope-definition/scope-definition-questions.md` | 存在・センサー PASSED | Q1〜Q5 の裁定記録、E-OC1 判定、full grant 自動裁定の証跡 |

センサー実測: `required-sections` / `upstream-coverage` / `answer-evidence` の3種を scope-definition の全成果物へ発火し、`SENSOR_FAILED` 0 件(audit seq 74-92、2026-08-05T05:03:35Z 断面)。

## 2. Intent → Scope → Intent Backlog トレーサビリティ

| # | Intent 成功指標 | Scope(In) | Backlog | 判定 |
|---|---|---|---|---|
| M1 | semi の質問が full と同一の無人解決4段(方針なしは3段縮退)で解決され `AUTO_DECIDED` + unreviewed queue に記録される | In-1 | P1、P2 | PASS |
| M2 | walking skeleton / phase 境界 / Intent 終端は semi でも人間裁定のまま(変更しない) | Out-1(明示的除外) | — (Won't) | PASS |
| M3 | `/amadeus --autonomy semi\|full` が動作(semi 即時設定、full は grant 実在時走行・不在時 fail-closed 停止) | In-2 | P4 | PASS |
| M4 | 旧仕様ピンの明示改訂(テスト `t431:313` / `t121:1138` + docs 11 ファイル日英同時) | In-5 | P6 | PASS |
| M5 | 実装面の完全性(`resolveAutoDecision:702` / `createGateAutoDecision:667` の両改訂、`amadeus-stop.ts` 質問 carve-out 述語、`--policies-file` 無音破棄の loud 化) | In-1、In-3 | P2、P3 | PASS |
| M6 | 後方互換なし(互換モード・フォールバック・移行シムを作らない) | Out-2(明示的除外) | Won't | PASS |
| M7 | 落ちる実証(grant 不在 `--autonomy full` の fail-closed 停止を回帰固定) | In-6 | P4 | PASS |
| M8 | 表示の同一語彙(`--status` + statusline の Autonomy 表示) | In-4 | P5 | PASS |

順方向カバレッジ **8/8(100%)** — 成功指標はすべて In 項目または明示的 Out へ到達する。逆方向も In-1〜In-6 / P1〜P6 の **100%** が成功指標へ対応し、孤立した In 項目・proto-Unit は 0 件。

## 3. スコープ境界の整合性

| 検査 | 結果 | 根拠 |
|---|---|---|
| 問題と解決範囲の一致 | PASS | Problem Statement の2欠落(起動宣言の不在・semi の不定形走行)が In-1〜In-4 に1:1 対応 |
| モード軸の一貫性 | PASS | semi = full − 節目(ユーザー裁定 2026-08-05)。none / semi / full の3値が「質問裁定 × 節目裁定」の直交軸で説明可能 |
| 互換性境界 | PASS | 後方互換レイヤ・移行シムを Out へ明示(org.md Forbidden の互換負債禁止と整合) |
| 認可境界 | PASS | FR-GRT-004(semi は current grant = null)不変を Out へ明記。semi の非 grant 認可基体は requirements 段へ委譲(P1) |
| 走行単位の主張限定 | PASS | 「質問で止まらない」に限定し、stop 継続予算(`AUTONOMOUS_BLOCK_CAP` = 8)は不変と Out に明記 |
| 実装方式の委譲 | PASS | 認可基体の担体・確認 digest の担体は requirements 裁定事項として明示委譲(#2253 記載の3件) |
| 検証戦略の整合 | PASS | `self-feature` / Standard / Comprehensive と一致。落ちる実証を In-6 で Must 化 |

矛盾検出 **0 件**。Intent Statement、Scope Document、Intent Backlog、質問記録は [Issue #2253](https://github.com/amadeus-dlc/amadeus/issues/2253) の本文および2名の独立クロスレビューの収束判定 `ESTABLISHED_WITH_REFINEMENTS` と整合する。

## 4. スキップステージの N/A 判定

| ステージ | N/A 根拠 | 代用証拠・後続確認 |
|---|---|---|
| market-research | Amadeus 自身の自律モード仕様を再定義する `self-feature`。第一顧客は本リポジトリのユーザー自身で、市場探索を必要としない | Issue #2253 のクロスレビュー2名、#2067 実装の一次記録 |
| feasibility | 対象機構(`resolveAutoDecision` / `createGateAutoDecision` / `amadeus-stop.ts` / grant ストア)は #2067 で実装済み・実測可能。未知点は方式選択であり initiative 成立可否ではない | reverse-engineering で認可基体と質問経路を実測棚卸し、application-design で方式比較 |
| team-formation | 単一リポジトリの self-feature。実装所有権は units-generation / delivery-planning で確定する | P1〜P6 の依存グラフと後続 Unit/Bolt 編成 |
| rough-mockups | CLI フラグ・statusline 文字列・監査記録の変更で、視覚 UI を伴わない。UI-less CLI の出力モックは application-design の出力契約で足りる(`cid:requirements-analysis:ui-less-mockups-as-output-contract`) | application-design で `--autonomy` の verdict 別出力と exit code を固定 |
| approval-handoff | `self-feature` の実行計画で SKIP。intent-capture と scope-definition にそれぞれ独立の承認ゲートがある | intent-capture 承認(05:00:46Z)+ scope-definition 承認 + 本 phase-check を Ideation 出口証拠とする |

## 5. 警告と後続確認事項

- **WARNING(追跡済み)**: semi の grant 非依存な認可基体(scope・effect 認可・`basisFingerprint` の担体)は未決定。requirements-analysis で裁定する(#2253 裁定事項1、backlog P1)。
- **WARNING(追跡済み)**: semi の事前裁定方針の担体と確認 digest の様式は未決定。requirements-analysis で裁定する(#2253 裁定事項2、backlog P3)。
- **WARNING(追跡済み)**: 走行単位の主張と stop 継続予算(cap 8)の整合表現は未確定。requirements-analysis で「質問で止まらない」への限定を文言固定する(#2253 裁定事項3)。
- **WARNING(追跡済み)**: Q1〜Q5 は full grant 下の自動裁定(`unreviewed` queue)であり、人間の事後検収が未了。Intent 終端の unreviewed 検収で閉じる。

いずれも Out of Scope へ落とした欠落ではなく、M1〜M8 を実現する後続ステージの設計判断として明示的に追跡されている。

## 6. 判定

**PASS** — Intent、Scope、Intent Backlog は双方向に 100% トレースされ、矛盾・孤立成果物・未解決 BLOCKER はない。スキップステージには N/A 根拠と代用証拠があり、未決定事項はすべて Inception のオーナー(requirements-analysis / application-design)へ接続済みである。

- [x] 人間による Intent Capture 承認(2026-08-05T05:00:46Z)
- [x] Scope Definition 承認(Intent grant `intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7` による full autonomy 自動承認 — HUMAN_TURN 由来の grant provenance)
- [x] Ideation → Inception phase-check PASS

`PHASE_VERIFIED` 監査イベントは Scope Definition 承認による phase 遷移時にエンジンが原子的に記録する。
