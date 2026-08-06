# Intent Statement: PR 収束 opt-in プラグイン(pr-convergence)

## Problem Statement

Amadeus の Construction ワークフローは Bolt ごとの PR 発行後、PR 収束(競合解消→レビュースレッド対応→CI green→収束通知)を指令ループの完了条件として持たない。`pr-converge-loop-required` ノルム(2026-07-30 発効)と収束スキルは存在するが、実行がタスク化に依存する散文規範であり、intent 260801-otel-meta-schema の実測では conductor がマージした 8 PR 中 7 PR に計19件のレビューコメントが未対応のまま残置された(うち CodeRabbit の Security Major 2件は HOME 配下パス・ユーザー名の telemetry 実漏洩)。ステージグラフ全32ステージに PR 収束の接続点が無いことも全数確認済み — 個体でなく構造の欠落である。

## Target Customer

- Bolt を出荷する開発チーム(AI conductor+人間承認者)。痛み: bot を含む全レビュースレッドの収束が機械保証されず、指摘取りこぼしが人間の注意力に依存する
- Amadeus メンテナー。痛み: 収束状態が台帳化されず、#1887 の捕捉者別集計が汚染される
- install しない workspace の利用者は対象外 — ワークフローに一切影響しない(opt-in 境界)

## Success Metrics

Issue #1971「受け入れの目安」を初期基準として採用する(詳細は Requirements で確定):

1. plugin install 済み workspace で `code-generation` の compose 後 produces に `pr-convergence-report` が載り、レポート不在の Bolt は batch 前進が拒否される(落ちる実証: レポート1件削除で `next` が同 batch を再発出)。未 install workspace では produces が不変であることも対で実証
2. 収束述語が4区分(resolved / outdated / replied-unresolved / ignored)+ mergeable UNKNOWN-retry + mergeStateStatus 接地で単一定義され、`replied-unresolved` を含む fixture で赤くなることを実証(検査はセンサーに置かない — センサーは advisory 実測のため)
3. thread 台帳が GitHub GraphQL 実測から機械導出される(手書き禁止。ページング・`__typename` bot 判定・severity 転記・終端処理を含む)

## Initiative Trigger

intent 260801-otel-meta-schema の運用実測(19件残置事故、2026-08-02 クロスレビュー2名の独立検証済み)。原因所在: ワークフロー設計 — PR 収束が指令ループに接続点を持たない構造欠落。事後の一括是正は PR #1958 で完了し以降の直近25 PR は再発ゼロだが、再発防止は構造(fail-closed ガード)でのみ保証できる。

## Initial Scope Signal

- 正規スコープ: `self-feature`(ユーザー明示指定、2026-08-05)
- 対象: opt-in プラグイン `pr-convergence` — 工程(ステージ本文断片+収束 CLI+thread 台帳生成器)/ ガード(compose 時の produces overlay で core 既存 `unitCovered` 述語をデータ点火)/ センサー(advisory 可視化)。要拡張は compose の「既存ステージ produces への overlay 追記」能力1点
- ユーザー裁定済み(2026-08-02): 自動付与は不可 — install = opt-in 境界(formal-model-check の既習形)。uninstall で可逆
- 非対象: PR マージの人間承認の変更(収束述語は merged を要求しない)、#1902(PR 発行の保証)、#1887(台帳化・計測)、既存負債のトリアージ(別対応中)
- Requirements 決定点(Issue が明示的に残置): install 後の適用 scope 絞り込み / GitHub 不達時の park vs 明示 override / #1902 R3 との発動点所有権

## Source and Traceability

- Primary source: [Issue #1971](https://github.com/amadeus-dlc/amadeus/issues/1971)(enhancement、エレベーターピッチ様式、#2006 吸収済み)
- クロスレビュー: 2名成立 — レビュー1「実在確認」/ レビュー2「実在確認+要訂正」、全訂正(7 PR 件数・HOME 漏洩帰属・述語4区分化・トリアージ基準・opt-in 裁定)は Issue 本文へ反映済み(Issue コメント実測 2026-08-05)
- Human scope ruling: `self-feature` + 自律モード full(ユーザー指示 2026-08-05、intent-grant-fd0ed2b79c48204d342920ce3b4b67f0)
- Observed base: origin/main `8409c2039c52`
