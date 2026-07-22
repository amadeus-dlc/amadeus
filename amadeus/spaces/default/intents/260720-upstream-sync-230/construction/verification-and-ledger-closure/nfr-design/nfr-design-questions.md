# NFR Design Questions — verification-and-ledger-closure

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順12/12 / 正本Unit U12 `verification-and-ledger-closure`。承認済みNFRを、既存C7 evidence・verification・ledger closure境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU18ND1 recorded裁定 `2026-07-21T04:10:43Z`。

## 質問不要案の根拠

- Seam: publicは`traceCoverage`、`assertPhaseVerification`、`planLedgerTransition`の正準3関数だけで、`classifyDisposition`は内部helperである。
- Coverage: approved 24 item全数を最低1つの自動testまたは明示docs検査へtraceし、partial EQUIVALENTと23/24以下を拒否する。
- Verification: targeted、typecheck、lint、dist、promote、full CI、local coverageを同一最終SHAで評価し、patch追加行未カバー0または既決waiver証拠を要求する。
- FR23/24: filesystem testはintegration-first、SKIP testは除外し、英語正本/日本語pair、Amadeus namespace、6 harness、generated/hand-edit境界、legacy path 0を検査する。
- Transition: 単なる未完了/三条件欠落は不変、構造化verification-failure/abandonだけはBLOCKED、三条件成立時だけAPPLIEDとするclosed unionである。
- Persistence: BLOCKED/APPLIEDは既存atomic ledger writerの最終operationとし、同一transition再実行はno-op、baselineはBLOCKEDで不変とする。

新failure evidence language、disposition、waiver、transition variant、判定順、writer、parallelism/cache/retry、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可（推奨）— 既決契約から機械導出できる。E-USSU18ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T04:10:43Z`）。承認範囲は正準3 public seamと内部classify、24/24検証・partial EQUIVALENT拒否、same-SHA gatesとpatch coverage、FR23/24、closed transition（incomplete不変・structured BLOCKED・三条件APPLIED）、既存atomic writer idempotencyを既決契約から機械導出する範囲に限定する。新evidence、disposition、waiver、transition、order、writer、policy、dependency、service、SLOは追加しない。
