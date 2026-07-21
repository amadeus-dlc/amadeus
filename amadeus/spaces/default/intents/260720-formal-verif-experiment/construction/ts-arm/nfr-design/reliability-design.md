# Reliability Design — ts-arm

## 上流と determinism

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、同じfrozen inputを同じcoverage/verdict/counterexampleへ収束させる。

## CoverageProofStore

full run manifestはarm freeze、subject tree、universe/order/predicates、runtime snapshot、sandbox policy / probe、lockfile/fast-check、coverage schema、seed/numRuns/pathを固定する。core/identity coverageはexpected keysとのbijection、per-predicate counts、first failureを持つ。PBT failureはfirst index、complete shrink path、canonical minimal bytes、replay identityを保存する。

`CoverageProofStore` はimmutable coverage proofを先にcommitする。U3 bundle transactionはfull run manifest identityとcoverage proof identityを必須参照し、U3 commit後にbundleを再読して両identity一致を確認してからhandoff receiptを`CoverageProofStore`へappendする。proof commit後・U3 commit前のcrashはproof lookupから同じU3 transactionを再開し、U3 commit後・handoff前のcrashはbundle再読からreceiptだけを再開するため、全域再実行やduplicate publishへ分岐しない。partial runはcounts/last key/raw identityを保存するがcoverage successをmintしない。coverage proof未commitのretryだけを新run keyまたはrevisionとして全域再実行する。

claimはfull run manifest identityへbindする。lockはcomplete owner recordをunique stagingへwrite / flush / directory syncしてからnonexistent lock名へexclusive renameし、parent sync後に可視化する。dead ownerだけをnonce照合付きquarantine renameで回収し、normal releaseはowner nonce再読→quarantine rename→parent sync→除去の順とする。ACTIVE→RESUMED*→CLOSED|ABORTEDをappend-onlyにし、resumeはfull manifest全field一致後だけ許す。runtime preparation、owner staging / visibility / transfer / release、generation/predicate/shrink、proof/U3/handoff各commit境界へcrash/driftを注入する。

## Acceptance

same manifest 100 replayでcoverage/verdict/counterexample差=0、partial success=0、ownerless visible lock=0、duplicate claim/proof/bundle/handoff=0を要求する。full run manifest、coverage proof、PBT replay、CellResult、U3 bundle、handoff receiptを順序付きidentity chainで結ぶ。
