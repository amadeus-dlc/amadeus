# Business Rules — status-registry

上流の `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`から、status語彙とmigrationの規則を具体化する。

## Status invariants

- BR-01: 通常runtimeのstatusは`in-flight`、`parked`、`complete`、`archived`の4値だけである。
- BR-02: unknownから`IntentStatus`への変換は`parseIntentStatus`だけが行う。型cast、fallback default、silent normalizationは禁止する。
- BR-03: registry readとwriteは全entryをstrict parseし、一件でも不正なら全操作をfail-fastする。
- BR-04: `closed`は通常runtimeで不正値であり、aliasやdeprecated valueとして公開しない。
- BR-05: arbitrary status setterを公開しない。status変更は名前付きtransition capabilityへ限定する。
- BR-06: `parseIntentStatus`はinvalid valueと許可された4値を持つtyped errorを返す。registry readerはrow indexと解決可能なrecord identityを付加して再throwする。
- BR-06a: `complete`は`in-flight`/`parked`から`complete`、`complete`ではno-op、`archived`では拒否する。
- BR-06b: `archive`は`in-flight`/`parked`/`complete`から`archived`だけを許可し、`archived`では拒否する。
- BR-06c: `unarchive`は`archived`から`in-flight`だけを許可し、他statusでは拒否する。
- BR-06d: transition拒否時はregistry bytesを変更しない。

## Migration invariants

- BR-07: raw decoderを呼べるのはversioned one-shot migrationだけである。
- BR-08: migration targetは`260713-swarm-driver-migration`に固定し、caller指定を受けない。
- BR-08a: target照合は`entry.dirName`の完全一致だけを使う。dirName欠落legacy rowへslug/uuid fallbackを適用しない。
- BR-09: targetが1件の`closed`なら`archived`へ変換する。
- BR-10: targetが1件の`archived`ならidempotent successとし、writeしない。
- BR-11: target欠落、重複、他のvalid statusはfail-closedする。
- BR-12: 対象外entryに不正statusが1件でもあればfail-closedする。
- BR-13: validationが全件成功するまで永続化しない。
- BR-14: 成功時はraw JSON token span patchでtargetのstatus string tokenだけを置換し、そのspan外の全bytesを保持する。
- BR-15: migration後のregistryは通常strict readerで再読込みでき、`closed`と未知statusが0件でなければならない。
- BR-16: atomic commit前の全失敗は元bytes不変とする。commit後のread-back不一致はfatal diagnosticであり、不変条件の例外として明示する。正常な再実行は`already-archived`へ収束する。
- BR-17: migration helperは上流契約どおり`IntentRegistry`を直接返す。write要否はcallerがraw target statusから決め、別の公開result unionを追加しない。

## Error and mutation policy

| Error class | Recoverability | Behaviour |
|---|---|---|
| invalid runtime status | caller修正が必要 | writeせず例外 |
| malformed registry structure | file修復が必要 | writeせず例外 |
| migration target missing/duplicate | データ調査が必要 | writeせず例外 |
| unexpected target valid status | 裁定確認が必要 | writeせず例外 |
| atomic write failure | 再実行可能 | 元fileを保持し例外 |
| post-write intended-bytes不一致 | 致命的 | loud error、commit前不変条件の対象外、再実行で収束確認 |

失敗をno-opへ丸めない。唯一の正常no-opは、対象が一意で既に`archived`かつregistry全件がvalidな再実行である。

## Verification rules

- 4 valid値、`closed`、未知文字列、非文字列、欠落statusを個別fixtureで検証する。
- migration decision tableの全行を独立testにする。
- mutation失敗ケースは処理前後のregistry bytesを比較する。
- 成功ケースはtarget status token span外のfile bytesを比較する。
- transition行列の全from/verb組を検証し、拒否とno-opを区別する。
- parser単体はvalue errorを、registry reader統合testはrow context付きerrorを検証する。
- corpus scanでstatus write callerを列挙し、strict parserまたは限定transition capabilityを迂回する経路0件を確認する。
- core、6 harness生成物、self-install treeのdrift checkを通す。
