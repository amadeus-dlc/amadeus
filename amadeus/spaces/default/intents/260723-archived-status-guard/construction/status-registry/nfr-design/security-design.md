# Security Design — status-registry

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`から、local filesystem trust boundaryを実装へ写像する。

## Input boundary

- `RegistryPathBoundary`をcanonical path解決とcontainment検査の単一ownerとする。readerとwriterはこのcomponentが発行したworkspace-contained pathだけを受け取る。
- registry bytesは`unknown`としてJSON decodeし、各statusを唯一の`parseIntentStatus`へ渡す。cast、fallback、`closed` aliasを通常pathに置かない。
- migration selectorは定数`260713-swarm-driver-migration`だけを受け、caller supplied path/from/toを公開しない。
- workspace resolverが返すregistry pathをcanonical containmentで検査し、開始時点のworkspace外symlink、absolute path、`..`を拒否する。

## Diagnostic boundary

- parse errorはrow indexまたはdirName、型名、最大256 UTF-8 bytesのJSON-safe previewだけを含む。
- previewはescape後にcode point境界で切り詰め、再encodeしてvalid UTF-8かつ256 bytes以下を確認する。
- registry全文、home path、environment value、credential-like data、循環objectを出力しない。

## Defense in depth

- write前に全entry strict parse、target一意性、対象外object slice一致、intended bytes再parseを行う。
- temp fileはtargetと同じdirectoryへ作り、`AtomicRegistryWriter`がrename直前に`RegistryPathBoundary`へdestination再確認を要求する。
- 同一OS userがcheck後にraw filesystemでentryを差し替えるactorは保証対象外とし、通常のAmadeus processはworkspace lockで直列化する。
- 新runtime dependency、network送信、telemetry SDKを導入しない。
