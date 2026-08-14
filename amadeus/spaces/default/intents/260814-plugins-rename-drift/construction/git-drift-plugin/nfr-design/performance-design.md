# Performance Design — git-drift-plugin

上流入力: `functional-design/business-logic-model.md`(スロットル判定 step 2)。nfr-requirements は SKIP(expected 不在)— 性能要件の正本は requirements.md NFR-1(定性)。

## レイテンシ設計

- 支配項は `git fetch`(ネットワーク)。スロットル(`fetch-throttle-seconds`、default 600)で高々 10 分に 1 回へ抑制し、それ以外の発火はローカル判定(rev-list/diff/status — 小リポジトリで数十 ms 級)のみ。
- fetch には timeout を適用(fetch のみ — domain-entities の確定基準で code-generation 段に値を確定)。timeout 超過は fail-open skip。
- 数値目標は要件に宣言されていないため、ベンチマークは生成しない(NFR-1 / cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。検証は skip 経路のカウンタ/タイミングシーム(port 注入)+ 実 fetch 所要時間の 1 回実測(NFR-1 検証)で行う。

## リソース設計

- センサーは単発プロセス(常駐なし)。fetch の同時多重は throttle 記録(workspace 単位)で自然に抑制される。メモリはファイル一覧(diff --name-only)の線形量のみ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T09:03:51Z
- **Iteration:** 1
- **Scope decision:** none

5成果物はbusiness-logic-modelのアルゴリズム・fail-open契約と整合し、NFR-1定性維持と非該当理由の明記も確認、ブロッカーなし

### Findings

- FOLLOW-UP | performance-design.md の fetch-throttle-seconds default 600 の出典が本審査の consumes 範囲内に見当たらない。settings スキーマ正本への出典参照を成果物内に一言添えることを推奨
- FOLLOW-UP | 上流 business-logic-model.md 末尾の Review セクション最終記録は verdict=NOT-READY(Iteration 2, BLOCKER)のままだが本文 step 2a は修正済み。functional-design 側の再承認状態(人間承認による上限超過裁定 2026-08-14)を別途確認することを推奨
