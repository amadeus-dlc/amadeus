# Component Dependency — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 依存グラフ

```mermaid
flowchart TD
    subgraph core["packages/framework/core(正本 — 配布面 dist×6+self-install)"]
        C1["C1 retreat-guard(handleSetStatus 内 — Q1=A 裁定)"]
        C2["C2 checkbox-state 判定(parseCheckboxes :3750 既存 export の再利用)"]
        LK["withAuditLock(amadeus-lib.ts:4266、既存)"]
        RW["readStateFile / writeStateFile(既存)"]
        SC["setCheckbox :3785 / setStageSuffix :3805(既存・不変)"]
    end
    subgraph scripts["scripts(repo ローカル — 配布面なし)"]
        C3["C3 countStageProgress 修正"]
    end
    subgraph record["record(データ)"]
        C4["C4 state-repair(mirror-issue-tool state)"]
    end
    C1 --> C2
    C1 --> LK
    C1 --> RW
    C3 -.->|"検証時のみ(A-3: 修復後 state で 18/18 実測)"| C4
```

テキストフォールバック: C1 は C2(checkbox 読取)・withAuditLock・readStateFile/writeStateFile に依存。C2 は依存なし(純関数)。C3 は独立(scripts のみ)。C4 はデータ操作で、C3 の live 検証(A-3)のみが C4 の完了に依存する。循環依存なし。

## 変更面の非交差(並行実装判定の材料 — c6)

| 修正 | 編集ファイル | 再生成面 |
|---|---|---|
| #1170(C1+C2) | packages/framework/core/tools/amadeus-utility.ts、amadeus-lib.ts | dist 6ツリー+self-install(.claude/ ほか) |
| #1172(C3) | scripts/amadeus-mirror.ts、tests/unit/t232 | なし |
| 修復(C4) | amadeus/spaces/default/intents/260717-mirror-issue-tool/amadeus-state.md | なし |

#1170 と #1172 はファイル単位で完全非交差(scope-document の並行可判定を設計面で再確認)。ただし実装規模が小さいため、Bolt 分割・直列/並行の確定は delivery-planning(units-generation)の判断に委ねる。

## 依存方向の制御(inception ガードレール)

- C2 は既存 `parseCheckboxes`(amadeus-lib.ts:3750、export 済み)の再利用 — 新設シンボルなし、lib → utility の既存依存方向を保つ(utility → lib import のみ、逆流なし)
- C1 は engine(amadeus-state.ts)のハンドラを呼ばない(FR-1e)— ロックドメインだけを共有し、コード依存は amadeus-lib.ts に閉じる
- C3 は core に依存しない(scripts 自己完結)— gh-scripts-boundary と同型の境界維持
