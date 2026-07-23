# Component Dependency — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 依存図(Mermaid)

```mermaid
graph TD
  C2["C2: /amadeus-mirror SKILL"] -->|CLI 呼出| C1["C1: amadeus-mirror.ts(core/tools)"]
  C4["C4: engine phase 境界分岐(amadeus-orchestrate.ts)"] -->|resolve 読取| C3["C3: 3層 config リゾルバ"]
  C4 -->|print 指令が sync を名指し| C1
  C1 -->|既存 import| LIB["amadeus-lib.ts(activeIntent 等)"]
  C4 -->|境界集合参照| STATE["amadeus-state.ts(PHASE_CHECK_REQUIRED_PHASES)"]
  C1 -->|GhRunner シーム| GH["gh CLI(optional)"]
  C5["C5: ノルム改定(norm PR)"] -.->|マージ順序前提| C1
```

テキストフォールバック: C2→C1(CLI 呼出)/ C4→C3(resolve 読取)/ C4→C1(sync print)/ C1→amadeus-lib(既存 import)/ C4→amadeus-state(境界集合参照)/ C1→gh(GhRunner シーム、optional)/ C5⇢C1(norm PR 先行のマージ順序制約 — コード依存ではない)。

## 循環なしの確認

C1→C3・C3→C1・C3→C4 の依存は存在しない(C3 は葉モジュール)。C1 は C4 を知らない(engine が一方的に CLI を名指す)。循環 0。

## Bolt 対応(D-08)

- Bolt 1(縦スライス・単独ゲート): C1+C2(+C5 は norm PR としてマージ順序先行)
- Bolt 2+: C3 → C4(C4 は C3 に依存するため順序固定)
