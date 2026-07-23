# Domain Entities — guard-integration

`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`に基づくguard data modelを定義する。新しいservice、database、frontend stateは追加しない。

## IntentOperation

```ts
export type IntentOperation = "select" | "next" | "unpark";
```

拒否対象の公開操作だけを閉じた語彙にする。archive/unarchiveはguard対象でなくlifecycle transaction commandであるため含めない。

## Rejection variants

```ts
export type IntentOperationRejection =
  | {
      readonly kind: "intent-not-found";
      readonly selector: string;
      readonly operation: IntentOperation;
      readonly reason: string;
      readonly recovery: readonly string[];
    }
  | {
      readonly kind: "intent-archived";
      readonly intentDir: string;
      readonly status: "archived";
      readonly operation: IntentOperation;
      readonly recovery: string;
    };
```

discriminated unionにより、対象不在variantへ架空statusを入れず、archived variantではstatusをliteralへ固定する。rendererはこのdataを受け取り、orchestratorではerror directive、utility/state CLIでは既存error出力へ変換する。

`intent-not-found`のselector、operation、reason、recoveryは全renderer共通の必須fieldである。archived variantの`recovery`はconstructorがresolved `intentDir`から`intent unarchive <dirName>`として生成し、placeholderを保存しない。

## Next ErrorDirective mapping

```ts
export type ErrorDirective = {
  readonly kind: "error";
  readonly message: string;
};

export declare function archivedNextGuard(
  projectDir: string,
): ErrorDirective | undefined;
```

messageは共通rejection rendererの出力である。callerは返値がdefinedならstdoutへserializeして即returnし、他directiveと併合しない。

## Guard result

```ts
export type IntentOperationGuardResult =
  | { readonly kind: "allowed" }
  | { readonly kind: "rejected"; readonly error: IntentOperationRejection };
```

guardは副作用を持たないdecision functionであり、status readとrecoveryはcallerが保有する`LockedLifecycleContext`内で済ませる。callerは`rejected`時に処理を継続できない。

## Delegation request

```ts
type LifecycleDelegationRequest = {
  readonly verb: "archive" | "unarchive";
  readonly intentDir: string;
  readonly projectDir: string;
};
```

utilityが解決したstable dirNameだけを渡す。status、HUMAN_TURN、operationId、lock contextは渡さず、state subprocessが権威ある現在値を再取得する。

## Relationships

- rejectionは一つのoperationと、存在する場合は一つのintent recordを参照する。
- guard resultはpreflight callback内だけで生成・消費する。
- lifecycle delegationはutility lockとstate lockの間を跨ぐが、capabilityやvalidation proofを運ばない。
- Bolt 1のstrict `IntentStatus`、Bolt 2の`LockedLifecycleContext`とpreflightを消費する。
- frontend componentは存在しないため`frontend-components.md`は生成しない。
