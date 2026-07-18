# External Dependency Map — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 外部依存

なし(0件)— 両 unit とも新規 runtime dependency なし(NFR-3/T1、components.md「依存と配布面」)。gh 等の外部 CLI 追加なし。外部サービス(Codecov)は既存 CI gate としての関与のみ(新規契約なし — team-practices.md の lcov 事前確認プラクティスで事前緩和)。

## 内部横断依存

- Bolt 1 の配布面: dist 6ツリー+self-install(NFR-2)— 並行 intent の core 変更 PR との交差は着地順に実 diff で再評価(c6/cross-merge-dist-tree-blindspot)
- C4 修復の対象: 260717-mirror-issue-tool record(完了 intent — 並行書き込みなしを修復時に確認)
