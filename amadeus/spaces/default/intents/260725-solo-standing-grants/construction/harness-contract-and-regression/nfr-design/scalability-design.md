# Scalability Design: harness-contract-and-regression

## Inputs and Dimensions

U3のNFR RequirementsとFunctional Designを入力とする。manifest harness数H、session数S、policy scenario数Pを対象にする。

## Design

- generatorとfixture enumerationはmanifestから導出し、固定6分岐をcoreへ埋め込まない。
- 32 sessionをdistinct digestとReservation Idで分離する。
- phase-boundary、walking-skeleton各stance、per-unitを共通policy matrixで全harnessへ適用する。
- future harnessはmanifest 1行追加でprojectionとfixture対象へ入る。

## Limits

remote store、distributed lock、parallel daemonを追加しない。identity capability不足はscale fallbackではなくfail-closedとする。
