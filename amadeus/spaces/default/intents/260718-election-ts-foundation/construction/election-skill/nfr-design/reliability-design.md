# Reliability Design — election-skill(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 検査の信頼性設計(中核)

reliability-requirements.md の両側実測+vacuity guard を次で実現する:

- 正例 fixture(転送ループのみの正当 SKILL 本文)で green+規則文注入 fixture で赤(business-rules.md BR-K2 — corpus-sweep-for-new-guards の両側)。注入は実行時に消費される検査対象文字列へ行う(inject-runtime-consumed-lines)
- vacuity guard: 定型ヘッダのみの入力で検査が空文化しないことをピン(business-rules.md 落ちる実証節 — vocabulary-collision-vacuity-guard の写像)。検査述語は SKILL.md の定型句(節見出し等)と禁止語彙の交差を持たない語彙設計(security-requirements.md の4カテゴリ集合と対)
- 落ちる実証は赤の実測→revert を1セットで実施(falling-proof-injection-one-set — nfr-requirements 段の帰属注記どおり FD 段追加の検査品質要求)

## 実演層の信頼性境界

- subagent 実演は非決定的につき CI 非常設(business-logic-model.md ADR-6 (ii)— performance-requirements.md の1回実行と一体)。常設保証は U5 機械実行器が担う分離を維持(scalability-requirements.md の非スケール設計と同根)。observability は N/A(常駐なし)。実演の証跡は record へ成果物として保存(tech-stack-decisions.md の実演層行)
