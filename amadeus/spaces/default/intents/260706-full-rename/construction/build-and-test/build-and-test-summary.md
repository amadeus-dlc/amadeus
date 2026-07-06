# build-and-test summary（260706-full-rename）

上流入力: [build-test-results.md](build-test-results.md)

## 要約

全面 rename（aidlc/ → amadeus/、aidlc-state.md → amadeus-state.md、/aidlc → /amadeus、.aidlc-* → .amadeus-*）の検証は全件 GREEN。パリティは写像 8 系統の拡張だけで「写像後 byte 一致」を維持し（例外純増ゼロ）、旧名残存は tree-wide 検査 (e) でゼロを確認。挙動不変（rename 以外の diff ゼロ = reviewer 実測）。

## 判断

gate 承認後に PR 作成（単一 PR、3 段 commit + record）。merge 後は全 worktree 使用者への新 path 周知を leader へ依頼する。
