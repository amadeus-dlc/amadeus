# Code Summary — docs-i18n

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 実施した変更

### B001（#521）: steering.md

- `docs/amadeus/steering.md` を英語正本へ書き直し（H1 = Space Reference、H2 = 7 対一致）、日本語本文を `steering.ja.md` へ移設。
- 参照元更新: README.ja.md（Space reference 行）、extension-guide.ja.md（2 箇所）を `.ja.md` 参照へ。
- steering.ja.md 内の Extension Guide リンクは Cross-linking rules により `extension-guide.ja.md` を参照。

### B002（#522）: aidlc-v2 系 5 文書（ファイル単位 5 コミット）

- 5 対すべて英語正本 + `.ja.md` 併置（H2 対一致: 8 / 6 / 5 / 7 / 8）。歴史的記述（調査・判断の記録）は内容を変えず英語化。
- ja 版相互参照は対訳実在分だけ `.ja.md` へ。

### B003（#523）: skill-language-policy + rollout-plan（2 コミット）

- 2 対とも英語正本 + `.ja.md` 併置（H2 = 8 / 8 対一致）。
- 参照元更新: README.ja.md、language-policy.ja.md、aidlc-v2 系 ja 3 件（difference-response-plan / operation-phase-boundary / reviewer-mapping）の skill-language-policy 参照を `.ja.md` へ。
- rollout-plan の表中 skill 名が計画作成時点（Issue #402）のものである旨の注記を英日へ追加（現行一覧は stage-catalog.md へ委譲）。

## 元文書の陳腐化への外科修正（ピア協議 = 案 B、5 回答全会一致）

steering.md（英日とも）。修正は退役機構への言及行に限定し、節構成（H2 = 7）は不変。

| 旧記述 | 新記述 | 根拠 |
|---|---|---|
| `amadeus-steering` は…作成、点検、補修する公開入口（Positioning） | Space の足場作りはエンジンが持つ（workspace-scaffold ステージ 0.1 + `space` / `space-create` utility verb） | skill 不在（#535 で README からも削除済み）。stage-graph.json と `amadeus-utility.ts help` で実在裏取り |
| 入口は既存資料…を点検（Positioning） | エンジンが既存資料…を点検 | 同上 |
| `amadeus-steering` は、…だけを扱う / 採用判断を作らない（Responsibility ×2） | Space の足場作りは、… | 同上 |
| `intents/intents.md`（`IndexGenerate.ts` の生成物）の表行 | intents.json 行へ「人間向け一覧は都度生成（intents.md 索引は廃止 — GD009）」を統合 | GD009（AMADEUS.md の現行契約） |
| `intents/<dirName>.md` と `intents/<dirName>/`（record） | `intents/<dirName>/`（record） | GD009（Intent モジュールファイル廃止） |
| この扱いは `amadeus-steering` の実行モードに依存しない（Bootstrap） | Space の足場作りの実行のされ方に依存しない | skill 不在 |
| `amadeus-steering` は…範囲が異なる（Notes ×2） | Space の足場作りは… | skill 不在 |

## 初見読者レビュー（NFR-1、reviewer / GPT-5.5）の所見と対応

依頼: B002 完了後（B003 と並行 = 「B003 完了までに 1 回」を充足）。所見 High 3 + Low 3 → 全件対応。合否基準（High 相当 0 件または対応完了）を対応完了で充足。

| 所見 | 対応 |
|---|---|
| High 1: sensor-learn-mapping の本文（Decision / Items Not Adopted）が D004 上書き済みの判断を現在形で主張し、初見読者が現行契約と誤読する | 両見出しへ「(Superseded by D004)」を付し、override note に「本文は Issue #393 時点の歴史的記録」の明示と退役 skill（history / learning-review → 現在は §13 learnings ritual）の注記を追加（英日） |
| High 2: operation-phase-boundary が退役済み `amadeus-history-review` / `amadeus-learning-review` を現行機構として記述 | §13 learnings ritual（`amadeus-learnings.ts`）へ修正（英日、Incident Response / Feedback & Optimization の 2 行） |
| High 3: difference-response-plan の `test-results.md` が Amadeus 契約（`build-test-results.md`）と不一致 | `build-test-results.md`（本家では `test-results.md`）へ修正（英日） |
| Low 1: 「englishization」が初見読者に不自然 | difference-response-plan 英語版の 5 箇所を English conversion 系へ言い換え |
| Low 2: pass 文の文法 | would change the meaning of `pass` from … へ修正 |
| Low 3: steering.md L14 の greenfield/brownfield の係り | for both greenfield and brownfield workspaces へ修正 |

## 検証結果

- 全 8 英語版: 日本語残存 0 件（`grep -P '[ぁ-んァ-ヶ一-龠]'`）。
- 全 8 対: H2 数一致。ja 版の移設忠実性 = 旧本文との diff が意図した `.ja.md` リンク差し替え（+ 陳腐化外科修正 + 注記追加）のみであることを対ごとに確認。
- リンク機械検査（NFR-3）: 対象 16 + 参照元 4 ファイルで **checked=106 broken=0**（scratchpad の一時スクリプト。コミットしない）。
- subagent 生成物の #541 純正性検証: 各 Bolt 完了時に conductor が fresh 実測（上記 grep / diff / git status の変更範囲確認）で独立検証した。
- 途中の副作用修復: 一括置換スクリプトのシェル引用ミスで § が不正バイト化・置換 1 件が破損 → 全変更を git diff で全数照合し、Edit ツールで確定的に修復（診断と修復は diary の Deviations に記録）。

## code-generation reviewer（amadeus-architecture-reviewer-agent）の所見と対応

iteration 1 = NOT-READY（軽微 3 件）→ 全件修正（commit 6a5e8374）→ iteration 2 で再検証。

| 所見 | 対応 |
|---|---|
| reviewer-mapping.ja.md の rollout-plan 参照が Cross-linking rules 未適用（.md のまま） | .ja.md へ差し替え |
| difference-response-plan.md の englishization 残存 1 箇所（Low-1 の対応が 6 分の 5 だった） | English conversion へ統一（残存 0 件） |
| sensor-learn-mapping override note の同趣旨重複文（High-1 対応時の統合し忘れ） | 1 文へ統合（英日） |

## PR 準備前の残タスク

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-i18n` と `npm run test:all` の実行・記録。
- PR は draft で作成（恒常ルール）。検証結果とリンク検査結果、陳腐化修正一覧を PR 説明へ転記。
