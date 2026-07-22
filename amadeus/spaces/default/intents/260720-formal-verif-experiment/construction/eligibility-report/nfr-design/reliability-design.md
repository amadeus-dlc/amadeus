# Reliability Design — eligibility-report

## 上流と deterministic output

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、same verified input/algorithmをsame decision/report identitiesへ収束させる。

## Evaluation union

structure failure、eligibility reasons、cost failure、Pareto、Alloyをclosed unionで保持し、missing/corruptionをINELIGIBLE、HARNESS_ERRORをNOT_DETECTED、evaluation failureをBOTH_INELIGIBLEへ丸めない。independent verifierはraw identitiesからdecision/reversal/trace bijectionを再計算する。

## Trusted publish protocol

workerはcanonical modelとverified staging manifestを作る。publisherはsame-filesystem stagingを再hashし、closed roles/schema、output caps/trace countを再検証してfile flush、directory sync、nonexistent successorへのatomic rename、parent sync後だけackする。single-writer lockはdurable owner/nonceとstale recovery/normal releaseを持つ。response喪失はreport identity lookupで同receiptへ収束し、report receipt後にCLOSED claimをcommitする。失敗はABORTED、terminal後はphysical release→absence再検証→RELEASEDとし、各response lossをidentity lookupで再開する。orphan/same identity different bytesを拒否する。

claim/evaluation/render/trace各workerのdeadline/terminate/kill、handoff/rehash/cap検証/flush/sync/rename/ack/CLOSED/ABORTED/release/RELEASEDへcrashを注入する。same input100 replayでdecision/JSON/Markdown/trace差=0、raw mutation=0、unverified/over-cap publish=0を要求する。

## Wiring history

closed commands/bindings equality、provider graph、error propagationを検証する。FD残存findingをNFRで解消済みとせず最終gateへ保持する。
