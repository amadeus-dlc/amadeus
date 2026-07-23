# Domain Entities — lifecycle-transaction

`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`に基づき、transactionとlock capabilityのdata structuresを定義する。frontend/UI entityは存在しない。

## LockedLifecycleContext

```ts
export type LockedLifecycleContext = {
  readonly projectDir: string;
  readonly space: string;
  readonly token: unique symbol;
};
```

実際のconstructorとactive-token registryはmodule privateで、public callerは値を生成できない。型だけでなくruntime token照合を行い、callback終了時にactive registryから削除する。serialization、clone、永続化、callback外保持を契約に含めない。

## Intent status transaction journal

```ts
export type IntentStatusTransactionJournal = {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly verb: "archive" | "unarchive";
  readonly intentDir: string;
  readonly fromStatus: IntentStatus;
  readonly toStatus: IntentStatus;
  readonly humanTurn: {
    readonly shard: string;
    readonly timestamp: string;
  };
  readonly userInput: string;
  readonly auditCommitted: boolean;
  readonly registryCommitted: boolean;
  readonly cursorCommitted: boolean;
};
```

journalはspaceのintents directoryに最大1件存在する。step flagはfalse→trueの単調遷移で、operationId、verb、intent、from/to、humanTurn、userInputは作成後に変更しない。

許可されるflag tupleは`FFF`、`TFF`、`TTF`、`TTT`だけである。archive/unarchiveのfrom/toもstatus-registryのtransition行列と一致しなければならず、schema shapeが正しくても意味的に表外ならcorrupt journalとする。

## Lifecycle audit event

```ts
export type IntentLifecycleAuditEvent = {
  readonly eventType: "INTENT_ARCHIVED" | "INTENT_UNARCHIVED";
  readonly intentDir: string;
  readonly fromStatus: IntentStatus;
  readonly toStatus: IntentStatus;
  readonly operationId: string;
  readonly userInput: string;
  readonly humanTurnTimestamp: string;
};
```

event identityは`eventType + operationId`である。journalのreservationと照合できるようhuman turn timestampを必須にし、通常eventのarchived sealに対する明示例外としてappendする。

eventは予約HUMAN_TURNと同じaudit shardへ書く。したがって永続identityは`{event storage shard, humanTurnTimestamp}`として再構成でき、payloadへshardを重複保存しない。同じshardに同一timestampのHUMAN_TURNが複数ある場合は予約を拒否する。

既存eventをidempotent successとして扱うには、保存先shard、eventType、intentDir、fromStatus、toStatus、operationId、userInput、humanTurnTimestampの全項目がjournal由来の期待値と一致しなければならない。

## Transaction ports

```ts
type LifecycleTransactionPorts = {
  readJournal(): unknown;
  writeJournal(journal: IntentStatusTransactionJournal): void;
  deleteJournal(): void;
  appendLifecycleEventOnce(
    context: LockedLifecycleContext,
    event: IntentLifecycleAuditEvent,
  ): void;
  transitionStatus(
    context: LockedLifecycleContext,
    intentDir: string,
    transition: "archive" | "unarchive",
  ): void;
  clearCursorIfMatches(context: LockedLifecycleContext, intentDir: string): void;
};
```

portはmodule internalで、production defaultを置換する公開configurationにはしない。test harnessだけがorchestrator factoryへfakeを渡し、各durable境界を決定的に失敗させる。

## Recovery result

```ts
export type RecoveryResult =
  | { readonly kind: "none" }
  | { readonly kind: "recovered"; readonly operationId: string }
  | { readonly kind: "completed"; readonly operationId: string };
```

corrupt journalはsuccess variantにせずtyped fatal errorをthrowする。`completed`は既に全commit stepが揃ったjournalを検証・削除した結果、`recovered`は一つ以上の未完了stepを前進させた結果を表す。

## Relationships

- journalは一つのintent transitionと一つのHUMAN_TURN reservationを所有する。
- lifecycle audit eventはjournal operationIdとhumanTurn timestampを参照する。
- contextはlock lifetimeを表し、journalやeventへ永続化しない。
- Bolt 1の`IntentStatus`とtransition capabilityを消費し、Bolt 3へpreflight wrapperとstate CLI contractを提供する。
- `frontend-components.md`は非該当のため生成しない。
