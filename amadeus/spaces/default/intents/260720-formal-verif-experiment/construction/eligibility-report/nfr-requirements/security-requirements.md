# Security Requirements — eligibility-report

## Threat boundary

`business-logic-model.md` のverified inputs / trace report、`business-rules.md` のrenderer purity / wiring、`requirements.md` のblind evidence / report、`technology-stack.md` のrepo-local CLIを正本とする。脅威はraw evidence差替え、trace traversal、Markdown injection、credential / private path漏洩、handler substitutionである。

## Evidence and trace integrity

- matrix、freeze、manifest、schedule、command / CI / artifact refsをcontent identityへ再hashし、unknown / missing / duplicate / cross-revision refを拒否する。
- trace pathはrecord-relative canonical allowlistへ限定し、absolute、`..`、symlink escape、external election store URIを拒否する。
- reversal conditionは6体グリリング正本identity / ordinal / text hashとのbijectionを要求し、正本外の条件を追加しない。
- evaluator / renderer / trace verifier workerはnetwork-deny・filesystem read allowlist sandboxで実行し、writeはworker固有revision stagingだけを許す。workerはreport-store lock、claim / reservation ledger、final store pathへのwrite / rename権限を持たない。

trusted publisherだけがreport-store lock、capacity / execution claim、final successor path、parent sync権限を持つ。publisherはworkerのverified staging manifest、JSON / Markdown / trace hashes、TraceVerification proof、revision manifest identityをread-only再検証し、exact bytes一致後だけfinal renameする。publisherはevaluation / rendering logicを再実装しない。

## Output safety

JSONはstrict serializer、Markdownはcontrol character、table delimiter、link destination、HTMLをescapeする。raw stdout / stderr、environment、credential、home path、sealed payload contentをreportへ埋め込まずcontent refだけを表示する。

final rootはclosed command discriminatorごとのtop-level handler identityを検証し、unknown / duplicate / fallbackを拒否する。rootへeligibility / Pareto / rendering codeを持たせない。FDのtop-level handler / dependency区別に関する既知findingは解消済みと再ラベルせず最終gate履歴へ保持する。

## Verification

hash drift、cross-revision ref、path traversal / symlink、Markdown / JSON injection、credential / private path、reversal condition創作、handler duplicate / substitutionをred fixtureとする。network publish、external store readは0件とする。
