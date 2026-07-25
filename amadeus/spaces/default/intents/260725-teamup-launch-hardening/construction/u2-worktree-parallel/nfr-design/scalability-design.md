# Scalability Design — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`

- `scalability-requirements.md` — SC-1（メンバー数に対する所要時間）、SC-2（並列度をメンバー数に追随させない）、SC-3（リポジトリ規模への依存）を、下記の実装方針で満たす対象とした。
- `performance-requirements.md` — P-2（並列度別の実測表）と P-3（上限4）を引き、固定値設計の根拠とした。
- `business-logic-model.md` — 並列化後のフロー（4a〜4d）を引き、バッチ境界の挙動を確定した。
- `reliability-requirements.md` — R-1（部分失敗からの回復）を引き、バッチ境界での失敗が回復可能であることを確認した。
- `security-requirements.md` — S-2（並列書込の競合）を引き、並列度を上げても書込が競合しないことを確認した。
- `tech-stack-decisions.md` — 動的並列度を却下した理由を引き、固定値の設計根拠とした。

測定 ref: HEAD `138a60372`。

## 設計方針

**並列度をメンバー数に追随させない。** これが実測から導かれた最も重要な設計判断である。

## D-SC1: 固定上限4

```sh
WORKTREE_PARALLELISM=4
```

| メンバー数 | バッチ構成 |
|---|---|
| 3人 | 3件同時（1バッチ） |
| 5人 | 4件 + 1件（2バッチ） |
| 7人 | 4件 + 3件（2バッチ） |

**メンバー数ぶん fan-out しない。** 実測で並列度7は 7.55秒 と直列 7.39秒 より遅い。

## D-SC2: なぜ追随させないか

「メンバー数ぶん並列にする」が最も自然に見える実装だが、実測では最も遅い。

| 並列度 | 所要時間 | 直列比 |
|---|---|---|
| 1（直列） | 7.39秒 | — |
| 4 | **3.32秒** | **2.23倍速** |
| 7（= メンバー数） | 7.55秒 | **0.98倍（遅い）** |

git が object store で直列化するため、全プロセスがロックを奪い合ってスループットが劣化する。

**この直感に反する事実を設計として明記する。** 記録しないと、後続の変更で「メンバー数に追随させる」案が復活しうる。

## D-SC3: リポジトリ規模への非依存

| 項目 | 内容 |
|---|---|
| 事実 | worktree 作成時間はリポジトリ規模に比例する（本リポジトリでは 1.078秒/個、tracked 11,051ファイル・`.git` 166M） |
| 設計 | 並列度の上限は**リポジトリ規模に依存しない固定値**とする |
| 根拠 | 最適並列度を決めるのは I/O とロックの競合であり、リポジトリ規模ではない |
| 限界 | 実測は本リポジトリ1点のみ。この判断自体が仮説である（RAID R-6） |

## D-SC4: バッチ境界での失敗

5人・7人構成では2バッチになる。1バッチ目で失敗した場合の挙動を定める。

| 項目 | 設計 |
|---|---|
| 1バッチ目で失敗 | **2バッチ目も実行する**（途中で打ち切らない） |
| 理由 | `create_run` の最後に全メンバーの worktree 実在を照合して成否を判定する（`reliability-design.md` D-R4）。途中打ち切りは実装を複雑にし、得られる時間の節約は小さい |
| 回復 | 全バッチ完了後、実在照合で欠落を検知し非ゼロで返る。`handle_exit` → `rollback_prepared_run` が実在走査で全て巻き戻す |

## 対象外

| 項目 | 理由 |
|---|---|
| 8人以上のチーム | `-2` / `-4` / `-6` の3択に限定されている |
| 動的並列度（CPU コア数等） | 実測が macOS のみで動的式の妥当性を検証できない（ADR-4） |
| 複数チームの同時起動時の競合 | `--instance` で分離される既存機能。実測外（RAID R-6 に類する） |
| 水平スケール・ロードバランシング | 常駐サービスの軸であり CLI に該当しない（`cid:nfr-design:c1`） |
