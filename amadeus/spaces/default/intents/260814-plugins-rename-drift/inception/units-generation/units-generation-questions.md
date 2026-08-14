# Units Generation 質問(260814-plugins-rename-drift)

> Unit 境界は上流(scope-definition の proto-Unit 3 件、application-design C1〜C6、requirements の Constraints「1 Issue = 2 Unit の意図的逸脱は承認済み」)から一意に定まるため、質問は分割確認の 1 問+計画承認の 1 問に絞る(予算 8 問中 2 問)。semi autonomy のため梯子裁定(cid:scope-definition:c1-semi-ladder-routing)。
>
> 境界戦略 = 変更理由による分割(改名 / core 設定機構 / plugin 消費者)。粒度 = proto-Unit と同一の粗粒度 3 Unit。デプロイモデル = 全て monorepo 内の同時配布(独立デプロイなし)。統合点 = C4 の argv 契約(settings-json)と plugin.json 宣言形式。順序決定は 2.8 に委ねる(本ステージは DAG のみ)。

## Q1. Unit 分割と kind の確認

A. 3 Unit 構成で確定: U1 `rename-github-pr-convergence`(kind: packaging — 配布物・投影・消費者面の再編)/ U2 `plugin-settings-core`(kind: library — core の宣言 parse・config キー・解決/受け渡し = C2+C3+C4)/ U3 `git-drift-plugin`(kind: service — spawn される実行可能センサー CLI + プラグイン一式 = C5+C6 の git-drift 分)。U3 → U2 依存、U1 独立。(推奨)
B. 別の分割
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q2. 分解計画の承認(Step 5)

A. 承認 — 上記 3 Unit・kind・依存で Generation へ進む(推奨)
B. 計画を修正する
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## 承認証跡

- semi 梯子裁定(承認): 2026-08-14T08:35:00Z — Q1=A `auto-decision-46dfb974d522942f95d6b6c4a699a825` / Q2=A `auto-decision-1c756751c0d622f6633d6ef23413d60b`(decider=agent-recommendation、unreviewed キュー入り。INTENT_AUTONOMY_TRANSACTION_COMMITTED が一次記録)
