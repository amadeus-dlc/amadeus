# Intent Backlog — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: scope-definition (1.4)

上流入力(consumes 全数): `intent-statement.md`(proto-Unit の分割と優先度はその In 境界・成功指標から導出)。`feasibility-assessment` / `constraint-register` は feasibility ステージ SKIP のため不存在。

## Proto-Units(MoSCoW + 依存順)

| ID | Proto-Unit | MoSCoW | 依存 | 内容 |
|---|---|---|---|---|
| PU-0 | 仕様裁定パック | Must | — | 要件段で裁定3点((a) Free 語彙 (b) §8 緊張一意化 (c) semi 除外契約)+ t415 改訂方針を確定(pinned-behavior クラスにつき要件段で裁定) |
| PU-1 | 正本書き直し | Must | PU-0 | `grilling-protocol.md` を上流骨格逐語+overlay 2層で全面改稿。帰属ヘッダ SHA 記録。骨格逐語の機械照合(diff)手段を同梱 |
| PU-2 | 契約面整合 | Must | PU-1 | stage-protocol §3 Step 3d / §8 / depth 表の改訂、question-budget センサー契約(Free の fail-open 封鎖含む)、t415 明示改訂+回路遮断器・枝刈り列挙の落ちる実証テスト |
| PU-3 | 投影・sweep | Must | PU-1 | `/amadeus-grilling` スキル(Free 既定)、prose 消費者8箇所、docs(hybrid 自然消滅分含む)。`bun run build` + `source-only:check` |
| PU-4 | dogfood 実走 | Must | PU-1..3 | Rust ナレッジ設計議論(10領域)を standalone Free で全分岐完走。刈りノード列挙の実確認 |
| PU-5 | 着地後報告 | Must | PU-1..4 着地 | #2683 へ L2 変更の反映報告コメント、#2785 クローズ判定(close-after-landing-verification) |

Should / Could / Won't: なし — 全能力が SETTLED の Must(#2785 完了条件と1:1)。Won't は scope-document の Out 境界を参照。

## Walking Skeleton

Bolt 1(skeleton)= PU-1 の最小 end-to-end スライス: 正本書き直し+最小テスト整合(t199 green 維持+t415 の暫定改訂)を単独ゲートで通す。以後の Bolt 編成は delivery-planning で確定する。

## 優先根拠

- dependency-first(Q2 裁定)。WSJF/RICE の数値化は不要 — 全 Must・単一系列の依存鎖であり順序は依存関係が一意に決める
- リスク最上位は PU-2 の契約面(t415 逐語 pin・センサー恒常 finding 化)だが、その設計判断は PU-0 で先に裁定するため実装段のリスクは低減される
