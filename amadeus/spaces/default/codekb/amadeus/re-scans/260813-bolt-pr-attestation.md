# 260813-bolt-pr-attestation 再スキャン記録

## 1. メタデータと断面

- Date: `2026-08-14`（Asia/Tokyo）
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Issue: [#2985](https://github.com/amadeus-dlc/amadeus/issues/2985)（Intent mirror: [#2989](https://github.com/amadeus-dlc/amadeus/issues/2989)）
- Base: `c0f9edf27828def6fa3dbbbc4101d753b398e025`。本 Intent に prior scan がないため、直前 re-scan の observed を採用した。
- Observed: `0fbbec42bb33d625bdb9d034789c0ff391df1287`。最新 `origin/main` lineage として主張・file:line の基準にした。
- Issue reproduction checkout: `cd225e6ea1c5834aaa79b3e68030213ba04c9340`。停止症状を持つ別断面であり、Observed の代用ではない。
- Focus: Delivery Planning Bolt cardinality、runtime DAG / worktree、PR provenance、attestation、Git / GitHub runner、report-format sensor、orchestrator / state completion guard。
- Scan mode: 通常の differential refresh。既存 codekb の #2813 current markerを履歴へ降格し、#2985 の Minimal deltaを現在節として統合した。

### Read-only と副作用

dirty worktree へ `origin/main` を merge / rebase していない。最新 trunk は `git show` / `git diff` / `git grep` で read-only 照合した。GitHub、state、audit、engine 操作は行っていない。書き込みは本 re-scan と共有 CodeKB 9成果物だけである。

Architect synthesis では test、build、lint、typecheck を実行していない。Developer scan の focused test 以外を green と昇格しない。

## 2. 再実行可能述語と結果

| ID | 述語 | 期待 / 実測 |
|---|---|---|
| P0 | `git merge-base --is-ancestor <base> <observed>` | exit 0。Base は Observed の祖先 |
| P1 | Observed の CLI work 型を実読 | `unit: string`、`{ record, bolt, unit }`、`DeliveryWork { bolt, unit }` |
| P2 | Observed の provenance / attestation を実読 | Bolt / Unit は各1件。attestation は1 PR と3 heads、digestを保持 |
| P3 | Observed の sensor `checkAttestation` を実読 | path Unit = receipt Unit、PR、3 heads、checkout、audit receiptを検査 |
| P4 | Observed の runtime / orchestrate / state を実読 | runtime は Unit DAG batch、完了側は全 Unit の per-unit evidenceを走査 |
| P5 | reproduction checkout の旧 Intent report 5件を sensor 評価 | 全5件 `pass:false` / `findings_count:5`。症状であり構造的不能の単独証明ではない |
| P6 | Developer focused tests 6 files | exit 0、187 pass / 0 fail / 552 expect、Bun 1.3.13 |

## 3. Currency

主張と file:line は Observed `0fbbec42bb33d625bdb9d034789c0ff391df1287` で再解決した。plugin の中心患部は `7f13639383c559bc8ab481fafdc4044c5cf198c2`、Observed、reproduction checkout の間で焦点差分がない。`amadeus-state.ts` / `amadeus-orchestrate.ts` は断面間差分があるため、行番号は Observed だけを引用した。

Base..Observed の焦点パス差分は `packages/framework/core/tools/amadeus-orchestrate.ts` と `packages/framework/core/tools/amadeus-state.ts`。旧 codekb の同ファイル行番号は流用していない。

## 4. Mechanism

### Normal path: 1 Unit / 1 Bolt / 1 PR

1. Unit worktree で変更を commit / push する。
2. CLI `create --record --bolt --unit` が clean checkout、non-base branch、local / remote / PR headを検証する。
3. PR title/body に単一 Intent / Bolt / Unit identityを付与する。
4. Unit pathへ reportを生成し、単一 Bolt / Unit / PR / 3 heads / digest の attestationと audit receiptを記録する。
5. blocking sensorが owner Unit path、receipt Unit、PR、heads、checkout、audit receiptを照合する。
6. state completionが Unitごとの最新 sensor / digest / audit evidenceを確認する。

この経路では report と audit receipt を統合側へ carry-forwardできる。

### Broken path: 複数 Unit / 1 Delivery Bolt / 1 PR

Delivery Planning の実例 `260813-election-multiq/inception/delivery-planning/bolt-plan.md:7-50` は8 Unitsを5 Delivery Boltsへ編成し、B2 / B3 / B4が各2 Unitsを持つ。runtime graphの実測 batchesは `[U1] [U2,U3] [U4] [U5] [U6,U7] [U8]` の6 batchで、Delivery Planの5 Boltと一致しない。runtimeは `bolt-plan.md` を消費せず、Unit dependency DAGのtopological levelを実行 batchにする。

1つの PR に Unit A identityを載せると、Unit Bは title/body provenance mismatchとなる。Unit B用の別 PRを作れば one-Bolt-one-PR と複数 Unit fold 禁止に反する。per-unit completion sensorは両 Unit pathの evidenceを要求するため、一方だけの attestationでは完了できない。

### Missing seam

欠落しているのは `Delivery Bolt identity -> units[] -> one PR identity/head tuple -> attestation/audit receipt -> each per-unit completion` の composition seamである。現行の `ConvergenceOptions.unit`、linked create、`DeliveryWork`、`AmadeusWorkFields`、`ReportAttestation` は単数 Unitで閉じている。

## 5. Non-duplication

- #2473: head binding
- #2791: provenance enforcement
- #2358: gate 再発行
- #2359: review 復旧
- #2836: gate:false reviewer
- #2976: solo election
- #2989: 本 Intent の mirror Issue

open implementation PRは観測されていない。Issue #2985 の Reviewer A / B comments は訂正後 CONFIRMEDである。

## 6. Tests and quality evidence

Developer scanの focused 6 filesは `t448`、`t450`、`t534 mandatory lifecycle`、`t541`、`t532 provenance`、`t534 attestation`。結果は187 pass / 0 fail / 552 expect、Bun 1.3.13。

repository test filesの実測は1119（unit 422 / integration 568 / e2e 100）、関連22。2 Unit / 1 Delivery Bolt / 1 PRを正規 lifecycleで完走するテストはない。focused test以外の全 suite、build、lint、typecheckは未実行である。

## 7. 未決事項

Reverse Engineeringでは次を決めない。

1. 候補A: Bolt identityが `units[]` を所有し、1 PR evidenceを各 per-unit completionへ正規投影する。
2. 候補B: Delivery Planning / runtime / PR convergenceを 1 Unit = 1 Bolt = 1 PRへ統一する。

後続 requirementsで one-Bolt-one-PR、既存1 Unit正常経路、resume / stale head、per-unit fail-closed completionを受け入れ条件へ落として選択する。`amadeus-state.ts` / `amadeus-orchestrate.ts` の一般リファクタ、新規改善探索は対象外である。
