# External Dependency Map — 形式検証対照実験

## 上流入力と境界

本mapは `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`を入力とする。AWS、database、external API、secret、personal data、外部選挙store、deployment基盤は追加しない。実行時network依存はTLC artifactの取得工程だけである。

## 依存一覧

| Dependency / approval | Type | Owner | Blocks | Lead-time handling | Verification / mitigation |
| --- | --- | --- | --- | --- | --- |
| TLA+ tools 1.7.4 `tla2tools.jar` | external binary acquisition | B1 TLA toolchain | B1 | B1 preflightのacquisition step内 | GitHub release URLを固定し、SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`を照合。runはoffline |
| OpenJDK 26.0.1 | local runtime | B1 TLA toolchain | B1 | Construction開始時にversion再実測 | versionをprovenanceへ記録。欠損・driftは`HARNESS_ERROR` / 新revision |
| Bun + fast-check 4.9.0 | repository toolchain / lockfile | B2 Arm S | B2 | 既存lockfileを使用し追加取得を作らない | `package.json` / `bun.lock`のversionとinput hashを固定 |
| PR #1268 / #1277 / #1273、Issue #1252と対応commit | GitHub一次資料 / source provenance | B1 Registry | B1、B3 | B1 seal前にSHAを固定 | branch / baseline / injection / allowed hunkを台帳化。drift時は停止 |
| GitHub CI runner class | execution environment | B1、B3 measurement | B1、B3 | 各gateのrun単位 | 両armで同一runner class / input、serial実行、raw run URL保存 |
| record内artifact storage | durable experiment evidence | B1〜B4 | B1〜B4 | 各Boltでappend-only保存 | CI retentionへ依存せずraw stdout / stderr / result / checksumをintent recordへ保存 |
| 人間によるBolt gate / main merge承認 | external approval | user / leader | 各Boltの次段 | per gate | AIはmain mergeや不可逆操作を行わず、完成証拠をhandoff |
| 他in-flight intentとの非交差確認 | coordination gate | leader / conductor | Construction開始 | origin/main再接地後に単発実測 | path intersectionがあればConstructionを開始せず選挙へ付議 |

## Bolt別消費

- **B1:** TLA jar、OpenJDK、GitHub一次資料、CI runner、artifact storage、walking-skeleton gate。
- **B2:** Bun / fast-check、同一healthy baseline、独立author session / worktree、Arm S freeze gate。
- **B3:** 両freeze SHA、promoted manifest、同一CI runner、artifact storage、integration gate。
- **B4:** verified matrix / raw cost、artifact storage、decision gate。新しいexternal toolはない。

## 非依存・追跡項目

Issue #1296はpractices-discovery sensor実装の追跡であり、本実験のConstruction依存ではない。Alloyは`NOT_DETECTED`発生時の別裁定候補であり、現在のdependency graphには含めない。production release / npm publish / deployment / external team hand-offも本intentのOut of Scopeである。

## Fail-closed条件

TLC取得不能、checksum不一致、runtime不在、source SHA drift、runner class不一致、approval不在は、対応Boltを完了扱いにしない。代替toolや別baselineへ黙って切り替えず、新revisionまたは選挙へhandoffする。
