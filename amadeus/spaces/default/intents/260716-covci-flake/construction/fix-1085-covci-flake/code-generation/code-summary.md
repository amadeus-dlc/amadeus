# Code Summary — fix-1085-covci-flake

## 上流入力(consumes 全数)

requirements.md、code-generation-plan.md、Issue #1085。

## 要件閉包(実測)

| AC | 結果 | エビデンス |
|----|------|-----------|
| AC-1a(tee 全文・機械抽出・planted 除外) | PASS | 3試行の tee ログ(scratch/covci-attempt-{1,2,3}.log)。ブロック文脈 awk で帰属 |
| AC-1b(PIPESTATUS 非経由) | PASS | ハーネスは `>"$LOG" 2>&1` 直リダイレクト+exit ファイル分離(パイプ不使用) |
| AC-1c(確定値報告) | PASS | 3試行の試行番号・負荷条件・Failed files 実数値・RESULT を表で Issue へ記載 |
| AC-1d(scratch 規律) | PASS | repo 外 scratchpad、`cd ... || exit 1`、record 非汚染 |
| AC-2a(再現時の実名確定) | N/A(根拠) | 3試行とも非再現 — AC-2b 側へ |
| AC-2b(非再現時の機構確定記載) | PASS | Issue コメントに e2e 不成立(:187-192)・mkdtemp 隔離・per-scope 表不在・:673 --debug 限定を確定記載 |
| AC-2c(誤計上仮説の定量検証) | PASS | 素朴 grep: --- FAIL: 0 / RESULT: FAIL 0 / GATE FAILED 3(全て coverage-project-gate ブロック内)— 親 stdout からの「unit1+e2e2」再構成は不能と確定 |
| AC-3a/3b(pre-declared 分岐) | PASS | E-1085-FIX 裁定 A(3/4+後着、提案者推奨一致)— 発動条件付き保留。実装ゼロが裁定どおりの成果。AC-3c(落ちる実証)は新設ゲートなしにつき非適用 |

## 逸脱

なし(裁定待ちの分岐は要件の pre-declared どおり)。

## フォロー

FR-5 執行済み: #1085 を条件付きクローズ(再捕捉手順+機構確定3点を固定、留保どおり)+in-progress ラベル除去(13:37Z)。リポジトリ変更ゼロにつき PR なし。
