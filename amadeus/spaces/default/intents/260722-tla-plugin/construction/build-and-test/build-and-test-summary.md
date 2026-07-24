# Build and Test サマリー

上流入力(consumes 全数): plugin-skeleton、run-model-check、ci-integration、tla-externalize、completeness-sensor各ユニットの `code-generation-plan.md` と `code-summary.md`

## 全体判定

ビルド・型検査・lint・全CI・coverage・配布面同期・plugin性能・TLC受入証拠はPASSした。plugin sourceは `stages/<slug>.md`、host targetは `plugins/<name>/stages/<slug>.md` で、禁止された二重namespaceは0件である。

対象機能はbuild-ready / test-ready。dependency auditに既存High advisoryがあるため、release-readyは条件付きである。今回の修復は依存を変更しておらず、plugin/TLC/sensorのsecurity regressionは全てgreen。

## テスト種別

| 種別 | 対象 | 判定 |
|---|---|---|
| Unit | domain、parser、planner、index、verifier | PASS |
| Integration | filesystem、process、plugin lifecycle、CI構造 | PASS |
| E2E | CLI、sensor dispatcher、artifact、workflow contract | PASS |
| Performance | plugin compile/capacity、TLC実受入 | PASS |
| Security | trust boundary、redaction、supply-chain固定 | PASS |
| Dependency audit | repository全体のtransitive dependency | CONDITIONAL |

## 実測品質ゲート

- Full CI: 515 files / 7,202 assertions / 0 failure。
- Coverage CI: 515 files / 7,202 assertions / 0 failure。
- Project coverage: 82.5295%（baseline 40.9395%、+41.5900pp）。
- Patch gate: uncovered 0。
- Typecheck、lint、dist:check、promote:self:check: exit 0。
- lintは既存265 warnings / 20 infosを報告したがerror 0。
- `bun audit`: High 3 / Moderate 8 / Low 1。dependency manifest/lockに本intent差分なし。

## 制約と準備度

- GitHub Actions実Docker受入は既存のユーザー承認済みrun `30078685585` を証拠とし、このステージでは外部dispatchを再実行していない。
- AWS/Claude live testはcredential/substrate不在により理由付きskip。
- deployment基盤は本intentの対象外で、Operation phaseはscope上SKIP。
- 残る条件はrepository全体の既存dependency advisoryの解消であり、本修復の機能受入を偽ってgreen化しない。
