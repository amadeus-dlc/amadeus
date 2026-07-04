# Performance Test Instructions — 260704-engine-namespace

Test Strategy が Minimal であり、性能 NFR が存在しない（requirements.md の N001〜N005 に性能項目なし）ため、性能テストは対象外である。
変更範囲は `../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照する。

## 対象外の判断根拠

- 変更は改名と参照更新であり、実行時性能特性を変えるコード変更を含まない（N002）。
- parity-check の対応表化による検査時間の増分は CI 連鎖内で数秒未満であり無視できる。

## 将来必要になった場合

CI 連鎖の実行時間が問題になった場合は、検査時間の計測を別 Issue として起票する。
