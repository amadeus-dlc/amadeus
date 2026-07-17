# Feasibility 質問ファイル — 260717-state-mirror-fixes

<!-- E-OC1 選挙不要判定の証跡(eoc1-evidence-in-questions-header 準拠)
判定申告: 全6問について選挙不要と判定(各問の判定行を参照 — いずれも repo 実測・memory 層既決ノルム・Issue 本文・leader 指示からの転記であり、新規の判断を含まない)。申告 agmsg: 2026-07-17T17:47:29Z e1→leader
leader 承認: 2026-07-17T17:48:22Z leader→e1 agmsg【E-OC1 承認】(6問全て承認 — 既決・実測由来で未決判断なし)
-->

## 上流入力(consumes 全数): intent-statement.md

## Q1: 統合対象の既存システムは?

- A. amadeus フレームワーク自身のみ — #1170 は `packages/framework/core/hooks/`(sync-statusline)+ `core/tools/`(amadeus-utility handleSetStatus / amadeus-lib setCheckbox)の正本と dist×6/self-install の生成物同期面、#1172 は `scripts/amadeus-mirror.ts`(repo ローカル、gh CLI 依存許容域)。外部システム統合なし
- B. AWS 等の外部クラウド
- C. 外部 SaaS API
- D. 他リポジトリ
- X. Other

[Answer]: A

選挙不要判定: intent-statement.md「修正対象の想定面」+ project.md 既決(正本/dist/self-install の同期構造、gh-scripts-boundary)からの転記 — repo 構造の実測既決事実。

## Q2: 規制・コンプライアンス要件(PCI/HIPAA/SOC2/データレジデンシ)は?

- A. なし — OSS 開発フレームワークの内部ツール修正であり、PII・決済・医療データを扱わない。project.md にも規制要件の記載なし
- B. SOC2 相当の統制が必要
- C. データレジデンシ制約あり
- X. Other

[Answer]: A

選挙不要判定: project.md(Deployment: npm 配布のみ・規制記載なし)の不在確認+扱うデータが record/state ファイルのみである事実 — 既決・実測由来。

## Q3: チームの技術スタックとスキルプロファイルは?

- A. Bun + TypeScript(ESM)、Biome lint、tsc 型検査、bun test 4層ランナー — 両修正とも既存スタック内で完結し、新規依存・新規スキル不要(Bun-only Forbidden 維持)
- B. 新規ランタイム導入が必要
- C. 外部ライブラリ追加が必要
- X. Other

[Answer]: A

選挙不要判定: project.md Tech Stack 既決の転記+両 Issue の修正案(1行条件+テスト/フックのガード追加)が既存スタック内である事実。

## Q4: 予算・タイムライン制約は?

- A. 明示の期限なし。本 intent は Ideation まで実施して park(leader 割当 17:32:09Z)。Construction 進入の可否・時期は leader/ユーザー判断。トークン資源制約下では rate-limit-idle-allowance に従う
- B. 即日修正が必須
- C. 四半期内リリース必須
- X. Other

[Answer]: A

選挙不要判定: leader タスク割当(2026-07-17T17:32:09Z agmsg)+ intent-statement.md「Initial Scope Signal」の転記 — 既決事実。

## Q5: 組織的ブロッカー(変更凍結・競合優先度)は?

- A. なし — 両 Issue のクロスレビュー2名成立済み(17:36:17Z)、record PR #1178 はマージ済み(f58b8bbd)。唯一のゲートは Construction 進入判断(ユーザー決定 — issue-selection-user-decides)のみ
- B. 変更凍結中
- C. 競合する高優先度 intent がブロック
- X. Other

[Answer]: A

選挙不要判定: leader 共有(17:36:17Z クロスレビュー成立・17:46:39Z PR マージ済み)の転記 — 既決事実。

## Q6: 使用中の AWS サービス・アカウントは?

- A. なし — 本プロジェクトはデプロイ基盤を持たず、npm パッケージ配布+GitHub Actions のみ(project.md Deployment 既決)。AWS 面の feasibility 評価は N/A(反証可能根拠: project.md「デプロイ基盤は持たず」)
- B. AWS アカウント運用中
- X. Other

[Answer]: A

選挙不要判定: project.md Deployment 既決の転記 — 既決事実。N/A 表記は environment-provisioning:c3 の N/A 根拠併記規範に従う。
