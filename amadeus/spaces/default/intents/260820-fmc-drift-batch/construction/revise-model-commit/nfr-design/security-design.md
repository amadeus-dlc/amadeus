# Security Design — revise-model-commit(U1 / #2289)

上流入力: `construction/revise-model-commit/functional-design/business-logic-model.md`(route 依存 compose 手順の正本 — 本書は確立済み決定を参照し再分類しない)。NFR Requirements ステージの成果物(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は self-feature スコープが同ステージを SKIP するため**設計どおり不在**(absent-and-expected)— 不在成果物の内容は発明せず、`inception/requirements-analysis/requirements.md:59-61` の NFR-1(検証劇場禁止)/ NFR-2(fail-closed)/ NFR-3(数値 NFR 未宣言)を上流要件として直接参照する。

## セキュリティ設計判断(registration 是正 unit の適用形)

- **fail-open 閉鎖が本 unit の主セキュリティ効果(NFR-2)**: 現行の「revise-model + 不在名が ok=true で map を書く」fail-open(FD 手順4、XR-260820-2289 F1)は、意図しない map 変異を無音で通す欠陥クラス — 明示 kind `revise-target-missing` の loud 拒否への**置換**(警告付き続行・互換分岐なし)により閉じる。これは書込系 CLI の入力検証強化であり、既存の防御(preconditions 6 検査・human-approval provenance 再照合・atomic rename・競合検知)は 1 バイトも変更しない(FD domain-entities.md「不変のエンティティ」)。
- **検証境界の不変**: `commit` の approval 検証(audit shard の HUMAN_TURN 実在照合)・bundle digest 整合・validator の map 全体検証は非接触。route は precondition (a) で検証済みの値を運ぶだけ(parse-don't-validate — FD 手順5)であり、新しい信頼境界を作らない。
- **供給網面(leaf モジュール)**: 新設 leaf `authoring-routes.ts` は定数のみ・import ゼロ(FD 手順1)— 実行面を持たず攻撃面を増やさない。plugin.json `tools[]` への宣言1行は t3078 の全数宣言ゲートが機械強制し、未宣言モジュールの無音混入を塞ぐ側の統制。
- **検証劇場の禁止(NFR-1)**: t448 の zero-assertion 早期 return の明示失敗化(FD 手順7)は #1982 silent-success クラスの除去。既存の自己参照比較(t448 :74-82)は FR-X-4 の起票対象で **U1 は修正も悪化もしない**(非接触の宣言 — FD 手順7)。
- **secrets / 認証・認可 / 暗号**: 非接触(変更対象は compose の route 分岐・leaf 定数・テストのみ)。
- **コンプライアンス統制**: 該当なし(requirements.md NFR-3 の判定を引用 — 覆す条件は同所に記録済み)。

## 適用外カテゴリの明示(N/A 宣言)

performance / scalability / reliability は本 unit(kind: library — unit-of-work.md U1)に適用可能な宣言済み要件を持たず、engine directive の produces から pruning 済み(本書と logical-components.md のみ)。体裁のための実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T19:13:07Z
- **Iteration:** 1
- **Scope decision:** none

absent-and-expected 入力の明示処理・上流 id 非発明・pruned produces の正確な2本構成を確認。セキュリティ主張(fail-open 閉鎖が主効果・信頼境界不変・leaf 供給網・t3078・t448 非接触ブロック)と blast radius 表は消費 FD の番号付き手順へ trace 可能で、2成果物は相互整合。BLOCKER なし。

### Findings

- FOLLOW-UP | FD への引用が緩いポインタ(FD 手順4 等)で file:line ピンを欠く — 兄弟 unit と同じ反復指摘。code-generation までに FD 行ピンで閉じる
- FOLLOW-UP | tla-applicability.ts 行の『FD business-rules.md BR-1』は consumes 外への冗長引用 — in-scope の business-logic-model.md:8 のピンへ置換するか削除(次回接触時)
