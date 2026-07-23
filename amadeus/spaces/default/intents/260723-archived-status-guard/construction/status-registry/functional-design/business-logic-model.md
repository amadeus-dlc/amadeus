# Business Logic Model — status-registry

上流入力は `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。本UnitはFR-01、FR-02、FR-08のprimary ownerであり、後続のlifecycle transactionとguard integrationへstrict status contractを提供する。

Integration spot-check `STATUS-REGISTRY-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

## Runtime status workflow

`IntentStatus`は `"in-flight" | "parked" | "complete" | "archived"` の閉じた型とし、companion parser `parseIntentStatus(value: unknown): IntentStatus`が唯一のunknown→validated変換境界になる。

1. registry JSONをunknownとしてdecodeする。
2. 各entryのstatusを`parseIntentStatus`へ渡す。
3. 4値のいずれかならvalidated entryへ昇格する。
4. `closed`、未知文字列、非文字列、欠落は対象entryを特定できる診断とともにfail-fastする。
5. 全entryの昇格が成功した場合だけ`IntentRegistry`を返す。

write pathも書込み前に同じparserを通す。呼出側の文字列比較やcastで証明を迂回せず、任意status setterは公開しない。`complete`、`archive`、`unarchive`は後続Unitの限定transition capabilityからのみ到達する。

### Transition capability

`transitionIntentStatusLocked(context, intentDir, transition)`はstatus-registryが所有する唯一のwrite capabilityであり、次の行列を固定する。

| Transition | From | To/result |
|---|---|---|
| `complete` | `in-flight` / `parked` | `complete` |
| `complete` | `complete` | idempotent no-op |
| `complete` | `archived` | reject、mutationなし |
| `archive` | `in-flight` / `parked` / `complete` | `archived` |
| `archive` | `archived` | reject、mutationなし |
| `unarchive` | `archived` | `in-flight` |
| `unarchive` | `in-flight` / `parked` / `complete` | reject、mutationなし |

capabilityはactive lock tokenを検証し、from statusのstrict read、行列照合、validated writeを同じlock context内で行う。Bolt 2はhuman-presence、journal、audit、cursorをorchestrateするが、from/to行列を複製しない。

## One-shot migration workflow

versioned one-shot migrationだけが`readLegacyIntentRegistryForMigration`を使い、statusを`unknown`のまま保持した`LegacyIntentRegistryEntry[]`を読む。対象は定数`260713-swarm-driver-migration`に固定し、callerからdirNameやfrom/to statusを受け取らない。

処理順:

1. 元ファイルbytesを保持し、legacy registry全件をdecodeする。
2. `entry.dirName === "260713-swarm-driver-migration"`の完全一致行を列挙する。legacy fallback matcherは使わず、dirName欠落行は対象に数えない。
3. decision tableを評価する。
4. 対象が1件かつ`closed`なら、そのentryのstatusだけを`archived`へ置換する。
5. 対象が1件かつ`archived`ならidempotent no-opとする。
6. 対象欠落、重複、別のvalid status、対象外行の不正statusではwrite前にfail-closedする。
7. 変換候補全件を通常のstrict parserへ通し、validated `IntentRegistry`へ昇格する。
8. helperは上流署名どおりstrict `IntentRegistry`を直接返す。callerはraw target statusが`closed`だったか`archived`だったかをdecision table評価時に保持し、前者だけをwrite対象とする。
9. raw bytesを走査するJSON token locatorで、一意に解決したtarget objectのstatus string token spanを特定する。元bytesの`[0,start)`と`(end,length]`をそのまま再利用し、string tokenだけを`"archived"`へ置換してintended bytesを構成する。通常のparse/stringifyで全fileを再serializeしない。
10. intended bytesを再parseし、target以外の各object sliceが元bytesと完全一致し、全statusが4値であることをwrite前に確認する。
11. 変更がある場合だけ既存atomic-write primitiveでintended bytesをcommitする。
12. commit後はfile bytesがintended bytesと完全一致することを確認する。不一致はatomic commit後のfatal diagnosticであり「失敗時bytes不変」の対象外とする。再実行はtarget=`archived`のidempotent no-opとして収束確認できる。

## Decision tree

| Condition | Result | Persistent effect |
|---|---|---|
| target count = 1、status = `closed`、他行valid | `archived`へ変換 | target statusだけ変更 |
| target count = 1、status = `archived`、他行valid | success/no-op | bytes不変 |
| target count = 0 | error: target missing | bytes不変 |
| target count > 1 | error: duplicate target | bytes不変 |
| target statusが別の4値 | error: unexpected target status | bytes不変 |
| 対象外statusが4値外 | error: invalid registry status | bytes不変 |

## Integration flow

Bolt 2はvalidated `IntentStatus`と限定transition capabilityを消費し、Bolt 3はstrict lookupと`archived` discriminatorを消費する。migration raw modelはexport範囲をone-shot pathに限定し、通常reader、selector、orchestrator、auditへ流出させない。

通常parserは値だけを検査する。registry readerはrow indexと`dirName`/legacy matcher情報を保持し、parser errorを`IntentStatusParseError`へcontext付きでwrapする。値の診断表現は型名とJSON-safeな短い表現に限定し、循環objectや巨大payloadをそのまま文字列化しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:15:31Z
- **Iteration:** 1
- **Scope decision:** none

strict status境界とmigrationの主要分岐は整理されているが、status-registryが所有するtransition capabilityの許可行列と、migrationのbyte-preservation／失敗時契約が実装可能な粒度まで閉じていない。

### Findings

- BLOCKER — 限定transition capabilityのdecision tableが未定義。
- BLOCKER — migrationの対象外JSON表現保持を実現する更新アルゴリズムが未定義。
- MAJOR — post-write strict verification failureのrollback/収束契約が未定義。
- MAJOR — IntentRegistryEntry identityと全registry dirName一意性の契約が不整合。
- MAJOR — parseIntentStatus署名とentry identityを含む診断責任が不整合。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:18:02Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5指摘は実質的に解消された。一方、migrationの返却型と対象照合規則に上流成果物との直接矛盾が残る。

### Findings

- MAJOR — migration返却型を上流のIntentRegistry直接返却かMigrationResultかへ統一する必要がある。
- MAJOR — migration対象照合をdirName完全一致かrecordDirMatches fallbackかへ統一する必要がある。
