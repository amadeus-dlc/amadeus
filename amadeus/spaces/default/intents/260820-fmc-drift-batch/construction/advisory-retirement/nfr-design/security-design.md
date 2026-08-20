# Security Design — advisory-retirement(U3 / #3187)

上流入力: `construction/advisory-retirement/functional-design/business-logic-model.md`(撤去手順の正本 — 本書はここで確立済みの決定を `file:line` 参照し再分類しない)。NFR Requirements ステージの成果物(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は self-feature スコープが同ステージを SKIP するため**設計どおり不在**(absent-and-expected)— 本書は不在成果物の内容を発明せず、`inception/requirements-analysis/requirements.md` の NFR-1〜3 を上流要件として直接参照する。上流に宣言された数値セキュリティ要件は存在しない(requirements.md NFR-3 — 目標なき検査は生成しない)。

## セキュリティ設計判断(撤去 unit の適用形)

- **攻撃面の縮小(本 unit の主効果)**: authoring-hold advisory 経路・`subjects declare` / `advisory hold` verb・`GovernedSubjects` 型の完全撤去(business-logic-model.md 手順1〜2)は、CLI の入力受理面と宣言ファイル読取面(`defaultSubjectsPath` の解決するパス契約)を削除する — 新規のセキュリティ機構は不要で、撤去自体が入力検証面の縮小として作用する。認証・認可・暗号・secrets の各面に接触しない(変更対象は宣言面と内部経路のみ)。
- **fail-closed の保存(NFR-2)**: 撤去後、退役 verb の呼出は既存の未知 verb 拒否(USAGE エラー)に合流する(business-rules.md BR-1 — 専用エラーメッセージも互換面になるため作らない)。撤去により新設されるエラー経路はゼロ。
- **検証劇場の禁止(NFR-1)**: 残存ゼロの担保は census 述語(business-logic-model.md「FR-RET-4 census 述語(確定形)」— 9キー・対象集合・帰属除外・対照リテラル併走)による実測であり、status ハードコード・自己参照比較を持たない。
- **監査ログ面**: 撤去は audit スキーマ・監査イベント面に非接触(engine の汎用 advisory 機構 `advisoryHold` は同名別物で 1 バイトも変更しない — business-rules.md BR-2)。
- **コンプライアンス統制**: 該当なし(requirements.md NFR-3 の判定を引用 — 適用可能な規制要件・数値目標は宣言されていない。将来この判定を覆す条件は同 NFR-3 に記録済み)。

## 適用外カテゴリの明示(N/A 宣言)

performance / scalability / reliability の各設計は本 unit(kind: library、常駐プロセス・新規 runtime なし — unit-of-work.md U3)に適用可能な宣言済み要件を持たないため、engine directive の produces から pruning 済み(本書と logical-components.md のみが出力契約)。体裁のための実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T19:05:37Z
- **Iteration:** 1
- **Scope decision:** none

absent-and-expected の NFR requirements 入力を発明せず明示処理し、blast radius 表は attested 4境界(engine advisoryHold 非接触・spec-change 生存・U3→U4 直列・plugin.json 行非交差)を正しく符号化、pruned カテゴリの N/A 埋め草なし。非ブロッキングの補完2件(RFC 行の欠落・FD 兄弟成果物引用の行番号)は申し送りへ。

### Findings

- FOLLOW-UP | blast radius 表に business-logic-model.md 手順5 が触る specs/rfc/0001-intent-autonomy-modes.md の行がない — code-generation が本表を正典扱いする前に RFC 行(pointer-update・1行編集・非コード)を追補する(U3 FD の write scope 追補 FOLLOW-UP と同じ閉包点 = code-summary.md)
- FOLLOW-UP | business-rules.md BR-1〜4 / domain-entities.md ライフサイクルの引用が rule-id ポインタのみで行番号なし(consumes 外の FD 兄弟成果物のため本レビューでは再検証不能)— 後続成果物では file:line を付す
- NIT | requirements.md NFR-1〜3 の引用が id のみ(行番号なし)— section ポインタとして許容
- NIT | FR-RET-3 の引用は BLM に逐語で現れない(census 除外節と同旨)— requirements.md の宣言行への直接ポインタが望ましい
