# Functional Design Questions — repository-adoption

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。U4、FR-05〜15、NFR-01〜09 と SC-01／03／04／07、FR-12直接acceptanceを対象にし、U1〜U3のimplementation ownershipを重複させない。

> ユーザーによる一括推奨承認: 2026-08-02T05:17:55Z（「1、すべて推奨で」）

## Interaction Mode

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — evidence provenance、base SHA、CI／distribution反例を一問ずつ深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A. Guide me（推奨）

## Q1. Evidence promotion chain

修正前後censusからcanonical `B0` へどう昇格しますか。

- A. immutable raw→classification＋approval→approved evidence→candidate→人間レビュー済み昇格（推奨）— 各段をdigestで結合し、CLIはcanonical ledgerを更新しない
- B. raw censusを直接baselineへcopyする
- C. classificationだけでapproval receiptを省略する
- D. CI初回実行がfindingをbaselineへ自動追記する
- X. Other (please specify)

[Answer]: A. immutable raw→classification＋approval→approved evidence→candidate→人間レビュー済み昇格（推奨）

## Q2. Trusted base revision

CIのratchet比較元をどう固定しますか。

- A. event固有のfull SHAを明示供給（推奨）— `pull_request` はbase SHA、pushはbefore SHAを使い、zero／missing／short SHAをfail-closedにする
- B. current HEADをprevious setとして読む
- C.実行時にmerge-baseを推測する
- D. current ledgerの `previousDigest` だけを信頼する
- X. Other (please specify)

[Answer]: A. event固有のfull SHAを明示供給（推奨）

## Q3. CI and distribution adoption

gateとcanonical runtime修正をrepositoryへどう統合しますか。

- A. 既存lint jobに独立blocking stepを追加し、canonical sourceから全projectionを再生成（推奨）— 新規job／serviceを作らず、package／promotion driftとfull regressionを必須化する
- B. warning-only stepとして追加する
- C. 新規CI jobへ分離し、既存lintとは独立運用する
- D. generated projectionを直接修正する
- X. Other (please specify)

[Answer]: A. 既存lint jobに独立blocking stepを追加し、canonical sourceから全projectionを再生成（推奨）

## Ambiguity Analysis

全回答後に、evidence provenance、TP／FP classification、B_pre／B0集合差分、trusted base SHA、CI blocking、#1963 regression、performance、package／promotion driftの矛盾と欠落を検査した。推奨案の組合せに矛盾はない。CLIがcanonical ledgerを更新しない境界、event固有full SHAのfail-closed検証、既存lint jobの独立blocking step、canonical sourceからの全projection再生成により、証跡の昇格責任と実行時検証責任を分離する。未承認FPをbaselineへ混入させず、U1〜U3のimplementation ownershipも重複させない。

## Functional Design Plan Approval

- A. Approve Plan（推奨）— `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を生成する。UIはないため `frontend-components.md` は生成しない
- B. Revise Plan — 修正内容を指定する
- X. Other (please specify)

[Answer]: A. Approve Plan（推奨）

## Revision Cycle 2 — Q4. Approved false-positive policy

実 corpus で承認済みFPが発生した場合の通常check契約をどう閉じますか。

- A. 承認済みFPを0件にする（推奨）— baseline／exemptionの2台帳を維持し、classifier改善を完了条件にする
- B. TP baseline／intentional-dropと分離したversioned FP suppression台帳を追加する
- C. Requirements Analysisへ戻り、精度要件とgate方式を再設計する

[Answer]: A. 承認済みFPを0件にする（推奨）

## Revision Cycle 2 — Q5. Bootstrap ownership

初回baseにcanonical ledgerが存在しない場合のprevious-setを、どの契約で扱いますか。

- A. 既存U1 schemaを維持し、bootstrap provenanceをledger外の別入力として検証する（推奨）— 通常ledgerの `previousDigest` はbase ledger bytesだけを指す
- B. U1 ledger schemaを `git-ledger | bootstrap-evidence` unionへ変更する
- C. Application Designへ戻り、U1／U4 contractを再設計する

[Answer]: A. 既存U1 schemaを維持し、bootstrap provenanceをledger外の別入力として検証する（推奨）
