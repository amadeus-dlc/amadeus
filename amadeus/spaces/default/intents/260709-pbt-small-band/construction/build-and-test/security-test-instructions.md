# Security Test Instructions — pbt-small-band

- audit-escape(B4)は監査ログの forged-entry 防御に関わる: P-AE2(escape 出力の一行不変条件)が t204 で恒久固定、t111 の既存防御 83 pass 維持
- 生成器はスマートコンストラクタ経由のみ(brand 型の無効状態を作らない — parse-don't-validate 維持)
- 依存追加は fast-check(devDependencies のみ、出荷物へのランタイム依存なし — dist:check/promote:self:check で機械保証)
