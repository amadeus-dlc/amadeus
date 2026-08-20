# Security Design — applicability-arms(U4 / #3186)

上流入力: `construction/applicability-arms/functional-design/business-logic-model.md`(段挿入手順の正本 — 本書は確立済み決定を参照し再分類しない)。NFR Requirements ステージの成果物(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は self-feature スコープが同ステージを SKIP するため**設計どおり不在**(absent-and-expected)— 不在成果物の内容は発明せず、`inception/requirements-analysis/requirements.md:59-61` の NFR-1(検証劇場禁止)/ NFR-2(fail-closed)/ NFR-3(数値 NFR 未宣言)を上流要件として直接参照する。

## セキュリティ設計判断(判定 pipeline 拡張 unit の適用形)

- **情報流の閉域性**: defectRecurrence 腕は GitHub への実行時照会を行わず(business-logic-model.md 手順3 — RA Q4=A の確定)、入力は conductor が CLI 引数で渡すローカルファイル(`--issue-evidence <path>`)のみ。plugin→core の import 方向も新設しない(同手順3 の実測宣言)— 依存面・ネットワーク面とも攻撃面を増やさない。
- **入力の fail-closed(NFR-2)**: 外部由来テキストを読む唯一の新設面は issue-evidence の parse であり、ファイル実在 + parse 不能 = 明示 halt(business-logic-model.md 手順3 エラー処理)。同様に .tla/.cfg の parse 不能・vocabulary 自己不整合も明示 halt(同手順2(c))。非発火(交差なし・入力不在)と判定不能は Result の判別 kind で区別し、同じ結果に潰さない(business-rules.md BR-3 — 本ステージ consumes 外の FD 兄弟成果物への参照であり、正本は business-logic-model.md 手順2〜3 の fail-closed 宣言)。
- **強制評価の非バイパス(NFR-1)**: drift / 再発検出時の revise-model 強制評価は既存 terminal-route receipt(#3262、`tla-authoring.ts:447-450` の fail-closed)でのみ閉じられ、「裁定済み」を示す新しい宣言ファイル・スキップ分岐を作らない(business-logic-model.md 手順2 末尾)— 検証されない宣言面の新設禁止が本 unit の中心的セキュリティ規律。
- **監査可能性**: 両腕の判定結果(発火有無・drift 詳細・プロパティクラス・被覆不足・「未実施」明記)は receipt 契約へ載り監査可能(business-logic-model.md 手順5)。coverageCheck の `--changed` 未供給は「被覆確認未実施」を receipt へ明記し、無音の素通りにしない(同手順4)。
- **secrets / 認証・認可 / 暗号**: 非接触(変更対象は判定 pipeline の段・CLI 出力面・stage/docs 文書面のみ)。
- **コンプライアンス統制**: 該当なし(requirements.md NFR-3 の判定を引用 — 覆す条件は同所に記録済み)。

## 適用外カテゴリの明示(N/A 宣言)

performance / scalability / reliability は本 unit(kind: library — unit-of-work.md U4)に適用可能な宣言済み要件を持たず、engine directive の produces から pruning 済み(本書と logical-components.md のみ)。判定 pipeline の実行時間微増は ADR-3 が NFR-3(数値 NFR 未宣言)を引いて専用検査を作らないと確定済み — 体裁のための実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T19:17:09Z
- **Iteration:** 1
- **Scope decision:** none

全セキュリティ主張(閉域情報流・fail-closed parse・既存 receipt 経由の非バイパス強制評価・監査可能性)が消費 FD の該当手順へ trace し、blast radius 表は修復済み二層落ちる実証設計(着地順非依存)を正しく伝播。兄弟指摘の consumes 外引用も in-scope 正本の明名で正しく処理。上流 id 非発明・N/A 埋め草なし・相互整合。

### Findings

- FOLLOW-UP | logical-components.md の『交差契約(#3261)』が消費 FD 内で解決しない(FD は #3262 のみ言及)— 消費 FD の手順/行ピンへ置換するか issue 番号ピンを除去(次回接触時)
- NIT | FD 引用が手順番号中心(file:line でない)— 番号付き短文書の慣行として許容だが、FD 自身の行ピン事実がある箇所は行アンカー化が望ましい
