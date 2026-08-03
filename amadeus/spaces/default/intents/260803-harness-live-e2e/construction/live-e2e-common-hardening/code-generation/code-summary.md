# Code Summary — live-e2e-common-hardening

## 実装結果

U02の承認済み設計に従い、production APIを変更しないoffline adversarial test kitを`tests/harness/live-e2e/testing/`へ追加した。kitはtransport固有command、prompt、anchor、auth方式を持たず、U03〜U11から再利用できる。

## 作成ファイル

- `tests/harness/live-e2e/testing/contract-case.ts`: `ContractCase`、closed `FaultPoint` / `ExpectedTerminal`、schema validation、seed付きstrict opt-in property corpus。
- `tests/harness/live-e2e/testing/fakes.ts`: scripted fake adapter/journey、run ID付きboundary trace、credential binding、offline scratch allocator。
- `tests/harness/live-e2e/testing/oracle.ts`: closed taxonomy、status/code、trace order、run ownership、skip無副作用、env allow-list、canary、credential-bearing descendant cleanup、timeout abort/reap、bounded outputのstable assertion oracle。
- `tests/harness/live-e2e/testing/evidence.ts`: baseline greenかつ期待mutant redの場合だけ生成できるsanitized `RedGreenEvidence`。
- `tests/unit/t-live-e2e-hardening-kit.test.ts`: schema/property/oracle/evidenceの7 test。
- `tests/integration/t-live-e2e-hardening-kit.integration.test.ts`: fakeを既存production `runLiveJourney`へ接続するsuccess、prepare fault、timeoutの3 test。

## 主要な判断

- ユーザー選択によりU02設計をauthoritativeとし、U01のproduction file/export/type/taxonomy/ledger schema/matrix schemaを変更しなかった。
- failure evidenceはraw値やpathを保持せず、case ID、seed、requirement ID、stable assertion IDだけを保持する。
- credential-bearing resourceは親run IDとの関係、release状態、escape有無をoracle入力として判定する。実credentialは使用せず固定canaryだけを用いる。
- timeout contractは`abort → reap → cleanup → leak-scan`の順序を要求し、output contractはraw byte cap超過時のtruncate/abort/reapと固定buffer上限を判定する。
- ledgerとmatrixのproduction contractは既存U01 integration/unit testsをfocused convergenceに含めた。U02はそれらを複製せず、closed run-error terminalとmatrix faultを表現できるschemaを提供する。

## テスト結果

- 新規tests: 10 pass / 0 fail。
- U01既存contractを含むfocused suite: 29 pass / 0 fail、85 assertions。
- `bun run typecheck`: 成功。
- `bun run lint`: 成功（既存complexity warningsのみ。新規6 filesのtargeted Biome checkはwarning 0）。
- `bun scripts/package.ts --check`: 全harness tree同期済み。
- `bun run promote:self:check`: project-local self install同期済み。

## 計画との差異

- test runnerは既存Bun設定で要件を満たすため、test configuration fileは追加していない。
- 実live CLI、model、credential、network、課金APIは呼び出していない。U02 terminal evidenceはoffline suiteのgreenとmutant redであり、live green receiptではない。
