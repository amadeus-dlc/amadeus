# Risk & Sequencing Rationale — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices — 実装順は unit-of-work.md U1 の完成条件と components.md C1〜C6 の依存(unit-of-work-dependency.md で閉包)、リスクは requirements.md FR-3/FR-4 の AC、ジャーニー段は unit-of-work-story-map.md、検証運用は team-practices.md 参照の Testing 層に依拠(raid-log/intent-backlog は ideation 由来の継承参照)

## 順序根拠(risk-first — scope-definition:c3 継承)

単一 Bolt 内の実装順を intent-backlog の risk-first に対応させる: (1) C1/C2 の抽出・除外述語+落ちる実証(R-1 = S1 級の境界誤判定を最初に封鎖)→ (2) C3/C4 の自己検査+PR 生成(R-2)→ (3) C5/C6 の status/dispatch。テストは各段で並行(コードと同時 — org Testing Posture)。

## リスク運用

- R-1(境界誤判定): 落ちる実証2注入(E-LSSRA1 留保)を実装完了条件に(component-methods 実証シナリオ節)。
- R-2(PR 巨大化): SYNC_SPLIT_FILE_LIMIT(ADR-4)+初回実行は #1280 済みで滞留小の想定。
- R-3(並行交差): 着手前実 diff 確認(bolt-plan 記載)。交差発生時は leader へ即報告し直列化判断へ。
