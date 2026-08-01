# NFR Design — 質問票(0問様式、unit: u1-runner-relocation)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 選挙不要判定(E-OC1 証跡)

- 判定: 質問 0 問。NFR は requirements.md の NFR-1〜5 で確定済みで、本 unit の NFR 設計はその機械的な unit 面展開=執行クラス(根拠種別: 既決裁定からの一意導出、1問1行)。**consumes の不在について**: stage frontmatter の performance/security/scalability/reliability-requirements・tech-stack-decisions は、本スコープ(self-feature)が nfr-requirements を SKIP するため engine directive で `consumes_absent`(`expected: true` = 設計上の不在)と解決されている — stage-protocol の規定どおり fallback として requirements.md の NFR 節を上流とする(欠落成果物の内容は発明しない)。センサーは実在 consumes のみ照合する設計(amadeus-sensor.ts:210-213)で偽陽性ではない。
- ユーザー承認: 2026-07-31T12:40:41Z(AskUserQuestion「FD 全 8 unit を 0問で進める」の一括承認は FD ステージ対象 — nfr-design も同じ既決 NFR の展開のため同型判定。真の未決が生じた場合は個別エスカレーション)

## 裁定の記録

- 0問方針(既決 NFR の unit 面展開)で成果物生成へ進む。
- ユーザー承認: 2026-07-31T12:40:41Z
