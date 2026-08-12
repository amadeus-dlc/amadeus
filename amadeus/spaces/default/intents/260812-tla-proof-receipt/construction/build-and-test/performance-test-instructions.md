# Performance Test Instructions — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 1〜7 のいずれも性能目標を持たず、Step 7 の回帰検証は型検査・lint・テストスイートの green 維持で構成される)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(検証表は exit code と pass 件数のみで、レイテンシ・スループットの計測値を持たない)。

## 適用外判定

**判定: 適用外(専用の性能試験を作らない)。**

本 unit の要件が宣言する非機能要件は次の2件のみで、いずれも合否を決める数値目標を持たない(requirements.md「非機能要件」節):

| NFR | 内容 | 数値目標 |
|---|---|---|
| NFR-1 | 決定性 — 同一入力バイトに対し referee 検証は決定的。TLC 実行環境はローカルで `mise x java@temurin-26.0.1+8 -- bun ...` に固定 | なし(決定性は等値性の性質であって時間・スループットの閾値ではない) |
| NFR-2 | 回帰なし — 既存の登録済みモデル check・receipt drift 検査・toolchain output binding に回帰がない | なし(既存テストスイートの green 維持) |

数値目標が宣言されていない以上、ベンチマークを作っても合否を判定する基準が存在しない。目標なきベンチマークは org.md Forbidden の「検証劇場」に該当するため作らない(project.md `cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。一方で無言の省略は黙示の欠落になるため、本ファイルで非該当を明示する。

Test Strategy は Comprehensive だが、stage 契約 Step 4-8 の Comprehensive 定義自体が `performance-test-instructions.md` を **IF NFR performance requirements exist** の条件付きとしており、戦略名だけを根拠に負荷試験・auto-scaling 検証を機械追加しない(project.md `cid:build-and-test:bt-proportional-selection`)。

## この判定を覆す条件

次のいずれかが成立したら、本判定を再検討する。

1. requirements/NFR に referee 検証または実TLC実行の**時間上限・退行上限**(例: 「baseline run は N 秒以内」「探索状態数の退行を M% 以内」)が数値で宣言される。
2. TLC 実行が日常 CI へ組み込まれ、CI 実行時間が blocking gate の予算制約に接する(現在は Q1=A により専用実行面へ分離済み — requirements.md スコープ外「formal-verif の日常 CI 組込み」)。
3. referee 経路が author-new 以外の高頻度呼び出し面へ接続され、呼び出し回数がレイテンシを意味のあるコストにする。

なお実TLC面の実行時間は本ステージで `19.80s`(7 pass、`mise x java@temurin-26.0.1+8 -- bun test tests/formal-verif/tla-referee-real-toolchain.test.ts`)と実測しているが、これは所要時間の記録であって合否閾値ではない。閾値を後付けする場合は project.md `cid:code-generation:c1-threshold-inside-observed-range`(閾値は観測レンジの内側に置き、両側で契約する)に従うこと。
