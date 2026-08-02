# Performance Design — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): performance-requirements(PERF-U4-1〜3 / 非適用補足), security-requirements(SEC-U4-1: safeReadFile 経由の据え置き), scalability-requirements(非適用判定 — 複雑度上界は PERF-U4-2 へ集約), reliability-requirements(REL-U4-3 決定性 / REL-U4-5 後方互換), tech-stack-decisions(新規技術選定なし — 既存スタック内配置 D-U4-1), business-logic-model(§2.1 aux 計測拡張 / §2.2 宣言照合ステップ / §5 timeout 予算)

## パフォーマンス設計方針

本 Unit は単発 CLI / CI 検証ツールの拡張であり、新設する性能機構は存在しない。設計の全内容は「宣言照合ステップが既存の測定・予算・計算量の枠組みに載る」ことの固定である。business-logic-model §2 で規定済みの機構をそのまま NFR 機構として採用し、新規のキャッシュ・並列化・非同期化は導入しない(要件側の非適用判定どおり)。

## NFR → 機構マッピング

| NFR | 設計機構(functional-design 由来、新規発明なし) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| PERF-U4-1(deadline・totalBytes 予算の尊重) | 宣言照合の全読込を `deps.readFile`(safeReadFile)経由に限定し totalBytes 予算(:31-33)へ計上。照合ループ先頭で check の deadline(:493)を確認し、超過時は従来どおり timeout finding で終了。宣言照合専用の読込経路は作らない(business-logic-model §5「timeout 予算」/ §2.2) | sensor 系既存4テスト(timeout 系を含む)が期待値不変で green(REL-U4-5 / BR-I1)。コードレビューで照合ループ先頭の deadline 確認と `deps.readFile` 以外の読込経路ゼロを確認(BR-SC6 / BR-I3) |
| PERF-U4-2(O(N × (V + E)) の線形性) | u1 リゾルバ `resolveAuxiliaryModules` の呼出は登録モデルごと高々1回(BFS/DFS 1回の推移解決)。宣言照合はモジュール名の**集合比較のみ**(u1 `compareDeclarations`)で、計測済み identity を照合のために再計算しない(business-logic-model §2.2「判定不能時の読込二重化防止」) | コードレビューでリゾルバ呼出回数・再計算なしを確認(PERF-U4-2 測定基準)。sensor 系既存テストの実行時間に実害ある退行がないこと(登録モデル2件規模で同オーダー)。t405 control green で緑経路の健全性を pin |
| PERF-U4-3(二重読込禁止) | `readModule` アダプタが §2.1 で safeReadFile 済みの bytes(model source・宣言 aux source)を優先返却し、未読込モジュール(宣言にない補助モジュール)のみ `deps.readFile` でその場読みする単一読込原則(business-logic-model §2.2) | t405 declaration-mismatch red ケース(宣言漏れ = 未読込モジュールのその場読み経路、過剰宣言 = 計測済み bytes 再利用経路)が両経路を打つ。BR-SC6 pass 条件のコードレビュー確認 |

## 非適用カテゴリの扱い

- **スループット・同時実行数・レスポンスタイム目標**: performance-requirements.md 非適用補足の段落をそのまま継承する — 本 Unit の変更面は単発実行の CLI ツール(sensor check / updateModelMap)で、利用者は開発者と CI ジョブのみ、処理対象は登録モデル2件の小規模データであり負荷特性を定義する意味を持たない(requirements NFR-1/2/4 にも性能目標の定義なし)。u5 の CI 探索時間予算(30 分 timeout)は u5 の Unit 面で扱う(u4 の sensor 変更は TLC 探索経路に関与しない)。
- **スケーラビリティ**: scalability-requirements.md の非適用判定どおり独立した設計を持たない。将来のモデル数増加に対する唯一の保証(線形計算量)は PERF-U4-2 として上表に固定済みであり、重複定義しない(要件・機構の正本は本書 PERF-U4-2 行。scalability-design.md は engine の produces 要件に従い非適用根拠と構造的将来耐性の記録として別生成する — 内容の矛盾はなく新規機構も追加しない)。

## code-generation への禁止事項(性能面)

- 宣言照合・aux 計測のために `deps.readFile` / `decodeIdentity` 以外の読込・identity 経路を新設しない(PERF-U4-1/3, SEC-U4-1 と同義)。
- 計測済み identity を宣言照合で再計算しない。比較に使うのはモジュール名集合のみ(PERF-U4-2)。
- deadline 確認を照合ループの後置・省略しない(PERF-U4-1)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T22:06:14Z
- **Iteration:** 1
- **Scope decision:** none

All 5 artifacts complete and NFR-mapped with named verifications; one minor stale cross-reference fixed post-review. READY.

### Findings

- None
