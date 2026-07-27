# Bolt Plan — solo-election

上流入力(consumes 全数): unit-of-work.md(U1/U2 定義と規模)、unit-of-work-dependency.md(U1→U2 依存)、unit-of-work-story-map.md(ジャーニー対応)、requirements.md(FR/AC)、scope-document.md(walking skeleton 裁定)、components.md(Bolt 1 手順 (2)(4)(5) の変更対象・規模の設計正本)、team-practices.md(worktree 分離・PR/スカッシュ運用の現行実践との整合確認)。

## Bolt 列

| Bolt | Unit | 内容 | ゲート |
|---|---|---|---|
| Bolt 1 | solo-election-core(U1) | tally 2体規則+split+TLA 意味論拡張+落ちる実証+regression+solo loop テスト+CLI/model の dist・self-install 同期。**walking skeleton**: 実選挙1件のソロ完走(2-0)+1-1 エスカレーション発火実証 | **単独・ゲート付き**(amadeus-feature の ALWAYS — Bolt 1 承認後に Bolt 2 着手) |
| Bolt 2 | solo-election-surface(U2) | SKILL.md 4節内挿+team.md ソロモード節改定+テンプレ検査テスト+SKILL 面 dist・self-install 同期+EN/JA docs 該当箇所 | 通常ゲート |

## Bolt 内実行順序(リスク制御としての明示 — cid:delivery-planning:intra-bolt-order-as-risk-control)

Bolt 1 内: (1) **落ちる実証を最初に**({5,1}/{4,1}/{1,7} が現行 established になるテストを先に書き赤を確認 — 注入でなく現行挙動の実証なので main 混入リスクなし)→ (2) tally 2体分岐+split 実装 → (3) t234 per-assertion 監査・書換+FR-06 regression → (4) TLA 拡張+TLC 探索(two-layer-verification-posture 発動)→ (5) dist/self-install 再生成 → (6) 実選挙スケルトン実証(2-0/1-1)。この順序は「集計規則が未固定のまま実選挙を回して誤裁定を record に残す」窓を消す。

## マージ方式

org.md どおり Bolt ごとに worktree 分離・PR・スカッシュマージ(ソロでも worktree 分離必須 — cid:code-generation:solo-bolt-worktree-required)。
