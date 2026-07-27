# Performance Test Instructions

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md

## 選定根拠(比例選定)

requirements.md の NFR-4(CI 予算)と FR-5 合否3(実行時間の実測固定)のみへ trace する(戦略名による機械追加はしない — cid:build-and-test:bt-proportional-selection)。code-generation-plan.md Step 6-4(E2E 実行時間の実測記録)と code-summary.md の実測値(0.76秒)を検証対象とする。負荷試験・ベンチマークは承認 NFR に不在のため生成しない。

## 実測基準

- E2E 実行時間: journey 本体 **0.76秒** / ファイル全体 0.85〜0.95秒(builder+conductor+reviewer の3独立実行の一致帯)。受け入れは実測値+暴走ガード(180秒タイムアウト)で、推定値を基準にしない(cid:nfr-requirements:estimates-not-acceptance-criteria)
- CI クリティカルパス: `plugin-conformance-e2e` は既存ジョブと並行実行のため実質延長なし(NFR-4)

## PENDING(閉包条件つき)

CI 実機での job duration の実測は PR 初回 CI 実行で確定する(閉包条件: PR CI green+duration 記録。cid:deployment-execution:c3 の PENDING 分離に従い PASS と相互代用しない)。
