# Domain Entities — status-registry

`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`に基づくclass-freeなTypeScript domain modelを定義する。新しいdatabase、service、packageは作らない。

## IntentStatus value

```ts
export type IntentStatus =
  | "in-flight"
  | "parked"
  | "complete"
  | "archived";

export declare function parseIntentStatus(value: unknown): IntentStatus;
```

identityを持たないimmutable valueであり、等価性は文字列値で決まる。companion parserがunknownをvalidated valueへ変換し、不正状態をdomain内へ持ち込ませない。

## Registry entities

```ts
export type IntentRegistryEntry = {
  dirName?: string;
  status: IntentStatus;
  // Existing fields remain unchanged.
};

export type IntentRegistry = readonly IntentRegistryEntry[];

type LegacyIntentRegistryEntry =
  Omit<IntentRegistryEntry, "status"> & { status: unknown };
```

通常runtimeでregistry rowとrecordの対応を解決するときは、既存の`recordDirMatches(entry, intentDir)`を維持する。`dirName`は新しいrowでは安定identityだがlegacy rowでは省略可能である。ただしone-shot migrationだけは裁定対象を厳密に限定するため`entry.dirName === "260713-swarm-driver-migration"`の完全一致を使い、fallback一致を対象に含めない。全rowの`dirName`必須化や一意性強制は本Intentへ持ち込まない。

`LegacyIntentRegistryEntry`はdomain entityではなくmigration入力DTOであり、通常runtimeのexport surfaceへ含めない。unknown statusを保持できるのはstrict parserへ昇格するまでのone-shot処理内だけである。

## Migration result

```ts
export declare function migrateClosedSwarmDriverIntent(
  raw: readonly LegacyIntentRegistryEntry[],
): IntentRegistry;
```

上流の`component-methods`署名どおりvalidated registryを直接返す。callerはdecision table評価時のraw target statusを保持し、`closed`ならwrite、`archived`ならno-opと判断する。公開`MigrationResult` unionや任意target・任意transition fieldは追加しない。

## Error entities

```ts
export type IntentStatusParseError = {
  kind: "invalid-intent-status";
  receivedType: string;
  receivedPreview: string;
  allowed: readonly IntentStatus[];
};

export type IntentRegistryStatusError = IntentStatusParseError & {
  rowIndex: number;
  intentDir?: string;
};
```

parserはentryを知らないためvalue-level errorだけを生成し、registry readerがrow contextを合成する。`receivedPreview`は長さ制限付きJSON-safe表現とし、serialization不能値では型名だけを使う。

## Relationships and lifecycle

- `IntentRegistry`は複数の`IntentRegistryEntry`を順序付きで所有する。
- 各entryはちょうど1つの`IntentStatus`を持つ。
- migration DTOは`closed`を含み得るが、validated registryへ昇格した時点で存在できない。
- `in-flight`、`parked`、`complete`から`archived`、`archived`から`in-flight`へのruntime transitionはBolt 2の責務であり、このUnitは許可されたvalueとcapability境界だけを提供する。
- frontend component、UI state、form validationは存在しないため`frontend-components.md`は生成しない。
