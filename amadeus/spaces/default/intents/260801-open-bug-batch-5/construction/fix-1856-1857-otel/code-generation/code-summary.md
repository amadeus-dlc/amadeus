# Code Summary — fix-1856-1857-otel(Bolt 3)

上流入力(consumes 全数): requirements.md

- 実装は `requirements.md` FR-5 / FR-6 の AC 全数+ユーザー裁定2件(裁定 B、probe same-root 同梱)に対し Red→Green を実測して完了した。PR: [#1886](https://github.com/amadeus-dlc/amadeus/pull/1886)(branch `bolt/obb5-3-otel`)。

## 変更面

- `packages/framework/core/otel/logger-provider.ts` — emitEvent の latch ガード(fail-closed drop、通知1回ラッチ、`canonicalRecord()` 抽出)。
- `packages/framework/core/otel/fatal-latch.ts` — probe 整合規則の merge 対応(AUDIT_FORKED/AUDIT_MERGED 前は seq 単調・後は idempotencyKey 一意性検査)。
- `packages/framework/core/tools/amadeus-state.ts` — `emitAudit` 1 seam へ mutation ガード2段(事前 assert+emit 戻り値 refuse)。
- `packages/framework/core/otel/migration-adapter.ts` ほか — reason union `"fatal-latch"` の伝播(#1248 seal 同型)。
- `packages/framework/core/hooks/amadeus-session-end.ts` — `ensureTracerBootstrap` へ置換(FR-6)。
- テスト: t395 / t396 新設(採番使用・返上なし)、t90 fixture 連番化(宣言つき改訂)、t125 は契約無改訂で 9/9 復旧。
- dist 7面+self-install 再生成。

## AC・裁定の実測

| 項目 | Red | Green |
|---|---|---|
| AC-5a | latch 下でも追記(`appended: true`) | 追記なし・shard 行数不変 |
| AC-5b | — | 未発火時ベースライン2件据置+`t-otel-failure-contract` pin は別層のため無改訂 |
| AC-5c | 通知 0 回 | 正確に1回、後続 stderr 空 |
| 裁定 B | drop 単独で t125 7/9 fail(state 変更が監査なし exit 0) | mutation ガード2段で t125+t17+t247 = 119 pass / 0 fail、契約無改訂 |
| probe same-root | 正常 merge shard(seq [1..19,7,8] 実測)に偽 latch → t49 赤 | merge-aware 規則で t49 green、真に壊れた台帳への latch は両側実証で維持 |
| AC-6a | 事前 tracer 登録で span 不記録(negative control で fixture 到達実証) | 両ケース span 記録 |
| AC-6b | — | 無音 catch 無改変、`register*Provider` 本番直呼び修正後 0 件 |

## 逸脱

2件 — いずれも実装前停止 → ユーザー裁定で解消(plan の系譜節参照)。裁定外の無申告逸脱なし。

## 検証(実測 exit code)

typecheck 0 / lint 0 / dist:check 0(7ツリー)/ promote:self:check 0 / complexity 0 / coverage-registry 0 / callsite-guard 0 / 対象+回復スイート(t395/t396/t125/t17/t247/t49/t90)green。committed shard 全数走査 179/179 整合(probe 規則変更の遡及影響なし)。CI は PR #1886 で確認中(conductor 管理)。

## 採番

t395 / t396 使用、返上なし。

## 同根

`register*Provider` 直呼び(修正後 0 件)と probe 偽 latch(同一 PR 修正)。他の残存なし。
