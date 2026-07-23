# コンポーネント依存 — archived intent lifecycle

上流入力: `requirements`、`architecture`、`component-inventory`、`team-practices`。

## 依存方向

| Consumer | Intent Registry Domain | Lifecycle Command | Intent Selector | Workflow Router | Audit Boundary |
|---|---:|---:|---:|---:|---:|
| Lifecycle Command | depends | — | no | no | depends |
| Intent Selector | depends | delegates | — | no | no |
| Workflow Router | reads | no | no | — | no |
| Audit Boundary | reads status/type | no | no | no | — |

依存方向はtoolから`amadeus-lib.ts`へ向ける。`amadeus-lib.ts`はtoolへ依存せず、循環を作らない。utilityからstateへの委譲はprocess境界で行い、state実装をimportしない。

## データフロー

- archive: selector/dirName → state → lib recovery/registry → audit → registry → cursor clear
- unarchive: selector/dirName → state → lib recovery/registry → audit → registry
- select: utility → lib lookup → archivedなら拒否 → cursor
- next: orchestrator → lib active status → archivedならerror directive
- unpark: state → lib active status → archivedならwrite前拒否

共有resourceはintents.json、active-intent cursor、audit shard、transaction journalであり、すべてworkspace lockの管理下に置く。

## Lock / recovery call graph

`withIntentLifecyclePreflight`が唯一のlock ownerである。state archive/unarchive、utility selector write、orchestrator next、state unpark、audit appendはpreflight callbackとして実行される。callback内のregistry/audit/cursor helperはopaqueな`LockedLifecycleContext`を要求する。lock外向け既存APIは内部でpreflightを所有するwrapper、lock内APIは`*Locked`名に分離する。

utility→state subprocessは同一lockを跨がない。utilityは解決後にlockを解放し、stateが再取得・再検証するためdeadlockせず、競合は変更前のloud拒否へ収束する。
