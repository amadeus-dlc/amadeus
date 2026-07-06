# Code Generation Plan — adr-vocab

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md) / [business-rules.md](../functional-design/business-rules.md) / [domain-entities.md](../functional-design/domain-entities.md) / [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施順序

business-logic-model.md の「code-generation 向け実行順」に従い、B001 → B002 → B003 → 横断検証の順で進める。README と lifecycle/overview.md の接触面ピア確認は business-rules.md BR-7 で決着済みのため、設計どおりの内容で直接編集する。

## B001: docs/adr 退役

1. `docs/amadeus/extension-guide.md` へ「## Design lineage」を追加し、ADR 0001（Lifecycle Binding / Profile）の判断要旨 + git 履歴参照を 1 段落で記す。`extension-guide.ja.md` へ「## 設計判断の由来」を対応内容で追加する。両ファイルの「see #527, pending」参照 2 箇所（knowledge 拡張ポイント行、人間編集の規律の段落）を確定後の記述（`CONTEXT.md` = 正準、`glossary.md` = 抜粋）へ更新する。
2. `docs/amadeus/lifecycle/overview.md`「Artifact layout」節末尾へ、ADR 0002（Intent Phase Directory Layout）の判断要旨 + 経緯参照を英語 1 段落で追記する。`overview.ja.md`「成果物配置」節末尾へ日本語 1 段落で追記する。見出し文言はいずれも変更しない。訳語は同ファイル既存節と engineer2 の訳語対応表に合わせる。
3. `docs/adr/README.md`「同期ルール」の一般規範（逆同期・確定語彙のみ・実装優先）を `.agents/rules/context.md` の新設「## 同期規約」節へ 4 項目で統合する。ADR 前提の規範（ADR ↔ CONTEXT.md 逆同期そのもの）は移さず退役させる。
4. `README.md` 155 行 / `README.ja.md` 155 行の ADR リンク行を、判断記録の現行の置き場（Intent record の decision・steering・`CONTEXT.md`）への説明へ置換する。
5. `skills/amadeus-domain-modeling/SKILL.md`（8 / 21 / 209 行）の docs/adr 言及を除去し、`CONTEXT.md` = 正準、`glossary.md` = 抜粋の位置づけへ更新する。`evals/README.md` の同種の言及も現行化する。編集後 `dev-scripts/promote-skill.ts amadeus-domain-modeling --replace` で昇格し、`npm run test:it:promote-skill` で検証する。
6. `git rm -r docs/adr/` で削除する。互換 stub・リダイレクトは置かない。`adr-template.md`（`.agents/amadeus/knowledge/amadeus-architect-agent/`）は対象外であり触れない。

## B002: 正準・境界・同期規約

1. `CONTEXT.md` の「ADR」定義（旧 80 行）を、退役済みの体系であることと移設先・判断記録の現行の置き場を示す定義へ置換する。
2. `CONTEXT.md` の「Glossary」定義（旧 338 行）へ、`CONTEXT.md` を唯一の定義元とし `glossary.md` は一方向・手動同期の抜粋であることを追記する。
3. `amadeus/spaces/default/knowledge/glossary.md` の冒頭に、抜粋宣言 + `CONTEXT.md` 参照 + 同期方向の 2 文を追記する。

## B003: 補正と棚卸し

1. GD009 矛盾 8 箇所（概要・依存・目標プロファイルの Intent モジュールファイル配置、Intent Record の構成要素、目標プロファイルの配置、Intent Phase Directory Layout の「モジュールディレクトリ配下」定義、モジュールファイルと `amadeus-state.md` の配置、`intents.md` 一覧・索引に関する記述 2 箇所、登録層の構成要素）を、現行契約（正準台帳 = `intents.json`、目標プロファイル等は record 成果物、人間向け一覧は都度生成）へ置換する。69〜79 行の一般定義（モジュールファイル / モジュールディレクトリ / モジュール構造）と Event Storming 用法は変更しない。
2. 旧名補正: `CONTEXT.md` の「Aidlc State」5 箇所を「Amadeus State」（見出し語含む）へ改名する。`glossary.md` の `aidlc/` → `amadeus/`、`target-aidlc/` → `target-amadeus/` を補正する。
3. 棚卸し 9 語彙（多体連携、ピア協議、承認中継、HUMAN_TURN、docs-only 宣言、reference-stub と直接解決、model overlay、Ready 化、先勝ち + 追従）を `CONTEXT.md` の既存構造を尊重した位置へ追加する。
4. 横断検証: (1) `docs/adr` grep、(2) `aidlc` grep（`CONTEXT.md` + `glossary.md`）、(3) GD009 キーワード grep の目視分類、(4) `npm run test:all` と `npm run test:it:promote-skill`。

## 検証観点との対応

| 検証項目 | 対応する作業 |
|---|---|
| docs/adr が存在せず、有効判断が移設先から参照できる | B001-1, B001-2, B001-6 |
| repo 内に docs/adr への壊れた参照が残っていない | B001-4, B001-5, B001-6, 横断検証 (1) |
| 語彙の正準・責務境界・同期規約が確定し、rules と skill の記述が一致 | B002-1〜3, B001-3 |
| 2026-07-04 以降に確定した語彙が正準側へ反映されている | B003-3 |
| CONTEXT.md に GD009 と矛盾する記述が残っていない | B003-1, 横断検証 (3) |
| npm run test:all が pass する | 横断検証 (4) |
