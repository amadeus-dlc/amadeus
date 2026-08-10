# Components — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6)

上流入力(consumes 全数): `requirements.md`(FR 22件 — 各コンポーネントの責務は FR 群を対象パス別に束ねて導出)、codekb `architecture.md`(core 中立層/harness 表層境界 — 全変更面が `packages/framework/core/` 中立層に属することの判定)、codekb `component-inventory.md`(「grilling 対話契約の棚卸し」節 — 正本/参照面/機械契約/投影の現況レイヤ表を変更前ベースラインとして使用)。

## コンポーネント一覧と責務

本 intent はプロダクトコードでなく**プロトコル文書+センサー+テスト**の改訂であり、コンポーネントは「所有権を持つ改訂単位」として切る。

| # | コンポーネント | 所有物 | 責務(変更後) | 対応 FR |
|---|---|---|---|---|
| C1 | grilling-protocol 正本 | `packages/framework/core/amadeus-common/protocols/grilling-protocol.md` | 骨格(上流逐語ブロック)+overlay(depth 閾値表・遮断器・annex 写像・D3/D4 接続・刈りノード列挙)の2層で grilling の規律を単独定義 | FR-PROTO-1〜10 |
| C2 | stage-protocol 参照面 | `stage-protocol.md` の :277(モード説明)/ :349(Step 3d)/ §8(:726-746 接続段落)/ §3 モード選択規定(semi 除外) | grilling への参照と §8 接続。規律の再定義はしない(C1 への参照のみ) | FR-CONTRACT-1/2/5 |
| C3 | question-budget センサー | `packages/framework/core/tools/amadeus-sensor-question-budget.ts` + マニフェスト `packages/framework/core/sensors/amadeus-question-budget.md` | grilling マーカー検知で数値検査→justification 検査へ切替。未知 depth の loud 化 | FR-CONTRACT-4 |
| C4 | 契約テスト | `tests/integration/t415-interaction-budget-contract.test.ts`(+センサーテスト追加分) | 新契約の逐語 pin・旧文言の復活禁止・VALID_DEPTH_VALUES 3値 assert・遮断器/センサーの落ちる実証 | FR-CONTRACT-3/6、FR-PROTO-8 の AC |
| C5 | standalone スキル | `packages/framework/core/skills/amadeus-grilling/SKILL.md` | レベル引数(M/S/C/Free)、既定 Free、遮断器の適用条件 | FR-PROJ-1 |
| C6 | prose/docs 投影 | conductor.md・docs/guide 4ファイル・docs/reference 2ファイル(en/ja)・**stage-protocol.md の残存語彙**(:277 等 — C2 完了後の sweep 対象) | 旧語彙(one question at a time 12ファイル14行・hybrid 3箇所・「一度に1質問」)の frontier 語彙化 | FR-PROJ-2/3 |

注: FR-PROJ-4(配布面再生成検証)・FR-DOG-1(dogfood 実走)・FR-LAND-1(着地後報告)の3件はコンポーネントを要しない運用・検証ステップであり、本表の対象外(22 FR 中 19 件がコンポーネントへマップ、3件は手順)。

## コンポーネント境界と所有権

- **規律の単一正本は C1**。C2/C5/C6 は参照・要約のみを持ち、終了条件・枝刈り・遮断器の数値を再定義しない(canonical 1定義から導出 — 数値の複製が必要な箇所は C1 を出典として明記)。
- **機械検査の所有は C3/C4**。C1 の prose 規定(遮断器・超過記録)に対応する機械面は C3(advisory センサー)と C4(CI 契約テスト)が持つ — 検証劇場禁止(P2): C4 のテストは C1/C2 の実ファイルを読み、C3 は実 questions ファイルを数える。
- **VALID_DEPTH_VALUES(amadeus-directive.ts)は本 intent の非所有** — FR-CONTRACT-3 は「不変の assert」のみで、ファイル自体を変更しない(裁定 (a))。

## 公開インターフェース(変更面)

- C1 → 全消費者: 骨格識別マーカー(ADR-1)で機械抽出可能な骨格ブロック+overlay 節構成。
- C3 → questions ファイル書き手(conductor): grilling モードマーカー(ADR-2)の1行契約と、超過記録行・刈りノード列挙節の様式。
- C5 → ユーザー: `/amadeus-grilling [level]`(無指定 = Free)。

## 規模の正当化(数値)

scope-document の見積り(合計 280-590行差分)をコンポーネント別に割付: C1 = 140-210行(全面改稿)/ C2 = 25-60行差分 / C3 = 40-90行 / C4 = 60-150行 / C5 = 20-40行差分 / C6 = 20-40行差分。単一 intent の凝集範囲内、分割不要。

## Reuse Inventory(新設前の既存確認)

- マーカー慣行: `<!-- amadeus-issue-form:v1 type=... -->`(.github/ISSUE_TEMPLATE 4テンプレが書き、t426 契約テストが様式を固定。issue-labels.yml は消費しない — E-GFR-ADS13 是正)— **様式のみ再利用**(ADR-2)。
- questions ファイルの parse seam: `amadeus-sensor-question-budget.ts` が既に questions ファイルを行読みする — **再利用**(マーカー検知を同モジュールへ追加、新規ツール新設なし)。
- 逐語 pin テスト: t415 の `readFileSync` + `toContain` 様式 — **再利用**(新 pin へ差し替え)。
- 新規機構は C3 のマーカー検知分岐と C4 の追加テストのみ — いずれも実装+配線が本 intent 内で揃う(先行着地なし)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T05:22:08Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2): FR 22件×C1-C6 の全数照合、機構引用(VALID_DEPTH_VALUES :62 / stage-protocol :277,:349,§8,:137 / t415 pin / amadeus-issue-form マーカー / ANSWER_TAG_RE 非交差 / センサー現行ロジック)の実コード照合すべて一致。ADR 3件の代替案・却下理由は事実接地。依存循環なし、write⇔check 対は両側定義済み、0問判定は妥当。FOLLOW-UP 2件(FR-PROJ-4/DOG/LAND の表外注記、C6 の stage-protocol 残存語彙の所有物明記)は conductor が同一ターンで components.md へ反映済み

### Findings

- FOLLOW-UP | components.md の対応 FR 列に FR-PROJ-4/FR-DOG-1/FR-LAND-1 が不在(運用ステップにつきコンポーネント不要の旨を注記) — 反映済み
- FOLLOW-UP | C6 の所有物列に stage-protocol.md 残存語彙(C2 完了後 sweep)を明記 — 反映済み
