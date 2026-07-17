# Performance Test Instructions — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md。

## 判定: N/A(根拠付き — build-and-test:c1/c3)

変更はコメント1行(実行コード不変)で性能境界に接触しない。対象テストの実行時間(31.3〜33.9s)は本修正の対象外 — 短縮は Issue #1087(時限判定付き)で追跡。

## 再発時の入口

drift が再発(実測が large 帯を大きく超え宣言と再乖離)した場合は、実測値を添えて #1087 の発動判定に合流する。
