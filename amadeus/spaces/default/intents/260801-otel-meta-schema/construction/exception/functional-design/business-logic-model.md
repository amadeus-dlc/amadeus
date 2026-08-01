# Business Logic Model — U3 exception

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U3 の責務は unit-of-work.md U3 行(按分95行: tracer recordException 部 20+redaction 60+registry exception 部 15)から、API 形は component-methods.md の redactStacktrace / recordException 節から、FR 契約は requirements.md FR-EXC-1〜4 から、価値は story-map 段3(バグ改修の直接材料)から、store 境界は services.md から導出した。

## recordException 拡張(tracer-provider.ts:145-157)

1. message: 既存どおり(exception.message)
2. **type**: err.name を exception.type へ(Error 以外は省略 = fail-open)
3. **stacktrace**: err.stack が存在する場合のみ `redactStacktrace(stack, repoRoot)`(戻り値 = redaction 済み string、component-methods.md:26 の承認シグネチャ)の**戻り値文字列をそのまま** exception.stacktrace へ。err.stack 不在は省略
4. 属性 bag 全体を redactAttributes(**write-time 層の新設** — addEvent 自体はフィルタなしだが export 境界では local-span-exporter.ts:88-99 が event attributes を既に redaction 済み(#1719 着地)。本 Unit が足すのは (a) write-time 層(recordException 内限定、addEvent 一般は不変 = ADR-4)と (b) 両層に無い **path マスク**(redactStacktrace)の2点)
5. addEvent(EXCEPTION_SPAN_EVENT_NAME, bag, time)

## redactStacktrace(redaction.ts 新設)

- 行単位走査: パス様トークンを検出し (a) repoRoot 配下 → repo 相対 (b) ホーム配下 → `<home>/…` (c) その他絶対パス → `<external>/…` へ書換
- 既存 scrubCredentials を全行へ適用(冪等)
- 戻り値は redaction 済み文字列(承認シグネチャ `(stack, repoRoot) => string` 維持)。落ちる実証はテスト側の文字列内容 assert で行う — `<home>`/`<external>` の出現数カウント・絶対ホームパスの非出現・repo 相対パスの出現(関数の公開戻り値にカウンタは持たせない)
