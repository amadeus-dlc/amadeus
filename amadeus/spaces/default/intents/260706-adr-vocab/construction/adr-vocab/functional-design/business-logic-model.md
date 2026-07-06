# Business Logic Model — adr-vocab

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## B001: docs/adr 退役の実施設計（FR-1）

1. **移設 1（ADR 0001 全体）**: `docs/amadeus/extension-guide.md` に「## Design lineage」（.ja.md は「## 設計判断の由来」）を追加し、Lifecycle Binding / Profile の判断要旨（Agent Skills を DLC の phase・成果物・gate へ束ねる採用判断、却下案 = Plugin / MCP 直結、経緯 = 2026-06-28 採用）を 1 段落 + git 履歴参照（`git log -- docs/adr/0001-lifecycle-binding-profile.md`）で記す。全文複製はしない（FR-1.1）。あわせて同ファイル 20 / 34 行（+ .ja.md の対応箇所）の「see #527, pending」参照 2 箇所を、#527 確定後の記述（CONTEXT.md = 正準、glossary = 抜粋）へ更新する（reviewer F5。同一ファイル編集内で処理）。
2. **移設 2（ADR 0002 の有効部分）**: `docs/amadeus/lifecycle/overview.md` の「Artifact layout」節（.ja.md は「成果物配置」節）末尾に、phase ディレクトリ構成（record 直下を `initialization/ ideation/ inception/ construction/ operation/` で分ける判断。成果物ルートと状態ファイル名は #387 で v2 準拠へ置換済み）の要旨 + 経緯参照を 1 段落で追記する。PR #575（#515〜520）merge により lifecycle/ は英語正 + `.ja.md` 併置になったため、**英語（overview.md）と日本語（overview.ja.md）の両言語へ追記**する（language-policy 準拠。訳語は overview.md 既存節の語彙と engineer2 の record 訳語対応表 `260706-lifecycle-i18n/construction/u001-lifecycle-i18n/functional-design/domain-entities.md` に合わせる）。見出し文言は両言語とも変更しない（engineer5 の docs/guide がアンカー参照。接触面ピア確認済み: engineer5 = 非接触 + 見出し不変条件、engineer2 = #575 merge 済みで非接触・両言語条件）。
3. **同期ルールの統合**: docs/adr/README「同期ルール」から一般規範だけを `.agents/rules/context.md` へ移す（詳細は B002 の 2）。ADR 前提の規範（ADR ↔ CONTEXT.md 逆同期、ADR の役割記述）は退役し、移さない。
4. **参照元更新**: README.md / README.ja.md の 155 行 ADR リンクを「判断記録は Intent record の decision・steering・CONTEXT.md（語彙）が持つ」旨の 1 行へ置換（**先に engineer5 へピア確認**）。domain-modeling skill の 3 箇所（B002 の 3）。evals/README の言及を現行化。
5. **削除**: `git rm -r docs/adr/`。互換 stub・リダイレクトなし（backward-compatibility ルール）。`adr-template.md` は不変。

## B002: 語彙の正準・境界・同期規約（FR-2、Q1 = (a) 改良版で人間確定済み）

1. **CONTEXT.md 側**: 「**ADR**」定義（80 行）を「判断記録」の現行定義へ置換する（ADR は退役済み。判断は Intent record の decision、grilling trail、steering 根拠表が持ち、語彙は CONTEXT.md が持つ）。「**Glossary**」定義（338 行）へ「CONTEXT.md を唯一の定義元とし、glossary.md は workspace 運用で頻用する語の抜粋 + 参照である。同期は CONTEXT.md → glossary の一方向・手動」を追記する。
2. **`.agents/rules/context.md` 側**: 「## 同期規約」節を追加し、次を定める。(1) 新語彙の確定時は対象 Intent の gate 承認までに CONTEXT.md へ反映する（既存 MUST の維持・明文化）。(2) 実装・merge 済み差分と CONTEXT.md がずれた場合は現行実装を優先して確定語彙だけを逆同期する（旧 docs/adr/README の一般規範の統合）。(3) glossary.md は抜粋であり、workspace 運用語彙に変化があった場合だけ CONTEXT.md から反映する。(4) 未決定事項・一時的な実装都合は追加しない（既存基準の維持）。
3. **domain-modeling skill 側**（英語、source → promote）: 8 行「Do not use this to update the repo's development `CONTEXT.md` or `docs/adr`.」→ docs/adr 言及を除去し「`CONTEXT.md` is the canonical vocabulary source maintained at Intent gates; this skill only maintains the workspace excerpt (`glossary.md`) and its siblings」の趣旨へ。21 行・209 行も同様に docs/adr 言及を除去し、glossary = 抜粋の位置づけへ更新。
4. **glossary.md 側**: 冒頭に「この用語集は workspace 運用語彙の抜粋である。語彙の定義元（正準）は開発リポジトリの `CONTEXT.md` である」を追記。

