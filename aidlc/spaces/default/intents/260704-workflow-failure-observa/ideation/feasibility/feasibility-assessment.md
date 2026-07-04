# Feasibility Assessment

## Upstream Context

この評価は、`intent-statement` を上流成果物として読む。
対象は [#431](https://github.com/amadeus-dlc/amadeus/issues/431)、[#432](https://github.com/amadeus-dlc/amadeus/issues/432)、[#433](https://github.com/amadeus-dlc/amadeus/issues/433)、[#435](https://github.com/amadeus-dlc/amadeus/issues/435) である。

`market-research` は mvp scope で skip されている。
そのため、`competitive-analysis`、`market-trends`、`build-vs-buy` は存在しない前提で扱う。

## Feasibility Judgement

この Intent は実現可能である。

理由は、対象が外部サービスや新しい実行基盤ではなく、既存の TypeScript CLI、hook、audit taxonomy、doctor、test fixture の範囲に収まるためである。
ただし、parity lock と配布物境界を誤ると、変更が上流追従や package 境界を壊す可能性がある。

Feasibility の結論は `GO_WITH_CONSTRAINTS` とする。
実装へ進めてよいが、必須スコープは deterministic な失敗証跡に限定する。
OpenTelemetry は分析価値があるが、現 Intent では optional extension として記録し、must-have には含めない。

## Technical Viability

### #431 engine error audit

`aidlc-orchestrate.ts` の error directive と top-level catch を audit に接続することは技術的に可能である。
ただし、stdout に完全な directive JSON だけを出す契約を壊してはいけない。
audit 書き込みは best-effort とし、失敗しても stdout を汚さない設計が必要である。

### #432 doctor hook drops

`recordHookDrop()` は `.aidlc-hooks-health/<hook>.drops` に drop を追記している。
`doctor` が `.drops` を読むようにすれば、hook 名、件数、最新時刻、最新理由を表示できる。
古い drop の retention や clear 手段は、今回の must-have から外す。

### #433 subagent success or failure

`SUBAGENT_COMPLETED` は現状、`Agent Type`、任意の `Agent ID`、任意の `Message` だけを持つ。
hook input に信頼できる status がある場合は、`SUBAGENT_COMPLETED` に `Status` フィールドを追加する方針が最小である。
hook input に信頼できる status がない場合は、推測実装を避け、区別不能という判断を記録する。

### #435 conductor-independent failure detection

conductor の自己申告に依存しない初期シグナルは、次を候補にする。

- `run-stage` directive 発行後に対応する report がないまま次の `next` が呼ばれる。
- Stop または SessionEnd 時点で in-flight stage が残っている。
- runtime graph と audit の stage outcome が矛盾している。

produces が存在しないのに完了報告されるケースは、既存 engine guard の確認対象とする。
初期実装では hard error 化を避け、audit と doctor で表面化する。

## AWS Landscape

現 Intent は AWS account、CloudWatch、CloudTrail、IAM、VPC、managed service を必要としない。
実装範囲はローカル CLI、hook、audit shard、doctor、test fixture、CI の検証証拠で閉じる。

CI は外部インフラではなく、標準検証の証拠として扱う。
PR 前の標準検証は `npm run test:all` である。

## Compliance Scan

PCI、HIPAA、GDPR、FedRAMP のような外部規制は直接適用しない。
この Intent は個人情報や顧客データを扱わない。

一方で、audit integrity と再現性は project policy 上の制約である。
audit の既存イベントを書き換えないこと、human input を要約しないこと、PR 前検証結果を追跡可能にすることを守る。

## Boundary Assessment

`skills/` は配布物境界である。
実装判断では、source skill、昇格先 skill、host harness、Intent 成果物を分ける。

`dev-scripts/data/parity-map.json` は、`.agents/aidlc/tools`、`.agents/aidlc/hooks`、`.agents/aidlc/aidlc-common` などを上流追従対象として扱っている。
現時点の `engineFileExceptions` は空である。
parity lock 対象に触れる場合は、対象ファイルごとに次の順で判断する。

1. lock 対象外の adapter または wrapper で回避できるか。
2. upstream contribution として扱うべきか。
3. 人間承認付きで `engineFileExceptions` に追加すべきか。
4. リスクが高い場合に後続 Intent へ分割すべきか。

## OpenTelemetry Position

`.agents/aidlc/tools` の TypeScript CLI に OpenTelemetry を入れる案は、分析性を高める。
ただし、現 Intent の必須目的は audit と doctor による deterministic な失敗証跡である。

OpenTelemetry を must-have にすると、collector、exporter、環境変数、依存追加、test fixture の固定化、trace data の扱いが新たな制約になる。
そのため、現 Intent では optional extension として記録する。
後続 Intent では、`OTEL_EXPORTER_OTLP_ENDPOINT` が未設定なら no-op、設定時だけ trace と metrics を送る設計を検討する。

## Verification Strategy

検証候補は次である。

- 対象 CLI と hook の unit test。
- deterministic e2e または eval fixture。
- parity check と promote-skill 経路への影響確認。
- Amadeus validator。
- `npm run test:all`。

Feasibility 時点では、これらを constraint-register と RAID に残す。
具体的な test case は Scope Definition、Requirements Analysis、Units Generation で落とし込む。

## Recommendation

この Intent は継続する。

実装分割は、engine error、doctor drops、subagent status、conductor detection を別 Bolt にする案、または #431 と #432 を walking skeleton にする案を候補にする。
最終分割は Scope Definition と Units Generation で決める。

OpenTelemetry は現 Intent の必須成果に含めない。
ただし、後続 opportunity として RAID に残す。
