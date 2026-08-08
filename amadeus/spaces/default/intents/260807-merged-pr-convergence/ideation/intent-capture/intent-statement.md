# Intent Statement — 260807-merged-pr-convergence

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし)。入力 = intent 記述(Issue #2401)+ `intent-capture-questions.md` の裁定(Q1〜Q3、承認 2026-08-07T10:04:51Z)。

## Problem Statement(解決するビジネス問題)

pr-convergence plugin は PR 収束を機械観測して report 化するが、convergence 判定が `mergeStateStatus === "CLEAN"` を要求するため、**マージ済み PR(GitHub が mergeable を計算せず恒久 UNKNOWN)では report を機械生成できない**。plugin overlay は code-generation の `produces` に report を必須追加するため、PR 先行マージ運用(本 repo の標準: 人間承認後に squash merge)では毎 intent で workflow が詰まり、唯一の回復経路が `override`(事実に反する converged:false の恒久記録 + 人間裁定往復)になる。

- 実在・機序はクロスレビュー2名の独立実測で確定(predicate.ts:184 の CLEAN 要求 / gh-runner.ts:191-195 が PR state を読まない / MERGED 2件で恒久 UNKNOWN を live 確認)。
- 実測起点: intent 260807-failclosed-recovery-path で 3 unit すべてが override 回復を要した(audit seq 338-345)。

## Target Customer(誰がどう楽になるか)

PR 先行マージ運用をとる Amadeus チーム(conductor / leader)。マージ済み PR しか残っていない unit でも収束実績が機械記録され、override の人間裁定往復と事実に反する記録が不要になる。

## 確定済み裁定(本ステージ Q1〜Q3、承認 2026-08-07T10:04:51Z)

1. **Q1=A**: 事実記録型 verdict **`landed`** — state=MERGED を検出したらマージ着地の事実(mergedAt・merge SHA 等)を記録する。収束の遡及判定はしない(`evaluateConvergence` 単一定義 FR-3b を保存)。
2. **Q2=A**: **report + status の両方**が MERGED を先行検出する(status は retry ループ前に短絡し、マージ済み PR での約50秒の無駄待ちを解消)。
3. **Q3=A**: マージ時 checks 情報は **informational 記録のみ**(`mergeCommit.statusCheckRollup` を参考値として記録、landed の成立条件にしない)。

## Success Metrics(成功指標)

- マージ済み PR に対する `report` verb が landed report を書き、per-unit artifact guard を override なしで通過する(実 PR で実測)。
- マージ済み PR に対する `status` verb が retry 待ちなしで応答する(現行約50秒 → 数秒)。
- `pr-convergence-report-format` センサーが landed report を PASS する(kind 語彙拡張 `converged | override | landed`)。
- 未マージ PR の既存挙動(CLEAN 要求・fail-closed UNKNOWN・override 経路)が無変更(既存テスト green)。

## Initiative Trigger(なぜ今か)

260807-failclosed-recovery-path(2026-08-07)で 3 unit 連続の override 回復が発生し、設計ギャップとして Issue #2401 を起票 → クロスレビュー2名成立(実在確認・訂正1件反映済み)→ ユーザーが対応を指示。

## Initial Scope Signal

`self-feature`(pr-convergence plugin への新機能追加 — 契約の未定義領域への意図的な仕様追加)。変更面の見込み: plugin tools(predicate / gh-runner / cli)+ report-format センサー + plugin stage 文書 + テスト。engine 本体は無変更の見込み(overlay 機構は既存のまま)。

## 設計申し送り(クロスレビューより — 下流ステージで扱う)

- sensor kind 閉集合(`amadeus-sensor-pr-convergence-report-format.ts:69`)の語彙拡張と converged 整合検査(:122-130)の改修を完了条件に含める(レビュー B)。
- `landed` 検出は retry ループより**前**に置く(レビュー B — Q2=A で確定)。
- `statusCheckRollup` は required/optional を区別しない弱い主張(predicate :176-178)— Q3=A の informational 扱いはこの設計と整合(レビュー A)。
