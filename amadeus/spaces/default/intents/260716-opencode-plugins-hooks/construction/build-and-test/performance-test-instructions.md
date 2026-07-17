# Performance Test Instructions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列・統制)、`../code-generation/code-summary.md`(出荷物・検証結果・レビュー)。2026-07-17。

## 比例選定(build-and-test:c1/c3)

nfr-requirements P-1〜P-3 は構造契約のみ(数値 SLO なし・N/A 根拠付き)であり、コード変更ゼロの本 Bolt に専用性能検査は追加しない(戦略名だけの機械追加をしない — c1)。充足面:

- P-2(常駐なし)/ P-3(純関数)— 実装不在につき自明充足(検査対象コードなし)
- テストランナー予算契約: `--ci` の wall-clock drift 0 file(s) を実測(ランナー内蔵の時間予算ゲート green)

## 将来条件

opencode 側にフック実行の時間予算が文書化された場合、その named constant を根拠に性能検査を再選定する(constants-from-code — 数値の発明はしない)。
