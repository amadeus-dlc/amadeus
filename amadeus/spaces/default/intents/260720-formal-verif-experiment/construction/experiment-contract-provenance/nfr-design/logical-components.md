# Logical Components — experiment-contract-provenance

## Design inputs

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の責務を次のlogical boundaryへ配置する。

## Component inventory

| Component | Responsibility | State / failure domain |
| --- | --- | --- |
| `CommandDecoder` | 1 MiB cap、strict argv / JSON parse | pure / command local |
| `CanonicalEncoder` | fixed-field canonical bytes / SHA-256 | pure / command local |
| `StateFolder` | max6 event fold / transition validation | pure / ledger snapshot |
| `ProofPolicyRegistry` | command-specific proof / state authorization | immutable registry |
| `CommandRouter` | exactly-one top-level handler dispatch | immutable registry |
| `ProvenanceStorePort` | appendBatch / lookup contract | domain boundary |
| `FsProvenanceStoreAdapter` | immutable objects / successor chain / recovery | repository-local store |
| `ReceiptRedactor` | safe structured observability | append-only record |

## Dependency direction

decoder / encoder / folder / policy / routerはpure domainで、store / filesystemへ依存しない。routerはtyped handler ports、store domainは`ProvenanceStorePort`だけを見る。`FsProvenanceStoreAdapter`が唯一のfilesystem writerである。

## Blast radius

parse / policy failureはcommand 1件、handler failureは該当port、store corruptionは該当ledger revisionで停止する。別arm、fixture registry、evidence storeへ自動fallbackしない。component identityとlimits identityをcomposition rootでexactly oneずつ結線する。

## Verification map

pure componentsはunit / property tests、adapterはtemporary filesystem crash tests、compositionはhandler / component exact-set testで検証する。U1 NFR Requirements reviewの残存履歴は保持し、本設計reviewで閉包可否を独立判定する。
