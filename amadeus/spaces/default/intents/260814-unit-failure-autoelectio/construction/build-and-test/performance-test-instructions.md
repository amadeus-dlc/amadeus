# Performance Test Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 適用判定

性能目標、負荷条件、レイテンシ閾値を定めるNFRはなく、変更対象は短命なローカルCLIの失敗分岐である。専用のload / stress / soak testは適用しない。

## 回帰確認

CIのtest-size reportとwall-clock driftを観測対象とする。今回のrunでは性能ゲート化された新規回帰はなく、既存の重いテストは通常のCI範囲で完了した。
