# Performance Design — repository-adoption

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。repository採用層はU1 gateを再実装せず、base materialization、単一CI invocation、capacity fixture、distribution verificationの外側予算を所有する。

## CI時間境界

| 区間 | 15秒sample | 上限／回数 |
| --- | --- | --- |
| checkout／base object取得 | 含めない | object確認最大2、欠落時fetch最大1 |
| Bun setup／frozen install | 含めない | CI既存stepを再利用 |
| root gate | 含める | invocation 1、cold／warm各15秒 |
| GNU outer deadline | 合否値ではない | TERM 30秒、5秒後KILL |
| GitHub step ceiling | 合否値ではない | no-silent-drop stepだけ `timeout-minutes: 1` |
| lint job | 変更しない | 既存timeoutを維持 |

測定開始はbase commit object確認後かつroot command起動直前、終了は全process reap時とする。checkout、fetch、installを15秒sampleへ混ぜず、非0、timeout、expected/scanned不一致を時間sampleとして採用しない。

## Invocation設計

CI wiringはeventからfull base SHAを一度選び、literal argvでobject確認／必要時fetchを完了後、次を一回だけ実行する。

```text
timeout --signal=TERM --kill-after=5s 30s \
  bun run no-silent-drop -- --base-revision <full-sha>
```

rule、root、finding単位の再起動、stdoutのCI側再解析、後続success commandによるexit上書きを禁止する。U1のexit 0／1／2と外側124／137をそのままstep outcomeへ渡す。

## Capacity予算

隔離Git workspaceのR0／R2／R4をU1公開CLIだけで測る。R0はcold／warm15秒、R2は20秒、R4は25秒以内とし、外側TERMまで5秒以上の余裕を持つ。elapsed比は `R2 <= 3 × R0`、`R4 <= 6 × R0` を追加条件とする。

U4はU1 algorithmやidentity codecを複製せず、review済みfixture manifestとU1 full evidence workflow後の `CapacityFixtureReceipt` に含まれるfiles、bytes、candidate、finding、ledger identity、digestを照合する。U1 focused complexity testのrevision-bound receiptが未実行／不一致ならcapacity合格にしない。

## Cold／warm測定

GitHub Actions `ubuntu-latest`、Bun 1.3.13、frozen install済みの独立fresh workspaceを5件使い、各workspaceで最初のrunをcold、直後の同一commandをwarmとする。各群の5値と最大値、runner image、current／base full SHA、argv、manifest／ledger digest、expected／scanned、GateResult digestを保存する。

`ColdWarmMeasurementHarness` はschema version 1の単一receiptをcanonical JSONで生成する。receiptはsuite ID、current／base SHA、runner image、command／environment digest、manifest／ledger digestと、workspace slot `0..4` ごとの `freshProofDigest`、cold record、warm recordを持つ。各warm recordは同じslotのcold result digestを `previousRunDigest` として参照する。

slotはexactly 5、各slotはcold／warm各1件、余剰run 0、両runのrevision／base／母集団digest一致を必須とする。fresh proofはfixture作成receipt、checkout object、frozen install receiptのdigestで、absolute pathやrandom IDをidentityに使わない。別revision、別slot、欠落run、warm単独を拒否する。

同一revision、roots、rules、semantic contract、ledger、base revisionの反復ではraw evidenceとGateResult bytesを一致させる。平均や外れ値除外で最大超過を隠さない。

## Performance failure方針

15／20／25秒超過、30秒TERM、35秒KILL、母集団差異、U1 complexity receipt不合格はrepository adoption failureである。scan sampling、root削減、semantic判定省略、ledger growth、cacheによる前回Pass再利用へ縮退しない。

## 検証項目

- fetch不要／必要／失敗fixtureでprocess回数と測定境界を固定する。
- cold／warm各5回、R0／R2／R4、hang fixtureのcommand recordを作る。
- no-silent-drop stepだけに1分ceilingがあり、lint job全体のtimeoutが不変であることをworkflow構造testで確認する。
- root gate invocationが常に1回で、exit 1／2／124／137がblockingであることを確認する。

## Iteration 1 Resolution

