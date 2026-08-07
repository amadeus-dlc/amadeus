# U3 subagent-stats — Performance Design

**上流入力(consumes 全数)**: `business-logic-model`(走査フェーズ/純関数境界 — 本書の性能設計の対象)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。性能の下限は明示 NFR が無いため、既存 audit 読取 CLI(`amadeus-norm-metrics.ts` 等)と同水準の体感応答(対話的実行で数秒以内)を設計目標とし、受け入れ基準には昇格させない(未実測の推定値を基準にしない — `estimates-not-acceptance-criteria`)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 走査の性能設計

- **単一パス集計**: シャード全行を1回だけ読み、行ごとに parse → 選別 → `ScannedAudit` へ蓄積(business-logic-model の走査フェーズ)。行の再読・二重走査をしない
- **早期選別**: `.attributes.Event` の等値判定で `SUBAGENT_*` 以外の行は record 化せず捨てる — メモリ保持は対象イベント行のみ(SUBAGENT_COMPLETED は概算で千行規模 — 未計測の概算であり、全行保持でも問題にならない規模想定。選別は corpus 成長への構え)
- **同期逐次で十分**: シャード数は intent 数 × clone 数(intent は概算で百規模 — 未計測の概算)— 並列読みの複雑さに見合う規模ではない(`parallelism-sweep-before-commit` の教訓: 並列化は実測なしに既定にしない)。実装は同期逐次読みとし、遅いと実測されたときだけ再設計する

## 純関数層の性能

- `composeStatsReport` は入力 `records` の1回の走査で全集計(byVerdict / byType / byModel / byModelSource)を構成 — 集計軸ごとの再走査をしない
- 許可集合の解決(`resolveAllowedAgentTypes`)は **CLI 実行につき1回**だけ呼び、全行の再分類に同じ resolution を使う(hook 側 BR-U1-6 の「発火ごと再読」は hook の文脈 — CLI は1実行=1測定時点なので1回で正しい)

## 性能バジェット

明示 NFR 不在のため設計目標のみ(受け入れ基準ではない): 現行 corpus 規模(シャード数百・対象行数千)で対話的応答。テスト(BR-U3-6)は機能の正しさを固定し、性能の退行上限は設けない — 退行が体感された時点で `bt-timeout-verification-shape`(counter assertion + 退行上限)の様式で追加する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T22:51:19Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER(FD エラーモデルに無いシャード読取失敗クラス)は FD への cross-stage 訂正(fail-loud クラス+unreadableShardCount+訂正注記)で閉包、FOLLOW-UP 4件・NIT 2件も閉包。i2 で是正起因の新 BLOCKER(制御文字除去の供給元が依存禁止と矛盾)が出たため E-LSSADS13 の閉包確認限定イテレーション(i2b)を実施 — 供給元を observability の export ヘルパへ確定し、i2b が全指摘の閉包を確認して READY(予算超過の開示: 通常2回+閉包確認1回)。

### Findings

- FOLLOW-UP | security-design.md:17 | (i2 の BLOCKER — i2b で閉包確認済み)制御文字除去の供給元が amadeus-lib.ts 名指しで依存禁止と逐語矛盾 | 是正: observability の export ヘルパへ変更(stats → observability の既定方向)、lib 定数非共有の根拠(意図ベースの重複排除)を明記
- FOLLOW-UP | logical-components.md:21 | (閉包済み)注記行文言の追加規定の所有未明示 | 本 ND 所有の出力文言統制と明示(BR-U3-5 の第5節構成は無改変)
- NIT | reliability-design.md:28 | (閉包済み)exit 列挙に環境差クラス不在 | 4クラス全ての exit を1文で確定
- NIT | reliability-design.md:22 | (閉包済み)warnings の語が allowedSetWarnings と紛れる | unreadableShardCount + stderr の名指しへ変更
