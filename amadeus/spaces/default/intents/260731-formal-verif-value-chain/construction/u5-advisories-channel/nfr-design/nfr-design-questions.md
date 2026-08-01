# NFR Design — 質問票(0問様式、unit: u5-advisories-channel)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 選挙不要判定(E-OC1 証跡)

- 判定: 質問 0 問。NFR は requirements.md の NFR-1〜5 で確定済みで、本 unit の NFR 設計はその機械的な unit 面展開=執行クラス(根拠種別: 既決裁定からの一意導出、1問1行)。**consumes の不在について**: stage frontmatter の requirements 系5件は self-feature スコープが nfr-requirements を SKIP するため engine directive で consumes_absent(expected: true = 設計上の不在)と解決される — fallback として requirements.md の NFR 節を上流とする(u1 ND reviewer iteration 2 で機構ごと追認済み)。
- ユーザー承認: 2026-07-31T12:40:41Z(0問方針の一括承認 — 同型判定)

## 裁定の記録

- 0問方針(既決 NFR の unit 面展開)で成果物生成へ進む。
- ユーザー承認: 2026-07-31T12:40:41Z
