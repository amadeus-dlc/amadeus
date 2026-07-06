# Requirements：260706-adr-vocab

## Intent 分析

### 目的

判断記録と語彙の置き場を現行契約へ整理する（Issue #525 + #527 + #560 の束ね、Maintainer 承認済みディスパッチ）。達成したい状態は次の 3 点である。

1. docs/adr が退役し、有効判断 2 点が現行の置き場から参照でき、壊れた参照が残っていない（#525）。
2. 語彙の正準・責務境界・同期規約が確定し、`.agents/rules/context.md` と関係 skill の記述が一致している（#527）。
3. 2026-07-04 以降に確定した語彙が正準側へ反映され、CONTEXT.md に GD009 と矛盾する記述が残っていない（#527 + #560）。

### 上流の位置づけ

- 要求の正は Issue #525 / #527 / #560 とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み）である。intent-statement / scope-document は scope（refactor）により SKIP のため存在しない。
- 対象 seam の一次情報は本ステージの直接実測（docs/adr 4 ファイル、CONTEXT.md 392 行、glossary.md 30 行、参照元 grep）である。コードベースの全体像は codekb（[business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)。reverse-engineering 段で 0075f931 まで差分更新済み）を参照した。
- 束ね判断と依存順（B001 = #525 → B002 = #527 → B003 = #560 内包）はディスパッチで承認済み。#527 の正準判断は gate 報告で判断案と根拠を明示し、leader が内容精査する（ディスパッチ条件）。
- 接触面: engineer5 の guide-intro が README へ最小行追記予定のため、README を触る前にピア確認する（先勝ち + 追従）。#569（ガイド記録系 3 章）が #527 の確定を待つ。

### 実測事実（本ステージで確認）

- docs/adr は README + ADR 3 件。0003 = 上書き済み、0002 = 成果物ルートは #387 で置換済みだが「phase ディレクトリ構成の判断は引き続き有効」と自己宣言、0001 = 採用（Lifecycle Binding / Profile）。
- CONTEXT.md 同期ルール（逆同期の規範）は docs/adr/README の「同期ルール」節にあり、退役で置き場が浮く。
- docs/adr への参照元（record 内の歴史的言及を除く）: README.md 155 行、README.ja.md 155 行、`skills/amadeus-domain-modeling/SKILL.md`（8 / 21 / 209 行）と昇格先、`skills/amadeus-domain-modeling/evals/README.md`。`adr-template.md` は別物（Intent record 内テンプレート）で残す。
- CONTEXT.md に旧名残存 5 箇所（154 / 155 / 162 / 165 / 201 行、すべて「Aidlc State」）と GD009 矛盾 1 箇所（169〜170 行「目標プロファイルは Intent のモジュールファイルに置く」）。
- glossary.md は stage0/1/2 と build/host/target の運用語彙 12 語 + 避ける語 2 + 禁止ワード 1 のみで、旧名残存は 2 行・出現 3 件（9 行目「自己開発用 `aidlc/`」、30 行目は用語欄 `target-aidlc/` と理由欄 `aidlc/` の両方）。
- `amadeus-domain-modeling` skill は「repo の CONTEXT.md や docs/adr の更新には使わない」と明記し、反映先は glossary.md である。

## 機能要求

### FR-1: docs/adr の退役（#525、B001）

- FR-1.1: まだ有効な判断 2 点を移設する。(1) ADR 0001 全体（Lifecycle Binding / Profile で Agent Skills を DLC に束ねる判断）、(2) ADR 0002 のうち phase ディレクトリ構成の判断。移設先は docs/amadeus/ 配下の実在文書（lifecycle/ または extension-guide 等）とし、実在文書の見出し・粒度に合わせて設計段で確定する（実在しない文書を新設しない。移設は判断の要旨 + 経緯参照で足り、ADR 全文の複製は要しない）。
- FR-1.2: docs/adr/README の「同期ルール」節のうち、ADR 前提の規範（ADR ↔ CONTEXT.md の逆同期）は退役し、一般規範（語彙の逆同期・確定語彙だけを追加・実装優先）は `.agents/rules/context.md` へ統合する（FR-2 の同期規約と一体で確定）。
- FR-1.3: 参照元を更新する: README.md / README.ja.md の ADR リンク、`amadeus-domain-modeling` skill の docs/adr 言及（source を更新し promote-skill.ts 経由で昇格先へ同期）、evals/README。`adr-template.md`（`.agents/amadeus/knowledge/amadeus-architect-agent/`）は残す。
- FR-1.4: docs/adr/ を削除する。互換 stub・リダイレクトは置かない（backward-compatibility ルール）。

