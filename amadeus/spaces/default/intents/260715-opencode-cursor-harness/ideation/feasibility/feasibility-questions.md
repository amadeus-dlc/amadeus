# Feasibility — 明確化質問

intent: `260715-opencode-cursor-harness`(Issue #626)
起草: 2026-07-16 / conductor e3(amadeus-architect-agent ペルソナ)

> **選挙不要判定(E-OC1 3段順序、記入は leader 承認後)**: 起草時の既決照合の結果、以下6問はすべて既決ノルム・上流成果物(intent-statement)・実測(リポジトリ実読/公式ドキュメント照会)に帰着すると判定し、根拠種別を leader へ申告済み。真に未決の設計判断(配布形の細目・完了境界の細部)は scope-definition / application-design へ持ち越し、本ステージでは問わない。
>
> 根拠種別(1問1行):
> Q1 = 実測(package.ts:64-71 manifest 発見 seam + 既存4 manifest 実読)
> Q2 = 既決(project.md — 配布フレームワーク・デプロイ基盤なし・規制要求の記録なし)
> Q3 = 既決(project.md Tech Stack — Bun/TypeScript/Biome/tsc)
> Q4 = 実測(Issue #626 ラベル enhancement/P2 — 期限・予算制約の記載なし)
> Q5 = 既決+実測(並行 intent 260709 との codekb 共有は leader 割当指示(5)で明示)
> Q6 = 既決(project.md Deployment — AWS 利用なし・npm 配布のみ)

## Q1: 統合しなければならない既存システムは何か?

- A. `scripts/package.ts` の manifest 駆動 packaging(harness/*/manifest.ts の自動発見)、dist:check / promote:self:check のドリフトガード、tests/run-tests.sh の4層テスト — 既存 open-set seam に載せる
- B. core のディスパッチロジックへの直接統合(core 側に分岐追加)
- C. 独立した別ビルドシステムの新設
- D. 外部 SaaS との統合
- E. 統合対象なし
- X. その他

[Answer]: A

## Q2: 規制・コンプライアンス要件はあるか?

- A. なし — OSS 開発ツールの配布であり PCI/HIPAA/SOC2/データレジデンシーいずれも非該当。ライセンス整合(既存リポジトリのライセンス)のみ通常注意
- B. PCI-DSS
- C. HIPAA
- D. SOC2 監査対象
- E. データレジデンシー要件
- X. その他

[Answer]: A

## Q3: チームの技術スタックとスキルプロファイルは?

- A. Bun + TypeScript/ESM、Biome lint、tsc 型検査、bun test 4層ランナー — 既存 harness 4種(claude/codex/kiro/kiro-ide)の port 実績があり、同スタックで opencode/Cursor manifest+emit を実装可能
- B. Node.js + npm 標準
- C. Python 中心
- D. 新規スタックの学習が必要
- E. 不明
- X. その他

[Answer]: A

## Q4: 予算・タイムラインの制約は?

- A. 明示的期限なし(enhancement / P2 = 通常優先度)。トークン資源制約下の運用ノルム(rate-limit-idle-allowance)には従う
- B. 四半期内リリース必須
- C. 今週中
- D. 予算上限が明示されている
- E. 不明
- X. その他

[Answer]: A

## Q5: 組織的ブロッカー(変更凍結・競合優先度)はあるか?

- A. 変更凍結はなし。並行 intent 260709-canonical-settings(e2)と codekb を共有するため、RE の diff-refresh・record-sync PR で merge 衝突に注意(leader 割当指示(5)で明示済み)— ブロッカーではなく調整事項
- B. 変更凍結中
- C. 高優先度 intent に全リソースが割かれている
- D. レビュー人員が確保できない
- E. 不明
- X. その他

[Answer]: A

## Q6: 現在使用中の AWS サービス・アカウントは?

- A. なし — 本プロジェクトはデプロイ基盤を持たず、リリースは npm パッケージ配布と GitHub(release.yml)のみ。AWS 前提の feasibility 検討は非該当
- B. AWS アカウントあり(本番運用中)
- C. AWS 移行を計画中
- D. マルチクラウド
- E. 不明
- X. その他

[Answer]: A

## 回答モード記録

チームモード実行。E-OC1 の3段順序に従い、判定申告(16:16Z 送付)→ leader 承認(16:18:51Z)後に記入した。未決の設計判断は本ステージに含めず、opencode / Cursor の受け取り単位の詳細確定(調査項目の深掘り)は reverse-engineering / application-design へ持ち越す(Open questions として diary に記録)。矛盾検出: Q1〜Q6 の回答間に矛盾なし。
