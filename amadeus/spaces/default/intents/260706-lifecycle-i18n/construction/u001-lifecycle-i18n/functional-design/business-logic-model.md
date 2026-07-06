# Business Logic Model — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent の「ロジック」は 6 文書の対訳ペア化である。Bolt 分割、訳語統制、執筆手順を定義する。

## Bolt 分割（2 本直列）

| Bolt | 対象 | 行数 | 根拠 |
|---|---|---|---|
| B001-core-docs | overview.md、scopes.md、state.md | 586 | 契約の核（記法定義・scope・状態）を先に英語化し、訳語対応表を確立する。3 文書は相互参照が密で、overview の I/O 記法（#561）が他 2 文書の語彙の正になる |
| B002-phase-docs | ideation.md、inception.md、construction.md | 1,087 | B001 で確立した訳語対応表に従い、phase 別 3 文書（22 ステージ契約）を英語化する。Inputs 表の英訳は #561 既定ラベルを機械的に適用できる |

## 訳語統制

訳語対応表（glossary、[domain-entities.md](domain-entities.md)）を唯一の正とする。出典の優先順は次のとおり。

1. CONTEXT.md の canonical name（English Term がそのまま英語版の用語になる）。
2. #561 の I/O 記法定義が既定した英語化後ラベル（Artifact / Required / Source、必須値 4 値）。
3. 上流 AI-DLC v2 の用語（stage 名、イベント名、成果物名は上流の英語をそのまま使う）。
4. #563（merge 済み）の既訳（steering.md ほか直下 10 文書で確立した対訳）。

## 執筆手順（Bolt 内、文書ごと）

1. 現行日本語版を `<name>.ja.md` へ複製し、H1 を対訳併記形式へ、文書内リンクを ja→ja（対訳あり）/ ja→en（対訳なし）へ調整する（FR-1.1、FR-1.4、FR-2.2、FR-2.4）。内容は無改変。
2. `<name>.md` を英語で書き直す（FR-1.2）。節構成・表構造・機械可読ラベルは日本語版と 1:1 に保つ（FR-1.3）。
3. 決定論検査: 見出し数・表の行数・コードフェンス数が英日で一致すること、リンク先 path が実在することを grep / スクリプトで照合する。
4. 意味論突き合わせ: 節単位で英日を読み比べ、乖離があれば英語版を修正する（FR-4.1(a)）。
5. 陳腐化を発見した場合は FR-3 に従い外科修正し、修正一覧へ記録する。

## 実行モード

翻訳の一次執筆は文書単位の subagent に委譲してよい（Maintainer の制限解除済み）。委譲する場合は、訳語対応表と執筆手順を prompt で固定し、成果物は #541 の純正性検証（conductor による fresh 実測 = 手順 3 の決定論検査と手順 4 の突き合わせ）を通してから採用する。委譲せず conductor が直接執筆してもよい。

## 逆方向リンクの整合（B002 の最終手順）

docs/amadeus 直下の 4 ファイル（steering.ja.md、aidlc-v2-operation-phase-boundary.ja.md、aidlc-v2-build-and-test-failure-handling.ja.md、aidlc-v2-sensor-learn-mapping.ja.md、計 5 箇所）は現在 lifecycle/<name>.md へ ja→en でリンクしている（現時点では policy 準拠）。本 Intent 完了後は対訳が存在するため、language-policy.md の cross-linking rule により ja→ja へ更新しないと policy 違反状態が残る。よって B002 の最終手順として、この 4 ファイル・5 箇所のリンク行だけを ja→ja へ更新する（変更対象の最小追加。BR-10 の但し書きと gate 報告で確定する。§12a 反復 1 の MEDIUM 指摘を反映）。

## 検証（FR-4）

- B002 完了後に流入参照 30 箇所と 6 文書間相互リンクの機械照合（FR-4.3）。逆方向 4 ファイル・5 箇所の ja→ja 化も照合対象に含める。
- validator + test:all は build-and-test で実行・記録（FR-4.2）。
- Codex 初見レビュー 1 回は PR 作成後（Bugbot と併用。FR-4.1(c)）。
