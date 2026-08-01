# Tech Stack Decisions — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節), business-logic-model(§1 D-U4-1 / §9.1 所有ファイル), business-rules(BR-SC5), requirements(NFR-4), u1 functional-design(リゾルバ配置)

## 判定

**新規技術選定なし — 既存スタック内の配置決定のみ。** requirements NFR-4(新規外部依存なし)により、言語・ランタイム・フレームワーク・ライブラリの追加・変更は全て対象外である。本 Unit に関わる技術面の決定は既存スタック内の物理配置(D-U4-1)の1件のみであり、business-logic-model §1 で裁定済みのものをここに NFR 面の裏付けとして転記する。

## 既存スタック(変更なし)

| 領域 | 現行 | 本 Unit での扱い |
|---|---|---|
| 言語 / ランタイム | TypeScript / Bun | 変更なし(sensor 拡張も同一ファイル内 TypeScript) |
| テスト | bun test(unit / integration) | 変更なし(t405 新規・t380 拡張は既存基盤を踏襲) |
| 配布機構 | `scripts/package.ts` の GENERATED_PLUGIN_SOURCES(generator-owned byte-identical 複製) | **既存機構へ1行追加**(下記 D-U4-1) |
| ハッシュ / canonical 化 | 既存の `canonicalIdentity`(canonical JSON + sha256、`amadeus-formal-verif-model-map.ts` :33-47) | 変更なし(同一アルゴリズムの再利用 — ADR-1 / services S3) |

## 決定 D-U4-1(business-logic-model §1 の転記)

- **決定**: u1 リゾルバ `tla-module-deps.ts` の canonical home を `packages/framework/core/tools/` に置き、plugin 側(`plugins/formal-model-check/tools/`)は `scripts/package.ts` の GENERATED_PLUGIN_SOURCES への1行追加で generator-owned 複製とする。sensor は `./tla-module-deps.ts` をローカル import する。
- **根拠(NFR 面)**: NFR-4 を満たしつつ BR-SC5(集合計算の単一実装)を成立させる唯一の配置。cross-tree import は `scripts/package.ts` :785-792 の投影制約で禁止、sensor 側別実装は ADR-2 却下案(規則ドリフトの温床)に該当するため、どちらも不可。
- **検証**: `bun scripts/package.ts --check` が複製 drift を赤にする。`bun run typecheck` / `bun run lint` green。

## 非適用の補足

データベース・メッセージング・インフラサービス・UI フレームワークの選定は非適用である(変更面にこれらの要素が存在しない — unit-of-work u4 所有ファイル節のとおり、触るのは TypeScript ツール・JSON 宣言・テストのみ)。
