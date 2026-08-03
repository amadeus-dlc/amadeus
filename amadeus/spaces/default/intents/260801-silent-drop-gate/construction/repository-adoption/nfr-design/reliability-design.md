# Reliability Design — repository-adoption

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。evidence provenance、trusted base、blocking exit、deterministic replay、distribution parityを一つのacceptance state machineへ閉じる。

## Adoption状態機械

| state | success condition | failure effect |
| --- | --- | --- |
| `raw-pre/post` | 完全scan、byte determinism、artifact新規作成 | 次段生成0、canonical不変 |
| `classified` | raw identity全単射、根拠非空、raw FP率5%以下 | approval生成0 |
| `approved` | FP=0、human audit検証、全digest一致 | candidate生成0 |
| `candidate` | `B0 ⊂ B_pre`、removed exact、added 0 | canonical promotion禁止 |
| `promoted` | 人間review済みrepository change、bootstrap整合 | CI activationへ進む |
| `ci-active` | trusted base取得、gate exit 0 | exit非0をblocking維持 |
| `verified` | regression、performance、capacity、distribution全receipt green | final report green禁止 |

各状態は前段immutable bytesを参照し、後段から上書きしない。未実行receiptを成功へ補完せず、overall statusは `RequiredAcceptanceReceiptRegistry/v1` が宣言するexact setの論理積で計算する。callerはrequired listを渡せない。

registry v1のIDは `shape-fixtures`、`census-pre`、`census-post`、`classification-precision`、`baseline-proof`、`failure-matrix`、`u2-u3-regressions`、`full-test`、`lint`、`typecheck`、`coverage`、`cold-warm-5x2`、`capacity-r0-r2-r4`、`u1-complexity`、`package-apply`、`promotion-apply`、`package-check`、`promotion-check`、`event-pr-base`、`event-fork-base`、`event-push-before`、`hang-deadline`、`workflow-structure` の23件である。各receiptはschema version、ID、current revision、command／artifact digest、passを持つ。欠落、余剰、重複、unknown version、revision不一致、pass=falseをすべてgreen拒否とする。

## Trusted base failure boundary

base SHA format／event不正はgate前に停止する。commit object欠落時だけliteral fetchを1回行い、再確認失敗時はgateを起動しない。HEAD、merge-base、current ledgerへfallbackしない。

base ledgerがあればexact Git bytesだけをprevious setとする。初回欠落時だけapproved bootstrap provenanceのprior identity-set digestとinitial exemption digestを検証し、base ledger存在後はfallbackを無視する。CLIはledgerを自動修復／更新しない。

## CI exit transport

| source | exit／signal | CI outcome |
| --- | --- | --- |
| U1 Pass | 0 | success |
| Policy Violations | 1 | blocking failure |
| U1 infrastructure Error | 2 | blocking failure |
| outer TERM deadline | 124 | blocking failure |
| KILL／shell transport | 137 | blocking failure |
| fetch／spawn／signal | nonzero | blocking failure |

CIはstdout／stderrを再分類せず、`continue-on-error`や後続0 exitを使わない。no-silent-drop stepだけに1分ceilingを置き、lint job timeoutを変更しない。U1 child timeoutが先に発火すればexit 2、外側deadlineなら124／137を保持する。

## Deterministic evidenceと回復

同一revision、contract、ledger、baseでraw evidence、identity順、GateResult bytesを一致させる。各command recordはfull revision、cwd、literal argv、environment contract、開始／終了UTC、exit、stdout／stderr／artifact digestを持ち、secretを含めない。

evidence改変、未分類、FP残存、candidate集合不成立は入力修正後に新しいoutput pathで前段から再実行する。canonical promotion failureはrepository changeとhuman reviewをやり直す。artifact上書き、automatic suppression、ledger growthによる自己修復を行わない。

## Distribution parity

canonical source変更後に `bun scripts/package.ts`、`bun run promote:self` の順で生成／self-promotionを行い、`bun scripts/package.ts --check` と `bun run promote:self:check` を実行する。4 commandを別receiptとしてregistryへ登録し、manifest全projectionのdigestと公開挙動回帰を確認する。一件でも未実行／drift／回帰があればverifiedへ進めない。generated fileの手修正は回復手段にしない。

## Failure injection

- evidence chain各段の1 byte改変、不足、余剰、重複、receipt流用。
- short／zero／missing／unresolvable SHA、fork base誤選択、fetch failure。
- U1 exit 1／2、hang TERM／KILL、spawn failure、step ceiling。
- zero／partial／symlink／source change／tool／rule／ledger invalid。
- package／promotion drift、projection欠落、対象外公開挙動回帰。

## Recovery objectives

- RPO: immutable evidence／canonical ledgerの上書き0件。
- Retry: base fetch最大1回以外、同一invocation内0回。
- Replay: 同じtrusted inputsからbyte-identical evidence／GateResult。
- Completion: focused regression、full test、lint、typecheck、coverage、cold／warm、capacity、driftの全receiptがgreenの場合だけ完了。

remote failover、database backup、circuit breakerは非適用である。
