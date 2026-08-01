# Code Summary — U3 exception(Bolt 2b)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan のスライス列どおり。

## 着地

- **PR [#1907](https://github.com/amadeus-dlc/amadeus/pull/1907) — MERGED**(スカッシュ)。#1905 着地後の tracer-provider 実競合(U2 contextAttributes × U3 projectDir の同一コンストラクタ拡張)は conductor が union 解消(両パラメータ共存)+dist 再生成+full CI PASS で閉包

## 変更面(正本)

- `otel/redaction.ts`: redactStacktrace(stack, repoRoot): string 新設(公開型追加なし)
- `otel/tracer-provider.ts`: recordException 拡張(exception.type / exception.stacktrace / write-time redaction は recordException 内限定、二次例外は内部 try 縮退)
- `otel/event-registry.ts`: exception def へ optional 2属性(required・canonical 数不変)
- tests: t-otel-stacktrace-redaction(unit 12)+t-otel-exception-attributes(integration 8)。allowlist 行ピン remap
- dist 7ハーネス+self-install 同期

## 検証実測

- typecheck / lint / run-tests --ci(726 files・9923 assertions PASS)/ dist:check / promote:self:check = 全 exit 0。patch coverage 39/39 uncovered 0
- 線形性実測: 100KB 合成 stack 完走・全 n で ≤0.06ms(判別力実証済み fixture)
- 独立 PR レビュー READY(GoA 2 — 留保は CI 完了待ちのみで解消)。referee check converged / tampered=false
- 申し送り: t145 並列 lock 消失(1/2回・base 対照で自変更由来を否定)→ #1906 起票
