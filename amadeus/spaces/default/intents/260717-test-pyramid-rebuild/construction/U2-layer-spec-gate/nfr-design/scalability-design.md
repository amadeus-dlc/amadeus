上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# スケーラビリティ設計 — U2 層責務仕様と tier-aware 判定

本設計は `performance-requirements.md` の O(N) 走査、`security-requirements.md` の入力検証、`scalability-requirements.md` の規模・tier 増、`reliability-requirements.md` の再現性、`tech-stack-decisions.md` の Bun/TypeScript 維持、および `business-logic-model.md` の開いた台帳・閉じた規約を具体化する。

## SCAL-D1: 行数増加への線形追随

U1 が再生成した complete ledger を1回走査し、行数 N に対して時間 O(N)、追加メモリ O(V + I) で追随する。I は1行1件に閉じた indeterminate 診断数であり、同じ不正行から field 数に比例して増幅させない。固定442、全ペア比較、行ごとの再 sort、source 再読込、incremental cache、shard、worker pool は使わない。

ratio の分母は都度 `summary.total` から取り、small/medium/large count を同じ走査で再計算する。measurement ref の163 violation と現行比率は regression oracle であり、将来母集団へ流用する定数ではない。

## SCAL-D2: NamedTier・AuxiliaryTier・Invalid の分離

- `NamedTier = unit|integration|e2e|smoke` は上限 policy の閉じた入力であり、追加時は型、`allowedMaxSize`、要件、テストを同時変更する仕様変更とする。
- `allowedMaxSize` の4値は `logical-components.md` LOG-D1 の単一定義表を参照し、consumer別の写像を増やさない。
- 承認済み補助 tier は初期値 `harness|lib` の明示 registry とし、台帳・比率分母・auxiliary countに残すが violation detectorへ渡さない。
- registry にない tier は invalid として indeterminate countへ加え、将来 tier を既存 policyへ類推しない。
- 新しい補助 tier の追加は registry と根拠を同時更新する。open `Tier` は入力を保持できることを意味し、unknown を自動承認することを意味しない。

## SCAL-D3: OS・順序非依存

U2 の純関数境界は U1 が正規化した `/` 区切り repository 相対 file と tier label を受け、OS の FS API、path separator、realpath、environmentへ依存しない。行順は U1 の file code-unit 順を維持し、violations と診断もその投影順にする。診断の安定識別子は zero-based `rowIndex` とし、fileが妥当な診断だけlogical pathを追加するため、malformed fileからhost依存pathを生成しない。

同じ ledger、policy、registry は macOS/Linux/Windows で同じ applicability、violations、summary、ratio を返す。現行 test の `rel` 文字列 slice は target 境界では再利用しないが、修正実装は別 intent とする。

## SCAL-D4: 再基準化と採用しない機構

比率は ledger 更新ごとに再計算する。tier 時間予算は件数、処理内容、host、runner 条件が変わった場合に既存4 commandで再測定し、人間承認前の値を流用しない。

autoscaling、load balancer、DB、cache、queue、distributed worker、multi-region、cloud resource は単発の in-memory 判定に該当せず N/A とする。新サービス、daemon、npm runtime dependency、AWS resource を予約しない。

## SCAL-D5: 検証条件

- 新しい承認済み補助 tier は registry 更新後、total と auxiliary を増やすが governed/violationへ入らない。
- 未登録 tier は indeterminate を増やし、zero-violation successへ縮退しない。
- 新 NamedTier の追加漏れは closed union と exhaustive policy により検出可能である。
- diagnostics は `rowIndex` 昇順かつ1行1件で、`indeterminate = diagnostics.length` を満たす。
- 442以外の ledgerでも固定母数なしに同じ不変条件を満たす。
