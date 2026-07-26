# Risk and Sequencing Rationale — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 順序の根拠(リスク駆動)

1. **skeleton 先行(Bolt 1 = U1)**: 最大リスクは「SVG 生成という repo 先例ゼロの新設面」(components.md Reuse Inventory の新設3件)。これを最小構成で最初に end-to-end 実証し、ユーザーが実物(index.html)を見た上で残りを承認する — walking-skeleton の本義
2. **CI 同乗は最後(Bolt 2 末尾)**: requirements.md FR-5 の CI 変更を script+テスト green の後に置き、metrics-snapshot job を赤くする窓を構造的に消す(bolt-plan.md の Bolt 内実行順)。前 intent 群の教訓(unverified-raid-is-live-risk — 未実測領域で CI が落ちる)に対し、CI 接続前にローカルで `--write`/`--check` の全検証を済ませる
3. **R-1 を Bolt 1 先頭に**: 既存 t230 系への非破壊性(export 追加のみ)を最初に実測確定(bolt-plan.md 実行順の根拠)

## リスクと緩和(ideation raid-log の継承+delivery 段の追加)

| リスク | 緩和 | 検証時機 |
|---|---|---|
| R1(HTML 肥大) | FR-6 サイズガード(U2)。U1 時点は実測123件=193KB で余裕 | Bolt 2 |
| R2(スキーマ進化) | データ駆動表示(FR-3)+parseSnapshot 共有 | Bolt 1 |
| R3(CI 干渉) | 挿入位置固定(retention 後・commit 前)+Bolt 2 末尾配置 | Bolt 2 |
| 新規: SVG 品質(見た目が使い物にならない) | Bolt 1 の walking-skeleton ゲートでユーザー実物確認 — 不満なら Keep/Modify/Redo | Bolt 1 ゲート |
| 新規: 既存テスト退行(R-1 の export 追加) | Bolt 1 冒頭で t230/t231 のベースライン green を実測してから着手 | Bolt 1 |

## 未実測の明示(no-silent-scope-narrowing 対応)

- AC-6 の「着地後 main run 観測」は Bolt 2 PR マージ後にのみ実測可能 — マージ後の main push run の metrics-snapshot job green+bot PR に index.html が同乗することの確認までを Bolt 2 の完了条件に含める(先送りしない)
