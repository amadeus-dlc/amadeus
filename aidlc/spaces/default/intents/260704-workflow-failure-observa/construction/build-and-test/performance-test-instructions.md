# Performance Test Instructions

## 入力成果物

この手順は、各 Unit の `code-generation-plan` と `code-summary`、および NFR performance requirements を入力として扱う。

U001 は error evidence、hook drop summary、doctor output の bounded processing を扱う。

U002 は status classification と old row normalization を扱う。

U003 は Requirement evidence map と PR readiness checklist の固定集合処理を扱う。

## Performance Scope

対象は local TypeScript helper と CLI eval である。

外部 collector、dashboard、cloud export、load balancer、database は対象外である。

性能目標は、決定的 fixture が通常の CI budget 内で完了することである。

## Run Commands

性能回帰の簡易検査は、追加 eval の合計実行時間で確認する。

```bash
time npm run test:it:failure-evidence-foundation
time npm run test:it:subagent-status-audit
time npm run test:it:workflow-warning-traceability
```

統合した評価時間は次で確認する。

```bash
time npm run test:it:all
```

## Expected Targets

U001、U002、U003 の個別 eval は、それぞれ数秒以内に完了することを期待する。

`test:it:all` は既存 eval 群を含むため、単体の性能判定ではなく CI feedback budget の参考値として扱う。

Requirement evidence map は R001 から R009 の固定 9 件を対象にし、無制限の audit scan を追加しない。

## Regression Handling

個別 eval が急に遅くなった場合は、一時 workspace の作成、audit shard scan、doctor warning scan の順に原因を切り分ける。

OpenTelemetry は no-op default であるため、collector との通信待ちを性能要因にしない。
