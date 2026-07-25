# Performance Design — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`

- `performance-requirements.md` — P-1（7人で 3.3秒前後）、P-2（並列度と時間の実測表）、P-3（上限4）、P-4（起動全体への寄与）を、下記の実装方針で満たす対象とした。
- `business-logic-model.md` — 並列化後のフロー（4a〜4d）と、台帳をやめる理由を引き、実装構造の根拠とした。
- `scalability-requirements.md` — SC-2（並列度をメンバー数に追随させない）を引き、固定上限の設計根拠とした。
- `reliability-requirements.md` — R-6（失敗の伝播）を引き、並列実行でも終了コードを集約する必要を確認した。
- `tech-stack-decisions.md` — 「bash のジョブ制御で賄える範囲、外部ユーティリティ不要」を引き、実装手段を確定した。
- `security-requirements.md` — S-2（並列書込の競合）を引き、メタデータ書込がサブシェル内で安全である根拠を確認した。

測定 ref: HEAD `138a60372`。

## 設計方針

**同時実行数に上限を設けた並列化**。無制限 fan-out は退行するため、上限そのものが設計の中心になる。

## D-P1: 並列度4のバッチ制御

bash のジョブ制御（`&` / `wait`）で実装する。外部ユーティリティは導入しない。

```
WORKTREE_PARALLELISM=4

各メンバーについて:
  サブシェルで worktree 作成 + メタデータ書込 を起動（&）
  起動したジョブ数が WORKTREE_PARALLELISM に達したら wait
全ジョブの完了を待つ（wait）
```

**7人構成の挙動**: 4件同時 → wait → 3件同時 → wait の2バッチ。

## D-P2: 期待値

| 構成 | 現行（直列） | U2 後 | 出典 |
|---|---|---|---|
| 7人 | **7.39秒** | **3.3秒前後** | 実測（feasibility の並列度スイープ） |
| 3人 | 約3.2秒 | 約1.6秒 | 推定（7人実測からの線形按分。未実測） |

**受け入れ基準は7人構成の実測値のみ**で判定する（`cid:nfr-requirements:estimates-not-acceptance-criteria`）。

## D-P3: 上限を超えない保証

| 項目 | 内容 |
|---|---|
| 要求 | 同時実行数が `WORKTREE_PARALLELISM` を超えない（P-3） |
| 実装 | 起動したジョブ数をカウントし、上限に達したら `wait` で全完了を待つ |
| 検証 | 実装構造の検査（カウンタと `wait` の存在）、または実行中のプロセス数観測 |

**バッチ方式（上限に達したら全完了を待つ）を採る。** ジョブが1つ終わるたびに次を投入する方式（ジョブスロット制）より遅くなりうるが、bash での実装が単純で、実測の 3.32秒 はバッチ方式で得た値である。

## D-P4: 定数の設計

```sh
# Measured on this repo (11,051 tracked files, .git 166M), 7 worktrees:
# serial 7.39s / 2 -> 4.88s / 3 -> 4.03s / 4 -> 3.32s / 7 -> 7.55s.
# Concurrency 7 is slower than serial: git serialises on the object store,
# so an unbounded fan-out thrashes. 4 is the measured optimum.
WORKTREE_PARALLELISM=4
```

実測根拠をコメントで定数の直上に記す（`cid:requirements-analysis:constants-from-code`）。

## 対象外の最適化

| 項目 | 理由 |
|---|---|
| `create_run` の手順1〜3 | 変更対象外。実測でも支配的でない |
| git 自体の worktree 作成速度 | 外部依存。並列化で**重ねる**のが解 |
| ジョブスロット制（1つ終わるごとに次を投入） | バッチ方式で実測 3.32秒 が出ている。複雑さに見合う改善が確認されていない |
| 動的並列度 | 実測が macOS のみで妥当性を検証できない（ADR-4） |
