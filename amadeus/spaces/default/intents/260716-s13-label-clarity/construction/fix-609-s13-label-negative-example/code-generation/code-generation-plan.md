# Code Generation Plan — fix-609-s13-label-negative-example

- Issue: #609(§13 学習候補の選択肢が内部 ID 単独表示 — 仕様は L960 で既定済み、LLM 逸脱の抑止が対象)
- 実装: worktree 隔離 builder(bolt/fix-609-s13-label-negative-example、base origin/main 43dcab5db)

## 方針

仕様変更ではなく契約内例示の追加: 正本 stage-protocol.md §13 Step 3 の label 規定文直後に否定例1文(Issue 実観測形 `Persist c5 only (Recommended)` を verbatim 素材)を追記(AC-1a/1b/1c — 肯定形無改変・配置一意)。t86 に核文字列存在 assertion を追加してリグレッションピン(AC-3d、org.md Testing Posture)。

## 検証計画

package.ts+promote:self 全ツリー同期 → dist:check/promote:self:check/typecheck/lint exit 0 → AC-3a 8ツリー grep 機械再計算 → AC-3b 実装時再列挙+専用5ファミリ実行 → smoke green → 削除注入の落ちる実証(新 assertion)。
