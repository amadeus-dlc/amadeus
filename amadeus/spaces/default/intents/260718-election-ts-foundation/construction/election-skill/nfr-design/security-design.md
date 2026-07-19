# Security Design — election-skill(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 語彙境界の設計(中核)

security-requirements.md の要件を次で実現する:

- 禁止語彙集合は business-rules.md BR-K1 の4カテゴリ(GoA 集計規則・閾値・シャッフル手順・開票分岐の規則文)を canonical 定数として検査テスト内に1定義(tech-stack-decisions.md — 複数箇所への手書き複製禁止)
- SKILL.md は4節構造(起動/転送/人間委譲/終了 — business-rules.md BR-K3)のみで構成し、判断点は人間委譲節に集約(BR-K4 の自動解決語不在検査が対)
- subagent 実演のプロンプト構成は「SKILL 本文+ツールパスのみ」(business-logic-model.md 実演層)— 選挙ノルム cid 群を含めない構造をプロンプト生成関数の入力制限で保証

## 配置境界

- contrib/skills/ 配置(到達ハーネス Claude/Codex の2経路実測は **security-requirements.md 配置と到達面節** — reviewer Critical 是正: scalability-requirements.md への取り違えを訂正)— 配布面(dist/)への投影なしを performance-requirements.md の常設負荷なしと合わせ、フレームワーク面への影響ゼロ(reliability-requirements.md の CI 非常設と同根)
