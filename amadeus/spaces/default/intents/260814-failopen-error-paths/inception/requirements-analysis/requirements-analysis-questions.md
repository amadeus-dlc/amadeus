# Requirements Analysis — 質問ファイル(intent 260814-failopen-error-paths)

> 対象: Issue #2988(sensor 実行の真理値表が script-error / bad-output を PASSED へ潰す fail-open)。#3004 はスコープ外(PR #3011 が別対応中、ユーザー裁定 2026-08-14)。
> Depth: Minimal(質問予算 ≤4)。Intent autonomy: **semi** — 本ステージの質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定する(`cid:scope-definition:c1-semi-ladder-routing`)。fail-closed の結果のみ人間へ回す。
> 事実基盤: RE 成果物(`codekb/amadeus/code-quality-assessment.md` 現在節、`re-scans/260814-failopen-error-paths.md`)。consume 宣言面の `codekb/amadeus/business-overview.md` / `architecture.md` / `code-structure.md` は本 intent の RE で「レビュー済み・無変更」(本 intent の節を持たない)ため一般文脈のみの参照とする。self-fix スコープでは設計ステージ(3.1-3.4)が SKIP のため、修正方式の裁定は本ステージが担う。

## Q1: 修正形状の選定

RE が確定した最重要制約: **dispatcher(amadeus-sensor.ts)は severity-blind by design** — severity は compile(`amadeus-graph.ts:813`)とゲート(`amadeus-state.ts:2004-2013`)にのみ存在し、真理値表(`decideOutcome` :612-735)は見えない。よって真理値表側の是正は必然的に advisory sensor の挙動・監査形状も変える。候補:

A. 真理値表変更 — e/f 等の script-error arm を新 terminal イベント(SENSOR_ERRORED 等)or SENSOR_FAILED へ。影響: FireOutcome/監査閉集合/otel registry/SENSOR_TERMINAL_EVENTS/runtime 集計/stage-stats/attribution/docs、t92 Group E + t2771 ピン全書換
B. 消費側強化 — ゲート(`evaluateBlockingSensors`)が `script-error:` 前置の Note を伴う SENSOR_PASSED を不通過(unresolved 相当)として扱う。影響: `amadeus-state.ts` のゲート内(`sensorRowsForStage` に Note 抽出 + pass 述語 + `BlockingSensorFinding` 新 kind)に封じ込め。advisory・監査形状・doc/otel 不変、t92/t2771 既存ピン全部不変
C. A+B 両方
D. dispatcher へ severity 配管(blocking のときのみ真理値表を fail 側へ) — 「thin routing surface」設計(:10-18)と政策分界コメント(:2018-2022)へ違反
E. 上記以外
X. Other (please specify)

推奨: **B** — Issue 完了条件1「blocking severity の sensor について不明(不通過)相当の verdict」を severity スコープどおりに達成する唯一の新配管不要形状。影響半径最小(P5 surgical)、advisory は現状維持(Issue が明示的に許容)、既存テストピン(t92 Group E :790-827 / test 44-45 / t2771 :151-163)を壊さない。

[Answer]: B(shape-b-consumer-side) — 2026-08-14 semi 梯子 AUTO_DECIDED `auto-decision-f89b2ba4e6a2df3a60dd0c1bfc8ce2be`(basis: agent-recommendation、solo-election は native 結果不在で loud degradation 記録済み)

## Q2: advisory severity の扱い

Issue 完了条件1の後段「advisory severity の扱いは設計裁定(現状維持も可、根拠明記)」。候補:

A. 現状維持 — advisory sensor の script-error は従来どおり SENSOR_PASSED + Note(監査上の診断は保存済み、判定影響なし)
B. advisory も不通過相当へ変更(真理値表変更が必要 = Q1 で A/C を要求)
C. advisory の script-error を警告としてゲート出力へ表示(挙動不変、可視化のみ追加)
X. Other (please specify)

推奨: **A** — advisory は定義上ゲートを持たず(`amadeus-sensor-schema.ts:35-40`、`t511:402` が「advisory の FAILED すらゲートに不可視」をピン)、script-error が PASSED でも FAILED でも判定結果に消費者がいない。根拠: severity-blind dispatcher の設計維持 + Note による監査可視性は既に確保。

[Answer]: A(advisory-keep-as-is) — 2026-08-14 semi 梯子 AUTO_DECIDED `auto-decision-b781dfe4d5eab803a896c3b11841ff93`

