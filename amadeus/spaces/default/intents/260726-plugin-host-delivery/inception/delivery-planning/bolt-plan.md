# Bolt Plan — plugin-host-delivery

> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices
> Bolt = Unit = 1 PR(unit-of-work.md の deployable 境界)。unit-of-work-dependency.md の DAG をそのまま Bolt 順序へ写像し、story-map のリリース順 6 段と一致させる。

## Bolt 列

| Bolt | Unit | 内容 | ゲート | 依存 |
|---|---|---|---|---|
| 1 | harness-capability-matrix(U1) | 7 ハーネス実測+能力マトリクス(record 文書 PR) | 通常 | なし |
| 2 | walking-skeleton-claude(U2) | **walking-skeleton Bolt(単独ゲート)** — engine 移設+CLI+claude 投影+claude フック+E2E。着地後にラダープロンプト(残 Bolt の自律/ゲート選択) | **skeleton 単独ゲート** | Bolt 1 |
| 3 | host-projection-all(U3) | 残ハーネス投影+outDir 拒否+--check 編入 | ラダー選択に従う | Bolt 2 |
| 4 | doctor-observability(U5) | doctor plugin 行 | 同上 | Bolt 2 |
| 5 | activation-policy(U6) | ADR-1 案 A 実装(spec-hash advisory+`--single` 撤廃) | 同上 | Bolt 2 |
| 6 | hook-wiring-remaining(U4) | 残面フック+degrade 文書化+実起動テスト | 同上 | Bolt 3 |
| 7 | conformance-suite(U7) | t188 32 ケース追跡表+層別適合テスト+sync レポート欄 | 同上 | Bolt 4, 5, 6 |
| 8 | docs-sync(U8) | 利用者ガイド同期(日英) | 同上 | Bolt 7 |

Bolt 3-5 は Bolt 2 着地後に並行可(worktree 分離、ファイル交差は着手前に実 diff 判定 — c6)。

## walking-skeleton マーカー

Bolt 2 = walking-skeleton(`amadeus-feature` スコープにつき skeleton-on — project.md Mandated)。Bolt 1 は skeleton に先行する調査 Bolt であり skeleton ゲートに含めない(unit-of-work.md の deployable 境界の根拠)。

## Bolt 内実行順のリスク制御(intra-bolt-order-as-risk-control)

- **Bolt 2 内**: (1) engine 移設(C2)+import 更新+既存テスト green を先に確定 → (2) CLI(C1) → (3) claude 投影 → (4) フック配線 → (5) E2E。移設を先頭に置くのは、移設破損(最大の退行リスク — 既存 t252-254 が守る面)を早期に検出し、後続手順が壊れた基盤の上に積まれる窓を消すため
- **Bolt 5 内**: `--single` 要求撤廃は spec-hash 判定の実装+テスト green の後に行う — 撤廃が先行すると「ゲートなしで通常到達可能」な窓が生まれる(FR-7(b) の一時違反を防ぐ)
- **Bolt 7 内**: 追跡表(N-A 根拠含む)を先に確定してからテストを書く — テスト先行だと未対応ケースが暗黙成功扱いになる(FR-8 合否)

## PR・マージ運用

各 Bolt はスカッシュマージ(org.md)。実装は worktree 分離(solo-bolt-worktree-required)。マージは CI green 実測後にユーザー承認(no-AI-merge)。工程記録はチェックポイントコミットで本線へ流し実装 PR に同乗させない。
