# R001 承認待ち判定のゲート契約準拠

## 要求

一覧が承認待ちと判定する条件は、Intent 20260702-phase-gate-approval-contract で確定した `state.json` のゲート語彙契約から導出され、契約と矛盾しない。

## 背景

ゲート語彙は契約カタログの生成物（`task-generation-contract.ts` の `gateResultByStatus`）と validator の gate 語彙に定義済みであり、Task Generation の `ready_for_approval` は gate 結果 `waiting_approval` へ写像される。
一覧側で判定条件を独自に定義すると、契約変更時に判定が古くなり、契約と一覧で「承認待ち」の意味がずれる。

## 受け入れ条件

- phase gate（ideation、inception、construction）の `waiting_approval` が承認待ちとして検出される。
- Bolt の `taskGeneration.status` が `ready_for_approval` の場合、Task Generation Gate の承認待ちとして検出される。
- gate が `not_ready`、`passed`、`failed` の場合、および `taskGeneration.status` が `ready_for_approval` 以外の場合は、承認待ちとして検出されない。
- 同じ `state.json` に対する判定結果が、確定済みゲート語彙契約の定義と矛盾しない。

## 依存

なし。

## 対応する対象境界

- SC-IN-001

## 未確認事項

- phase の `status: waiting_approval`（gate 以外の待ち表現）を検出対象に含めるかは、Construction Functional Design で確定する。
