# Requirements — 260814-autonomy-stop-fixes

Intent: Issue [#3016](https://github.com/amadeus-dlc/amadeus/issues/3016) と [#2974](https://github.com/amadeus-dlc/amadeus/issues/2974) の autonomy full grant 下の停止・拒否バグ修正。scope `self-fix`、depth Minimal。

## Upstream inputs

- `codekb/amadeus/architecture.md`(本 intent の現在節 A-1〜A-6)と `codekb/amadeus/re-scans/260814-autonomy-stop-fixes.md` — 本 intent の患部 file:line・不在確認・drift 棚卸しの正本。本書の実測引用はすべてここに由来する。
- `codekb/amadeus/business-overview.md` / `codekb/amadeus/code-structure.md` — 本 intent の RE では「レビュー済み・無変更」。一般文脈(プロダクト目的、リポジトリ構造)としてのみ前提とし、本 intent 固有の事実はここから引かない。
- Issue #2974 クロスレビュー(2名 CONFIRMED_WITH_REFINEMENTS、収束 REFRAME_REQUIRED)の確定リフレーム、および本ステージ Q1〜Q4 の裁定(questions ファイル参照。Q4 はユーザー裁定 C)。

## Intent analysis

`autonomy=full` の価値提案は「エンジンが止めていない限り unattended で進む」こと。現状は (a) 実ユーザーの明示的な park 指示すら `Construction Autonomy Mode: autonomous` を理由に一律拒否され(#3016)、(b) engine の `error` directive 受領時に conductor が契約外の新規質問を発明して unattended 実行が停止する(#2974)。目標は、full の自動継続原則と人間の明示的制御・既存の安全境界(merge 人間専権、grant の不変条件)を両立させること。

## Functional requirements

### FR-PARK-1: 実ユーザー明示指示による park の受理

`Construction Autonomy Mode: autonomous` の Intent でも、現在セッションの fresh な `HUMAN_TURN`(本 intent shard 上・未消費)に結び付いた明示的 park 要求は受理される。orchestrate `park` 経路が presence を実測し、その turn 識別子を state 層 `handlePark`(`amadeus-state.ts:1579` 起点のガード)へ渡して検証する(Q1=A)。
受け入れ確認: full/autonomous 状態の fixture で fresh turn を伴う park が `WORKFLOW_PARKED` と park marker を監査可能に記録すること。

### FR-PARK-2: unattended park の拒否維持(fail-closed)

fresh な HUMAN_TURN を伴わない park(hook 起因・無人実行中・turn 不在)、消費済み turn の使い回し、他 intent の turn の流用は従来どおり拒否される。provenance 検証は fail-closed とし、判定不能は拒否へ倒す。
受け入れ確認: turn 不在 / 消費済み / 他 record の turn の3ケースで拒否メッセージと共に park が成立しないこと(既存 `t17.test.ts:1222-1235` の一律拒否固定は本契約へ書き換え)。

### FR-PARK-3: park 後の resume と grant の扱い

FR-PARK-1 で park した workflow は通常の `/amadeus --resume`(既存 Branch 2.6 経路)で再開できる。Intent autonomy grant は park を跨いで保持される(Stop hook が既に `amadeus-stop.ts:943-946` で「park は grant を revoke しない」と定める現行意味論を維持)。保持・失効方針はテストで固定する。
受け入れ確認: park → resume の往復で `Intent Autonomy Mode` と grant Id が不変であること。

### FR-PARK-4: park 契約の経路間一致

orchestrator(`amadeus-orchestrate.ts` park 経路)、state tool(`handlePark`)、Stop hook の3経路で park の認可契約が一致する。`amadeus-state.ts:1565-1578` の「Stop hook との二層防御」という虚偽コメント(RE 実測: hooks に当該フィールド 0 hit)は実装に合わせて是正する。Abort park / REPAIR_STALLED park の既存経路(ガード非通過)の意味論は変えない。
受け入れ確認: 3経路の契約を検証するテストが存在し、`orchestrate:6171-6182` の park 拒否前提経路の再検査を含むこと。

### FR-ERR-1: `error` directive 受領時の逐語停止契約の正本化

`error` directive の受け手条項(「`directive.message` を逐語出力して停止。回復・リトライ・取り繕い・**新規質問の発明**をしない」)を core の正本(`stage-protocol.md` 等のハーネス中立面)に1定義として置き、8 ハーネス表層(claude / codex / cursor / opencode / kimi / kiro / kiro-ide / pi)の文言を正本から導出または同期検査する。現状の 3 系統 drift(完全形5 / 短縮形2 / 逐語指示なし1)を解消する(Q2=A の面1)。
受け入れ確認: 各配送先ツリーの実述語で 8 面の条項一致を検査する drift ガードが存在し、落ちる実証を経ること。

### FR-BND-1: approval boundary の定義と grant との優先順位の明文化

「workspace's approval boundary」の定義を文書の正本(`docs/reference/24-intent-autonomy.md` または新設節)に置き、Intent grant との関係を明文化する: remote write(push / PR create / レビュー返信・resolve / Issue 起票)は毎回 decide-question 梯子で裁定し、`human-required` が返る場合のみ人間へ回す(Q4=C ユーザー裁定)。`pr-convergence.md` の Guardrail「Ask before writing to the remote」は「梯子へ諮る」と再定義する。PR の merge は人間専権のまま不変(`pr-convergence.md:381` の never merge と `cid:requirements-analysis:no-ai-merge` を壊さない)。
受け入れ確認: 定義文書と pr-convergence.md の改訂が同一変更で着地し、merge 人間専権の文言が保持されること。

### FR-BND-2: remote write 可否判断の梯子配線

full/semi 有効中に remote write の可否判断が生じたとき、conductor 契約は人間への直接質問ではなく `amadeus-bolt decide-question` を経由することを命じる(`cid:scope-definition:c1-semi-ladder-routing` の適用経路を契約へ明文化)。裁定(auto / human-required)と根拠は監査に記録される。`stage-protocol.md:139-141` の Bolt code-generation 失敗 halt(唯一の無条件停止)には触れない。
受け入れ確認: 契約文面(stage-protocol / pr-convergence)に梯子経由が明記され、押し戻しテストまたはプロトコル文面検査で固定されること。

## Non-functional requirements

- **NFR-1(安全不変条件)**: 本修正は grant の効果分類(`new-permission` / `irreversible` 等5分類は grant 認可不可、`24-intent-autonomy.md:79-84`)を変更しない。梯子の裁定が grant の権限を拡張する形にならないこと。
- **NFR-2(TDD)**: 実行可能な振る舞いの追加・変更はすべて TDD(Red 実測 → 最小実装 → Green)で行う。新設ガード・drift 検査は落ちる実証を経る。
- **NFR-3(検証)**: `bun run typecheck` / lint / フルテストスイート / coverage gate / 配布 drift 検査の現行ブロッキング集合を全て通す。ハーネス表層の変更は全ハーネス配布面の再生成・実ツリー述語で検証する。

## Constraints

- 1 Issue = 1 Unit、PR は Bolt ごと(スカッシュマージ、マージは人間承認)。
- #3016 はクロスレビュー2名成立(Q3=A: 本 intent 内で実施、コメント投稿は現行契約に基づき人間承認後)まで実装バッチへ組み込まない。
- 後方互換レイヤー・移行シムは追加しない。古い挙動(一律拒否・drift 文言)は置き換える。
- `packages/framework/core/` を正本として編集し、`bun run build` で全ハーネス配布面を再生成する。

## Assumptions

- #2974 の修正対象は「契約文面(core 正本 + 8 表層)と文書」および梯子配線の契約明文化であり、conductor の LLM 挙動そのものはテスト不能なため、契約・drift ガード・監査経路で固定する(クロスレビュー確定リフレームと整合)。
- park の「fresh」基準は既存部品(`latestHumanTurnId` / `AutonomyProvenanceScope` / `freshHumanRetryTurn` 先例)の意味論に合わせる。基準時刻の詳細は functional 設計(code-generation plan)で確定する。

## Out of scope

- PR マージの自動化(人間専権のまま)。
- #2967(advisory `run-now` 再提示)・#2378・#2914 の修正。
- Issue #2974 本文の GitHub 上の書き直し(REFRAME_REQUIRED への対応は本 requirements への取り込みで行う。Issue 編集はユーザー判断)。
- Abort park / REPAIR_STALLED park 経路の意味論変更。

## Open questions

- park 受理時の「fresh」の基準時刻(直近 gate 以後か、park コマンド発行 turn そのものか)— code-generation 設計で確定し、逸脱があれば梯子/選挙へ。
- FR-ERR-1 の正本の置き所(stage-protocol.md へ節追加か、専用 protocol 断片か)— 実装時に既存様式へ合わせる。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T08:00:47Z
- **Iteration:** 1
- **Scope decision:** none

7件のFRが両Issueの確定完了条件(#3016 park fail-closed、#2974 REFRAME_REQUIREDの逐語停止契約)へ過不足なく写像され、Q1-Q4は全記入・A-D+X形式でQ4のユーザー裁定と整合、上流引用も本intent節に限定されている

### Findings

- FOLLOW-UP | requirements.md:35 FR-PARK-4の受け入れ確認「3経路の契約を検証するテストが存在」は『一致』の判定基準(何を同一とみなすか)が未定義。code-generation設計段で具体化させること
- FOLLOW-UP | requirements.md:50 FR-BND-2の受け入れ確認が『押し戻しテストまたはプロトコル文面検査』のいずれか一方で満たせる形になっており、文面検査のみで閉じられると実行時の梯子経由が未検証のまま合格しうる。テスト側を必須にするか明記すること
- NIT | requirements.md:32-34 FR-PARK-4に『虚偽コメント』という原因説明の記述があり、Minimal深度のStep10ガイド(状態と受け入れ確認のみ、ナラティブな根拠説明は省略)よりやや詳細だが、行数はまだ帯域内で実害はない
