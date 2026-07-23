# Code Summary — status-registry

Integration spot-check `STATUS-REGISTRY-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

## 実装結果

- `IntentStatus`を`in-flight | parked | complete | archived`の4値へ閉じ、`parseIntentStatus(unknown)`、型付きvalue error、row indexと`dirName`を持つregistry errorを追加した。
- 通常registry read、append、status writeをstrict parserへ接続した。malformed JSON、非array/非object row、欠落status、`closed`、未知値は永続化前に拒否する。
- callbackの実行中だけ有効なopaque lock contextを`withLockedIntentRegistry`で発行し、`transitionIntentStatusLocked`とmigration capabilityでidentity・lock保持・失効を検証する。`complete`、`archive`、`unarchive`の許可行列、拒否、`complete`のidempotent no-opを一箇所へ集約した。
- `complete-workflow`の既存status更新を限定transition capabilityへ移行し、任意status setterを削除した。関連する既存integration testもlock付き契約へ更新した。
- `260713-swarm-driver-migration`完全一致rowだけを扱うmigration専用raw decode、decision table、top-level JSON object/status token locatorを追加した。対象status token以外の元文字列を再利用し、canonical path boundaryを開始時とrename直前に再検証してから、atomic write後にintended bytesをread-backする。
- `writeFileAtomic`はPIDとUUIDを含む一意な同一directory tempを使い、file `fsync` → rename → parent directory `fsync`を行う。全failure経路でtempをcleanupする。新runtime dependency、network、database、CI jobは追加していない。
- workspaceの`amadeus/spaces/default/intents/intents.json`は対象1件だけを`closed`から`archived`へ移行した。diffは1行のstatus token置換である。
- coreからClaude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeの6 harnessを再生成し、Claude/Codex/Cursor/OpenCodeのself-install面も同期した。

## テスト

- 新規unit/integration: `tests/unit/t257-status-registry.test.ts`、`tests/integration/t257-status-registry-migration.test.ts`
- parser、context診断、遷移行列、lock外・失効context拒否、migration target欠落/重複/unexpected status/他row不正、canonical path/symlink境界、byte preservation、atomic failure cleanup、100回no-op、10,000 rowを検証した。
- benchmark integration: 10 warmup後、active migrationとno-opを各100回、独立child processで計測した。10,000 row p95はstrict read 2.468ms、migration 0.546ms、RSS差分 7.8125MiB。
- growth実測（strict read / migration）は1,000件 0.715/0.164ms、2,000件 1.131/0.358ms、5,000件 1.603/0.473ms、10,000件 2.475/0.618ms。1,000→10,000件比は3.459倍/3.764倍で、O(n)上限を満たす。
- benchmark provenance: Git SHA `cb3525fa85d3fe22f945ee3c4f74c681a32b9ae6`、fixture SHA-256 `502f9b9a208177b3e16361c55123b33305592e39f5479e46ac9c9e18f63ba0a2`、Bun 1.3.13、Apple M4 Max、runner `local`。correctness assertionはgreen。
- reviewer指摘対応後のstatus-registry integration benchmarkは11 pass / 0 fail。全体CIで検出した関連fixture・ratchet 6 filesの対象再実行は116 pass / 0 fail。
- `bun install --frozen-lockfile`: pass。
- `bun run typecheck`: pass。
- `bun run lint:check`: pass。repository既存のBiome advisory warningは残るが、本変更で追加したJSON scannerのcomplexity warningはhelper分割で解消した。
- `bun run dist:check`: 6 harnessすべてpass、drift 0。
- `bun run promote:self:check`: 4 self-install面すべてpass、drift 0。
- `bun run test:ci`: 465 files、6,687 assertions、0 failed files、0 failed assertions、RESULT PASS。`t-codex-hooks-migration.test.ts`に実測31.779秒のwall-clock drift advisoryが1件あるが、suite判定はpass。

## Corpus確認

- intent registry statusの直接代入は限定transition内部とmigration raw変換内部だけである。
- 通常runtimeの`closed` literalは0件。`closed`は対象固定migrationのdecision table/token locatorだけに存在する。
- 既存`updateIntentStatus` callerは0件で、`complete-workflow`と関連testは`transitionIntentStatusLocked`を使用する。

## 制約・引継ぎ

- archive/unarchive transaction、journal、human-presence、cursor処理、selector/next/unpark guardは後続Unitの責務として実装していない。
- migrationのcommit後read-back不一致は設計どおりfatal diagnosticであり、自動rollbackは行わない。
- coverage registryとtest-size purity ratchetは新規testを登録済みで、freshness/mechanism honestyもgreen。
- git commitは作成していない。
