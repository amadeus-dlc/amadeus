# Code Summary — guide-intro

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 実施した変更

### 新設（docs/guide/、8 ファイル = 4 対）

| 章 | H1（英語版） | H2 対 |
|---|---|---|
| index | Amadeus DLC User Guide | 4 / 4 |
| 00 | Introduction | 6 / 6 |
| 01 | Getting Started | 5 / 5 |
| 02 | Your First Workflow | 7 / 7 |

- 執筆は subagent 2 体並行（A = index + 00、B = 01 + 02）。上流 docs/guide の本文は開いていない（構成参考の旨は index の About に明記）。
- 掲載した全コマンド・出力は隔離 workspace（installer 導入 → intent-birth → next → status → birth 後 doctor）の実実行結果。subagent B が全 code block を実測ログと byte 照合。一時パスは `<workspace>` へ置換し明記、省略は「…」で明示。
- 01 章は導入直後の doctor 1 fail（workspace shell ready）を正直に記載し、#573 の pending 注記を付した。02 章で birth 後に全 pass へ解消する実測（追加採取）を掲載。

### 既存文書への最小行追記（3 対）

- language-policy 対: Scope へ docs/guide/ が同じ対規約に従う旨を 1 行明文化（ピア協議の leader 条件）。
- README 対: Documentation 節へ User guide リンク。
- extension-guide 対: 導入者はガイドから読み始める旨の相互リンク（逆方向は index の Related links）。

## 初見読者レビュー（NFR-4、reviewer / GPT-5.5）の所見と対応

High 4 + Low 3 → 全件対応（commit be75a069、英日同時）。合否基準（High 相当 0 件または対応完了）を対応完了で充足。

| 所見 | 対応 |
|---|---|
| High 1: 01 は clone 直下で終わり、02 が相対 path を workspace への移動説明なしで実行させる | 02 冒頭（Birth 節）に「全コマンドは対象 workspace ルートで実行」+ `cd <workspace>` block を明示 |
| High 2: 00 末尾「次章未公開」が index（Available）と矛盾 | 01 への実リンクへ修正（subagent A の並行執筆による誤解。index の 01/02 行も conductor が実リンク化済み） |
| High 3: 02 の「one Intent end to end」が過大（birth〜status まで） | 「最初の数手（birth・最初の directive・置き場所）」へ修正し、完了までは conductor loop が担う旨を明記 |
| High 4: 00 の Operation 表現が lifecycle overview（常時 [S]）と矛盾 | エンジン実体を実測（scope-grid.json で enterprise 等が Operation EXECUTE）し、ガイドは scope 基準の表現へ。overview.md L87 側の陳腐化は Issue 候補として leader へ報告 |
| Low 1: index 読む順の 01/02 が plain text | 実リンク化（英日） |
| Low 2: next の JSON 抜粋が不完全 JSON と誤読されうる | 「完全な JSON ドキュメントではなく抜粋」と明示（英日） |
| Low 3: status の Next Stage の意味が初見に不明瞭 | Current / Next の読み方を 1 行補足（英日） |

## 検証結果

- 英語版 4 件: 日本語残存 0 件。4 対の H2 数一致（4 / 6 / 5 / 7）。
- リンク機械検査（アンカー込み、NFR-5）: 新設 8 + 追記 3 対 = 14 ファイルで **checked=156 broken=0**（scratchpad の一時スクリプト、コミットしない）。
- parity:check: exit 0、出力に docs/guide 言及 0 件（engineer3 の留意への実測回答 = docs/guide は parity 検査対象外）。
- 数値の照合: 32 stages / 5 phases / 10 scopes / 42 skills / nameMappings kind 10 系統・120 件 — すべて照合台帳（domain-entities.md）と一致（subagent A + Codex reviewer が独立再計測）。
- #541 純正性検証: 各 subagent 完了時に conductor が fresh 実測（残存 grep / H2 対一致 / リンク検査 / git status 変更範囲）で独立検証。

## コミット構成（BR-7 = 章対単位）

00 対 / 01 対 / 02 対 / index 対 / 参照接続 3 対 / レビュー所見反映 の 6 コミット。

## PR 準備前の残タスク

- validator + `npm run test:all` の実行・記録（build-and-test）。
- draft PR 作成（恒常ルール）→ 3 条件充足で Ready 化 → merge 依頼。

## PR 監視中の main 追随（PR #577 / #575 の merge を受けた更新）

- **#577（= 当方起票の #573 修正）**: installer / doctor の挙動が変わったため、隔離 workspace（guide-ws2）で再実測し、01 章の Install / Verify 節を新挙動（smoke passed + shell seed の note、doctor 全 pass 32/0 + pending first workflow 行）へ更新、#573 の pending 注記を除去。02 章の呼応（pending → workspace shell ready への切り替わり）も更新（英日）。
- **#575（lifecycle 英語化）**: lifecycle の `*.ja.md` 新設により、ja ガイドの overview / scopes / state 参照 6 箇所を Cross-linking rules に従って `.ja.md` へ追随。英語化で破損した ja アンカー（overview.md#成果物配置）を overview.ja.md 側で解消。リンク機械検査 checked=158 broken=0。
- **記録事項**: 01 章英語版の実測 block 内に日本語 1 箇所（installer 実出力の「導入後の検証」）が含まれる。実測 byte 忠実を優先して原文のまま掲載（英語正本の散文には日本語 0 件を維持）。installer 出力の英語化は別件候補。
