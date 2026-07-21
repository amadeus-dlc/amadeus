# Tech Stack Decisions — execution-evidence

## Constraints

`business-logic-model.md` のprocess / evidence ports、`business-rules.md` のclosed bundle / atomic store、`requirements.md` のdeterminism / raw evidence、`technology-stack.md` のcurrent repository stackを維持する。database、queue、cloud object storeを追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Runtime / language | Bun 1.3.13 / TypeScript ESM | current CLI / test stack |
| Process boundary | injected array-argv adapter + frozen Bun / Java executable allowlist | shell injectionとPATH shadowingを避け、実体identity / versionを固定する |
| Filesystem | `node:fs` same-filesystem staging + file / directory sync + atomic rename | bundleと2 ledger entryを単一durable acknowledgementへ束ねる |
| Identity | `node:crypto` SHA-256 | payload / envelope / chainを外部dependencyなしで検証 |
| Time | injected monotonic clock + Coordinator UTC | durationとprovenance時刻を分離 |
| Tests | `bun:test` | crash / corruption / deadline fixtureを既存runnerで検査 |

## Storage layout decision

storeはcontent-addressed bundle tree、append-only runner/store ledger、transaction staging / successor slotをrepository-local record pathに持つ。pathはidentityから導出し、mtimeやdirectory enumeration orderを正本にしない。raw binary streamはbytesのまま保存し、JSONへbase64複製しない。

## Rejected additions and verification

shell pipeline、SQLite、external CAS、message broker、remote worker、新規hash libraryを採用しない。import / diff scanで新規runtime dependencyとnetwork client 0件を確認し、`bun test`、typecheck、Biome、package checkの既存面を使う。tool欠損やunsupported atomicityは成功へ丸めずtyped failureにする。
