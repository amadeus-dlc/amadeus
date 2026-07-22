# Phase 2 — Provenance Ledger 発行レシート(2026-07-22)

上流入力(consumes 全数): defect-ledger.md, walking-skeleton-receipt.md, final-fd-gate-ruling.md

## 結果

- ledger 状態: **S_FROZEN**(6イベントの happy path 完走)
- promotion 判定: **MANIFEST_PROMOTABLE**(ledgerHead `fa850112…`)
- store: `experiment/provenance/`(実 FsProvenanceStoreAdapter による append、head `1cdd5b17…`)
- transactionId: `0ce39077…`

## イベント列(seq 0〜5)

ARM_AUTHORING_STARTED(tla) → ARM_FROZEN(tla) → FIXTURE_REVEALED → SKELETON_PASSED
→ ARM_AUTHORING_STARTED(ts) → ARM_FROZEN(ts)

## identity 導出(全て実在物から — 検証可能)

| フィールド | 導出 |
| --- | --- |
| publicInputHash / actualInputManifestIdentity | sha256(tests/formal-verif/fixtures/contract-provenance/public-manifest.json) = `b2497f1f…` |
| proof.freezeSha | 64-hex 要件のため `sha256("<git-sha>:<arm>")`。**git freeze commit = `167a229c371e1738f2ef279b901b90fb45c31eff`(#1327)** — 両アームの spec 正本(tla-arm.ts / arm-s-\*.ts)は同コミット以降無変更(`git log -1` 実測) |
| forbiddenScanReceiptIdentity | freeze SHA 時点の arm-owned files への禁止トークン(fv-fixture / patch名 / #1268・#1273・#1277)git grep 実測 **0件** の canonical hash |
| testsReceiptIdentity | アーム所有テスト(tla-model / arm-s-{oracle,universe,run})**63 pass 0 fail** 実測レシートの canonical hash |
| SKELETON_PASSED.cellResultIdentity | CI artifact(run 29906204612)の run1 cellResultIdentity `69532dcd…` |
| SKELETON_PASSED.evidenceBundleHash | sha256(skeleton-artifact.json) = `387e6c62…` |
| FIXTURE_REVEALED.disclosureHash | sha256(d4-invalid-timestamp.patch) = `aa9aa714…` |
| baseSha | 欠陥台帳 baseline `b0fa344a0…` |

## blind 主張の根拠(git 時系列)

- 両アーム spec の freeze commit `167a229c3` の着地: **2026-07-22T04:33:25Z**
- 欠陥 fixture の作成(fv-fixture ブランチ群 push): **2026-07-22T08:4x** — freeze の約4時間後
- よって「アームは fixture 内容を知らずに書かれた」は git 時系列で機械検証可能
- harness-repair(spec 非接触の toolchain 修理): #1361(MSG 2107)、#1367(trace ラベル文法)—
  最終FDゲート裁定+自律続行裁定に基づく verdict 中立修理として記録
- プロトコル上 S freeze は skeleton 後のイベント順だが、S の実コード凍結は同一 commit
 (= skeleton より**前**)— 安全側の逸脱として明記

## 再現

発行スクリプト(session scratch)と同一手順は本レシートの導出式から再構成可能。
ledger の検証は `foldLedger`(provenance.ts)へ store 内イベントを与えれば機械再実行できる。
