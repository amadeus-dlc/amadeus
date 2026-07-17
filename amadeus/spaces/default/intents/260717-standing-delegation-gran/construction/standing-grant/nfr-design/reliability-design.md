# Reliability Design — standing-grant(U1)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜S-4)、`../nfr-requirements/scalability-requirements.md`(N/A 反証条件付き)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数構成)

## 設計

- RL-1 実現: GrantVerifier 内の throw は catch して null へ(壊れ行・読取不能は「不在」意味論)— ゲート解決は従来経路へ継続。verb 層の throw は loud(発行時の誤用はブロックが正)— 検査層と発行層で失敗様式を分離
- RL-2 実現: 入力 = シャード内容+now 引数のみ(Date.now は呼び出し元で1回取得して引き渡し — テストが時刻を注入可能)。C-6 で2回実行一致をピン
- RL-3 実現: expiresAtMs 有界(TTL 4h)+revoke 行の優先(同 Grant Id の REVOKED があれば expires 前でも無効)

## 失敗様式の分離

発行拒否(loud)/ 受理不成立(null → フォールバック)/ 検証例外(null へ吸収+従来経路)の3様式を相互代用しない(deployment-execution:c3 の分離原則の設計面適用)。
