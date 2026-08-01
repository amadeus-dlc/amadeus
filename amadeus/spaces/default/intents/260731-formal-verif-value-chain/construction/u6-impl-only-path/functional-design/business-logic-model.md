# Business Logic Model — u6-impl-only-path

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u6 は `updateModelMap --impl-only`(FR-D1)と SOURCE_DRIFT 案内(FR-D2)を実装する Unit(unit-of-work.md の u6、components.md C7、intent-capture Q1=A「両方」裁定)。story-map の「実装のみ変更時に SOURCE_DRIFT から正規復旧できる(#1510 の詰み解消)」に対応。

## 判定・更新のモデル

### P1: 分岐条件(component-methods.md C7 の契約)

`updateModelMap --impl-only` の受理条件: **model/cfg identity 不変** AND **impl drift が存在**。
- model/cfg 不変判定: 既存の identity 比較(:650-659 の `assets.modelIdentity === loaded.map.model.identity && assets.cfgIdentity === ...`)を再利用。
- **impl drift 判定の配線(reviewer iteration 1 M2 の確定)**: check 経路の既存関数を再利用する — `evaluateEntries`(:409-440)で currentEntries を算出し、`loaded.canonical.diffModelMap(loaded.map, currentEntries)`(checkModelCompleteness :490 と同一の呼び方)で drift 有無を判定する。**独自の比較ロジックは書かない**(check/loader と同じ「drift」を第3の実装で再定義しない — 複製禁止ガードレール)。既存 update 経路(`performModelMapUpdate` :630-686)にはこの配線が存在しないため、`--impl-only` 分岐で新規に配線する(evaluateAssets のみの現構造への追加であり、無フラグ経路は触らない)。
- model/cfg が変わっている → `--impl-only` を**拒否**(誤用ガード — 従来経路 `updateModelMap` を案内)。モデル意味論の変更を impl-only と偽装させない。
- impl drift なし(diffModelMap が差分なし)→ 更新対象なしとして no-op 拒否(現行 MODEL_UNCHANGED と同型の loud 応答)。
- 受理時: entries[].sha256 を実測値へ更新して publish(既存 `updatedEntries` :608-626 の全再計算+publish 経路を再利用)し、**監査記録**(P2)を出す。

### P2: 監査記録(reviewer iteration 1 M1 の機構確定)

本ツールは intent 非依存の汎用 CLI(import は node:* と model-map モジュールのみ — reviewer 実測)であり、amadeus 監査シャード(active-intent 前提の appendAuditEntry)への結線は汎用性を壊すため**採らない**。#1510 裁定の「監査行付きで更新」は次の2層で充足する:
1. **stdout 構造化結果**: 成功時の JSON に `{ code: "IMPL_ONLY_UPDATED", declared: "impl-only", changed: [{ implPath, from: <旧sha256 先頭12>, to: <新sha256 先頭12> }] }` を含める — 更新の事実・宣言の受領・対象と差分が機械可読で残る(実 publish の戻りから導出 — P5)。
2. **git コミット面**: model-map.json の diff 自体が恒久記録(このリポジトリの台帳哲学 — version-controlled ledger)。運用規約として、`--impl-only` 更新を含む PR は stdout 結果を PR 本文へ転記する(#1510 の暫定運用「手編集+PR 本文明記」の正規化)。
新イベント種の発明も amadeus audit 依存の導入もしない(FD 段の interpretation として diary へ記録 — FR-D1 AC の「監査行」の実現形の確定)。

### P3: 宣言要求

`--impl-only` フラグ自体が「モデル意味論に影響しない」宣言(intent-capture Q1 裁定の宣言要求)。フラグなしの `updateModelMap` は現行挙動(MODEL_UNCHANGED 拒否)を完全維持 — 後方互換。

### P4: 案内文面(FR-D2)

- MODEL_UNCHANGED の detail 文面へ正規手順(`--impl-only`)を追記(amadeus-sensor-model-completeness.ts:655-659 の return ブロック、detail は :658)。
- センサー manifest 文書(.claude/sensors/amadeus-model-completeness.md:35-41 — 「MODEL_UNCHANGED で拒否される」記述は :39)へ `--impl-only` の正規手順を同期追記。
- SOURCE_DRIFT 側(tla-model-loader-internal.ts:232 の detail「implementation entry hash differs from model map」)は u1 移設後のプラグイン側ファイルになる — 文面へ正規手順を追記する場合は移設後パスで行う(u1 依存)。

### P5: 成功コード(reviewer iteration 2 Major の確定)

現行型は成功枝 `{ ok: true, entries, map }`(:70-71)に code を持たず、code union は失敗枝(:73-82)のみ — 「既存 code union へ追加」は誤誘導のため撤回する。確定形: **第3の判別 union メンバーを新設**する — `{ ok: true; code: "IMPL_ONLY_UPDATED"; declared: "impl-only"; changed: readonly { implPath; from; to }[]; map }`。無フラグ経路の成功形 `{ ok: true, entries, map }` は**フィールド追加なしのバイト不変**(I2 の厳守 — 案 (a) の optional 拡張は無フラグ出力形を緩めるため不採用)。stdout 形は型そのもの(main :775-793 の JSON.stringify 直書き — reviewer 実測)なので、この union 追加が P2 の stdout 契約を型レベルで固定する。**成功コードは実 publish の戻りから導出**(検証劇場回避)。

### P6: deadline 配管(reviewer iteration 2 Minor)

`evaluateEntries` は deadline 引数を要求する(check 経路は `deps.now() + DEFAULT_DEADLINE_MS` :456 で算出)。`--impl-only` 分岐への配線時に同じ算出を plumb する(機械的追加 — 独自のタイムアウト方針は導入しない)。

## 不変条件

- **I1(意味論ガード)**: model/cfg identity が1ビットでも変わっていれば `--impl-only` は必ず拒否(P1 — fail-closed)。
- **I2(後方互換)**: フラグなし経路の挙動・出力はバイト等価(既存テスト t-formal-verif-model-completeness-sensor 系が green を維持)。
- **I3(u1 依存)**: SOURCE_DRIFT 検出面(loader)は u1 移設後の plugin 側 — u6 のテストは移設後パスを踏む(edge block depends_on どおり)。
- **I4(検証劇場禁止)**: 監査行・成功コードは実行結果からのみ導出。

## テスト設計(t380 予約済み)

(1) impl のみ変更 → SOURCE_DRIFT 赤 → `--impl-only` → 監査行記録+check green(FR-D1 AC の一連) (2) model 変更時の `--impl-only` 拒否 (3) drift なし時の no-op 拒否 (4) フラグなし経路の後方互換(既存挙動バイト等価) (5) MODEL_UNCHANGED detail に正規手順が載る(FR-D2 AC)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T13:19:22Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major 2: 監査行機構未特定・impl drift 算出元未特定)→ stdout+git 2層監査(intent 非依存維持)と evaluateEntries+diffModelMap 再配線で是正、iteration 2 READY。iteration 2 の新 Major(成功枝に code 不在)は第3 union メンバー新設(無フラグ成功形バイト不変)で、Minor(deadline 配管)は P6 追記で即時確定済み。UTC 2026-07-31T13:18:10Z

### Findings

- iteration1 Major: 監査行の書込先未特定 — stdout 構造化結果+git コミット面の2層で確定(amadeus 監査シャード非依存)
- iteration1 Major: impl drift 判定の算出元未特定 — check 経路の evaluateEntries+diffModelMap を再配線(複製禁止)
- iteration2 Major: 成功枝に code union 不在 — 第3判別メンバー新設で確定(無フラグ成功形はバイト不変)
- iteration2 Minor: evaluateEntries の deadline 配管 — P6 で明記
