# Risk and Sequencing Rationale — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md

## 順序 = リスク制御(cid:delivery-planning:intra-bolt-order-as-risk-control)

| 順序制約 | 封じるリスク |
|---|---|
| Bolt 1 → Bolt 2(tier 実体化が先) | perf.yml が空実行/赤で着地する窓 |
| Bolt 2 → Bolt 3(受け皿が main に先着) | distribution-benchmark 検証がどの workflow にも無い commit 窓(P2 検証無音喪失 — requirements.md FR-3d / components.md 依存節) |
| Bolt 3 → Bolt 4(最終形を記述) | docs の即時陳腐化 |
| Bolt 1 内部: テスト移設と coverage 再生成を同一 PR | coverage 3 gate の赤着地(FR-5b の同一 PR 制約) |

## Bolt 別リスクと緩和

- **Bolt 1**: 最大規模(+195 行+データ再生成)。緩和: TDD 先行(NFR-3)、AC-5 の全ゲートをローカル実測してから push(cid:code-generation:local-lcov-pre-push)、allowlist remap は機械 remap+直読照合(E-FSPBTS13)
- **Bolt 2**: schedule トリガーは本 repo 初(unit-of-work.md U2)。緩和: マージ直後に workflow_dispatch で実測(AC-2)、cron 発火は翌日確認(60日 suspend 仕様は docs 注記 — requirements.md R-3)
- **Bolt 3**: 削除ミスによる ci-success 破壊。緩和: FR-3d 対照表 V-1〜V-8 の機械照合+needs 集合の実読(AC-3)
- **Bolt 4**: 対訳非同期。緩和: en/ja ペア更新をレビュー観点に明記(story map ジャーニー1)

## 撤退経路

各 Bolt は独立 revert 可能(スカッシュ1コミット)。Bolt 3 の revert は benchmark 群を ci.yml へ戻す(perf.yml 側と二重実行になるが安全側)。
