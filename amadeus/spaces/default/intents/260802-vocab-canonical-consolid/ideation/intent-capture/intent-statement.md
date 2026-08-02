# Intent Statement — 用語定義の正本一本化 (#2030)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。入力はユーザーの initiative 記述と Issue #2030、および本ステージの質問票回答)

## Problem Statement

Amadeus リポジトリの用語定義が7つの独立面(`CONTEXT.md` / `docs/guide/glossary.md` / `glossary.ja.md` / `domain-language.md` / `stage-protocol.md` §9 / `docs/reference/04-stage-protocol.md` / 同 `.ja.md`)に分散し、正本を指名する生きた契約が存在しない。その結果、**意味の異なる同名語が既に出荷面へ混入している**(Unit of Work の三重定義と Bolt 契約との矛盾、Guardrail の相互排他定義、件数語の陳腐化、Scope 外延の不足 — #2030 クロスレビュー xrev-2030-20260802081731 で実測確定)。さらに「正典」を名乗る glossary はどのハーネスにも出荷されず、ステージ実行コンテキストへ届く面(stage-protocol §9、domain-language.md)は正本を名乗らない — 権威と到達性が逆転している。用語面を検査するテスト・CI は皆無で、ドリフトは構造的に不可視である。

原因の所在: bootstrap 初期実装由来(`origin:bootstrap`、コミット 5cfb16165)。#527/PR#580 の旧裁定は 2026-07-06 の main restart で系譜ごと失われ、再確立されていない。

## Target Customer

- **ステージ実行中のエージェント(全ハーネス)**: 同一定義を実行コンテキストで参照でき、成果物への異義同名語の混入が構造的に止まる
- **ドキュメント読者(利用者・コントリビュータ)**: どのファイルを見れば意味が確定するかが一意になる
- **メンテナ**: 用語の追加・変更は正本1ペアの編集だけで全面へ波及し、更新漏れは drift guard が機械検出する

## Success Metrics

- 独立定義面が 7 → **1ペア**(`docs/guide/glossary.md` / `.ja.md`)に縮約され、他はすべて機械投影(drift guard 付き)である
- 実測済みの意味矛盾(Unit of Work / Guardrail / Scope 外延 / 件数語)が **0 件**になる
- 正本↔投影・EN↔JA の不一致を検出する検証ゲートが CI に存在し、**落ちる実証**を経ている
- 全7ハーネスのステージ実行コンテキストへ正本と同内容の用語が供給される
- symlink・定義を持たないポインタのみ用語 md が **0 件**

## Initiative Trigger

Issue #2030(bug / P2 / S3-MAJOR / origin:bootstrap)。クロスレビュー2名(収束 `REFRAME_REQUIRED` → 本文改稿済み)で分散・矛盾・検証不能が実測確定し、ユーザーが 2026-08-02 に正本一本化を裁定した。

## 確定済み裁定(仕様、変更にはユーザー再裁定が必要)

1. 正本 = `docs/guide/glossary.md` / `glossary.ja.md`(EN/JA ペア)へ一本化
2. `domain-language.md` は削除。チーム固有語彙(31語・表記規則)は正本へ吸収
3. `CONTEXT.md` は削除。self-* 4語は正本へ統合(スコープ運用の正準は project.md § Scope Overrides のまま)【Q1=A】
4. intent 実行時も同一定義を見る — 全ハーネスのステージ実行コンテキストへ正本と同内容を供給
5. **シンボリックリンク禁止**・**定義を持たないポインタのみの用語 md 禁止** — 供給・参照面は dist 同型の機械投影+drift guard で実現
6. stage-protocol §9 / docs/reference/04 の Terminology 節は、正本側の投影対象マーカーによる**部分集合の機械抽出**で導出【Q3=B】
7. `slo-sli-patterns.md` の Key Terminology は統合せず、drift guard の検査(正本と矛盾する定義を持たない)対象にのみ含める【Q2=A】

## Initial Scope Signal

self-document(確定済み — ユーザー選択)。文書正本の再編+機械投影+検証ゲート新設が主で、RE による実測接地と build-and-test の docs ゲートを必須とする構成が適合。検証ゲート・投影生成は TDD+落ちる実証の対象(tdd-default-with-narrow-exceptions)。
