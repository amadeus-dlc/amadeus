# NFR Requirements Questions — verification-and-ledger-closure

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U12 `verification-and-ledger-closure`。BR-U12-01〜13、FR-7 items 23–24、FR-8、Requirements NFR-1〜8をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:52:33Z`。

## 質問不要の根拠

- Performance/scalability: 24 item evidence、必須verification、最終SHAを一回のclosure判定へ集約するだけであり、新SLO、parallelism、cache、分散ledgerを決める余地はない。
- Security/integrity: EQUIVALENTはupstream contract全体のcharacterization evidenceだけ、23/24以下や未実施・非0・古いSHAはfalse greenにしないことが既決である。
- Verification: FR23は採用contractのみを再著作しfilesystem testをintegration-first、SKIP testを除外する。NFR-6はpatch追加行未カバー0、waiverは既決条件の明示証拠時だけ受理する。
- Ledger reliability: (a)単なる未完了/三条件欠落はAPPLIED拒否・ledger/baseline不変、(b)構造化`verification-failure`/`abandon`だけを反証可能根拠付きBLOCKEDへ冪等計画しbaseline不変、(c)24 disposition+全gate green+最終SHA成立時だけAPPLIED、というclosed unionが既決である。
- Technology: Bun/TypeScript、既存CI/coverage/docs/ledger writerを再利用し、BLOCKED/APPLIEDとも既存atomic write境界で同一transition再実行no-opとする。新runtime dependency、service、database、network、UIを追加しない。

新failure分類、accepted terminal language、判定順、waiver条件、ledger atomicity、transition variantを選ぶ余地はない。成果物化中に新たなfailure evidence、disposition、coverage waiver、ledger transition判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:52:33Z`）。承認範囲はBR-U12-01〜13、FR-7 items 23–24、FR-8、Requirements NFR-1〜8、正準3 public seamと内部`classifyDisposition`、24/24 trace、same-SHA verification、patch coverage/既決waiver、BLOCKED/APPLIED closed union、Bun/TypeScriptと既存verification/ledger stackの機械導出に限定する。新failure evidence、disposition、waiver、transition、atomicity、public API、dependency、service、database、network、UI、保持期間、SLOは追加しない。
