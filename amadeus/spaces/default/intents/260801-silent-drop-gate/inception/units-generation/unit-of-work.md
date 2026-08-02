# Unit of Work — no-silent-drop

## 上流入力と分解原則

本分解は `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md` を正本とする。User Stories stage は SKIP のため、`requirements.md` の SC-01〜SC-07 を利用者シナリオとして追跡する。

Unit は独立テスト可能な capability／change boundary で切る。Application Design の C1〜C6 は adapter と配線を同じ Unit に置いて dormant seam を避け、異なる既存 runtime boundary の #1874 と #1878 は相互に分離する。repository corpus、ledger、CI、distribution は全成果を統合する別 Unit とする。4 Unit はすべて同じ monorepo へ埋め込み、独立 service／package／deployment target を作らない。

規模見積りは authored production source、focused tests、設定を含む。generated projection は行数に含めず、正本からの再生成量として別管理する。総計の上限目安は2,230〜3,620行であり、超過時は Unit 境界を黙って広げず Delivery Planning／Construction gate で再評価する。

## U1 — static-gate-engine

### 目的と境界

fixture と immutable source snapshot から、ast-grep candidate、TypeScript semantic classification、exemption／baseline policy、閉じた JSON／exit contract までを一つの短命 Bun CLI 内で完結させる。

### 所有する責務と成果

- C1〜C6 の実装と `tests/no-silent-drop-gate.ts` entrypoint。
- config、semantic catalog、ast-grep rule bundle、coverage sentinel、positive／negative fixture。
- repository-local exact `@ast-grep/cli` dependency と lockfile、shell 非経由 process adapter。
- expected manifest、bytes snapshot、read-only mirror、path＋digest receipt、走査後 stability。
- snapshot-overlay TypeScript Program、symbol／union／path classifier、unresolved の `RULE_INVALID`。
- raw／exempted／effective finding 集合、closed `GateResult`、`NonEmptyArray<Finding>`、exit 0／1／2。
- `census-evidence`、`approve-evidence`、`baseline-candidate` の read-only／new-output-only command contract。
- `GitReadPort`、trusted previous ledger の読込み、baseline／exemption ratchet、`check --base-revision` の end-to-end algorithm。
- `package.json`／`bun.lock` の dependency pin と root `no-silent-drop` script の最終書込み。
- pure unit、filesystem／real ast-grep integration、CLI round-trip test。

### 所有しない責務

- canonical baseline／exemption の corpus 値、CI が供給する base SHA、GitHub Actions 接続。
- #1874／#1878 の runtime 修正、generated harness projection。
- TP／FP の人間分類や approval receipt の発行。

### 規模・配布・複雑度

- 見積り: 1,300〜2,000 authored 行。内訳は contract／schema／catalog 120〜180、scanner／snapshot／mirror 180〜260、ast-grep／Git adapter 140〜220、semantic classifier／path evaluator 220〜340、policy／evidence／ratchet 180〜280、CLI／renderer 100〜160、tests／fixtures／config 360〜560。
- 相対複雑度: L。新規 tool adapter、snapshot、semantic path 判定、policy の複合 Unit。
- deployment model: contributor-side embedded CLI。同一 Bun process＋1 ast-grep child process。常駐 service なし。

### 要件と完了条件

- 主追跡: FR-01〜FR-09、FR-15、NFR-01／02／04〜08。
- fixture で NSD001〜003 の positive／negative が100%分類される。
- zero／partial／symlink／source change／tool／rule／schema failure が閉じた Error と exit 2 になる。
-同一snapshotとcontractでstdoutがbyte-deterministicである。

## U2 — text-mutation-loud-failure

### 目的と境界

#1874 の `setCheckbox`／`setStageSuffix` silent no-op を、検証済み state document と全 caller の明示結果消費へ置き換える。

### 所有する責務と成果

- canonical `amadeus-lib.ts` の `ValidatedStageState` と `TextMutationResult = changed | not-found`。
- duplicate／malformed stage line の既存 typed validation failure、0件だけの bytes-invariant `not-found`。
-既に期待値のtargetを同一bytesのidempotent `changed` とする postcondition 再parse。
- `amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts` の全 callsite 移行。
- not-found／malformed／duplicate／idempotent／全 caller write-before-success の unit／integration test。

### 所有しない責務

- NSD003 detector 自体、baseline／exemption、CI workflow。
- #1878 mirror state store、generated projection の手編集。

### 規模・配布・複雑度

- 見積り: 300〜500 authored 行。内訳は validated state／result／postcondition 80〜130、caller 移行 70〜120、tests 150〜250。
- 相対複雑度: M。helper は小さいが、既存全 callsite と atomic write 前不変条件の移行を含む。
- deployment model: 既存 Amadeus runtime への embedded change。公開 service／package なし。

