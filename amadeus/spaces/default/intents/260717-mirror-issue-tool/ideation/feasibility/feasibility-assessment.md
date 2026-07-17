# Feasibility Assessment — amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md(intent-capture)

## Technical Viability(技術的実現性)

**評価: 実現可能(高確度)。** intent-statement.md の成功指標3点はすべて既存原語の組み合わせで達成できる。

| 前提 | 実測結果(2026-07-17、measurement ref: worktree HEAD) |
|---|---|
| gh CLI 認証 | `gh auth status` = j5ik2o(keyring)ログイン済み |
| Issue 編集権限 | 本日 #1157 のタイトル・本文編集を実行済み(実証) |
| 状態源: workflow 集計 | `bun .claude/tools/amadeus-runtime.ts summary --json` が workflow_id / scope / by_phase(phase 別 total/approved/pending)/ stages を返すことを実測 |
| 状態源: intent 台帳 | intents.json は配列で slug / dirName / scope / status("in-flight" 等)を保持(実測) |
| ランタイム | bun + gh のみ。配布フレームワークへの runtime dependency 追加なし(Bun-only 前提を維持) |

## Risk Analysis(リスク分析)

- **中**: park 状態の機械可読な取得 — summary --json のキーには park 表現がなく、amadeus-state.md の Current Status 節(prose 寄り)に依存しうる。design 段で「どのフィールドを状態行の正とするか」を確定する(raid-log R1)
- **低**: gh の一時的失敗(ネットワーク/レート) — sync は冪等な本文書き換えのため再実行で回復
- **低**: ミラー Issue の手編集との衝突 — 同期は record → Issue の一方向であり、ツールが上書きする契約をノルム(PR #1159)が明文化済み

## Support Perspectives(支援エージェント観点)

- **aws-platform**: 対象外 — 本ツールはクラウド資源を一切使わない(ローカル CLI + GitHub API のみ)。AWS ランドスケープ評価は N/A(反証可能な根拠: intent-statement のスコープ感に infra 要素なし)
- **compliance**: 規制要件なし。取り扱うのは公開リポジトリの Issue メタデータのみで、秘密情報・個人データの新規取り扱いを追加しない。認証はローカルの gh keyring に委譲(トークンをコードに持たない)