## Q3: ゲート側 fail-closed 述語の射程

Issue は e(exit-n)/f(bad-output)を名指すが、実装には同族の script-error arm が計8本ある(spawn-failed :637 / external-sigterm :706 / signal-n :723 / unknown :731 / spawn-threw :745-751 / detail-write-failed :588-593 を含む)。また b(exit 127)は別系統の note `tool-unavailable`。ゲート述語の候補:

A. Note が `script-error:` で始まる SENSOR_PASSED を全て不通過扱い(8 arm 全カバー)。`tool-unavailable`(127)は対象外のまま(別設計の寛容ブランチ、Issue 射程外 — 変更するなら仕様変更として別裁定)
B. Issue 名指しの exit-n / bad-output のみ不通過扱い(spawn-failed 等は fail-open のまま残る)
C. note を伴う SENSOR_PASSED を全て不通過扱い(tool-unavailable も含む — blocking sensor のツール不在もゲート素通りさせない)
X. Other (please specify)

推奨: **A** — B は同一失敗クラス(スクリプト異常)の部分修正で fail-open の残余を作る。C は tool-unavailable の設計意図(ツール未導入環境で sensor を advisory に倒す)を変える仕様変更であり Issue 射程外 — 必要なら別 Issue(follow-up)として起票を提案。

[Answer]: A(predicate-all-script-error) — 2026-08-14 semi 梯子 AUTO_DECIDED `auto-decision-79d2699dbcaa7b46d51a2cf49b4289b8`

## Q4: 隣接クリーンアップのスコープ内外

RE が発見した #2988 隣接の drift 3件の扱い:

(i) `amadeus-state.ts:2018-2022` — fail-open を意図的に温存すると宣言する政策分界コメント(是正後は偽になる)
(ii) `amadeus-sensor-schema.ts:21` — `verifyBlockingSensors` への stale な散文言及(#2986 移行の取り残し)
(iii) `amadeus-sensor.ts:19-31` — コメント表 7 arm vs 実装 11 return site の drift(#2988 と独立に既存)

A. (i) のみ同一変更で更新(是正が直接偽にするコメントのみ。(ii)(iii) は触らない)
B. (i)+(ii) を同一変更で是正、(iii) は対象外((iii) は shape B では実装を触らない面のコメント整備であり、surgical 原則から除外。必要なら follow-up)
C. (i)+(ii)+(iii) 全て同一変更で是正
D. 全て対象外(コード変更のみ)
X. Other (please specify)

推奨: **B** — (i) は是正の意味論的一部(コメントが挙動を偽って擁護し続けるのは NIT どころか誤導)。(ii) は今回のゲート変更が同ファイル群(sensor-schema の severity 語彙)を参照する変更であり、1行の stale 言及是正は surgical の範囲内。(iii) は shape B で無変更の dispatcher 面の文書整備で、変更理由が異なる(P5/意図ベース重複排除の裏返し)— スコープ外とし、必要性が残れば follow-up。

[Answer]: B(cleanup-i-and-ii) — 2026-08-14 semi 梯子 AUTO_DECIDED `auto-decision-20dce85195d452005ffc02e429632a0a`

## 裁定の記録(E-OC1 evidence)

- **認可基盤**: 本 intent は **semi** autonomy(人間コマンド由来 — セッション内の実 HUMAN_TURN を provenance とする `INTENT_AUTONOMY_TRANSACTION_COMMITTED`、audit seq 23)下で走行しており、ステージ内質問は `amadeus-bolt decide-question` の梯子が裁定する(`cid:scope-definition:c1-semi-ladder-routing`)。承認: 2026-08-14T07:11:32Z(semi 宣言トランザクションの HUMAN_TURN provenance)。
- **Q1-Q4 の裁定**: いずれも kind=decided(basis: agent-recommendation、solo-election は native 結果不在の loud degradation を decision record に記録)。decision ids: `auto-decision-f89b2ba4e6a2df3a60dd0c1bfc8ce2be` / `auto-decision-b781dfe4d5eab803a896c3b11841ff93` / `auto-decision-79d2699dbcaa7b46d51a2cf49b4289b8` / `auto-decision-20dce85195d452005ffc02e429632a0a`(reviewState: unreviewed — 事後検収は list-auto-decisions / review-auto-decision で可能)。
