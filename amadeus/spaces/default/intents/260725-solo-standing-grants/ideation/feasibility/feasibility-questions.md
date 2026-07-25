# Feasibility Questions

**Mode:** chat  
**Started:** 2026-07-25T03:03:26Z  
**ユーザー承認:** 2026-07-25T03:06:39Z  
**Primary evidence:** 現行mainのコード、Issue #1466、承認済みIntent Capture成果物

## Q1. どの既存system・契約と統合する必要があるか

[Answer]: 現行の監査ledger、`amadeus-state`のgrant/delegation/approve処理、`amadeus-lib`のgrant探索・gate適用判定、`amadeus-orchestrate`のdirective/report処理、全ハーネスのconductor手順、配布生成物と統合する必要がある。現行team modeは、leaderの`HUMAN_TURN`を根拠に`GRANT_ISSUED`を記録し、active space全体のaudit shardから有効grantを探索し、target intentのgateを判定して`DELEGATED_APPROVAL`へGrant Idを付与し、conductorがprovenanceを検証したうえで通常approveをcommitする。

## Q2. 規制・コンプライアンス上の制約は何か

[Answer]: PCI、HIPAA、個人情報、data residency等の外部規制対象は確認されていない。一方、内部統制としてhuman presenceの非偽造性、issuer `HUMAN_TURN`の物理的存在、grantの期限・取消、正確なGrant Id provenance、audit-first atomicity、対象外gateの人間統制が必須である。`GRANT_ISSUED`と`GRANT_REVOKED`は一般audit CLIからmintできず、専用verbだけが発行できる現行制約を維持する。

## Q3. 技術stackと保守能力は十分か

[Answer]: 対象repositoryはTypeScriptとBunで実装され、grant parse、space横断探索、provenance検証、gate分類、team delegation、approval commitに既存の分離されたseamとテストがある。関連する現行基線として`tests/integration/t-standing-grant.test.ts`、`tests/unit/t188-human-presence-gate.test.ts`、`tests/unit/t-delegate-answer-consume.test.ts`の79 testが成功した。既存seamを拡張する能力は十分であり、新しい外部serviceやAWS resourceは不要である。

## Q4. 予算・timeline・品質制約は何か

[Answer]: 明示的な金銭予算や納期は提示されていない。外部resource費用は発生しない見込みである。優先される制約は、設計gate承認前に実装しないこと、関連test・全test・型check・生成物drift checkを完了すること、team modeを回帰させないことである。速度のためにこれらを省略しない。

## Q5. 組織的・技術的blockerと主要な不確実性は何か

[Answer]: PR #1468は凍結済み試作であり、そのbranchや実装形状を変更起点にできない。現行`findActiveStandingGrant`はactive space内の全intentを横断するため、solo modeでそのまま利用するとcross-intent認可の危険がある。現行approveはgrant探索・選択をcommit処理内で行うため、route時に選んだGrant Idをdirectiveからcommitへ明示的に渡す契約が存在しない。また、`amadeus-orchestrate`はstate toolの拒否を通常のerror directiveへ変換して`ERROR_LOGGED`を発行するため、失効競合をその経路へ落とすと受け入れ条件に反する。全ハーネスの手順とgenerated distributionを同じ意味論へ同期する必要がある。
