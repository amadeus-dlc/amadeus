# Reliability Requirements — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 信頼性方針

business-logic-model.mdの検出・記録flowとbusiness-rules.mdの不変条件を、requirements.mdのNFR-1/NFR-2へ結びつける。technology-stack.mdの既存Bun test、typecheck、lint、dist/self-install drift guardを品質ゲートとして再利用する。network serviceではないためavailability SLAやbackup/RTOは非該当である。

## Graceful degradation

| Failure/uncertainty | Required behavior |
|---|---|
| invalid/空type override | `unknown`を記録しbirth継続。自動検出へfall throughしない |
| 未知dot-dir | `unknown`を記録しbirth継続 |
| resolver fallback | `.claude`文字列でも`unknown`を記録 |
| 既存stateにHarnessなし | 従来どおり読込・validation成功 |
| memoryに実観測なし | synthetic entryを作らずfresh `total=0`維持 |
| state file write失敗 | 既存intent birthのI/O失敗経路を維持し、成功として隠さない |

## Compatibility targets

- 新規state: Project InformationにHarness exactly-one
- 既存V7 state: Harnessはoptionalでversion bumpなし
- 既存`harnessDir()`: signature、env優先、string結果、cache意味論不変
- memory template: 4見出しとfresh total=0不変
- dependency direction: `amadeus-utility.ts → amadeus-lib.ts`の一方向
- 全6manifest配布と4 self-install面: 正本とのdriftなし

## Verification gate

以下をすべてgreenとする。

1. resolver/type parserのunit test
2. fresh process・3 env unset・異type競合CWD候補による全6配布形態AC-3d test
3. intent birth実FS integrationと既存V7 regression
4. `t100-memory-template-lifecycle`
5. `bun run typecheck`
6. `bun run lint`
7. `bash tests/run-tests.sh --ci`
8. `bun run dist:check`
9. `bun run promote:self:check`

失敗時にtest timeoutやassertionを緩和してgreen化しない。変更前からの無関係な赤はbaselineと比較し、本変更起因かを分離して報告する。

## Observability要件

本機能の一次観測面は新規intentの`amadeus-state.md`にあるexactly-oneの`Harness` fieldである。`getField(content, "Harness")`で7値のいずれかを機械的に取得できることをintegration testで検証する。

stage `memory.md`の`Harness=<type>`は、人間が障害調査時に読む補助面である。最初の実観測entryに併記された場合だけ実在を確認し、構造化parse・常時entry生成・完全性SLOは要求しない。

| 観測面 | 要件 | 検証 |
|---|---|---|
| State | 新規birthごとに正規化済みHarnessを1件記録 | intent birth fixture + `getField` |
| Memory | 実観測entryへraw値でなく正規化済み`Harness=<type>`を併記 | 実在entry確認 + template regression |
| Audit/log | raw override、session環境、検出途中値を追加記録しない | fixtureのaudit/stdout/stderrにraw markerがないことを検索 |
| Metrics/trace | 新規metric・span・trace exporterを追加しない | dependency/import/diff検査 |
| Alerting | 外部alertは非該当。`unknown`はstateで可視化しbirthを継続 | unknown caseのstate assertion |

ローカル同期CLIの観測field追加であり、常駐monitoring、dashboard、alert rule、distributed tracing backendは導入しない。検出値はauthorizationやsecurity alertの根拠に使わない。

## Recovery

検出結果の誤りは新規intentの観測fieldに限定され、既存stateや監査履歴を書き換えない。自動rollback/migrationは不要である。誤設定は次のintent birthでoverrideを修正して回復する。
