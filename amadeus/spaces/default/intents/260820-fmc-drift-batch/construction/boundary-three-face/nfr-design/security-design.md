# Security Design — boundary-three-face(U2 / #2929)

上流入力: `construction/boundary-three-face/functional-design/business-logic-model.md`(3面是正手順の正本 — 本書は確立済み決定を参照し再分類しない)。NFR Requirements ステージの成果物(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は self-feature スコープが同ステージを SKIP するため**設計どおり不在**(absent-and-expected)— 不在成果物の内容は発明せず、`inception/requirements-analysis/requirements.md:59-61` の NFR-1(検証劇場禁止)/ NFR-2(fail-closed)/ NFR-3(数値 NFR 未宣言 — 専用検査を生成しない)を上流要件として直接参照する。

## セキュリティ設計判断(境界是正 unit の適用形)

- **境界述語は入力検証面の統制である**: `isCanonicalImplementationPath` の前段検査(非文字列・`\\`・絶対パス・POSIX 非正規形・`..` 拒否 — business-logic-model.md 手順1)は path traversal を止める入力検証であり、形状変更後も**不変のまま維持**する(FD が明示)。境界一般化は受理集合の拡大のみで、拒否側の検査強度を落とさない。
- **loader 側の多層防御の保存(NFR-2)**: symlink 拒否・regular file 検査・sha256 照合(business-logic-model.md 手順2 — `tla-model-loader-internal.ts:299-315` 面)は境界述語と独立の完全性検査として不変。containment 基点の repo ルート実パス化(`realpathIfExists`)は symlink checkout での偽拒否/偽受理の両方を塞ぐ方向の変更で、escape パスは共有述語が構造的に false を返す(fail-closed 保存 — FD 手順2 の宣言どおり)。
- **改竄検出面の拡大(本 unit の主効果)**: pr-convergence plugin 4ファイルの governed entry 化(FD 手順5)は、これらのファイルの無断変更を SOURCE_DRIFT(sha256 不一致)として検出可能にする — 監視対象の拡大であり権限面の変更はない(`inception/application-design/decisions.md` ADR-2 のセキュリティ影響宣言と整合)。
- **検証劇場の禁止(NFR-1)**: glob drift テストは本番 matcher `matchesGlob` をオラクルに使い再実装を持たない(FD BR-6)。entries の sha256 誤記は completeness check / loader が `hash differs` で止める — 素通り経路なし(FD business-rules.md BR-3 のエラー処理)。
- **secrets / 認証・認可 / 暗号**: 非接触(変更対象は境界述語・glob・model-map entries のみ。ネットワーク・credential 面なし)。
- **コンプライアンス統制**: 該当なし(requirements.md NFR-3 の判定を引用 — 覆す条件は同所に記録済み)。

## 適用外カテゴリの明示(N/A 宣言)

performance / scalability / reliability は本 unit(kind: library — unit-of-work.md U2)に適用可能な宣言済み要件を持たず、engine directive の produces から pruning 済み(本書と logical-components.md のみ)。体裁のための実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T19:10:27Z
- **Iteration:** 1
- **Scope decision:** none

absent-and-expected 入力の明示処理・上流 id の非発明・FD との逐語整合(前段検査保存・loader 多層防御・SOURCE_DRIFT 面拡大・非接触境界・単一 PR 原子性)を確認し、pruned カテゴリの N/A 埋め草なし・2成果物の相互整合も成立。BLOCKER なし — 引用精度の補完3件と精度 NIT 1件は申し送りへ。

### Findings

- FOLLOW-UP | security-design.md の『(FD BR-6)』がファイル名を欠く — 隣接引用と同形の『business-rules.md BR-6』へ正規化(次回接触時)
- FOLLOW-UP | FD 兄弟成果物(business-rules.md / domain-entities.md / unit-of-work.md)への引用が file:line ピンを欠く — 先行 U3 レビューと同じ指摘。後続成果物(code-summary 等)で行アンカーを付す
- FOLLOW-UP | loader 行の『#2890 由来の休眠バグ』が pass-list 内で検証不能 — 保持するなら citable な成果物(requirements.md FR-BND-2)へ帰属させる
- NIT | hash differs 拒否の帰属を completeness check / loader の両方としたが FD は loader のみに帰属 — 精度差、矛盾ではない