## B003: 棚卸しと補正（FR-3。一覧は gate で確定）

1. **GD009 補正（FR-3.2）**: reviewer F2（iteration 1 / 2）の実測により対象は次の 8 記述に確定する — 140 行（概要・依存・目標プロファイルの `intents/<dirName>.md` 配置）、148〜149 行（Intent Record の構成要素としてのモジュールファイル + その内容）、169〜170 行（目標プロファイルのモジュールファイル配置）、192 行（Intent Phase Directory Layout の「モジュールディレクトリ配下」定義）、194 行（モジュールファイルと `amadeus-state.md` の配置。`<dirName>.md` は GD009 廃止、state の path 記述は現行と一致するため path 部分は維持）、204 行（`intents.md` 人間向け一覧の配置）、210 行（`intents.md` を現存する再生成索引とする記述）、215 行（登録層の構成要素としてのモジュールファイル）。いずれも現行契約（正準台帳 = `intents.json`、目標プロファイル等は record 成果物、人間向け一覧は廃止 = 必要なら都度生成）へ置換する。**69〜79 行の一般定義（モジュールファイル / モジュールディレクトリ / モジュール構造 = 同 stem のペア配置概念）は変更しない** — GD009 が廃止したのは Intent の `<dirName>.md` と `intents.md` 索引であり、ペア配置の一般概念ではない。110 行（Event Storming のモジュールディレクトリ配置）は現行有効な用法であり不変（reviewer F2(a)）。
2. **旧名補正（FR-3.3）**: 「Aidlc State」5 箇所（154 / 155 / 162 / 165 / 201 行）→「Amadeus State」（見出し語も改名。実ファイル名 `amadeus-state.md` と一致させる）。glossary.md の 9 行目 `aidlc/` → `amadeus/`、30 行目の用語欄 `target-aidlc/` → `target-amadeus/` と理由欄 `aidlc/` → `amadeus/`（禁止ワードの概念は維持し名称だけ現行化）。69〜79 行の一般定義は B003-1 の確定判断どおり変更しない。
3. **棚卸し追加語彙（FR-3.1）**: 次の 8 候補を CONTEXT.md へ追加する（選別基準 = `.agents/rules/context.md` のプロジェクト固有概念のみ。gate で人間が絞り込める形で提示する）。
   - 多体連携（leader + engineer のロール固定 worktree 運用。team.md「多体連携の運用」節が根拠）
   - ピア協議（期限 15 分・回答 1 件成立の技術確認プロトコル）
   - 承認中継（人間 → leader → engineer の承認経路。ディスパッチ定型文と中継承認定型文の 2 種）
   - HUMAN_TURN（人間同席の証跡 mint。中継承認定型文の受信直後だけ mint する規律を含む）
   - docs-only 宣言（`declare-docs-only` + 免除発動の `GUARD_EXEMPTED`。#499）
   - reference-stub と直接解決（record 成果物が共有 codekb を参照する 2 形態。#501 / #548）
   - model overlay（project-local な modelOverride 固定。管理値集合・base・fallback 発動記録。#554）
   - Ready 化（draft PR 運用における「人間はいつ merge してもよい」の意思表示。2026-07-06 恒常ルール）
   - 先勝ち + 追従（並行 Intent の共有ファイル接触時の順序規約。先に merge した側を正とし、後続が rebase で追従する。reviewer F7）
4. **横断検証（FR-3.4）**: (1) `grep -rn "docs/adr" --include="*.md" --include="*.ts" .` = BR-6 の除外 3 カテゴリ（record 内の歴史的言及、意図的な git 履歴参照、adr-template.md の一般手引き例示）以外で 0 件。(2) `grep -n -i "aidlc" CONTEXT.md amadeus/spaces/default/knowledge/glossary.md` = 0 件。(3) GD009 矛盾はキーワード列挙で検査（exact 一致ではなく）: `grep -nE "モジュールファイル|モジュールディレクトリ|intents\.md" CONTEXT.md` の全ヒットを目視分類し、**「Intent の目標プロファイル・概要・状態・一覧の置き場として旧構造（`<dirName>.md` / `intents.md` 索引）を現行として記述する箇所」が 0 件**であること。許容されるヒットは (i) 69〜79 行の一般概念定義 (ii) 110 行の Event Storming 用法（Intent 以外の現行有効な用法）(iii) 補正後の「GD009 で廃止済み」を明示する歴史的言及、の 3 種に限る（reviewer F2(b) の区別基準）。(4) `npm run test:all` pass（rename-leftovers lint 込み）、`npm run test:it:promote-skill` pass。

## code-generation 向け実行順

B001（移設 → 参照元更新 → 削除）→ B002（規範・skill・glossary）→ B003（補正・棚卸し追記）→ FR-3.4 横断検証 → validator。README と lifecycle/overview.md の編集前に engineer5 へ接触面ピア確認（先勝ち + 追従）。skill 変更は promote → `npm run test:it:promote-skill`。
