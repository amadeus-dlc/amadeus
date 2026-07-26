# Bolt Plan — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## Bolt 列(unit-of-work-dependency.md の DAG どおり直列2本)

| Bolt | Unit | walking-skeleton | 内容 | 出荷(PR) |
|---|---|---|---|---|
| 1 | visualize-skeleton | **対象**(amadeus-feature = skeleton ON) | unit-of-work.md U1: R-1 seam 拡張+CLI `--write`+基本 HTML(チャート・表・SHA title)+中核テスト | Bolt 単位 PR → main スカッシュ |
| 2 | visualize-hardening | 非対象 | unit-of-work.md U2: 劣化強調+サイズガード+`--check`+CI 同乗+docs 日英+残余テスト | 同上 |

## 進行契約

- Bolt 1 は単独・ゲート付き実行: 実装 → 検証(requirements.md AC-1/AC-3/AC-4 一部/AC-7)→ **ユーザーが index.html を実際に開いて確認 → walking-skeleton ゲート承認**(常任グラント対象外)→ PR → マージ承認(no-AI-merge)
- Bolt 1 出荷後、ラダープロンプト(残り Bolt を自律継続 or 全ゲート)をユーザーへ提示し、選択を `Construction Autonomy Mode` として state に永続化(org.md Walking Skeleton)
- 各 Bolt はレビュー READY 時に「Bolt ブランチ切り出し+PR 発行」をタスク化(bolt-pr-taskization)
- worktree: ベース `main`・マージターゲット `main`(org.md Way of Working)

## Bolt 内実行順(リスク制御 — intra-bolt-order-as-risk-control)

- Bolt 1 内は R-1(timeseries export 追加)→ V-1/V-3/V-4/V-6(script 本体)→ T-1/T-2 の順。R-1 を先に置くのは、既存 t230 系が formatValue 昇格で壊れないこと(export 追加は非破壊)を最初に実測で確定し、以降の作業を安定面の上で行うため
- Bolt 2 内は script 増分(V-5/V-7/--check)→ テスト → CI 同乗(C-1)→ docs の順。CI 変更を script+テスト green の後に置くのは、job 赤(main run 失敗)の窓を作らないため — story-map の「維持する」ジャーニーは最後に接続する