### 要件と完了条件

- 主追跡: FR-04、FR-11、FR-15、NFR-03／05／06／09、SC-06。
- 全 callsite が result を exhaustive に検査し、not-found 時に state／audit bytes を変えない。
- retry／暗黙 resync／warning success は0件である。

## U3 — mirror-persistence-propagation

### 目的と境界

#1878 の `persistBlocked` が破棄する `applyTransition` 結果を、既存 outcome／warning field と transactional outbox の意味を維持して caller へ伝播する。

### 所有する責務と成果

- internal `StateResult` の `failed(pre-commit | durability-unknown)` と `ok(clean | outbox-pending)`。
- `persistBlocked` の single-call result inspection。
-既存 `stateFailure` の局所拡張: pre-commit は `warning.effect=not-started`、durability unknown は `warning.effect=outcome-unknown`。
- commit 後 audit append／outbox clear failure を `ok(outbox-pending)` と既存冪等 drain へ写像。
- lock〜rename前、directory fsync、audit append、outbox clear の failure-injection test と bytes／収束証跡。

### 所有しない責務

-新しい `MirrorOperationOutcome`／`MirrorWarning` variant、rollback、同期 retry。
- gate detector、ledger、CI／distribution。

### 規模・配布・複雑度

- 見積り: 190〜330 authored 行。内訳は internal result／`stateFailure`／`persistBlocked` 50〜90、tests 140〜240。
- 相対複雑度: M。差分は局所的だが commit point ごとの不変条件は高リスク。
- deployment model: 既存 mirror runtime／state store への embedded change。常駐 resource なし。

### 要件と完了条件

- 主追跡: FR-03／04／10／15、NFR-03／05／06／09、SC-05。
- pre-commit failure は偽 `safety-blocked` を返さず bytes 不変、durability unknown は文字列解析なしで判別できる。
- commit 後 failure は outbox から重複なしで最終収束する。

## U4 — repository-adoption

### 目的と境界

U1 の gate を実 corpus に適用し、U2／U3 修正前後の承認済み evidence、canonical ledgers、trusted base ratchet、blocking CI、distribution drift を一つの repository adoption contract として閉じる。

### 所有する責務と成果

- U1 の raw census schema を使う `C_pre-raw`／`C_post-raw`、人間分類 ledger、approval receipt の正本値。
- U1 が生成した approved evidence と candidate baseline／bootstrap provenance の正本化、および `B0 ⊂ B_pre`、削除 identity=#1874／#1878、追加0件の統合検証。
- canonical `baseline.json`／`exemptions.json`、initial exemption set／digest。
- PR base SHA／push before SHA と current ledger の正本値を U1 の `check --base-revision` へ供給し、その exit contract を消費する CI 配線。
- U1 所有の root package script を呼び出す既存 `.github/workflows/ci.yml` lint job の独立 blocking step。
- corpus TP／FP率、cold／warm各5試行、#1963 regression、full test、package／promotion drift の完了証跡。
- canonical core から全 harness projection の再生成。生成 tree は手編集しない。

### 所有しない責務

- U1〜U3 の内部 algorithm 再実装。
- `GitReadPort`、trusted previous ledger、ratchet、`package.json`／`bun.lock`／root script の編集。
- 新規 CI job、remote service、credential、database、deployment pipeline。

### 規模・配布・複雑度

- 見積り: 440〜790 authored 行＋generated projection。内訳は ledger／classification／approval の正本値 100〜180、CI SHA 配線 40〜80、corpus／precision／timing／regression evidence 200〜350、distribution／drift／handoff documentation 100〜180。
- 相対複雑度: L。実装量より revision／ledger／CI／distribution の統合証跡が支配的。
- deployment model: repository CI と既存 package／promotion pipeline への embedded integration。

### 要件と完了条件

- 主追跡: FR-05〜FR-15、NFR-01〜09、SC-01／03／04／07。
- baseline／exemption の同時追加回避が trusted previous set により失敗する。
- baseline promotionに使う最終承認済みpre／post evidenceのFPが0件であり、FPをbaseline／exemptionへ移していない。
- `bun run no-silent-drop` が local／CI で同じ結果を返し、lint job が違反／異常を blocking failure にする。
- `bun scripts/package.ts --check`、`bun run promote:self:check`、対象 test suite が green である。

## Reuse inventory と共有制約

| 既存資産 | 再利用する Unit | 再利用内容 |
|---|---|---|
| Bun CLI／test runner、root package scripts | U1、U4 | U1 が短命 command と root script を所有し、U4 が CI から呼び出す |
| repository-local TypeScript／tsconfig | U1 | snapshot overlay semantic projection |
| 既存 gate の pure verdict／adapter pattern | U1 | I/O と policy の分離 |
| `parseCheckboxes` と state validation／atomic writer | U2 | stage line 検証、write-before-success |
| mirror state store／transactional outbox／failure injection | U3 | commit-state-machine と冪等 drain |
| 既存 lint job | U4 | 新規 job を作らず blocking step を追加 |
| `scripts/package.ts`／promotion drift guard | U4 | canonical core から generated tree を更新 |

