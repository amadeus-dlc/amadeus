# Performance Test Instructions — 260715-opencode-cursor-harness

上流入力(consumes 全数): 性能面の実測値(dist:check 冪等・t-cursor-adapter 124ms/37 tests)は各 unit の code-generation-plan.md / code-summary.md(U1〜U4)から転記。

## 判定: N/A(根拠付き — build-and-test:c1/c3)

本 intent の変更は packaging 面(manifest/emit による dist ツリー生成)と docs/smoke のみで、実行時の性能境界に接触しない:

- 承認済み NFR に性能目標なし(nfr-requirements: 性能面は「既存 package.ts ビルド時間の実績帯を維持」のみ — dist:check ×2 冪等実測で担保済み、専用検査の新設根拠なし)
- 実在境界の変化なし: エンジン・フック・テストランナーのタイムアウト/スループット設定は非接触(AC-4d: core/scripts 変更ゼロ)
- cursor adapter は hook 実行1回あたり数十 ms の薄い stdin 変換で、性能検査を要する処理(ループ・IO 集約・並列)を含まない(t-cursor-adapter の実行時間 124ms/37 tests が傍証)

戦略名だけの機械追加はしない(c1)。

## 再発時の入口

将来、hooks の実運用で遅延が観測された場合(例: Cursor で afterShellExecution → runtime-compile の体感遅延)は、実測値(処理時間・発生条件)を添えた Issue 起票から始める — 本 N/A 判定は「実在境界が生じた時点で失効する時限判定」であり、既存必須検査の省略根拠にはしない(c3)。
