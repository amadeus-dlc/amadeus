---
name: functional-domain-modeling-ts
description: >-
  Use when a TypeScript project adopts the class-free, functional domain
  modeling style: type-alias contracts instead of interface, factory
  functions with closure state instead of class, companion objects via
  type+namespace declaration merging, branded types with smart
  constructors, and discriminated-union Result/error values instead of
  exception class hierarchies. Trigger for class-free TypeScript, companion
  object pattern, branded types, smart constructors, or Result-based error
  handling design.
---

# Functional Domain Modeling (TypeScript)

class / interface を使わず、**データ = 型、振る舞い = 関数**で構成する TypeScript スタイル。Scott Wlaschin『Domain Modeling Made Functional』の流儀を TypeScript のイディオムに落としたもの。正準実装例は [j5ik2o/event-store-adapter-js `packages/library`](https://github.com/j5ik2o/event-store-adapter-js/tree/main/packages/library)。

適用条件: **方式依存**。プロジェクトがこのスタイルを採用する場合のみ適用し、採用プロジェクトは `memory/project.md` にこのガイドへのポインタルールを追加する(索引 `../README.md` の運用に従う)。

## 構成イディオム(5つ)

### 1. `type` エイリアスによる構造的契約 — `interface` の代替

契約はメソッドシグネチャを持つ `type` で定義する。実装側に `implements` 宣言は不要で、構造的互換で満たされる。

```typescript
export type EventStore<AID extends AggregateId, /* ... */> = {
  persistEvent(event: E, expectedVersion: number): Promise<Result<void, EventStoreError>>;
  getLatestSnapshotById(id: AID): Promise<A | undefined>;
};
```

### 2. ファクトリ関数 + クロージャ — `class` の代替

コンストラクタの代わりに `create*` ファクトリ関数。private フィールドの代わりにクロージャ変数。返すオブジェクトリテラルは `Object.freeze` する。実装関数は `internal/` に置き、公開はコンパニオンオブジェクト経由に限定する。

```typescript
function createMemoryEventStore<...>(input = {}): EventStore<...> {
  const events = new Map(/* クロージャに閉じた可変状態 */);
  function appendEvent(id: string, event: E): void { /* 内部ヘルパー */ }
  return Object.freeze({
    async persistEvent(event, expectedVersion) { /* ... */ },
  });
}
```

### 3. コンパニオンオブジェクトパターン — static メンバの代替

同名の `type` と `namespace` を宣言マージし、コンストラクタ関数・ファクトリを namespace 側に置く(名前は Scala 由来)。namespace 自体も `Object.freeze` する。

```typescript
export type Result<T, E> = { type: "ok"; value: T } | { type: "err"; error: E };

export namespace Result {
  export function ok<T>(value: T): Result<T, never> {
    return Object.freeze({ type: "ok", value });
  }
  export function err<E>(error: E): Result<never, E> {
    return Object.freeze({ type: "err", error });
  }
}

Object.freeze(Result);
```

利用側は `Result.ok(x)`、`EventStore.createMemory(input)` のように型名を経由して呼ぶ。

### 4. ブランド型 + スマートコンストラクタ — 公称型の擬似再現

プリミティブに `unique symbol` のブランドを交差させ、検証を通ったコンパニオンの `create` だけがその型を作れるようにする(parse-dont-validate の型システム版)。

```typescript
declare const shardCountBrand: unique symbol;
export type ShardCount = number & { readonly [shardCountBrand]: "ShardCount" };

export namespace ShardCount {
  export function create(value: number): ShardCount {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`shardCount must be a positive safe integer, got ${value}`);
    }
    return value as ShardCount;
  }
}
```

### 5. 判別可能ユニオンによる Result とエラー — 例外クラス階層の代替

失敗しうる操作は `Result<T, E>` を返す。**エラー自体も `Error` 継承クラスではなく判別可能ユニオン**とし、ケースごとのファクトリをコンパニオンに置く。

```typescript
export type EventStoreError =
  | { type: "optimistic-lock-conflict"; message: string; cause?: unknown }
  | { type: "storage-error"; message: string; cause?: unknown };

export namespace EventStoreError {
  export function optimisticLockConflict(message = "Optimistic locking failed", cause?: unknown): EventStoreError {
    return Object.freeze({ type: "optimistic-lock-conflict", message, cause });
  }
}
```

呼び出し側は `result.type` で網羅的に分岐する(switch + never 検査で漏れを型エラー化できる)。

## 補助イディオム

- **イミュータブル更新 + F-bounded 自己型**: 更新メソッドは新インスタンスを返す。自分自身の型を返す契約は `type Aggregate<This extends Aggregate<This, AID>, AID> = { withVersion(version: number): This; ... }` のように自己参照型パラメータで表す
- **type-only export**: 型だけを公開するものは `export type { AggregateId }` とし、値の実体を持たせない

## 採用時の注意

- lint プリセットが `namespace` を禁止している場合(typescript-eslint の `no-namespace` 等)、コンパニオンオブジェクト用に例外設定が必要
- `Object.freeze` は浅い凍結。深い不変性はイミュータブル更新の規律(新インスタンスを返す)で担保する
- 普遍原則(`tell-dont-ask`、`parse-dont-validate`、`first-class-collection` など `../README.md` の常時適用群)はこのスタイルの上でもそのまま適用される — 本ガイドはその表現手段を定めるだけ
