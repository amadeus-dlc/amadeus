# PR Convergence Report — u5-measurement-report

上流入力(consumes 全数): code-generation-plan.md(本 unit の実施手順と検証面の規定)、code-summary.md(計測レポート本体 — 収束対象となる成果物)、functional-design/business-rules.md(BR-U5-1〜6)、functional-design/domain-entities.md(レポートの節構成)。

## 収束対象: **N/A — 該当 PR なし**(反証可能な根拠付き)

本 unit は**コード変更をゼロ**で完了する record 内レポート1本の unit であり、Bolt PR を持たない。したがって `j5ik2o-gh-pr-converge-loop` が収束させる3面(base 競合・レビュースレッド・必須 check)はいずれも**対象が存在しない**。

N/A は「未検証」でも「PASS」でもない(cid:deployment-execution:c3 の分離規律)。以下がその反証可能な根拠である:

- **変更面ゼロの機械確認**: 本 unit のディスパッチは `amadeus/spaces/default/intents/260807-autonomy-reachability/construction/u5-measurement-report/code-generation/` 配下のみを書き、`packages/` `tests/` `docs/` `scripts/` のいずれにも触れていない。計測スクリプトは repo 外 scratch に置かれ(BR-U5-6)、リポジトリへ入っていない
- **したがって CI の対象がない**: 追跡ファイルの差分が record のみである以上、`pull_request` トリガの必須 check 集合が判定すべきコード面が存在しない
- **record の本線反映は PR ではなくチェックポイントコミット経由**: `amadeus/` ツリーは team.md § Way of Working に従い record-sync のチェックポイントで本線へ流す。工程記録を実装 PR に同乗させない規律の帰結であり、本 unit に PR が無いことは欠落ではなく設計どおりである

## 本 unit の実際の検証面

PR 収束の代わりに、本 unit の成果物契約は次の2点で検証される(code-generation-plan.md § 検証で宣言済み):

1. **レポート実体の実読** — 計測 ref(clone / SHA / 述語 / 測定時刻)、コーパス規模、集計値、per-record 標本、順序所見が code-summary.md に実在すること
2. **スクリプトの第三者再実行可能性** — 集計スクリプト全文が逐語掲載され(BR-U5-4)、同じ入力から同じ数値が再導出できること

## 申し送り(収束面での特記)

FR-4c は **PENDING** として記録されており PASS と代用していない(code-summary.md § 6)。閉包条件は同ファイルに明記した。本レポートの N/A 判定は「PR が無い」ことのみを対象とし、FR-4c の PENDING を N/A へ丸めるものではない — 両者は別の未確定であり、混同すると計測の未閉包が収束の N/A に紛れて見えなくなる。
