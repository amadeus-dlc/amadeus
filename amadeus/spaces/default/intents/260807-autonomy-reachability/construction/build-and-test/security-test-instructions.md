# Security Test Instructions — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(認可境界の不変条件)と `code-summary.md`(実装した防御と実測) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 適用範囲: NFR-1(安全性)へ trace する認可境界の検査

本 intent の security 面は**認可境界そのもの**である — autonomy は「人間の承認をどこまで機械が代行してよいか」を決める機構であり、その到達性を上げる変更は、同時に境界を緩めない証明を要求する。`requirements.md:54` の NFR-1 が受け入れ基準:「すべての変更で fail-closed 原則を維持する。FR-2a の可視化は認可判定を変えない(観測のみ)。FR-1b は grant 儀式を一切緩めない」。

外形的な DAST・依存 audit は本 intent の変更面(認可ロジックと文書)へ trace できないため生成しない(`cid:build-and-test:bt-proportional-selection`)。リポジトリ全体の依存 advisory は本 intent の判定対象外であり、範囲外の依存更新は別作業へ送る(`cid:build-and-test:c1-doctor-seam`)。

## 検査する不変条件と、それを固定するテスト

| 不変条件 | 固定面 |
|---|---|
| **`full` の grant 儀式は起動フラグで代行できない** | `--autonomy full` は受理されるが**適用されない** — 儀式の2コマンドを印字して停止する。t490/t491 が固定 |
| **既に人間が設定した mode を上書きできない** | フラグは provenance が `system-default` の**最初の宣言としてのみ**受理。同一 mode の再宣言は no-op、異なる mode は loud に拒否して `set-autonomy` を指す |
| **grant の取り消しはフラグの副作用にならない** | 有効な grant がある状態での `--autonomy none` は拒否 |
| **presence を偽造できない** | birth 直後の Intent は自前の audit 履歴を持たないため、宣言は**起動キーストロークの human turn へ束縛**される。実在の human turn を伴わない起動は loud に拒否され、Intent は mode 未設定のまま立ち、最初の宣言権は残る |
| **launch chain の束縛は identity 一致で行う** | 上界(時刻)だけでは、space 内の任意の未消費 human turn が認可に使えてしまう。fingerprint 一致 + 未消費 + `<= bornAt` の**identity 解決**とし、退化ケースを判別ユニオンで表現不能にする(CodeRabbit の Major 指摘を受けた u2 の是正 — 修正前は exit 0 の無音成功として再現された) |
| **観測の追加は判定を変えない** | u3 の `Resolution Route` / `Decision Id` は `QUESTION_ANSWERED` の**派生属性**であり、認可判定の入力にならない |
| **記録の失敗はゲートを緩めない** | u1 の refusal イベントは fail-open で記録する — 記録に失敗しても stderr へ出してゲートは不変(t481 が audit commit 失敗の注入で固定) |
| **semi の範囲は実装の正準定数に一致する** | `SEMI_ROUTINE_INTERACTIONS = ["stage-gate", "question"]`(`amadeus-intent-autonomy.ts:581`)。t452 が semi-authority の付与と phase boundary の人間必須を固定。u4 の導線文言・参照表もこの定数に合わせて是正済み |

## 実行

```sh
bun test tests/unit/t483-non-auto-decided-kinds.test.ts
bun test tests/unit/t452-authorize-interaction-semi.test.ts
bun test tests/integration/t481-*.integration.test.ts
bun test tests/integration/t482-autonomy-refusal-event.integration.test.ts
bun test tests/integration/t490-*.integration.test.ts
bun test tests/integration/t491-*.integration.test.ts
```

いずれも `bash tests/run-tests.sh --ci` の母集団に含まれるため、全 CI の green が上記全件の green を含む。個別実行は診断可能性のために残す(`cid:build-and-test:c3-mirror-review-fixes`)。

## 注記: 拒否経路は「実際に赤くなること」まで実証する

拒否を固定するテストは、**修正前の実装に対して赤くなること**を確認して初めて意味を持つ。u2 の launch chain 是正では、builder が修正前コードで穴を再現(認可が通ってしまい exit 0 の無音成功)してから identity 束縛を入れており、これが閉包の実証になっている(`cid:code-generation:ruling-premise-closure-verification` — 裁定準拠の実装完了と症状の閉包は別物)。
