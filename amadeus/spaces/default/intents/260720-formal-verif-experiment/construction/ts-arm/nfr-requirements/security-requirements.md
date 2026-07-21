# Security Requirements — ts-arm

## Threat boundary

`business-logic-model.md` のpure oracle / opaque subject、`business-rules.md` のblind input / runtime identity、`requirements.md` のFR-3/NFR-3、`technology-stack.md` のBun / fast-check stackを正本とする。脅威は先行arm leakage、fixture semantics混入、dependency drift、dynamic code execution、path escapeである。

## Blind input isolation

- Arm S inputはpublic contract、healthy baseline、opaque subject materialization、frozen universe / arbitrary manifestだけを許す。
- TLA source / output、Arm T path / evidence、fixture ID / patch / expected failure / regression名、B1 evidenceを禁止する。
- start / freeze / run前にactual input manifest identityとforbidden-path scan receiptを再検証する。

## Runtime controls

Bun executable realpath / version / distribution identity、package.json / bun.lock、fast-check 4.9.0 package tree hashをfreezeする。runはnetwork-denyに加えOS-level filesystem sandboxを使う。read allowlistはfrozen Bun runtime / package tree、Arm S source / tests、public contract、grant-bound opaque subjectだけ、write allowlistはrevision-scoped output / tempだけとし、Arm T / U5 / Registry sealed store / fixture expectation / prior evidence pathをdenyする。sandbox enforcement probeが失敗すれば起動しない。denied open attemptはpath hash付きtyped failureにする。

closed environment、array argv、repository-contained cwd / output pathを使い、dynamic import path、`eval`、Function constructor、child shellを禁止する。read allowlist外のrepository-contained pathも許可しない。

subject bytesはgrant-bound materializationだけから取得し、content identityを再照合する。error / counterexampleへabsolute path、credential、sealed payload contentを含めない。

## Verification

TLA / U5 / fixture / prior evidence path open attempt、filesystem sandbox unavailable / allowlist escape、lockfile / package drift、PATH shadowing、network attempt、eval / dynamic import、subject identity driftをred fixtureとする。secret / personal data / external election store readは0件とする。
