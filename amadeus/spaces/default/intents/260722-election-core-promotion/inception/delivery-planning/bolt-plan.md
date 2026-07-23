# Bolt Plan — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## Bolt 編成(dependency + risk-first)

| Bolt | Unit | 根拠 |
|---|---|---|
| Bolt 1 | U1 boundary-guard + U2 election-promotion | U1→U2 の直列制約(FR-5b 落ちる実証)+U1 live enforcement の同 Bolt 拘束(UG U1 重要制約)。配布経路の end-to-end スライス(ガード→移設→全6 dist 投影→スキル動作)として walking-skeleton 候補 — 新配布経路を含むため最初の Bolt を小さな縦切りで人間確認する(project.md Walking Skeleton 既定。stance 分類は engine の gate:"unresolved" 手続きで実施) |
| Bolt 2 | U3 team-launcher-promotion | U1/U2 と依存なし(DAG 上独立)だが、リスク最大面(bash 配布+prerequisite 検査)を Bolt 1 の骨格確認後に実施(risk-first の前倒し、SD Q3=A) |
| Bolt 3(並行バッチ) | U4 clean-env-e2e + U5 team-mode-docs | 両 Unit とも U2/U3 依存の合流点で相互非交差(tests/e2e/ vs docs/)— 並行バッチ(cid:parallel-bolts の枠内、同時アクティブ builder ≤4) |

## Bolt 単位の PR 方針

各 Bolt はスカッシュマージで main へ1コミット(org.md Way of Working)。Bolt 1 の PR は U1+U2 を単一 PR(ガード赤→green の実証が同一 diff 内で完結)。工程記録はチェックポイントコミットで別送(PR 肥大化防止 — team.md)。

## 実行モード

code-generation は swarm(prepare → 並列 fan-out → check → finalize)既定(cid:parallel-bolts)。Bolt 3 のみ2 Unit 並行、Bolt 1/2 は各1〜2 Unit の直列内訳。ラダープロンプト(autonomy 選択)は Bolt 1 gate 承認後に engine 手続きどおり提示。
