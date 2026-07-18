上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, unit-of-work.md, requirements.md, decisions.md, technology-stack.md

本 NFR は既存技術スタック(codekb `technology-stack.md`: TypeScript/ESM・Bun ランタイム・Biome・bun test)を前提とし、新規ランタイム依存を追加しない(project.md Forbidden: Bun-only 前提維持)。

# 技術スタック決定 — U1 サイズ分類台帳(SizeLedger)

本書は U1(台帳生成)の**技術スタック非機能決定**を規定する。本 intent は**設計・台帳 materialize まで**であり、生成スクリプトの実コード・CI 配線は Out。ここでの決定は「本ユニットが依拠する既存スタックと再利用資産、新規依存を追加しないこと」の明文化である。

実測 ref: 検証 HEAD `6c0faab6adf89a461aa5b3467b3f29d595ae6d60`(`git rev-parse HEAD` 実測)。

## TECH-1: 既存ランタイム・言語スタックの踏襲(新規依存追加なし)

- **ランタイム/言語 = TypeScript + Bun(既存)**: 本ユニットは project.md「Tech Stack」の既存前提(Bun、TypeScript/ESM、`tsc --noEmit` 型検査、Biome lint)を踏襲する。新しいランタイム・トランスパイラ・ビルドツールを導入しない。
- **新規依存追加なし(Bun-only 前提維持)**: U1 は `classifyTestSize`(`tests/lib/test-size.ts:49`)と既存 `test_pyramid` コレクタ形式(`scripts/metrics-snapshot.ts:97-104`)の再利用に閉じ、**新規の npm 依存・外部ライブラリを一切追加しない**(unit-of-work.md:52-58 reuse inventory)。これは project.md Forbidden「配布フレームワークへ runtime dependency を追加しない(Bun-only 前提)」に整合する。台帳組み立ての新規面は薄い純関数(`buildLedgerRow` / `buildSizeLedger`)のみ(unit-of-work.md:62-64)で、標準ランタイム機能のみで実装可能。
- **ドメインモデリングスタイル = functional-domain-modeling-ts(既存 DECIDED)**: 型定義は project.md「Code Style」DECIDED(2026-07-08、class-free、type + コンパニオンオブジェクト、判別ユニオン)に従い、既存 `test-size.ts` の型(`TestSize` / `SizeClassification` / `SizeAnnotation` / `SIZE_ORDER`)を**再利用し新規発明しない**(domain-entities.md:7-16)。`Tier` は tests/ 全域再帰に整合する**開いた集合**(既知4 named tier + harness/lib 等の補助 tier)として持ち、規約対象の `NamedTier` のみを閉じた判別ユニオンとする(判別ユニオンの網羅前提は `NamedTier` に限定、E-TPR-NR1、domain-entities.md:20-27)。

## TECH-2: 再利用資産の技術決定(唯一真実源への一本化)

- **`classifyTestSize`(test-size.ts)= size 唯一真実源の再利用**: 台帳は size 判定を独自実装せず、既存決定的純関数 `classifyTestSize` の計測出力を転記する(ADR-04 decisions.md:82-105、business-rules.md:44-49)。技術決定として、SIGNAL_PATTERN 定義・序数比較(`SIZE_ORDER`、`test-size.ts:28`)・declared パース(`parseSizeAnnotation`、`test-size.ts:279`)をいずれも**再定義しない**。ルール変更時は `test-size.ts` の1箇所が変わり台帳は自動追随する(scalability-requirements.md SCAL-1)。
- **出力形式 = 既存 `${tier}_${size}` キーの踏襲**: マトリクスキーは既存コレクタ `scripts/metrics-snapshot.ts:102`(verbatim: `values[`${tier}_${size}`] = (values[`${tier}_${size}`] ?? 0) + 1;`)と exact 一致させ、消費側(test_pyramid コレクタ)が本台帳を共通利用できる形にする(business-rules.md:40-42、domain-entities.md:51)。新しい出力スキーマ・シリアライズ形式を発明しない。
- **後方互換シム・二重実装の非追加**: 要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装を追加しない(Forbidden org.md/team.md P5、inception.md)。既存 `classifyTestSize` / `parseSizeAnnotation` / `SIZE_ORDER` は**不変で再利用**(非破壊、business-rules.md:69)。size 判定経路も二重化せず単一真実源へ一本化する(Q1 e4、business-rules.md:44-46)。
- **消費側棚卸し(将来条件 c4)**: 台帳の消費者は test_pyramid コレクタ + 移設 intent(U3)+ #683 整合計画(U3)であり、形式は既存 tier_size キーと整合する(requirements.md:50、domain-entities.md:43 のフィールド別消費者)。新規消費経路のための技術機構は本 intent では着地させない(N3、unit-of-work.md:156 — 未配線の dormant contract を残さない)。

**実装スコープ境界(Out 明記)**: 生成スクリプトの実コード・パッケージ配線・`dist`/self-install 同期・CI 配線は本 intent Out(別 intent、business-logic-model.md:53、FR-1 将来条件 requirements.md:47)。本書は技術スタック決定の設計・宣言までである。新規パッケージを導入しないため、新設パッケージへの lint/型検査配線(project.md Mandated)は該当なし(N/A、反証可能根拠: 新規 `packages/*` を追加しない)。
