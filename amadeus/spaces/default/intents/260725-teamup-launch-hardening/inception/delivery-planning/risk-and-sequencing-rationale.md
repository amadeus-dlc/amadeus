# Risk and Sequencing Rationale — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — NFR-3（actas 排他ロック）と FR-7（部分失敗のロールバック）を主要リスクの根拠とした。
- `components.md` — 変更対象コンポーネントを引き、リスクが顕在化する箇所を特定した。
- `unit-of-work.md` — 各ユニットの完了の定義を引き、リスク緩和の検証点と対応づけた。
- `unit-of-work-dependency.md` — 依存辺ゼロと配布同期の交差を引き、順序決定の根拠とした。
- `unit-of-work-story-map.md` — US-2 の順序制約を引き、Bolt 1 内部順序のリスク根拠とした。
- `team-practices.md` — 落ちる実証・配布同期・検証コマンドの実務を、各リスクの緩和手段とした。

測定 ref: HEAD `304bae2eb`。

## 順序の決定根拠

依存辺はゼロ（`unit-of-work-dependency.md`）なので、順序は**優先度と risk-first** で決める（raw WSJF ではない）。

| # | Bolt | 優先度 | 決定理由 |
|---|---|---|---|
| 1 | U1（actas 移行 + 待機設計） | P1 / S2-CRITICAL | #1384 の保護が導入以来不在という状態を最短で解消する。依存制約がないため優先度がそのまま順序になる（`cid:requirements-analysis:priority-vs-dependency`） |
| 2 | U2（worktree 並列化） | P2 | U1 に依存しないが、同一ファイルの配布同期が交差するため直列化する |

### Bolt 1 内部の順序（最重要）

**B-3（検証を `mux_attach` の後ろへ移す）を先頭に置く。**

これは単なる作業順ではなく**リスク制御**である。B-1/B-2（actas 移行）を先に入れると、その時点で `watcher_verification_applies` が真を返すようになり、`mux_attach` の前で実測 32.2秒/1メンバー の待機が発生する。前 intent（PR #1477）が 200.85秒 → 5.87秒 として解消した起動レイテンシ問題が、コミット単位で一時的に復活する窓ができる。

B-3 を先に入れておけば、その窓は存在しない。

## リスク台帳

| ID | リスク | 影響 | 状態 | 緩和 |
|---|---|---|---|---|
| R-1 | 検証再有効化による起動レイテンシの退行 | 前 intent の成果を失う | **設計で封じ済み** | ADR-5（検証を attach 後へ）+ Bolt 1 内で B-3 を先頭に置く。Definition of Done で「アタッチ到達時間が 5.87秒 から悪化しない」を実測確認 |
| R-2 | actas 排他ロックが7メンバー同時起動・resume で競合し起動が失敗する | Bolt 1 が出荷できない | **未検証** | NFR-3 として要件化済み。Bolt 1 の Definition of Done に (a) 7メンバー同時起動、(b) `-c` での再起動 の2実測を含める。`_actas_lock_try_claim`（`lib/actas-lock.sh:106-133`）が所有 sid の生存を確認して stale 再取得を許すため恒久ブロックはしない見込みだが、実測で確認する |
| R-3 | actas の受信範囲制限（`<name>` 宛のみ）が配送を壊す | メンバーがメッセージを取りこぼす | **未検証・低** | チームモードは1 worktree に1ロールしか登録しないため実質同等と見込む。Bolt 1 の実装時に実測確認 |
| R-4 | 並列 worktree の部分失敗でロールバックが壊れ、中途半端な状態が残る | 再実行前に手作業の掃除が要る | **未検証** | feasibility の実験では失敗が発生せず未観測。Bolt 2 の Definition of Done に**失敗注入による実証**を含める |
| R-5 | 定数ブロックの textual conflict | Bolt 2 の rebase で衝突 | **予見済み** | Bolt 2 着手時に union 解消 → 再生成 → 検証再実行（`cid:code-generation:shared-ledger-insert-collision`） |
| R-6 | Linux CI 上の並列度特性が macOS と異なる | 並列度4が最適でない可能性 | **未検証・低** | 実測は macOS のみ。並列度は上限として設計しており、「上限があること自体」が退行（並列度7 = 7.55秒）を防ぐ主目的。CI で明確な劣化が観測されれば実測に基づき見直す |
| R-7 | 消費者の取りこぼしで既存テストが壊れる | CI 赤 | **設計で封じ済み** | `component-methods.md` の2キー棚卸し（変数名 + 展開後リテラル、計11消費者）。実装時に両キーで repo 全域を再 grep する |

## 検証の重み付け

| 検証手段 | 対象リスク | 実施タイミング |
|---|---|---|
| 落ちる実証（`org.md` Mandated） | R-1, R-4, R-7 | 各 Bolt の実装直後 |
| 実 launch 計測 | R-1, R-2, R-3 | Bolt 1 の完了確認 |
| 失敗注入 | R-4 | Bolt 2 の完了確認 |
| `dist:check` / `promote:self:check` | R-5 | 各 Bolt + Bolt 2 の再接地時 |
| 2キー grep | R-7 | Bolt 1 の実装時 |
| `tests/run-tests.sh --ci` | 全般 | 各 Bolt の PR 前 |

## 中断条件

以下が発生した場合、実装を止めてユーザーへエスカレーションする。

- R-2 が顕在化し、actas 排他ロックが7メンバー起動を恒久的に塞ぐ → Q2 裁定 B（別 readiness 指標へ切替）の発動を諮る。
- R-3 が顕在化し、actas の受信範囲制限で配送が壊れる → 同上。
- 承認済みの要件・設計から逸脱する必要に気づいた → その場で逸脱せず報告（`cid:requirements-analysis:implementation-deviation-election`）。
