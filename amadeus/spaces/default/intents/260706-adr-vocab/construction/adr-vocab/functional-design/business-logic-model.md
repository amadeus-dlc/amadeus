# Business Logic Model — adr-vocab

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## B001: docs/adr 退役の実施設計（FR-1）

1. **移設 1（ADR 0001 全体）**: `docs/amadeus/extension-guide.md` に「## Design lineage」（.ja.md は「## 設計判断の由来」）を追加し、Lifecycle Binding / Profile の判断要旨（Agent Skills を DLC の phase・成果物・gate へ束ねる採用判断、却下案 = Plugin / MCP 直結、経緯 = 2026-06-28 採用）を 1 段落 + git 履歴参照（`git log -- docs/adr/0001-lifecycle-binding-profile.md`）で記す。全文複製はしない（FR-1.1）。
2. **移設 2（ADR 0002 の有効部分）**: `docs/amadeus/lifecycle/overview.md` の「成果物配置」節末尾に、phase ディレクトリ構成（record 直下を `initialization/ ideation/ inception/ construction/ operation/` で分ける判断。成果物ルートと状態ファイル名は #387 で v2 準拠へ置換済み）の要旨 + 経緯参照を 1 段落で追記する。lifecycle/ は現状日本語のみで .ja.md 併置がないため、既存の言語状態に合わせて日本語で追記する（英語化は docs-i18n 側 Issue 群の責務。**engineer5 の docs-i18n と接触しうるため、編集前に接触面をピア確認する**）。
3. **同期ルールの統合**: docs/adr/README「同期ルール」から一般規範だけを `.agents/rules/context.md` へ移す（詳細は B002 の 2）。ADR 前提の規範（ADR ↔ CONTEXT.md 逆同期、ADR の役割記述）は退役し、移さない。
4. **参照元更新**: README.md / README.ja.md の 155 行 ADR リンクを「判断記録は Intent record の decision・steering・CONTEXT.md（語彙）が持つ」旨の 1 行へ置換（**先に engineer5 へピア確認**）。domain-modeling skill の 3 箇所（B002 の 3）。evals/README の言及を現行化。
5. **削除**: `git rm -r docs/adr/`。互換 stub・リダイレクトなし（backward-compatibility ルール）。`adr-template.md` は不変。

## B002: 語彙の正準・境界・同期規約（FR-2、Q1 = (a) 改良版で人間確定済み）

1. **CONTEXT.md 側**: 「**ADR**」定義（80 行）を「判断記録」の現行定義へ置換する（ADR は退役済み。判断は Intent record の decision、grilling trail、steering 根拠表が持ち、語彙は CONTEXT.md が持つ）。「**Glossary**」定義（338 行）へ「CONTEXT.md を唯一の定義元とし、glossary.md は workspace 運用で頻用する語の抜粋 + 参照である。同期は CONTEXT.md → glossary の一方向・手動」を追記する。
2. **`.agents/rules/context.md` 側**: 「## 同期規約」節を追加し、次を定める。(1) 新語彙の確定時は対象 Intent の gate 承認までに CONTEXT.md へ反映する（既存 MUST の維持・明文化）。(2) 実装・merge 済み差分と CONTEXT.md がずれた場合は現行実装を優先して確定語彙だけを逆同期する（旧 docs/adr/README の一般規範の統合）。(3) glossary.md は抜粋であり、workspace 運用語彙に変化があった場合だけ CONTEXT.md から反映する。(4) 未決定事項・一時的な実装都合は追加しない（既存基準の維持）。
3. **domain-modeling skill 側**（英語、source → promote）: 8 行「Do not use this to update the repo's development `CONTEXT.md` or `docs/adr`.」→ docs/adr 言及を除去し「`CONTEXT.md` is the canonical vocabulary source maintained at Intent gates; this skill only maintains the workspace excerpt (`glossary.md`) and its siblings」の趣旨へ。21 行・209 行も同様に docs/adr 言及を除去し、glossary = 抜粋の位置づけへ更新。
4. **glossary.md 側**: 冒頭に「この用語集は workspace 運用語彙の抜粋である。語彙の定義元（正準）は開発リポジトリの `CONTEXT.md` である」を追記。

## B003: 棚卸しと補正（FR-3。一覧は gate で確定）

1. **GD009 補正（FR-3.2）**: CONTEXT.md 169〜170 行「目標プロファイルは Intent のモジュールファイルに置く」→「目標プロファイルは Intent Registry（`intents/intents.json`）の行と record 成果物が扱う」へ置換。
2. **旧名補正（FR-3.3）**: 「Aidlc State」5 箇所（154 / 155 / 162 / 165 / 201 行）→「Amadeus State」（見出し語も改名。実ファイル名 `amadeus-state.md` と一致させる）。glossary.md の 9 行目 `aidlc/` → `amadeus/`、30 行目の用語欄 `target-aidlc/` → `target-amadeus/` と理由欄 `aidlc/` → `amadeus/`（禁止ワードの概念は維持し名称だけ現行化）。あわせてモジュールファイル / モジュールディレクトリ / モジュール構造の既存定義（69〜79 行）に GD009 退役の注記が必要かを code-generation で実測判断する（定義自体が廃止概念を現行として扱っていれば補正対象）。
3. **棚卸し追加語彙（FR-3.1）**: 次の 8 候補を CONTEXT.md へ追加する（選別基準 = `.agents/rules/context.md` のプロジェクト固有概念のみ。gate で人間が絞り込める形で提示する）。
   - 多体連携（leader + engineer のロール固定 worktree 運用。team.md「多体連携の運用」節が根拠）
   - ピア協議（期限 15 分・回答 1 件成立の技術確認プロトコル）
   - 承認中継（人間 → leader → engineer の承認経路。ディスパッチ定型文と中継承認定型文の 2 種）
   - HUMAN_TURN（人間同席の証跡 mint。中継承認定型文の受信直後だけ mint する規律を含む）
   - docs-only 宣言（`declare-docs-only` + 免除発動の `GUARD_EXEMPTED`。#499）
   - reference-stub と直接解決（record 成果物が共有 codekb を参照する 2 形態。#501 / #548）
   - model overlay（project-local な modelOverride 固定。管理値集合・base・fallback 発動記録。#554）
   - Ready 化（draft PR 運用における「人間はいつ merge してもよい」の意思表示。2026-07-06 恒常ルール）
4. **横断検証（FR-3.4）**: `grep -rn "docs/adr" --include="*.md" --include="*.ts" .`（record と git 履歴参照を除外）= 0 件、`grep -n -i "aidlc" CONTEXT.md amadeus/spaces/default/knowledge/glossary.md` = 0 件、GD009 矛盾表現（「モジュールファイルに置く」）= 0 件、`npm run test:all` pass（rename-leftovers lint 込み）、`npm run test:it:promote-skill` pass。

## code-generation 向け実行順

B001（移設 → 参照元更新 → 削除）→ B002（規範・skill・glossary）→ B003（補正・棚卸し追記）→ FR-3.4 横断検証 → validator。README と lifecycle/overview.md の編集前に engineer5 へ接触面ピア確認（先勝ち + 追従）。skill 変更は promote → `npm run test:it:promote-skill`。
