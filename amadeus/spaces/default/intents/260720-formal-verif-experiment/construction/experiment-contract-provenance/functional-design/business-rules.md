# Business Rules — experiment-contract-provenance

## Traceability

以下の規則は`unit-of-work.md` のU1完成条件、`unit-of-work-story-map.md` のS-1/S-2/S-3/S-4/S-7/S-8、`requirements.md` のFR-3〜FR-5・NFR-1/NFR-2、`components.md` のblind state machine、`component-methods.md` のResult契約、`services.md` のCLI順序制御を具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜05 | FR-4、NFR-1、S-3/S-8 |
| BR-06〜14 | FR-3、NFR-2、S-2/S-4 |
| BR-15〜19 | FR-5、NFR-1/NFR-2、S-7/S-8 |
| BR-20〜23 | U1 port境界、NFR-4 |

## Contractとidentity規則

- **BR-01 Strict parse:** required field欠損、未知field、unknown discriminator、型不一致を成功valueへ丸めない。
- **BR-02 Closed constants:** benchmark runs=5、warmups=1、timeout=120秒、TLC workers=1、voters=3、choices=3、initial/amend/hold上限=1、PBT seed=20260720、runs=100以外のconfigを拒否する。
- **BR-03 Canonical identity:** parser通過済みJSONをrecursive key-sortし、array順序を保持したUTF-8 bytesのSHA-256を使う。
- **BR-04 Order significance:** canonical input set、evidence paths、event ledgerのarray順序はsortしない。同じ要素でも順序が違えば別identityとする。
- **BR-05 Evidence completeness:** `CellResult`はarm、fixture、baseline/arm SHA、verdict、exit、tool versions、seed/bound、開始/終了、counterexample、evidence pathsを必須とする。欠損をnull以外の暗黙値で補わない。

## Blind provenance規則

- **BR-06 Start uniqueness:** armごとに`ARM_AUTHORING_STARTED`は1件だけ許す。最初のarm-owned file変更前のclean receiptを必要とする。
- **BR-07 Input isolation:** start/freezeの申告public input manifestと実入力manifest identity/artifactを照合する。禁止path scan receiptは先行arm evidence、他arm path、sealed fixture詳細、allowlist外pathが0件であることを証明し、いずれかの混入または申告との乖離があれば拒否する。
- **BR-08 Freeze continuity:** freezeのarm、author、session、worktree、base SHA、public input hashは対応するstartと一致しなければならない。
- **BR-09 Freeze proof:** clean tree、green unit test、owned path allowlist、freeze commit実在のreceiptが全て揃う場合だけ`ARM_FROZEN`を受理する。
- **BR-10 T-first:** 最初のauthoring/freeze対象はArm Tだけとする。Arm S startを先行させない。
- **BR-11 Reveal after freeze:** #1252 revealはArm T freeze後だけ許し、対応freeze event IDと開示hashを必須とする。
- **BR-12 Skeleton terminal:** `SKELETON_FAILED`後の全transitionを拒否する。`SKELETON_PASSED`の再発行も拒否する。
- **BR-13 S-after-pass:** Arm S startは`SKELETON_PASSED`後、Arm T branchを含まない同一healthy baseline/public contractでだけ許す。
- **BR-14 Promotion permission:** T/S両freezeとskeleton passが揃った場合だけ`MANIFEST_PROMOTABLE`を導出する。U1はpromotion I/Oを行わない。

## Reliabilityと測定規則

- **BR-15 Monotonic UTC:** event受理順はCoordinatorがmintしたUTCとledger順の両方で非減少とし、逆転・未来/無効時刻を拒否する。同値時刻はtransaction内sequenceで一意化する。
- **BR-16 Append-only and retry:** 既存eventの更新・削除・並べ替えを禁止する。event identity重複は別transactionならduplicate errorとする。同じtransaction IDと同じcanonical batchの再送だけは既commit内容を再照合して同一成功receiptを返す。
- **BR-17 Atomic batch:** transaction IDはIDを除外したcanonical event payload列、domain separation、expected head identityから生成する。`appendBatch(expectedHead, transactionId, events)`は全生成・全検証後にatomic commitし、部分appendを禁止する。head競合、同一ID/異bytes、結果不明は別のtyped outcomeとする。
- **BR-18 Elapsed source:** 実装経過時間は対応するstart/freeze eventのCoordinator UTC差だけで計算し、commit timestampや会話時刻を使わない。
- **BR-19 Fail-closed verdict boundary:** port/schema/tool/timeout failureを`DETECTED`または`NOT_DETECTED`へ変換しない。verdict生成はarm/evidence Unitに委譲する。

## Dispatcher規則

- **BR-20 Exhaustive handlers:** `fixture-seal/start/freeze/reveal/record-skeleton/request-promotion/fetch-tlc/run/benchmark/evaluate/report`の各kindにhandlerが1件だけ必要である。
- **BR-21 No concrete import:** generic dispatcherとcontract moduleはRegistry、TLC、TS、Evidence、Evaluator、Rendererのconcrete moduleをimportしない。
- **BR-22 Error preservation:** handlerのtyped error discriminator、detail、causeを変更せずcallerへ返す。catch-all successやsilent fallbackは禁止する。
- **BR-23 No chained execution:** command成功後も次commandを自動実行しない。状態遷移ごとに明示commandと新しい検証を要求する。

## Negative scenarios

最低限、未知field、config定数drift、key順だけが異なる同値JSON、array順変更、start重複、S先行、freeze hash drift、dirty freeze、申告/実入力manifest乖離、禁止path scan receipt欠損、private path混入、freeze前reveal、skeleton失敗後command、handler欠損/重複、dependency error、同一transaction再送、同一ID/異bytes、head競合、部分batch failureをred fixtureとして固定する。
