# Security Design — eligibility-report

## 上流と integrity boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。matrix/freeze/manifest/schedule/command/CI/artifact refsを再hashし、cross-revision/missing/duplicateを拒否する。

## SandboxedReportWorker

workerはnetwork deny、record-relative read allowlist、revision-private staging writeだけを持つ。absolute/traversal/symlink/external election URIを拒否し、report-store lock/claim/reservation/final rename権限を持たない。reversal mappingsは正本identity/ordinal/text hashとのbijectionを要求する。

`TrustedReportPublisher` だけがfinal storeを所有し、worker manifest、JSON/Markdown/trace hashes、TraceVerification proof、revision bindingに加え、closed output roles、schema identities、JSON/Markdown各16 MiB以下、trace entries<=256をread-only再検証する。exact bytes一致後だけrenameし、evaluation/renderingを再実装しない。

JSONはstrict serializer、Markdownはcontrol/table/link/HTML escapeを使い、raw stream/env/credential/home/sealed contentを埋め込まない。rootはclosed handler identitiesを検証しlogicを持たない。

## Verification

hash/cross-revision/path/symlink/injection/private data/reversal創作/handler substitutionをred fixtureにする。network publish/external store read=0である。