### FR-2: 語彙の正準・責務境界・同期規約（#527、B002）

- FR-2.1: 正準は CONTEXT.md とする（判断案 (a) の改良版。gate で人間確定）。CONTEXT.md = 開発リポジトリのドメイン語彙の唯一の定義元（現行 `.agents/rules/context.md` の規範を維持）。glossary.md = workspace 運用で頻用する語（働き方・steering 由来の運用語彙）の抜粋 + CONTEXT.md への参照とし、独自定義を持たない。
- FR-2.2: 同期の向きは CONTEXT.md → glossary.md の一方向（抜粋）とする。更新トリガー: 新語彙の確定時は Intent の gate 承認までに CONTEXT.md へ反映（`.agents/rules/context.md` の既存 MUST を維持）。glossary への抜粋は workspace 運用語彙に変化があった場合だけ行う。
- FR-2.3: `amadeus-domain-modeling` skill の記述を境界確定に合わせて更新する（「CONTEXT.md を更新しない」制約は維持。glossary の位置づけを「抜粋」へ更新。source + 昇格先、言語方針準拠）。
- FR-2.4: `.agents/rules/context.md` へ同期規約（FR-1.2 の一般規範 + FR-2.2 のトリガー）を統合し、規範の置き場を 1 箇所にする。

### FR-3: 未反映語彙の棚卸しと GD009 矛盾補正（#527 + #560、B003 内包）

- FR-3.1: 2026-07-04 以降の Intent 群で確定した語彙を棚卸しし、CONTEXT.md へ追記する。棚卸しの走査源は steering（team.md の多体連携節・Corrections）、merge 済み Intent record の decision、CONTEXT.md 既存見出しとし、候補は設計段で一覧化して gate で確定する（候補例: 多体連携のロール・定型文 2 種・ピア協議、docs-only 宣言 = GUARD_EXEMPTED、reference-stub と直接解決、installer / 配布、model overlay、draft PR 運用。`.agents/rules/context.md` の追加基準 = プロジェクト固有概念のみ・一般技術語や単発ラベルは追加しない、に従い選別する）。
- FR-3.2: CONTEXT.md の GD009 矛盾（169〜170 行「目標プロファイルは Intent のモジュールファイルに置く」）を現行契約（正準台帳 = intents.json、成果物 = record 配下）へ補正する（#560）。
- FR-3.3: CONTEXT.md の旧名残存（「Aidlc State」5 箇所すべて = 154 / 155 / 162 / 165 / 201 行）と glossary.md の旧名残存（2 行・出現 3 件。30 行目は用語欄と理由欄の両方を補正する）を、#526 rename 後の現行名（Amadeus State / `amadeus/`）へ補正する（棚卸しで検出した事実。用語の概念自体は維持し、名称だけ現行化する）。
- FR-3.4: 横断 grep で GD009 矛盾・旧名残存・docs/adr 壊れ参照がゼロであることを検証する（record 内の歴史的言及と git 履歴参照は除外）。

## 非機能要求

- NFR-1: 受け入れは決定論的に検証する。`npm run test:all` pass（rename-leftovers 等の既存 lint を含む）、FR-3.4 の横断 grep、validator pass（. + 260706-adr-vocab）。skill 変更は `npm run test:it:promote-skill` pass。
- NFR-2: 文書変更は日本語規範（`japanese-tech-writing`）と言語方針（skill の SKILL.md は英語必須）に従う。

## 受け入れ条件（Issue 由来）

| 条件 | 由来 | 検証 |
|---|---|---|
| docs/adr/ が存在せず、有効だった判断が移設先から参照できる | #525 | FR-1、横断 grep + 移設先実在確認 |
| repo 内に docs/adr への壊れた参照が残っていない（record 内の歴史的言及は除く） | #525 | FR-1.3 / FR-3.4 |
| 語彙の正準・責務境界・同期規約が確定し、rules と skill の記述が一致 | #527 | FR-2、gate の人間確定 |
| 2026-07-04 以降に確定した語彙が正準側へ反映されている | #527 | FR-3.1、棚卸し一覧と CONTEXT.md 差分 |
| CONTEXT.md に GD009 と矛盾する記述が残っていない（横断 grep で確認） | #560 | FR-3.2 / FR-3.4 |
| `npm run test:all` が pass する | #525 | NFR-1 |
