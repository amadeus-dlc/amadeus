# Requirements：260706-docs-lang-guide

## Intent 分析

### 目的

docs/amadeus の言語方針を確定・文書化し（Issue #509）、その方針に従う拡張ガイドを新設する（Issue #532）。達成したい状態は次の 2 点である。

1. docs/amadeus の言語方針（英語 `*.md` を正、日本語 `*.ja.md` を併置）が文書として存在し、AMADEUS.md から参照され、後続の英語化 Issue 群（#515〜#523）が参照して進められる。
2. 「拡張したいとき、`aidlc/spaces/<space>/` の何を編集すればよいか、人間が直接編集してよいか」を判断できる拡張ガイドが docs/amadeus に存在し、記載内容がエンジン実装と実測で一致している。

### 上流の位置づけ

- 要求の正は Issue #509、#532（骨子は Maintainer 確認済み）である。intent-statement / scope-document は scope（refactor）により SKIP のため存在せず、Issue 2 件とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は `aidlc/spaces/default/codekb/amadeus/`（本 Intent の reverse-engineering で 2a0a784b 基準へ更新済み。architecture、code-structure、business-overview を消費）を参照する。
- 成果物の置き場・命名（Q1/Q2）は小さな構造判断として自己判断で確定した（questions ファイル参照。gate の人間承認で最終確定）。
- チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` の質問プロトコル（小さな構造判断の自己判断）と Git Branching Policy を参照した。

## 機能要求

### FR-1: docs/amadeus 言語方針の文書化（#509、B001）

- FR-1.1: `docs/amadeus/language-policy.md`（英語、正）と `docs/amadeus/language-policy.ja.md`（日本語）を新設する。内容: (a) `*.md` = 英語（正）、`*.ja.md` = 日本語版の併置規約 (b) 同期規約 = 乖離時は英語が正。更新 PR は原則両方を含める。片方だけを更新する場合は理由と追随予定を PR に記す (c) 相互リンク規約 = `*.md` からは `*.md` を参照する。`*.ja.md` からは `*.ja.md` を優先参照し、対応する `*.ja.md` が無い場合は `*.md` を参照する。
- FR-1.2: `AMADEUS.md` の「作業言語」節に docs/amadeus の扱い（英語正 + 日本語併置、language-policy.md 参照）を追記する。追記する一文は、`docs/amadeus/*.md` が既存 2 箇条（「返答、仕様、調査メモ、検証結果は日本語で書く」「記述系成果物とユーザー向け gate 文言は日本語を維持する」）の対象外であることを、既存の「英語必須の対象」カーブアウト（SKILL.md / TS スクリプト）と同じ様式で明示する。
- FR-1.3: `docs/amadeus/skill-language-policy.md` との責務分担を明記する（skill-language-policy = skill の言語 / language-policy = docs/amadeus 配下の文書の言語）。相互参照を張る。
- FR-1.4: 既存 15 ファイルの英語化そのもの（#515〜#523）には着手しない。方針文書の検証可能な完了基準: 同期規約・リンク規約が安定した H2 見出し（例: "Synchronization rules" / "Cross-linking rules"）を持ち、後続 Issue がアンカーで参照できること。

### FR-2: 拡張ガイドの新設（#532、B002）

- FR-2.1: `docs/amadeus/extension-guide.md`（英語、正）と `docs/amadeus/extension-guide.ja.md`（日本語）を新設し、FR-1 の言語方針に従う。
- FR-2.2: 記載内容は Issue #532 の骨子 4 点とする: (1) スケール原理（stage 定義は「何をやるか」だけを持ち、「どうやるか」は memory が担う。エンジンの run-stage directive が rules_in_context として org.md / team.md / project.md + memory/phases/<phase>.md を各ステージへ注入する）(2) 拡張ポイントの使い分け表（memory/ 3 層、memory/phases/、memory/templates/、knowledge/、codekb/、workspace 外 = scopes/・sensors/・composer）(3) 人間編集の可否と規律（memory は Maintainer の指示チャネルで直接編集可。①判断基準の追記は観察済み実例に根拠がある範囲だけ、② Corrections は learned 形式 + cid marker。knowledge/ は domain-modeling skill 経由が安全）(4) 出典の明記。
- FR-2.3: 記載内容はエンジン実装と実測で一致させる。実測アンカー: rules_in_context の実配線 = `amadeus-graph.ts`（compile が org+team+project + phases/<phase>.md を各 stage へ焼き込む）と本 record の run-stage directive 実物、templates の解決順 = `stage-protocol.md` の template resolution（memory/templates/ の上書きが skill 同梱より優先）と `amadeus-sensor-required-sections.ts` の OVERRIDE tier、cid marker = #504 修正後の新形式。推測で書かない。
- FR-2.4: knowledge 節は現状の記述（glossary / domain-map / context-map / actors、domain-modeling skill 経由）に留め、#527（CONTEXT.md / glossary 責務整理）への参照を残す。あわせて、使い分け表で Amadeus 独自の拡張ポイント（pdm scope、docs-only 宣言など上流に対応がないもの）に触れる箇所には「詳細な機能差比較は #524 に委ねる」旨の注記を残す（#527 / #428 と同じ pending-note 方式）。
- FR-2.5: `docs/amadeus/steering.md` と `README.md` から拡張ガイドへの参照を追加する。

## 非機能要求

- NFR-1: 日本語版（*.ja.md）は japanese-tech-writing 規範に従う。英語版が正であり、両者は同一内容の対訳とする（本 Intent の PR は両方を含める = 同期規約の自己実践）。
- NFR-2: 各文書は required-sections sensor（H2 見出し 2 個以上）を満たす。
- NFR-3: 実測の証跡（参照した実装ファイルと行、実 directive の rules_in_context）を record（code-summary.md または diary）に残す。

## 制約

- C-1: Bolt は B001（#509）→ B002（#532）の直列とし、PR の merge は人間が行う（#532 は #509 の方針確定に前提依存）。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。
- C-3: 本 Intent は docs 系であり実装コード・テストコードを変更しない。code-generation の workspace_requires ガードについては、成果物（docs/amadeus/*.md、AMADEUS.md、README.md）が aidlc/ 外への書き込みであり、ガード実装（amadeus-state.ts の workspaceHasWork。除外は HARNESS_DOC_DIRS = aidlc / .claude / .kiro / .codex / .git のみで docs/ は作業として数える）を自然に満たすため、`declare-docs-only` は不要である（functional-design での実測訂正。当初想定の「declare-docs-only を初実使用」は、成果物が record 内に閉じる Intent にだけ必要）。

## 前提

- A-1: #532 の骨子は Issue 本文に記載済みで Maintainer 確認済みである（ディスパッチ承認要旨）。
- A-2: 言語方針の対象は docs/amadeus 配下に限る。`aidlc/**`、`.kiro/specs/**`、テンプレート由来 Markdown、gate 文言の日本語維持（AMADEUS.md 作業言語節）は変わらない。

## スコープ外

- 既存 docs/amadeus 15 ファイルの英語化（#515〜#523）。
- CONTEXT.md / glossary の責務整理（#527）。
- 機能差一覧（#524）。
- docs/amadeus 以外（README、CONTEXT.md 等）の言語方針変更。

## 未解決事項

- O-1: 拡張ガイドの使い分け表における composer の記述粒度は、#428（上流 2.2.0 同期、composer 導入）が merge 前のため「2.2.0 取り込み後に利用可能になる」旨の検討中注記とする（Design Honesty。#428 merge 後の追随は同 Intent または後続で行う）。
