# ビジネス概要

## プロダクトと利用者価値

Amadeus は、AI 支援開発を Intent から設計、実装、検証、運用まで追跡可能な AI-DLC として実行する、Bun/TypeScript 製の自己ホスト型フレームワークである。単一の core 正本を Claude Code、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCode の6ハーネスへ投影し、同じ状態機械、監査、ルール、ステージ契約を各実行環境へ届ける。

主要な利用者は、ワークフロー利用者、複数の開発者・エージェントを調整するチーム、フレームワーク保守者である。利用者価値は次の4点に集約される。

- Intent ごとの決定、成果物、承認、監査証跡を永続化する。
- 人間の承認境界を維持しながら、決定的な engine directive で工程を進める。
- core、配布物、self-install 面の drift を機械検査する。
- GitHub Issue を record の最小共有面として使い、チーム内の重複・競合作業を早期に可視化する。

## 主要な業務能力

| 能力 | 責務 | 主な実装面 |
|---|---|---|
| Intent 管理 | Intent の birth、選択、park、完了、再開 | `amadeus-state.ts`、`amadeus-lib.ts` |
| ワークフロー制御 | stage graph に基づく次指令と report 遷移 | `amadeus-orchestrate.ts` |
| 成果物・監査 | record、memory、CodeKB、監査 shard の管理 | `amadeus/`、state/audit tools |
| Construction | Unit/Bolt、worktree、swarm、収束判定 | bolt/worktree/swarm tools |
| 配布 | core と harness 固有資産を6面へ生成 | `scripts/package.ts`、harness manifests |
| 自己導入 | 生成済み機能を開発リポジトリ自身へ投影 | `scripts/promote-self.ts` |
| Issue ミラー | Intent の create、sync、close、status | `amadeus-mirror.ts`、mirror skill |
| 品質保証 | typecheck、lint、tests、coverage、drift guard | CI、`tests/`、package scripts |

## 今回の焦点: mirror 三モード

観測コミット `2126ec1144a6fd0808021d7c386c1afbfdea6ae2` では、`auto-mirror` は boolean、既定値は `false` である。`true` が自動化するのは既存 Issue の phase 境界 sync に限られ、create と close は自動ライフサイクルへ接続されていない。このため設定名と利用者が期待する自動化範囲が一致していない。

承認済み Intent `260724-mirror-auto-modes` は、次の利用者契約へ置き換える。

| モード | create | sync | close |
|---|---|---|---|
| `off` | 発火しない | 発火しない | 発火しない |
| `prompt` | 操作前に確認 | 操作前に確認 | 操作前に確認 |
| `auto` | Intent Capture 承認直後 | phase 完了、park、workflow 完了 | 最終 sync 成功後、安全条件を満たす場合のみ |

未指定時は `prompt` とし、旧 boolean は暗黙変換せず設定エラーにする。GitHub 障害は workflow を停止させず、未同期状態と警告を残し、次の適格境界で再試行する。

## 成功条件と境界

成功には、3モードの意味が config、engine、state、GitHub 操作、全ハーネス配布物、日英ドキュメントで一致することが必要である。特に、Issue 作成成功後のローカル state 書込み失敗で重複 Issue を作らないことと、Amadeus が当該 Intent 用に作成した Issue だけを自動 close できる provenance が必須条件である。

GitHub 以外の tracker、boolean 互換 shim、stage ごとの sync、外部作成 Issue の自動 close、逆同期、daemon、新規クラウド基盤は対象外である。
