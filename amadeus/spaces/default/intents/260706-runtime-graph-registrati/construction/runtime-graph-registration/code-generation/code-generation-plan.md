# コード生成計画 — unit: runtime-graph-registration

上流入力は requirements.md（FR-1〜FR-3、NFR-1〜NFR-2、AC 4 行）である。
scope bugfix により functional-design は SKIP（設計どおりの不在）。設計判断は本書に記録する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は単一 unit / 1 PR（draft 作成 → 3 条件充足で Ready 化）である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | FR-1.2 | RED 先行: hooks-state-bugfix へ runtime-compile hook の 4 ケース追加 |
| Step 2 | FR-1.1 | hook の command filter regex 3 本へ `.agents/amadeus` を追加 |
| Step 3 | FR-2.3 | engine-e2e へ #558a（自己修復成立）/ #558b（復旧手順つきエラー）追加 |
| Step 4 | FR-2.1 / FR-2.2 | surface の readRuntimeStageRow へ自己修復 + fail fast を実装 |
| Step 5 | FR-3.1 / FR-3.2 | parity 宣言（runtime-compile 追加、learnings reason 追記）と正準反映判断 |
| Step 6 | AC #3 / #4 | 検証一式（parity:check、typecheck、test:all、validator） |
| Step 7 | 成果物契約 | code-summary.md の作成 |

## 実行ステップ

- [x] **Step 1: hook eval の RED（FR-1.2）** — hooks-state-bugfix へ `runtimeCompileScenario`（birth → runtime-graph 削除 → hook を PostToolUse payload で駆動 → graph 再生成の有無で compile 発火を判定）と 4 ケース（.agents 経由 report / .agents 経由 state verb / .claude 経由の回帰ガード / runtime.ts の再帰ガード）を追加。実装前に .agents 経由 2 ケースの FAIL を確認した（RED）。
- [x] **Step 2: FR-1.1 実装** — `amadeus-runtime-compile.ts` の regex 3 本（transition tool / orchestrate report / runtime 再帰ガード）の path alternation を `(?:\.(?:claude|kiro|codex)|\.agents\/amadeus)` へ拡張。再帰ガードにも同時適用（.agents 経由 compile の transition 誤判定 = 再帰の芽を塞ぐ）。GREEN 4/4。
- [x] **Step 3: e2e ケース追加（FR-2.3）** — engine-e2e へ #558 節を追加。(a) bugfix scope birth → graph 削除 → surface が自動再 compile で成立 + graph 再生成。(b) graph 削除 + audit shard を STAGE_STARTED を含まない本文へ置換（再 compile は成功するが slug が graph に載らない）→ exit 非 0 + エラーに `amadeus-runtime.ts compile` の復旧手順を含む。
- [x] **Step 4: FR-2 実装** — `amadeus-learnings.ts` の `readRuntimeStageRow` を tryRead（graph 不在・malformed・slug 不在 → null）+ 自己修復 wrapper（1 回だけ sibling の `amadeus-runtime.ts compile` を spawn → 再解決 → spawn 失敗・exit 非 0・再解決不能のすべてで復旧手順つき fail(1)）へ分割。実装が Step 3 より先行したため、遡及 RED（git stash → #558a FAIL 確認 → pop → GREEN）で eval の検出力を証明（diary の Deviations 参照）。
- [x] **Step 5: FR-3 実測どおり** — parity-map: `hooks/aidlc-runtime-compile.ts` を engineFileExceptions へ追加（実測: 未宣言）、exceptions へ #558 の理由 entry（learnings 含む）を追記（実測: learnings は宣言済み）。skills/ にエンジン tools/hooks の正準コピーなし = 反映対象なし（#559 実測の再確認）。
- [x] **Step 6: 検証一式** — typecheck pass / parity:check ok（199 files）/ test:all exit 0（hooks-state-bugfix・engine-e2e の新ケース含む）。validator は commit 後に Intent 指定で実行し code-summary に記録。
- [x] **Step 7: code-summary.md 作成**。

## 設計判断（bugfix scope の設計確定地点）

1. **regex 3 本へ同一の path alternation を適用する。** 再帰ガードを除外すると `.agents` 経由の compile 呼び出しが transition 扱いになり再帰の芽になる。
2. **自己修復の再試行は 1 回。** compile 成功後も slug 不在なのは audit 側の欠落で、繰り返しでは解決しない。復旧手順つきエラーで人間へ返す。
3. **自己修復は surface の解決関数（readRuntimeStageRow）に閉じる。** persist 等の他経路は graph を読まず、適用範囲を広げる根拠（実害）がない（Right-Sizing）。
