# Architecture Decisions — archived intent lifecycle

上流入力: `requirements`、brownfield `architecture` / `component-inventory`、`team-practices`。

## ADR-01: 既存tool境界を維持する

### Context

registry helper、state transition、selector、routing、audit sealは既存の深いmoduleに分かれている。

### Decision

`IntentStatus`とjournal/recovery primitiveを`amadeus-lib.ts`で所有し、archive/unarchive orchestrationを`amadeus-state.ts`で所有する。新規service/moduleは作らない。

### Consequences

- 既存依存方向を維持できる。
- libの責務は増えるが、registry永続化知識として凝集する。
- utility/orchestrator/auditは薄いguard consumerになる。

### Alternatives Rejected

- 新規lifecycle module: 単用途の抽象と配布面を増やす。
- 各tool個別union: status語彙がdriftする。

## ADR-02: Recoverable journal transaction

### Context

intents.json、cursor、auditは別ファイルであり、単一filesystem atomic writeでは更新できない。

### Decision

spaceのintents配下に単一journalを置き、workspace lock、step marker、operationId、reader前recoveryで論理原子性を実現する。

### Consequences

- crash後にdurable中間状態は残り得るが、repository提供readerはrecovery後だけを返す。
- failure injection対象が7境界へ増える。
- journal schemaの後方互換は本intentではversion 1のみとする。

### Alternatives Rejected

- registry rowへtransaction埋込み: registry公開契約を汚染する。
- auditをjournal兼用: 監査と処理状態を結合する。

### Options / Reversibility

- space単一journal（採用）: pros=全recordから独立して復旧、cons=space内並列を直列化、reversibility=高（machine-local marker削除で戻せる）。
- record内journal: pros=所有が明確、cons=archived解決/sealに依存、reversibility=高。
- registry埋込み: pros=単一durable file、cons=公開schemaと通常dataを汚染、reversibility=低。

RecommendationはNFR-01のreader前recoveryと最小schema影響を同時に満たすspace単一journalである。

## ADR-03: Lifecycle eventをseal例外にする

### Context

archived sealを先に適用すると、archive/unarchive自身の監査eventが順序依存になる。

### Decision

`INTENT_ARCHIVED`と`INTENT_UNARCHIVED`だけをseal例外とする。その他eventはarchived/completeで拒否する。

### Consequences

- status flip順序に依存せずrecoveryできる。
- 例外集合を監査event registryとテストで固定する必要がある。

### Alternatives Rejected

- archive/unarchiveでemit順序を変える: 非対称で再実行が複雑。
- workspace auditへ分離: intent監査が分散する。

### Options / Reversibility

- lifecycle例外（採用）: pros=順序非依存・冪等append可能、cons=例外集合の保守、reversibility=高。
- audit-first固定: pros=seal変更が小さい、cons=後続失敗時の補償が順序依存、reversibility=中。
- workspace audit分離: pros=seal独立、cons=trace分散、reversibility=低。

RecommendationはNFR-01のcrash recoveryとNFR-02の診断相関を最も単純に満たすlifecycle例外である。

## ADR-04: Record checkpointを保存する

### Context

archiveは完了ではなく、明示的に再開不可とする可逆なregistry状態である。

### Decision

archive/unarchiveは`amadeus-state.md`を変更しない。unarchive後は通常selectorで選択し、保存済みCurrent Stageから再開する。

### Consequences

- checkpointを損失しない。
- registry statusが実行可否の唯一のguardとなるため、select/next/unparkの三重防御が必須となる。

### Alternatives Rejected

- state StatusをArchivedへ変更: registryとの二重状態になる。
- Parkedへ変更: archiveとparkの意味を混同する。

### Reversibility

checkpoint不変更は完全に可逆であり、unarchive後の通常selectorで元のCurrent Stageへ戻れる。

## ADR-05: 破損journalはfail-closed

### Context

未知schema、JSON破損、対象消失、fromStatus不一致を自動推測すると、別intentのregistry/cursorを誤更新し得る。

### Decision

自動再構築しない。全公開preflightをtyped errorで停止し、journal path、operationId（読める場合）、不一致field、手動診断手順を表示する。

### Consequences

blast radiusはspace内のlifecycle関連公開操作へ及ぶが、誤更新を防ぐ。通常のsource/artifact読取りは対象外とする。

### Alternatives Rejected

- journal削除して継続: audit/registryの部分commitを見失う。
- registryから推測再構築: human-presenceとoperationIdを復元できない。

可逆性は高い。人間がbytesを確認しjournalを修復/除去すればpreflightを再実行できる。

## ADR-06: Lock外wrapperとlock内capabilityを分離する

### Context

既存caller互換の公開readerと、transaction中にlock再入せず使うhelperを同じ署名にすると、recovery迂回またはdeadlockが起きる。

### Decision

lock外APIは内部でpreflightを所有する。lock内APIは`*Locked`名とopaque `LockedLifecycleContext`を要求し、runtime tokenも照合する。utility subprocess委譲はlock解放後に行い、state側が再検証する。

### Consequences

既存callerはwrapperへ移行しやすく、transaction orchestrationは再入しない。競合時はstate側の再検証で安全に拒否される。

### Alternatives Rejected

- lockをprocess間で保持: subprocessが同じlockを取得できずdeadlockする。
- utility解決結果をstateが信用: TOCTOUで誤対象を変更し得る。

可逆性は高く、wrapperを段階的に既存callerへ適用できる。

## ADR-07: Legacy migrationだけraw decodeを許可する

### Context

通常readerを4値strictにすると`closed`行はmigration前に拒否される。

### Decision

明示migration専用readerだけがstatusを`unknown`としてdecodeし、対象1件を決定表で変換後、全行をstrict registryへ昇格する。通常runtimeにaliasやraw readerを公開しない。

### Consequences

legacy入力を限定面で処理でき、通常契約はstrictのまま保てる。

### Alternatives Rejected

- 通常parserで`closed` alias受理: C8の互換禁止に反する。
- 手編集のみ: 一意照合・他行不変の機械証拠が残らない。

移行完了後に専用readerを残しても通常callerから到達不能であり、削除も容易なので可逆性は高い。
