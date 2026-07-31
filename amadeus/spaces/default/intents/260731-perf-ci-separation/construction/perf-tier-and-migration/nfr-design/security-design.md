# Security Design — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md(U1 FD)。nfr-requirements 5成果物は本 scope(self-feature)で同ステージ SKIP のため設計上不存在(engine の consumes_absent expected:true)— fallback として requirements.md の NFR 節と #1830/#1835 実測を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 脅威面の評価

- 本 Unit の変更面(tests/、run-tests.ts、coverage データ)は secrets・認可・外部送信を持たない — 新規攻撃面ゼロ
- business-logic-model.md ロジック2 の移設は既存テストコードの再配置のみ(新規実行権限・新規依存なし。Forbidden: runtime dependency 追加なしを維持)

## 検証

- `bun run lint`(Biome)と既存の t258-boundary-guard(出荷境界契約)が green を維持することで境界不変を機械確認
