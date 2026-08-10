# Scope Definition — 明確化質問

**Intent**: 260810-grilling-frontier-resync / **Stage**: scope-definition (1.4) / **Depth**: Standard

## 確定済み境界(質問しなかった範囲とその出典)

上流入力 `intent-statement.md` と #2785(クロスレビュー済み本文)により、能力目録13項目は**全件 SETTLED**: (1) grilling-protocol 全面書き直し(上流骨格 `1495d014` 逐語+overlay 分離) (2) depth = 枝刈り閾値の再定義 (3) Free モード(standalone 既定 — 語彙上の実現形のみ要件段未決) (4) 回路遮断器 (5) 刈ったノードの合意サマリ列挙 (6) frontier ラウンドと質問ファイル・監査契約の annex 写像 (7) stage-protocol §3 Step 3d / §8 / depth 表の整合改訂 (8) question-budget センサー契約改訂 (9) t415 の明示改訂 (10) `/amadeus-grilling` スキル改訂 (11) prose 消費者 sweep + docs(hybrid 残存は自然消滅分のみ同梱 — intent-capture Q3 裁定) (12) dogfood 実走 = Rust ナレッジ議論(同 Q2 裁定) (13) 着地後の #2683 反映報告(同 Q1 裁定)。

よって scope-boundary 質問(最小価値スコープ / must-have vs nice-to-have)は**省略**した — SETTLED 境界への縮小提案は仕様変更でありユーザー専権(ステージ規定 Step 3)。以下は operational 3問のみ。

## Q1. 能力間の依存関係(operational)

- **A. 正本先行の4層依存を採用(推奨)** — grilling-protocol 書き直し(正本)→ 契約面(stage-protocol 整合・question-budget・t415)は正本文言の確定に依存 → スキル・prose・docs 投影 → dogfood 実走は全着地後。要件段の裁定3点((a) Free 語彙 (b) §8 緊張 (c) semi 除外)は正本着手前の前提
- B. 契約面(t415・センサー)を先に改訂して正本を追従させる
- C. その他(X)

[Answer]: A — 正本先行の4層依存(要件段裁定3点 → 正本 grilling-protocol → 契約面 → 投影 → dogfood)。ユーザー承認: 2026-08-10T03:55:33Z(Guide me 構造化質問への直接回答)

## Q2. シーケンシング方針(operational)

- **A. dependency-first(推奨)** — 上記依存の根元から順に。walking-skeleton(self-feature 必須)は Bolt 1 で「最小の骨格置換 end-to-end(protocol 書き直し+最小テスト整合)」を通してから残りへ広げる
- B. risk-first — 契約面(t415/センサー)の破壊リスクを最初に検証
- C. value-first — standalone Free(最短で使える価値)を先に出す
- D. その他(X)

[Answer]: A — dependency-first。walking-skeleton Bolt 1 = 最小の骨格置換 end-to-end(protocol 書き直し+最小テスト整合)。ユーザー承認: 2026-08-10T03:55:33Z(Guide me 構造化質問への直接回答)

## Q3. ハードデッドライン(operational)

- **A. なし(推奨)** — Rust ナレッジ議論(次作業)は本 intent の完了を待つ依存であって期限ではない
- B. ある(具体日時を X で指定)
- C. その他(X)

[Answer]: A — ハードデッドラインなし。Rust ナレッジ議論は完了待ちの後続依存。ユーザー承認: 2026-08-10T03:55:33Z(Guide me 構造化質問への直接回答)
