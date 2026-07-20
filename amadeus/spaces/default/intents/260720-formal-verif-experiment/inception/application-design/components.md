# Components — 形式検証対照実験

## 上流入力と設計境界

本設計は `requirements.md` のFR-1〜FR-9 / NFR-1〜NFR-4、`architecture.md` のrepo-local scriptとone-core-many-harnesses境界、`component-inventory.md` の既存選挙model / store / CLI / record層、`team-practices.md` のTypeScript・Bun・test・branch規律を入力とする。AWS resource、外部service、UI、`packages/framework/`、`dist/` は追加しない。

構成は、既存repository内の実験用modular monolithである。再利用可能な実行コードは `scripts/formal-verif/`、testとfixture contractは `tests/formal-verif/`、intent固有の注入patch・freeze provenance・raw evidence・reportは `<record>/construction/experiment-evidence/` が所有する(E-FVEAD3=A)。

## コンポーネント一覧

| Component | Purpose / Ownership | Public surface | Owns data | Boundary |
| --- | --- | --- | --- | --- |
| Experiment Contract | arm間で共有可能な型、named constants、verdict schemaを一元化 | config/result schema validation | `experiment-config.json` schema | defect ID、注入patch、期待failureをarm freeze前に公開しない |
| Blind Coordinator | arm authoring開始・freeze・開示順序を統制 | authoring start、freeze、reveal | `authoring-events.jsonl`、disclosure manifest | arm実装を解釈せず、時刻とSHAをmint / validateする |
| Sealed Fixture Registry | defect台帳と再注入provenanceを検証 | seal、reveal、validate fixture | intent record内のsealed manifest / patch | 両arm authoring中はarm worktreeから不可視。最終freeze後だけrepo-local manifestへ昇格 |
| Arm T Adapter | TLA+ modelとTLCの実行を共通verdictへ変換 | prepare / run / normalize counterexample | `.tla` / `.cfg`、TLC raw output | TLA+契約だけを知り、TS armやdefect期待値を知らない |
| Arm S Adapter | universe全域性・fast-check・2時刻型を共通verdictへ変換 | prepare / run / normalize failure | TS oracle、seed / replay path | TS契約だけを知り、TLA+ armやdefect期待値を知らない |
| Cell Runner | baseline / injection × armを同条件で実行 | execute one cell / benchmark | command log、exit、duration samples | verdictを推測せずadapter結果をschema検証する |
| Evidence Store | append-only raw evidenceをintent recordへ保存 | append / read / completeness check | cell results、raw stdout/stderr、checksums | arm codeから書込み不可。runnerだけが書く |
| Eligibility & Pareto Evaluator | hard eligibilityと3コスト軸の閉じた比較 | classify eligibility / compare | derived comparison tuple | raw evidenceを書換えない。重み付き合算を持たない |
| Report Renderer | 再現可能な最終reportを生成 | render / verify trace links | report、matrix、Alloy判定 | evaluator結果の表示のみ。採否ルールを再実装しない |
| TLC Toolchain | v1.7.4 jarの取得とchecksum検証 | acquire / verify / invoke | ignored local cache | networkは取得stepだけ。検査実行はoffline |

## Blind公開state machine

順序は次の一経路だけを許す。

1. Coordinatorは健全baseline SHA、公開contract bundle hash、Arm T IDだけをArm T authoring worktreeへ渡す。Arm T branchはmainへ未mergeとする。
2. Arm T worktree作成・公開入力検証後、Coordinatorが`ARM_AUTHORING_STARTED(T)`をmintする。arm testが通りclean freeze commitが得られた時だけ`ARM_FROZEN(T)`をmintする。
3. Coordinatorはsealed registry内の#1252 entryだけをArm T専用execution worktreeへ開示し、walking-skeletonを実行する。manifestはrecord内のsealed形のままで、repo-local公開pathへ昇格しない。
4. skeletonが`HARNESS_ERROR`、非決定的、または必要証跡欠損なら状態を`SKELETON_FAILED`として停止する。Arm S開始・残件fan-out・manifest昇格を禁止する。
5. `SKELETON_PASSED`後だけ、Arm T branchを含まない同じ健全baselineと公開contractからArm S authoring worktreeを作る。skeleton result、#1252 entry、Arm T実装pathを入力allowlist外にし、`ARM_AUTHORING_STARTED(S)`→`ARM_FROZEN(S)`を同じ条件でmintする。
6. 両freeze後、Coordinatorが2つのfrozen commitをintegration branchへ内容変更なしで統合し、sealed fixture manifestを `tests/formal-verif/fixtures/fixture-manifest.json` へ昇格する。この時点で初めて全fixtureを両armのexecution worktreeへ開示し、残件fan-outとcanonical full-suite測定を開始する。skeletonのArm T × #1252結果はfalling proofとして保持するが、CIコストはfull suiteを再実行して測る。

状態遷移は `T_AUTHORING → T_FROZEN → SKELETON_REVEALED → SKELETON_PASSED → S_AUTHORING → S_FROZEN → MANIFEST_PROMOTED → FULL_SUITE` とし、失敗edgeは`SKELETON_FAILED`だけである。

合否: freeze前のarm入力manifestにdefect ID、注入branch、patch、既存回帰test名、他arm実装が0件であり、各開示が対応する`ARM_FROZEN`より後である。event ledgerが上記state machine以外の遷移を1件でも含む場合は不合格とする。

## 配置と変更境界

```text
scripts/formal-verif/                 reusable coordinator, adapters, runner, evaluator
tests/formal-verif/                   reusable tests and post-freeze fixture manifest
<record>/construction/experiment-evidence/
  sealed/                             pre-freeze defect registry and injection patches
  provenance/                         arm events, input hashes, freeze SHAs
  raw/<arm>/<fixture>/                commands, streams, result JSON, benchmark samples
  report/                             matrix, cost table, final decision
.cache/formal-verif/                  ignored TLC jar cache
```

`packages/framework/`、`dist/`、self-install、production CI required checkには書き込まない。Phase PRではInception設計recordだけを扱い、上記implementation pathはConstructionのunitが作成する。
