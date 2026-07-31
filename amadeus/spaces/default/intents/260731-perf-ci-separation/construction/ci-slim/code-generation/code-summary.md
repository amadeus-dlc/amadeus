# Code Summary — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U3 FD)、code-generation-plan.md

実装 branch: `bolt-ci-slim`(PR #1855、マージ着地 2b1490261)。コミット: 575ae78b9(3 job 削除 69行・追加0)/ 62ce40437(pin テスト再固定)/ 957ae2ee6(needs 8項の構造化 assert)。

## 実装内容

- 削除: distribution-benchmark(:224-253)/ aggregate(:255-277)/ release-gate(:279-291)— domain-entities.md の台帳どおり、追加行 0
- 逸脱プロトコルの実演: ci.yml を pin する2テスト(t222 / formal-verif baseline)の赤を builder が実装前停止で報告 → conductor 裁定(承認済み FR-3 の機械的帰結 = 執行クラス)→ t222 repin+negative pin 新設、baseline は normalizedCiBaseline 実行出力から再生成
- レビュー強化(CodeRabbit Major): ci-success needs 8項の Set 厳密一致+distribution-contract 実在の構造化 assert(ブロッキング依存の削除も loud に)

## 検証

AC-3 grep 4→0(ci.yml 限定)/ needs 前後 diff 空 / yaml parse 0 / --ci 675 files green / typecheck・lint・dist:check・promote:self:check・registry・complexity 全 0。落ちる実証2件: (i) benchmark job 注入で negative pin のみ赤(注入非コミット・cmp 復元確認) (ii) scratch copy の needs 1項削除で新 assert 赤。FR-3d 対照 V-1〜V-6 を PR 本文に記載。patch-gate はローカル dirty 前提拒否のため CI 側で確定(green)— 偽 PASS 報告なし(builder 申告)。
