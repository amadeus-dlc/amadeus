# Delivery Planning — 明確化質問

**Intent**: 260810-grilling-frontier-resync / **Stage**: delivery-planning (2.8) / **Depth**: Standard

上流入力の消費: Bolt 編成案は `unit-of-work.md`(U1/U2/U3 の完了条件と複雑度)と `unit-of-work-dependency.md`(U2/U3→U1 の2エッジ+運用上の実行順序注記)から導出した。walking-skeleton の対象は `unit-of-work-story-map.md`(スライス1が骨格)に、Bolt 検証内容は `requirements.md`(FR の AC)と `components.md`(規模割付)に依る。

## Q1. Bolt 編成(粒度は intent ごとの設問 — cid:units-generation:c1)

- **A. 1 Unit = 1 Bolt の3本、Bolt 1 = walking skeleton 単独ゲート(推奨)** — Bolt 1 = U1 protocol-core(self-feature の walking-skeleton Mandated。最小 end-to-end = 正本書き直し+t415 暫定整合+t199 green)。ユーザー承認後、Bolt 2 = U2 / Bolt 3 = U3 を並行実装(worktree 隔離、ファイル非交差確認済み。U3 の隔離2回ビルドは最後に直列)。PR は Bolt ごと(スカッシュ、team.md 既定)
- B. 2本に圧縮(U2+U3 を1 Bolt に束ねる) — レビュー焦点が濁る(ts+テスト と docs sweep の混載)
- C. その他(X)

[Answer]: A — 1 Unit = 1 Bolt の3本。Bolt 1 = U1 walking skeleton 単独ゲート、承認後 Bolt 2/3 並行。PR は Bolt ごとスカッシュ。ユーザー承認: 2026-08-10T06:24:31Z(Guide me 構造化質問への直接回答)
