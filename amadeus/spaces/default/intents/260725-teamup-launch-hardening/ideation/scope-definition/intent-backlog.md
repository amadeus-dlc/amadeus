# Intent Backlog — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/constraint-register.md`

- `intent-statement.md` — 「達成したい状態」3項目を backlog の価値単位へ分解する起点とした。
- `feasibility-assessment.md` — U1 の必須条件（待機設計）を B-3 として独立項目に切り出し、U2 の並列度上限を B-6 の受け入れ基準に反映した。
- `constraint-register.md` — C-18〜C-21 の実測値を各項目の受け入れ基準の数値source とした。

優先度は dependency と risk-first で決める（raw WSJF ではない）。U1 は P1/S2-CRITICAL、U2 は P2 だが、**U1-3（待機設計）は U1-1（actas 移行）の前提**であり、順序は依存で決まる。

## Bolt 1 — U1: actas 移行と待機設計（#1476）

| ID | 項目 | 優先 | 依存 | 受け入れ基準 |
|---|---|---|---|---|
| B-1 | `CLAUDE_MONITOR_PROMPT` の per-member 化 | Must | — | 4参照点（`:104` / `:861` / `:1094` / `:1202` / `:1211`）がすべて role を解決できる。member 文脈を持たない `:1094` のガードが書き換えられている |
| B-2 | 初期プロンプトを `/agmsg actas <role>` へ移行 | Must | B-1 | 実 launch で ready sentinel が全メンバー分出現する。`delivery.sh set monitor`（`:877-879`）は既存のまま維持される（C-1） |
| B-3 | **検証を `mux_attach` の後ろへ移す** | Must | — | `mux_attach` までの経路に arming 待機が存在しない。実 launch のアタッチ到達時間が 5.87秒 から悪化しない |
| B-4 | exit code の意味づけ再設計 | Must | B-3 | 検証結果が呼び出し元へ到達する経路が定義され、対話的アタッチに飲み込まれない。no-silent-success を満たす |
| B-5 | テスト構造の是正 | Must | B-2 | `t-team-up-watcher-arming.test.ts` が sentinel を自前で書く構造（`:42` パス関数スタブ / `:60` フェイク arming / `:87-91` 事前配置）を解消し、agmsg の実挙動に対して検証する |

**Bolt 1 のリスク**: B-3 を欠くと前 intent の成果を失う（C-17）。B-3 は B-1/B-2 と独立に実装できるため、**先に着手して退行を構造的に防ぐ**。

## Bolt 2 — U2: worktree 並列化（#1478）

| ID | 項目 | 優先 | 依存 | 受け入れ基準 |
|---|---|---|---|---|
| B-6 | `create_run` の `git worktree add` を並列化（固定上限4） | Must | — | 7個の作成が 3.3秒前後（直列 7.39秒 に対し）。上限4を超えて fan-out しない（並列度7は 7.55秒で退行 — C-6） |
| B-7 | 部分失敗時のロールバック | Must | B-6 | 並列実行下で成功集合が正しく集約され、`handle_exit` が巻き戻せる。**失敗注入で実証**する（実験では失敗ゼロのため未観測 — RAID R-4） |
| B-8 | 失敗メンバーの可視性 | Must | B-6 | どのメンバーの worktree 作成が失敗したかが loud に特定できる（並列実行では stderr が交錯する） |

## 共通（両 Bolt）

| ID | 項目 | 優先 |
|---|---|---|
| B-9 | 正本 + dist 6面 + self-install 4面 = 11コピーの同期 | Must |
| B-10 | 検証5コマンドの通過 | Must |
| B-11 | 落ちる実証 | Must |

## Won't（本 intent では実装しない）

| 項目 | 理由 |
|---|---|
| agmsg 側の変更 | 外部依存（C-5） |
| codex 経路の同型ギャップ | #1388 |
| herdr backend 経路 | monitor 不在で対象外 |
| 動的並列度（CPU コア数ベース） | 実測が macOS のみで妥当性未検証（feasibility Q2 = A） |
| `WATCHER_READY_TIMEOUT` / `WATCHER_RESEND_MAX` の値の最適化 | B-3 により待機がアタッチを妨げなくなるため従属的 |

## 持ち越しリスク（requirements / nfr で扱う）

| ID | 内容 |
|---|---|
| R-2 | actas 排他ロック（`template.md` step 4 は `status=held` で abort）が7メンバー同時起動・resume で競合しないか |
| R-3 | actas の受信範囲制限（`<name>` 宛のみ）が配送を壊さないか |
| R-4 | 並列 worktree の部分失敗時のロールバック（B-7 で実証する） |
| R-6 | Linux CI 上での並列度特性 |
