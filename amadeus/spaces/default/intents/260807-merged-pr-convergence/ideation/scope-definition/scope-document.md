# Scope Document — 260807-merged-pr-convergence

上流入力(consumes 全数): `intent-statement`(`ideation/intent-capture/intent-statement.md` — 確定済み裁定 Q1〜Q3・Success Metrics・設計申し送りを In/Out 境界の正本として消費)。feasibility-assessment / constraint-register は本 scope(self-feature)で SKIP のため不在(設計どおり)。

## In(スコープ内)

| # | Capability | 導出元 |
|---|---|---|
| 1 | `pr-convergence-cli.ts` の **MERGED 先行検出**: status / report 両 verb が state=MERGED を retry ループ**前**に検出し短絡する | Q2=A + レビュー B 申し送り |
| 2 | **landed report**: report verb が state=MERGED でマージ着地の事実(mergedAt・merge SHA・`statusCheckRollup` informational)を記録する report を書く。収束の遡及判定はしない | Q1=A + Q3=A |
| 3 | **gh-runner のクエリ拡張**: `PR_STATE_QUERY` に `state`(+ mergedAt / mergeCommit)を追加 | 機序(現行は state を読まない) |
| 4 | **sensor kind 語彙拡張**: `pr-convergence-report-format` の kind 閉集合 `converged | override` に `landed` を追加し、converged 整合検査を同期改修 | レビュー B 申し送り(完了条件) |
| 5 | **plugin stage 文書の更新**: `stages/pr-convergence.md` に landed 経路を記載(override との使い分け) | Mandated(docs 同一変更) |
| 6 | **テスト**: TDD(Red 実測→最小実装)+ 落ちる実証(未マージ PR に landed 経路が発火しない負方向)+ 既存挙動無変更の回帰 | team.md Testing Posture + Issue 完了条件 |

## Out(スコープ外 — 根拠付き)

- **マージ時実績の導出**(branch-protection 照会・required checks 個別照合): Q1/Q3 で棄却(レビュー B の限界3点)。
- **override 経路・未マージ PR の CLEAN 要求・fail-closed UNKNOWN 設計の変更**: Issue 完了条件が「既存挙動不変」を明記。
- **engine 本体(orchestrate / state / artifact guard)の変更**: overlay 機構は既存のまま — landed report が produces を満たせば guard は自然通過。
- **#2403 / #2397**: 別 Issue・別 intent(既決)。

## Walking Skeleton

self-feature の Mandated により、最初の Construction Bolt に walking-skeleton gate を維持する。単一機能・単一 Bolt の見込みのため、Bolt 1 = 全 capability の end-to-end スライス(MERGED 検出 → landed report → sensor PASS)が skeleton を兼ねる。

## 価値ストリーム(要約)

マージ済み PR の unit → report verb(landed)→ per-unit artifact guard 通過 → override 人間裁定往復ゼロ。status 応答は約50秒 → 数秒。
