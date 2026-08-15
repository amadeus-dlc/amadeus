# Integration Test Instructions — intent 260814-open-bug-batch-6

- 上記 t3062 / t3026 / t3028 は integration 層(各 Bolt PR で Red→Green の落ちる実証済み — 各 unit の code-summary を正とする)
- #3031(worktree-gc)は是正 0 件の判定 unit(対称面 #3088 起票で閉包)、#3032 は調査 unit(機序確定・#3099 系へ接続)— 追加テストなし
- フルスイート: 各 PR 着地時の CI green + 現 main(b9615ffb8 断面)の CI green を正とする
