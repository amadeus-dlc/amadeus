# Component Dependency — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、codekb の architecture.md・component-inventory.md(re-scan 鮮度確認済み)、`../practices-discovery/team-practices.md`(live 温存)。

## 依存方向(実装順序)

C3(写像対応表 — 工程0 実測)→ C2(lib — 表の確定分のみ実装)→ C1(entrypoint — lib 登録)→ C4(テスト — C2 純関数+C1 統合)→ C5(manifest+docs — regen)

C3 が最初(工程0): in-tree 再実測(AC-1c 確定条件)を実装前に完了し、配線集合を凍結してから C2 に着手する。循環なし。

## 並行開発の可否

C3→C2→C1 は直列必須(配線集合の凍結が先行入力)。C4 は C2 完了後、C5(docs 面)は C3 確定後に並行可 — ただし単一 Bolt 想定につき実質直列。
