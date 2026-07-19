# Reliability Design — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## エラー設計(Result 単一様式)

reliability-requirements.md の障害耐性要件を次で実現する:

- fallible API(`Election.parse`/`Ballot.parse`)は `Result<T, E>` を返し throw しない。E は理由の判別ユニオン(`BallotError` 5クラス — domain-entities.md:18 の正準名)で、呼び出し元 C6 が指令/exit code へ写像(business-logic-model.md エラー処理節の設計確定)
- 全域関数(shuffleView/tally/canEarlyTally/classifyLate)は素の値を返す — 例外経路ゼロの設計を型シグネチャで可視化

## 決定性の機構設計

- シード = fnv1a(electionId + ":" + voter)、PRNG = mulberry32(tech-stack-decisions.md で確定)。両者とも整数演算のみの決定的実装で、環境依存(ロケール・時刻・プロセス)を持たない(reliability-requirements.md 監査再現性の実現機構)
- observability は N/A(reliability-requirements.md Observability 節の設計反映 — 常駐プロセスなし。決定性による再計算が監査手段)
