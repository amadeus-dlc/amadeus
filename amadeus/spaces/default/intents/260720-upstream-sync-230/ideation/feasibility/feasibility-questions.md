# Feasibility 質問ファイル — 260720-upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md` — 各問の既決根拠の導出元)

## E-OC1 選挙不要判定

- 判定: 本ファイルの全6問は選挙不要(既決適用・実測導出)と判定する。根拠種別(1問1行):
  - Q1: 実測 — 統合面は repo 実測(6ハーネス dist、self-install、CI ゲート群)で確定
  - Q2: 実測 — upstream LICENSE=MIT-0 / Amadeus=MIT+Apache-2.0 を実読、規制要件なしは計画スコープ(開発フレームワーク)より既決
  - Q3: 既決 — tech stack は memory/project.md(Bun/TS/Biome/bun test)で既決
  - Q4: user decision — ideation で park、実装時期は再開承認に従属(本セッションのユーザー指示)
  - Q5: user decision — 組織ブロッカーなし、construction 進入はユーザー承認ゲートのみ
  - Q6: 既決 — AWS 利用なし(amadeus スコープは infrastructure operations 除外)
- 申告: e5 → leader 2026-07-20T05:01Z 頃(agmsg)
- 承認: leader 承認 2026-07-20T05:02:24Z(agmsg タイムスタンプ、出典 agmsg — agmsg-git-evidence-split 準拠)

> [Answer] 記入は leader 承認後に実施(no-election-judgment-gate 3段順序遵守)。

## Q1: 統合しなければならない既存システムは何か?

- A. Amadeus 自身の配布・検証機構 — 6ハーネス `dist/` ツリー、self-install ツリー、drift ガード(dist:check / promote:self:check)、coverage ratchet/registry、既存 CI(typecheck / lint / test:ci)
- B. 外部 SaaS 連携
- C. AWS 環境
- D. 他社製品 API
- E. 統合対象なし
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)

## Q2: 規制・コンプライアンス要件はあるか?

- A. 規制要件なし。ライセンス面のみ: upstream は MIT-0(無帰属)、Amadeus は MIT/Apache-2.0 デュアル — 設計ガイドとしての参照・再実装に法的障害なし(実読確認済み)
- B. PCI DSS
- C. HIPAA
- D. データレジデンシー要件
- E. SOC2
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)

## Q3: チームの技術スタックとスキルは?

- A. TypeScript/ESM + Bun 直接実行、Biome lint、`tsc --noEmit`、bun test 4層ランナー — 本 intent の全作業面と一致(project.md 既決)
- B. Python 中心
- C. JVM 中心
- D. スタック未確立
- E. 外部要員が必要
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)

## Q4: 予算・タイムライン制約は?

- A. 固定期限なし。ideation 完了で park し、実装(inception 以降)の時期はユーザーの再開承認に従属。トークン資源制約下では rate-limit-idle-allowance に従う
- B. 四半期内必須
- C. 今週中必須
- D. 予算上限が明示されている
- E. 制約不明
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)

## Q5: 組織的ブロッカーはあるか?

- A. なし。唯一のゲートは「construction 進入(実装)にユーザーの明示承認が必要」というユーザー自身の指示(ブロッカーではなく設計されたゲート)
- B. チェンジフリーズ中
- C. 競合する優先案件で着手不能
- D. 承認者不在
- E. 不明
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)

## Q6: 現在使用中の AWS サービス・アカウントは?

- A. なし — amadeus スコープはインフラ運用を除外し、本 intent はエンジン/ハーネス/パッケージャ/docs のコードのみを触る。AWS 面の評価は N/A(反証可能根拠: リポジトリにデプロイ基盤なし、Operation フェーズ全 SKIP)
- B. 単一アカウントで数サービス
- C. マルチアカウント Organizations
- D. 他クラウド併用
- E. 不明
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:02:24Z — 既決/実測導出)
