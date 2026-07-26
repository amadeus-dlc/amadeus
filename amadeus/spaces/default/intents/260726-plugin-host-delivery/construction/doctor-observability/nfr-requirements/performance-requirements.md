# 性能要件 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 読み取り専用・既存 doctor への軽微追加

business-logic-model のフロー(doctor plugin 節の構築)は、既存 `/amadeus --doctor` 経路へ plugin 節を追加するものである。business-rules の BR-U5-1(射影のみ)のとおり、doctor の plugin 節は diagnosePlugins・composition record・U6 判定の既存戻り値からの **射影のみ** で構成し、新走査・新 I/O を作らない。したがって追加コストは既存 doctor 実行時間へのごく軽微な上乗せに留まる。

- 合否(純関数性の構造検証): `buildDoctorPluginSection(diag, record, judgment)` が入力引数以外を読まない純関数であること(BR-U5-1)。これにより追加の走査・I/O が発生しないことを構造的に固定する。この合否は数値予算に依存せず成立する

## 数値予算の扱い(build-and-test で実測固定)

doctor は利用者が明示起動する一度きりの診断コマンドであり、繰り返しのホットパスではない。plugin 節追加による実行時間の増分は僅少と見込まれるが、具体的な数値は未実測である。

- 推定(算出根拠なし・目安): 追加処理は既存戻り値の射影と行整形のみで、新規のファイル走査・ハッシュ計算を伴わないため、実行時間の増分は体感不能な水準と見込む
- 合否: doctor 実行時間の数値予算は本 Unit では固定せず、必要な場合は build-and-test の実測で確定する(推定値を受け入れ基準に用いない)

## 常駐 service 向けパターンの非適用(N/A)

technology-stack のとおり本フレームワークは常駐 service を持たない単発 CLI 実行である。requirements の FR-5(doctor 可観測性)は表示内容の要件であって性能予算を課さず、doctor はスループット・同時実行の対象ではないため、cache / 水平スケール / circuit breaker などの常駐向け性能パターンは **N/A** とする。BR-U5-4(0-plugin 縮退)のとおり、0-plugin 時は 1 行縮退で既存 doctor 出力の他行に影響ゼロであることが、追加コストの上限を決定的に固定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:20Z
- **Iteration:** 1
- **Scope decision:** none

recovery-pending / DropsRecord の cross-unit 整合を裏取り。読み取り専用・N/A 根拠適正。Minor 1(誤字)は是正済み。

### Findings

- [Minor] scalability-requirements の誤字(ゼル→ゼロ)— 是正済み
