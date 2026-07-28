# Domain Entities — u2-state-reconcile-hardening

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

型は component-methods の C0 を verbatim 正とする(独立進化させない)。U2 は U1 で導入済みの `MirrorProjectSyncEntry` に **pending / safety-blocked の書込と収束遷移**を解禁する(unit-of-work の段階導入 — U1 は synced のみだった)。story-map ジャーニー2(障害後の追いつき)の状態表現。requirements FR-7 と services の失敗分類が遷移の入力。

## MirrorProjectSyncEntry のライフサイクル(U2 完全形)

遷移規則は**現在状態に依存しない一律分類**(business-logic-model 手順3): 再評価のたびに、その回の結果(成功 / retryable 失敗 / 解決不能)だけで次状態が決まる。したがって 3状態×3結果 = **9セル全数**が定義される:

| 現在\結果 | 成功・既一致 | retryable 失敗 | 解決不能 |
|---|---|---|---|
| (新規) | synced | pending | safety-blocked |
| synced | synced(冪等) | pending | safety-blocked |
| pending | synced | pending | safety-blocked |
| safety-blocked | synced | pending | safety-blocked |

```mermaid
stateDiagram-v2
    [*] --> synced: 成功 / 既一致
    [*] --> pending: retryable 失敗
    [*] --> safety-blocked: 解決不能
    synced --> synced: 冪等再実行(mutation なし)
    synced --> pending: 更新が retryable 失敗
    synced --> safety-blocked: 構成が壊れた(選択肢削除等)
    pending --> synced: 再評価で成功
    pending --> pending: 再評価でも retryable 失敗
    pending --> safety-blocked: 再評価で解決不能と判明
    safety-blocked --> synced: 構成解消後の再評価で成功
    safety-blocked --> pending: 構成解消後の再評価が retryable 失敗
    safety-blocked --> safety-blocked: 未解消のまま再評価
```

<!-- Text fallback: 9セル全数遷移(上の表が正)。現在状態に依存せず、その回の結果のみで次状態が決まる — synced から safety-blocked(構成破壊)、safety-blocked から pending(構成解消後の一時障害)も正当な遷移。 -->

## reducer transitions(component-methods の3種を消費)

| transition | 発火条件 | 結果 |
|---|---|---|
| `upsert-project-entry` | 成功(追加/適用/既一致) | entry を synced で upsert(lastAppliedStatus 更新) |
| `mark-project-pending` | retryable 失敗 | state=pending、updatedAt 更新(lastAppliedStatus は保持) |
| `mark-project-safety-blocked` | 解決不能 | state=safety-blocked、updatedAt 更新 |

- ReducerResult は既存様式(changed/unchanged/invalid)に従い、不変時は unchanged(無駄な state write を発行しない)。
- 台帳の規模: projects 配列は「この Issue が同期対象になったことのある Project 数」まで単調増加する(所属離脱した Project の entry も保持し、drift 診断(U4)の材料にする。削除はしない — FR-11 の Project 側削除禁止とは別軸の台帳保持方針)。実用上は A-2(所属 Project は少数)により有界で、数値上限は設けない。

## 永続化

U1 の codec 3面(PROJECT_SYNC_KEYS / PROJECT_ENTRY_KEYS)をそのまま使用 — U2 で codec 変更は不要(U1 の validate が3値 union を受理済み)。書込は reducer 経由のみ(BR-U2-3)。