共有 file を編集する場合も owner を一つにする。`package.json`／`bun.lock`／root script の最終 writer は U1、`.github/workflows/ci.yml` と生成投影は U4、runtime canonical source は U2／U3 が所有する。U4 は U1 の script を呼び出すだけで `package.json` を編集しない。Unit 間で同じ内部関数を複製しない。

## Unit coverage summary

| Unit | Requirements | Scenarios | 独立 acceptance |
|---|---|---|---|
| U1 | FR-01〜09、FR-15、NFR-01〜08 | SC-01／02／04／07 | fixture-to-CLI、typed failure、ratchet algorithm |
| U2 | FR-04／11／15、NFR-03／05／06／09 | SC-03／06 | 全 caller loud failure |
| U3 | FR-03／04／10／15、NFR-03／05／06／09 | SC-03／05 | commit boundary failure propagation |
| U4 | FR-05〜15、NFR-01〜09 | SC-01／03〜07、FR-12直接acceptance | corpus／ledger／CI／distribution |

全 FR-01〜FR-15 と SC-01〜SC-07 に少なくとも1 Unit が割り当てられ、全 Unit に利用者／運用シナリオと独立 acceptance が存在する。FR-12 の #1963 regression は SC-01〜SC-07 に対応 scenario がないため、U4 の直接 requirement acceptance として別に追跡する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T03:46:13Z
- **Iteration:** 1
- **Scope decision:** none

YAML DAGは非循環だが、gate内部の所有権、evidence契約、共有ファイル、規模・coverage表に実装を一意化できない不整合がある。

### Findings

- trusted-base ratchet のUnit所有権が上流設計と矛盾する。Application Designでは `loadTrustedPreviousLedgers`、`evaluateLedgerRatchets`、`runNoSilentDrop(check --base-revision)` がC1／C5／C6の責務であり、U1はC1〜C6全実装を所有すると宣言する一方、U1はGit base比較を所有せず、U4が `check --base-revision`、`git show`、ledger追加拒否を所有し、さらにU4はdetector algorithmを編集しないとしている。この境界ではどちらのUnitもend-to-end checkを実装できないため、gate側のGit port／ratchetをU1へ置いてU4をSHA供給・正本ledger・CI配線に限定するか、componentとUnitを明示分割してDAG／ownershipを更新する必要がある。
- evidence integration contract のproducer／consumer方向が誤っている。classification ledgerとapproval receiptはU4／人間側が生成してU1所有の `approve-evidence` が消費し、approved evidenceとcandidate baselineはU1が生成してU4が正本化するが、表はstatic-gate-engine→repository-adoptionの一方向に入力と出力を混在させている。raw census、classification、approval、approved evidence、candidate／provenanceを別contractとして、各schema owner、producer、consumer、digest failure boundaryを双方向に明記する必要がある。
- 共有fileの単一owner方針が自己矛盾している。`package.json`／`bun.lock` のownerをU1としながら、同じ `package.json` のroot script追加をU4へ割り当てており、「共有fileを編集する場合もownerを一つにする」「U4はU1の領域を編集しない」という境界を満たさない。少なくとも `package.json` の最終writerとdependency pin／script変更の受渡し契約を一意にする必要がある。
- 相対複雑度はstageが要求するS／M／L／XLの単一値になっておらず、U3がS/M、U4がM/Lである。また総計2,100〜3,400行は各Unit範囲を単純合算しただけで、特にU1の6 component・4 CLI mode・semantic path evaluator・filesystem／real-process testを1,200〜1,800行に収める根拠となるsource／test／config別内訳がない。各Unitの単一complexity classと、数値見積りを検算できる責務別内訳が必要である。
- coverage表がUnit定義と一致しない。`unit-of-work.md` はU2／U3をNFR-03／05／06の実装・failure-injection ownerに割り当てる一方、story mapはNFR-01〜08をU1／U4だけへ割り当てている。またFR-12の#1963 compose-resync regressionをscan基盤異常のSC-07へ対応付けており、scenario内容と一致しない。実装ownerとintegration verifierを区別してNFR mappingを修正し、FR-12は対応scenarioなしの直接requirement acceptanceとして明示する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T03:50:48Z
- **Iteration:** 2
- **Scope decision:** none

前回5件は解消され、4 Unitの責務、直接依存DAG、双方向integration contract、単一file ownership、規模分類、FR／NFR／SC coverageが上流設計と整合している。

### Findings

- None
