# Intent Statement — Team Mode 起動経路の堅牢化（#1476 / #1478）

測定 ref: HEAD `c4c9531ee`。file:line はワークツリー実ファイル直読、agmsg は repo 外 read-only（読取 2026-07-25）。

## 解きたい問題

前 intent `260725-teamup-attach-latency`（PR #1477、マージ済み `8729199589`）は `team-up.sh` の起動を 200.85秒 → 5.87秒 へ短縮した。ただしそれは **watcher arming 検証を既定でスキップする**ことで達成しており、2つの問題が残っている。

### 問題1 — #1384 の保護が機能していない（#1476、P1 / S2-CRITICAL）

`verify_watchers_armed` が待つ ready sentinel を書くのは agmsg の actas モードの watcher だけである（`watch.sh:307`、ガード `:300` の `if [ -n "$ACTIVE_NAME" ]`、`ACTIVE_NAME` は `watch.sh:43` の第4位置引数）。`team-up.sh:104` の初期プロンプト `/agmsg mode monitor` が起動するのは monitor モードの watcher で、`delivery.sh:301` は位置引数を3個しか渡さない。

結果として #1384（fresh 起動メンバーの初期プロンプトが TUI 起動レースで落ち、agmsg monitor が起動しない）に対する保護は**導入以来一度も働いていない**。PR #1477 の適用可否ガードはこの事実を可視化しただけで、保護そのものは不在のままである。

### 問題2 — 起動時間の支配項が worktree 直列作成へ移った（#1478、P2）

`create_run` の `git worktree add` 直列実行が **1.078秒/個**（3回計測 1.153909 / 1.067943 / 1.013304 の平均）。7人構成では直列7個で **7.39秒**（実測）。3人構成の約3.2秒と「5.87秒のうち約55%」は7人実測からの線形按分による**推定**であり未実測。

> **訂正（2026-07-25、nfr-requirements reviewer の指摘）**: 起草時に「1.05秒/個」と記載していたが、実測3値の平均は 1.078秒 であり計算誤りだった。行番号 `:1282` も PR #1477 前の値で、現 HEAD では `:1305`。誤値は Issue #1478 にも伝播しており、同 Issue へ訂正コメントを投稿した。

## 達成したい状態

1. **watcher arming 検証が実際に機能する** — 実 launch で sentinel が書かれ、検証が成功することを実測できる。
2. **起動時間がさらに短縮される** — 現行 5.87秒（3人構成）から worktree 並列化分だけ縮む。
3. **テストが agmsg の実挙動を検証する** — `t-team-up-watcher-arming.test.ts` が sentinel を自前で書く構造（`:42` パス関数スタブ、`:60` 再送時フェイク arming、`:87-91` 事前配置）を解消する。この構造こそが #1449 の欠陥を導入から2日間 CI で見逃した原因である。

## アプローチ（未確定 — feasibility で実測する）

### ユニット1: actas 移行（#1476）

初期プロンプトを `/agmsg mode monitor` から `/agmsg actas <role>` へ移行する。実形は `spawn.sh:358`（verbatim: `ACTAS_PROMPT="${CMD_PREFIX}${CMD_NAME} actas ${NAME}"`）および main の `codex_member_cmd`（verbatim: `prompt="\$agmsg actas $role"`）で確認済み。PR #1477 で追加した適用可否ガードは ` actas ` を含むプロンプト形で真を返すため、移行と同時に検証が自動的に再有効化される。

**構造上の含意**: `CLAUDE_MONITOR_PROMPT`（`:104`）は引数を持たない定数で4箇所から参照される（`:861` init_prompt、`:1094` ガードの `case`、`:1202` 再送、`:1211` 回復ガイダンス）。actas プロンプトは role を要するため **per-member 化**が必要で、member 文脈を持たない `:1094` は書き換えを要する。

**未検証の前提**: actas 移行が `despawn.sh` / `team-msg.sh` / `session-end.sh` の配送セマンティクス、および resume 時の actas 排他ロック（`watch.sh:185` `actas_lock_state` / `:203` `actas_lock_claim`）を壊さないこと。feasibility で実測する。壊すと判明した場合は Q2 裁定 B（monitor モードでも観測可能な別 readiness 指標へ検証対象を変更）へ倒す。

### ユニット2: worktree 並列化（#1478）

`create_run` の `git worktree add` を並列化する。

**未検証の前提**: 並列 `git worktree add` の `.git` 設定ロック競合、部分失敗時のロールバック（現行は `CREATED_MEMBERS` に追記しつつ `handle_exit` トラップで巻き戻す）、エラーの可視性、妥当な並列度。feasibility で実測する。

## スコープ

- **含む**: 上記2ユニット、および `t-team-up-watcher-arming.test.ts` のテスト構造の是正（Q3 裁定 A）。
- **含まない**: `RUNTIME=codex` 経路の同型ギャップ（#1388 が別途扱う）。`MSG_BACKEND=herdr` 経路（monitor を持たないため対象外）。

## 出荷方針（Q1 裁定 A）

2つの Bolt に分け、**ユニットごとに PR を出す**。両者は `team-up.sh` 内で非交差の関数を触る（#1476 = 初期プロンプトと検証経路、#1478 = `create_run`）。#1476 の着地が #1478 の未検証事項の解決に待たされないようにする。

## 完了条件（Q3 裁定 A）

両ユニットが main へ着地し、実 launch で (i) watcher arming 検証が実際に成功する、(ii) 起動時間が現行 5.87秒から短縮される、の両方を実測し、かつテストが sentinel を自前で書く構造を解消したとき。

## リスク

| リスク | 影響 | 緩和 |
|---|---|---|
| actas 移行が配送セマンティクスを壊す | #1476 が実現不能 | feasibility で実測。壊す場合は Q2 裁定 B（別 readiness 指標）へ倒す |
| actas 排他ロックが resume 経路を塞ぐ | `-c` での再開が失敗 | feasibility で resume シナリオを実測 |
| 並列 `git worktree add` が `.git` ロックで競合 | #1478 が実現不能または不安定 | feasibility で並列度を変えて実測。競合するなら並列度を下げるか見送る |
| 検証が再有効化された結果、起動が再びブロックされる | 起動レイテンシの退行（前 intent の成果を失う） | 検証成功時の待機時間を実測し、許容範囲を requirements で数値固定する |

最後のリスクは特に重要である。actas 移行が成功すると `verify_watchers_armed` が実際に走るようになり、**7つの Claude Code TUI のコールドスタート完了までブロックする**構造が復活する。前 intent が解消した問題を再導入しないための待機設計（非同期化、タイムアウト、あるいは `mux_attach` 後への移動）を requirements で確定する必要がある。
