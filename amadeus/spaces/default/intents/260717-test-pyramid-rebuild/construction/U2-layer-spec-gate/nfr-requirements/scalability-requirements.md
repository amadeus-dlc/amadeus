上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun と既存 `tests/` ディレクトリ構造を前提とし、新規の分散処理基盤を導入しない。

# スケーラビリティ要件 — U2 層責務仕様と tier-aware ドリフト判定

本書は `business-logic-model.md` の台帳全行判定、`business-rules.md` の開いた tier 台帳と閉じた規約対象、`requirements.md` の将来条件を、テスト数・tier 数の増加に対する追随性として具体化する。

## SCAL-1: テストファイル数増加への線形追随

現行母集団は measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の 442 行である。tier-aware 判定は各台帳行を1回だけ走査する O(N) とし、ファイル数が N から M に増えても M 回の判定で追随する。全ペア比較、台帳行ごとの FS 再読込、全体ソートの反復、外部 API 呼び出しを持たない。

容量上限や増加率の数値は、対応する強制メカニズム・実測値が存在しないため発明しない。将来の規模増は U1 台帳の再生成と本判定の再実行で追随し、結果の `summary.total` と `violationCount` を比較可能にする。

## SCAL-2: 開いた Tier と閉じた NamedTier の分離

- 台帳の `Tier` は `tests/` 直下第1階層から導出する開いた集合であり、unit/integration/e2e/smoke に加えて harness/lib や将来追加される補助 tier を失わず可視化する。
- 上限規約の `NamedTier` は unit/integration/e2e/smoke の4種に閉じる。harness/lib 等は台帳と比率分母には残すが、tier 上限 violation の母集団には含めない。
- 新たなピラミッド層を「規約対象の named tier」として追加する場合は、`allowedMaxSize` の契約・網羅判定・要件を同時に変更する仕様変更であり、未知 tier を自動的に既存のいずれかへ類推しない。

この分離により、新しい補助ディレクトリの追加で処理が停止せず、同時に規約対象の追加漏れは型・レビューで明示的に扱える。

## SCAL-3: 比率と実行時間予算の再基準化

比率は全域再帰の総行数を分母に、small ≥ 50% / medium ≤ 45% / large ≤ 5% の named ガイドラインと比較する。テスト追加後は固定の 442 を使い続けず、再生成した台帳の総行数から機械再計算する。

tier 別実行時間予算は、各 tier の件数・処理内容・ホスト性能に依存するため現時点では PENDING とする。将来値を確定した後も、母集団または runner 実行条件が変わった場合は同じ個別 tier コマンドで再実測し、古い値を無条件に流用しない。実行時間の強制ゲート化と自動スケール機構は本 intent Out である。
