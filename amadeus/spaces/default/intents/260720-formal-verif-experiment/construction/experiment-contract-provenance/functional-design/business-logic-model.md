# Business Logic Model — experiment-contract-provenance

## 上流契約と責務

本Unitは、`unit-of-work.md` のU1責務、`unit-of-work-story-map.md` のS-1/S-2/S-3/S-4/S-7/S-8、`requirements.md` のFR-3〜FR-5・NFR-1/NFR-2、`components.md` のExperiment Contract / Blind Coordinator、`component-methods.md` の型とmethod、`services.md` のnon-interactive CLI lifecycleを実装可能なpure contractへ落とす。concrete fixture、TLC、TS arm、evidence store、report rendererは所有せず、typed port越しにだけ呼び出す。

処理は次の4系統に分ける。

1. unknown inputをstrict parserでdomain valueへ変換する。
2. 検証済みvalueをcanonical JSONへ正準化し、stable SHA-256 identityを作る。
3. append-only provenance event列をfoldし、blind公開stateと次command可否を導出する。
4. typed commandをconstructor-injected handlerへ一意にdispatchし、handlerのtyped errorを変更せず返す。

## Schema parseとidentity生成

`loadConfig`、`parseCellResult`、`parseArmSuiteResult`は、最初にrootがplain JSON objectであることを確認し、required field、literal/named constant、closed discriminator、ISO-8601 UTC、non-negative integer、pathの相対性を順にparseする。未知field、重複identity、`NaN`相当、空文字、unknown discriminatorは`SchemaError`で終了し、部分valueを返さない。

identity生成手順は次のとおり。

1. parser通過済みvalueだけを受け取る。
2. object keyを各階層でUnicode code point辞書順へ並べる。array順序は意味を持つため変更しない。
3. `undefined`、function、symbol、非有限numberのようなJSON外値はdefectとしてfail-fastする。
4. 余分な空白なしのUTF-8 JSON bytesを1回だけ生成する。
5. bytesのSHA-256 lowercase hexをidentityとする。

同じ意味valueは入力key順に依存せず同じidentityを返す。一方、canonical input列、evidence path列、event列の順序変更は意味変更なので別identityになる。

## Blind state foldとcommand判定

初期stateは`READY_FOR_T_AUTHORING`である。検証済みeventを時系列にfoldし、次の一本道だけを受理する。

```text
READY_FOR_T_AUTHORING
  -> T_AUTHORING
  -> T_FROZEN
  -> SKELETON_REVEALED
  -> SKELETON_PASSED | SKELETON_FAILED
SKELETON_PASSED
  -> S_AUTHORING
  -> S_FROZEN
  -> MANIFEST_PROMOTABLE
```

`SKELETON_FAILED`はterminalであり、Arm S開始、manifest promotion、full-suite commandを全拒否する。`MANIFEST_PROMOTABLE`はpermission valueを返すだけで、promotionそのものはRegistry handlerを持つ後続composition rootが行う。

各eventの受理前に、直前state、event identity重複、UTC順序、actor/session/worktree/base SHA/public input hashを検査する。start/freezeは実入力manifest identityとartifact reference、禁止path scan receiptを必須とし、allowlist外の実入力、先行arm evidence、他arm path、sealed fixture詳細が0件であることをvalidatorで照合する。`ARM_FROZEN`はさらに対応するstart、同じarm/worktree/input hash、clean receipt、green test receipt、owned path allowlist、freeze SHAを要求する。revealはArm T freeze後の#1252専用eventだけ、Arm S startは`SKELETON_PASSED`後だけ許す。

stateはledgerから毎回導出し、別state fileを正本化しない。複数eventを1 commandでappendする場合は、`transactionId`を持たないcanonical event payload列を全生成・fold検証し、domain separation `amadeus.formal-verif.transaction.v1` とexpected head identityを含めてhashしたtransaction IDを作る。その後だけ各event envelopeへ同じtransaction IDを付与するため、hash preimageは自己参照しない。

commitはatomic store portの`appendBatch(expectedHead, transactionId, events)`だけを使う。storeは新規commit、同一transactionが同一canonical batchですでにcommit済み、expected head競合を区別する。同一transaction再送は既commit batchを再照合して同じ成功receiptへ収束し、同じIDでbytesが違う場合はcorruption error、commit結果不明時はtransaction lookup後にのみ再送する。生成・検証失敗またはhead競合ではledger bytesを変更せず、部分appendを許さない。

## Typed dispatcherとfailure flow

command parserはCLI argvをclosed `ExperimentCommand` unionへ変換する。`SkeletonRecord(pass|fail)`はskeleton evidenceからpass/fail eventを生成し、`ManifestPromotionRequest`はpermission receiptをRegistry handlerへ渡す。dispatcherは`Map<CommandKind, Handler>`をconstructorで受け、起動時に全command kindのhandlerがちょうど1件ずつあること、余分なkindがないことを検証する。U1はconcrete providerをimportしない。

dispatch手順は `parse argv -> validate command against folded state -> lookup handler -> await handler -> return Result` である。unknown/surplus argv、禁止transition、handler欠損・重複、port failureはnon-zeroに対応するtyped errorとなる。dispatcherはerrorを`DETECTED`、`NOT_DETECTED`、成功へ変換せず、後続commandを自動実行しない。

test doubleだけで、全commandの一意routing、引数伝達、dependency error propagation、invalid event order、dirty freeze、実入力manifest乖離、禁止path scan漏れ、private input漏洩、同一transaction再送、head競合、禁止subcommandを検証する。U1単独ではwalking skeleton完成を主張せず、U2〜U5とのB1統合まで未出荷境界を維持する。
