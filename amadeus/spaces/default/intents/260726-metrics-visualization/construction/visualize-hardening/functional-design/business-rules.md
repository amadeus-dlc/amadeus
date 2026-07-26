# Business Rules — U2 visualize-hardening

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## U1 ルールの継承

U1(construction/visualize-skeleton/functional-design/business-rules.md)のルール1〜11 はすべて U2 でも有効。特にルール11(renderHtml 決定性)は `--check` の成立条件として本 Unit で消費される。

## U2 追加ルール

12. **強調の両側性**(AC-2): 悪化 → `regressed` class 出現、非悪化・非数値・prev 不在 → 非出現(prev 不問例外 = failedFiles / failedAssertions はルール13参照)。テストは両側を assert(corpus-sweep-for-new-guards の両側原則)。強調は表示のみで exit code に影響しない(観測面 — ゲートは既存 ratchet/codecov の責務)
13. **強調対象の固定列挙**(FR-4 S2): regressionClass の判定表(over_threshold↑ / max↑ / percent↓ / failedFiles≠0 / failedAssertions≠0 / bytes↑)がコード上の単一定義。未知コレクタ・未知キーは構造的に非強調(データ駆動表示との両立)
14. **サイズ上限は fail-closed**(FR-6): 超過時は `--write` でも `--check` でも書き込み・比較を行わず exit 1。stderr に実測バイト数と上限を出す(無音の肥大禁止)
15. **ミラー定数の乖離検出**(ADR-3): 16_384 ミラーは serializeSnapshot 実駆動テストでピン。テストなしのミラー追加禁止
16. **CI ステップの位置固定**(FR-5): retention 後・commit 前。`continue-on-error` 禁止(loud-fail)。ci-success 集約への追加禁止(C5 の非対称維持)
17. **docs の言語規約**(FR-8): 日英ペアで同一内容。相互参照リンクを双方に置く(docs-language-ownership)
18. **`--check` の drift 検査は CI に載せない**(本 intent スコープ): index.html は CI 自身が再生成・コミットするため、既存 dist:check 型の PR blocking drift guard は不要。`--check` はローカル・レビュー時の手動検査手段として提供(ci.yml へ検査ステップは追加しない — 追加は将来判断)