- 必須receiptはcaller入力でなくschema version付きclosed registryから導出し、exact set／revision bindingを検証する。
- R0／R2／R4はpath変更後identityをU1公開evidence workflowで生成したscale別reviewed receipt／ledger bytesからmaterializeする。
- distribution apply順を `bun scripts/package.ts` → `bun run promote:self`、検査順を対応する2つのcheckへ固定した。
- cold／warmは5 slot×2 runのcanonical measurement receiptで対応付ける。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:52:00Z
- **Iteration:** 1
- **Scope decision:** none

CIとevidenceの基本境界は妥当だが、受入receiptの必須集合がfail-openで、capacity identityとdistribution生成にも実装不能な不整合が残る。

### Findings

- Critical — logical-components.md:18,44-45,67のAcceptanceReceiptAggregatorは呼出側から渡されたrequiredReceiptsがすべてgreenなら成功するだけで、必須receipt ID／version／revisionの閉じたregistryや不足・余剰検査を所有しない。空または不完全な集合でも論理積がgreenになり得るため、reliability-design.md:17-19,63の「未実行を成功へ補完しない」を保証できず、coverage・capacity・drift等を省略したrepository adoptionを誤って完了できる。
- Major — scalability-design.md:9,13,17はapproved pre corpusを `replica-0000` namespaceへ移したR0を元の母集団と一致させるが、finding／candidate／ledger identityはrepository-relative pathを含むため、path変更後のidentity digestはapproved preと一致しない。さらにR2／R4用ledger identityを生成する公開U1 interfaceやbase/current Git ledger materializationが定義されず、U4はidentity codec再実装も禁止されているため、root gateがratchetを含めて実行可能なcapacity fixtureを構築できない。
- Major — security-design.md:35とtech-stack-decisions.md:17はpackageとpromotionの両scriptでprojectionを生成すると定める一方、business-logic-model.md:108-112とreliability-design.md:48は `bun scripts/package.ts` だけを生成として実行し、promotionはcheckしか行わない。canonical変更でpromoted rootがdriftした場合、直接編集は禁止されているのに正規のpromotion生成手順がなく、DistributionProjectionVerifierの成功経路が閉じていない。
- Major — performance-design.md:39はcold／warm証跡にcurrent／base SHA、manifest／ledger digest等を保存するとする一方、logical-components.mdのRepositoryCapacityHarness／AcceptanceReceiptAggregator interfaceにはcommand record／measurement receiptのschema、canonical serialization、fresh workspace相関キーがない。5 workspace×2 runの完全性、cold→warm対応、revision-bound性を機械的に検証するownerが未定義であり、欠落runや別revisionの測定混入を拒否できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:56:05Z
- **Iteration:** 2
- **Scope decision:** none

前回4件はすべて解消され、closed receipt registry、scale別identity／ledger fixture、distribution apply順、cold／warm相関が実装・機械検証可能な契約へ閉じた。

### Findings

- Resolved — RequiredAcceptanceReceiptRegistry/v1が23件の必須ID、version、revisionを所有し、欠落・余剰・重複・空集合をredにするため、前回のfail-open aggregationは解消した。
- Resolved — R0／R2／R4はpath変更後のfixture固有identityをU1公開evidence workflowで生成し、review済みexact ledger bytesからbase／head commitをmaterializeするため、前回のidentity driftとratchet実行不能は解消した。
- Resolved — package apply→promotion apply→両checkの順序と各receiptがsecurity-design.md:35、reliability-design.md:50、logical-components.md:79-82で一致し、distribution成功経路は閉じた。
- Resolved — ColdWarmMeasurementHarnessが5 slot×cold／warmのexact pair、fresh proof、previousRunDigest、revision／母集団一致をcanonical receiptへ固定し、欠落run・別revision混入を拒否できる。
- Minor — performance-design.md:35は依然 `census-evidence` receipt単独がledger identityを持つように読めるが、scalability-design.md:17-19とlogical-components.md:18,74-77はfull evidence workflow後のCapacityFixtureReceiptを正本としている。実装契約は後者で閉じているため、前者の用語だけを次回整合させるとよい。

## Iteration 2 Resolution

- capacity identity／ledgerの正本用語を、U1 `census-evidence` 単独receiptではなくfull evidence workflow後の `CapacityFixtureReceipt` へ統一した。
