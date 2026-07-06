# Requirements：260706-docs-i18n

## Intent 分析

### 目的

docs/amadeus 直下（lifecycle/ 除く）の日本語 8 文書を、言語方針（#509 = `docs/amadeus/language-policy.md`）に従って英語化する（Issue #521 + #522 + #523 の束ね）。達成したい状態は次の 2 点である。

1. 対象 8 文書すべてで英語 `*.md`（正本）と日本語 `*.ja.md`（翻訳）が併置され、意味論が一致している。
2. 参照元リンクが Cross-linking rules（`*.md` → `*.md`、`*.ja.md` → `*.ja.md` 優先）に従って更新され、壊れていない。

### 上流の位置づけ

- 要求の正は Issue #521 / #522 / #523 とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み。束ね判断 = 3 Issue は同一言語方針に基づく docs/amadeus 直下の英語化で、進行中 Intent と非接触）である。intent-statement / scope-document は scope（refactor）により SKIP。
- 様式の正は PR #536 の前例（language-policy.md + .ja.md、extension-guide.md + .ja.md）である: 英語版 = 英語見出し、日本語版 = H1 に「English Title（日本語名）」+ 日本語見出し、意味論一致の書き直し（丸ごとの機械翻訳ではない）。
- 用語は CONTEXT.md の canonical name を使う（#521 の作業内容）。
- コードベース知識は codekb/amadeus/（9dd93f50 基準へ鮮度確認済み）を補助参照とする。消費する上流成果物は、本 Intent の reverse-engineering が作成した参照台帳 [business-overview](../reverse-engineering/business-overview.md)、[architecture](../reverse-engineering/architecture.md)、[code-structure](../reverse-engineering/code-structure.md)（いずれも codekb 正本への参照台帳）である。docs/amadeus の文書体系と参照構造の把握には architecture / code-structure を、対象文書の位置づけの確認には business-overview を使った。

## 機能要求

### FR-1: steering.md の英語化（#521、B001）

- FR-1.1: 現行の日本語本文を `docs/amadeus/steering.ja.md` へ移し、`docs/amadeus/steering.md` を英語で書き直す（意味論一致、75 行）。
- FR-1.2: 参照元リンクを Cross-linking rules どおりに更新する。実測した参照元: README.md / README.ja.md（Space reference 行）、AMADEUS.md、docs/amadeus/extension-guide.md / .ja.md、docs/amadeus/lifecycle/ 配下（AGENTS.md は steering.md を参照しない — 再実測で訂正）。`*.ja.md` の参照元だけ `.ja.md` へ差し替え、日本語だが `.ja.md` でないファイル（AMADEUS.md、AGENTS.md、.agents/rules/**）は正本 `.md` 参照のまま維持する（前例: AMADEUS.md は language-policy.md を `.md` で参照）。

### FR-2: aidlc-v2 系 5 文書の英語化（#522、B002）

- FR-2.1: 次の 5 文書で日本語本文を `*.ja.md` へ移し、`*.md` を英語で書き直す（意味論一致）: aidlc-v2-build-and-test-failure-handling.md（76 行）、aidlc-v2-difference-response-plan.md（70 行）、aidlc-v2-operation-phase-boundary.md（71 行）、aidlc-v2-reviewer-mapping.md（81 行）、aidlc-v2-sensor-learn-mapping.md（84 行）。
- FR-2.2: PR 内のコミットはファイル単位に分ける（#522 の作業内容）。
- FR-2.3: 本文の旧 path 言及の扱い: 実測の結果、対象 8 文書に旧 path（aidlc/、aidlc-state、/aidlc）の言及は残っていない（PR #553 が更新済み）。文書ごとの歴史的記述か更新かの判断は「該当なし」として記録する（ディスパッチ注記への回答）。
- FR-2.4: 5 文書間および lifecycle/ からの相互参照（overview.md、construction.md が参照）はリンク先ファイル名が変わらないため更新不要。`*.ja.md` 参照元（extension-guide.ja.md、language-policy.ja.md 等）に対象文書への参照がある場合だけ `.ja.md` へ差し替える。

### FR-3: skill-language-policy と rollout-plan の英語化（#523、B003）

- FR-3.1: `docs/amadeus/skill-language-policy.md`（109 行）と `docs/amadeus/skill-englishization-rollout-plan.md`（99 行）で日本語本文を `*.ja.md` へ移し、`*.md` を英語で書き直す（意味論一致）。
- FR-3.2: 参照元リンクを更新する。実測した参照元: AMADEUS.md、AGENTS.md、.agents/rules/amadeus-artifacts-and-examples.md、README.md / README.ja.md、docs/amadeus/language-policy.md / .ja.md、および aidlc-v2 系 3 文書（aidlc-v2-difference-response-plan.md、aidlc-v2-operation-phase-boundary.md、aidlc-v2-reviewer-mapping.md — これらは B002 の英語化対象自身であり、英語化時に参照文もあわせて書く）。`.ja.md` 参照元（README.ja.md、language-policy.ja.md、B002 で新設する aidlc-v2 系 `.ja.md`）だけ `.ja.md` へ差し替える。
- FR-3.3: language-policy.md の「Relation to skill-language-policy」節との相互参照整合を維持する。

## 非機能要求

- NFR-1: 意味論一致の検証は reviewer による英日突き合わせで行う（PR #536 の前例）。加えて reviewer（Codex / GPT-5.5）の初見読者レビューを B003 完了までのどこかで 1 回入れる（ディスパッチ指示。英語文書の読み味確認）。合否基準: 意味の取り違え・重大な読みにくさ（High 相当）の指摘 0 件、または指摘への対応完了をもって合格とする。依頼と所見の要旨は decision に記録し（帰属 = reviewer / GPT-5.5）、High 所見があれば leader へ一報する。
- NFR-2: 日本語版は japanese-tech-writing 規範に従う（既存本文の移設が主で、書き換えは最小）。
- NFR-3: 全対象文書と参照元のリンク解決可能性を機械検査し、broken 0 件を PR 説明に記載する（scratchpad の一時スクリプト、コミットしない）。
- NFR-4: 英語版の用語は CONTEXT.md の canonical name と一致させる。

## 制約

- C-1: 変更対象は docs/amadeus 直下の対象 8 文書（+ 新設 8 `*.ja.md`）と、実測した参照元のリンク行に限る。lifecycle/ 配下の英語化（#515〜520）は行わない。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。
- C-3: PR の merge は人間が行う。gate は auto 委任（4 イベントを leader へ報告）。
- C-4: Bolt 順序は B001（#521）→ B002（#522）→ B003（#523）の直列とする（ディスパッチ承認要旨）。

## 前提

- A-1: 基点は origin/main = 9dd93f50（PR #553 = 全面 rename 後）である。対象文書に旧 path 言及は残っていない（実測済み）。
- A-2: 対象は進行中 Intent（#552、#554 等）と非接触である（docs/amadeus 直下は他 Intent の変更対象外。ディスパッチの接触面判断）。

## スコープ外

- docs/amadeus/lifecycle/ 6 ファイルの英語化（#515〜520。engineer2 の #510〜514 完了後）。
- language-policy.md / extension-guide.md 本体の内容変更（#536 で確定済み。`.ja.md` 参照の差し替えだけ行う）。
- CONTEXT.md への用語追加（英語化で新概念は生まれない）。

## 未解決事項

なし（小さな構造判断は questions ファイルに記録し、gate の承認で確定する）。
