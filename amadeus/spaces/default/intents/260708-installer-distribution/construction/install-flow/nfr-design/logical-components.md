# Logical Components — install-flow

> ステージ: nfr-design (3.3) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`、`../nfr-requirements/tech-stack-decisions.md`(parseArgs/readline)、U1 nfr-design/logical-components.md(レイアウト継承)、`../../../inception/application-design/components.md`

## ソースレイアウト追加分(packages/setup/src/ — U1 レイアウトへの増分)

```
src/
  cli.ts                 # main(argv) — 引数解析(node:util parseArgs)、ディスパッチ、終了コード単一経路
  domain/
    command.ts           #   ParsedCommand + UsageError + InstallInputs
    installation.ts      #   Installation + InstallationEvidence + InstallAdmission
    plan.ts              #   Plan + PlanEntry + PlanAction + PlanRefusal + PlanSummary(+ Plan.forInstall)
    apply-result.ts      #   ApplyResult + ApplyFailure
    verify-result.ts     #   VerifyResult + Check + NextSteps
    harness.ts           #   (U1 の型に)HarnessName.parse を本 Unit で追加(UsageError 依存のため — 所有分割どおり)
  modules/
    wizard.ts            #   runWizard(parsed, missing, tty) — node:readline/promises
    applier.ts           #   Applier.create(fsWrite) — resolveWithin/SafeTargetPath を内包
    verifier.ts          #   Verifier.create(fsRead)
    reporter.ts          #   Reporter API 8関数(純関数 — 文字列生成のみ)
  ports/
    tty.ts               #   TtyIO(isTTY/select/input/confirm)
```

- 依存方向は U1 の規律を継承(modules → domain/ports、domain コンパニオン → internal 値インポート、internal → domain 型のみ)
- applier への FsWrite 注入はここが唯一(U1 の注入非対称と整合 — cli が組み立て時に配線)
- reporter は I/O を持たない純関数群(出力は cli の console 呼び出しに一元化 — SEC-I04 の文言レビューを1箇所で可能に)
