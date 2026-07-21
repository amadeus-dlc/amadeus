# Business Logic Model — workspace-inspection

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U06は、既存Bun CLI内のC3 Workspace Inspectionへ、FR-3 item 11のdepth-1 nested root検出とitem 12のsubmodule検出を追加する。`unit-of-work.md`が定める公開seamは`inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules`であり、`component-methods.md`の`WorkspaceScan`をbirth、detect JSON、doctor、auditへ共通投影する。

新規service、database、network、UIはない。`services.md`のWorkspace Inspection Serviceどおり、処理はon-demandかつread-onlyである。depth>1探索、候補の自動選択、submodule初期化、filesystem修復は行わない。

`unit-of-work-story-map.md`はU06をFR-3 items 11–12の唯一のprimary owner、U12をverification ownerとするため、本設計ではnested/submoduleの機能実装・targeted testsをU06へ閉じ、全体24項目ledger集約を持ち込まない。`components.md`はC3を既存workspace detectorとbirth/detect/doctor JSON formatterの再利用境界とするため、別serviceやconsumer別scannerを新設しない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | U06責務、3公開seam、read-only、depth-1、no auto-select、no submodule init | 目的と境界、Workspace scan pipeline |
| `unit-of-work-story-map.md` | FR-3 items 11–12のprimary ownerはU06、U12は集約のみ | 目的と境界、Verification scenarios |
| `requirements.md` | nested/submodule detection、permission advisory、既定互換、誤Greenfield overwrite禁止 | Decision and failure table、Verification scenarios |
| `components.md` | C3 owner、既存detector/birth/detect/doctor再利用、新規serviceなし | 目的と境界、Projection rules |
| `component-methods.md` | `WorkspaceScan`、`inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules` | Workspace scan pipeline、Projection rules |
| `services.md` | invocation-local read-only scan、同一snapshotの中央projection、DB/network/UIなし | 目的と境界、Projection rules |

## Workspace scan pipeline

1. `inspectWorkspace(root, io)`はrootを一度だけ列挙し、既存の言語、framework、build system、source dir、manifest signalを`scanSignals(root)`で評価する。
2. `inspectSubmodules(root, io)`はworkspace rootの`.gitmodules`だけを読む。parse可能な相対`path`が1件以上あれば第6のbrownfield signalとする。absolute path、drive absolute、`..` traversal、pathなしentryは捨てる。
3. rootの既存signalまたはsubmodule signalが一つでもあればBrownfieldと確定し、depth-1 fallbackを実行しない。これにより通常workspaceの既定経路とscan量を不変に保つ。
4. rootが無信号のときだけ`detectDepthOneProjects`を実行する。entry名をcanonical sortし、hidden dir、harness/VCS/build dir、既知source dir、docs/examples/samples/demos/reference/testdata/fixtures/templates/scripts、symlink、非directoryを除外する。
5. 各候補へrootと同じsignal evaluatorを適用する。候補内部は1階層だけsweepし、既知source dirは既存の深さ上限で一度だけ数える。source dirをsweepと再帰の双方で二重集計しない。
6. hitが1件なら`nestedRoot`へそのrelative pathを設定する。hitが複数なら`nestedRoot`を設定せず、全件をsorted `nestedCandidates`へ保持し、自動選択しない。どちらもworkspace自体はBrownfieldである。
7. 言語countは全hitから加算し、frameworkはfirst-seen orderで重複排除し、build systemは最初の`Unknown`でない値を採用する。primary languageは既存count規則、secondaryは既存閾値をそのまま使う。
8. root列挙不能、classification signalのmetadata読取不能、fallback候補の読取不能、または`.gitmodules`が存在するのにparse可能entryが0件の場合は、`WorkspaceAdvisory`へpathとreasonを記録し、結果を`kind: "inconclusive"`にする。読めた断片からGreenfield/Brownfieldを確定しない。
9. 読取が完了した場合だけ`kind: "classified"`と`projectType`を返す。scanはどちらの結果でも対象treeへ書き込まない。

## Fail-closed classification boundary

E-USSU06FD1はAを3–0で採用した。`inspectWorkspace`の結果はC3境界内の判別unionであり、classificationの完全性を型として運ぶ。

```ts
type WorkspaceScanResult =
  | { kind: "classified"; scan: ClassifiedWorkspaceScan }
  | { kind: "inconclusive"; scan: InconclusiveWorkspaceScan };
```

birth/state projectorは`switch (result.kind)`をexhaustiveに実装する。`classified`だけがProject Type、plan、runtime graph、state、auditのcommit pathへ進める。`inconclusive`はadvisoryを含むtyped errorを返し、state、plan、graph、audit、workspaceを一切変更しない。consumerが二値`projectType`だけを受け取るAPIは公開しない。

detectとdoctorはread-onlyなので両variantを表示できる。detect JSONは`inconclusive`とadvisoryを明示し、doctorは対象pathと修復案をadvisory rowへ表示する。audit projectorも両variantから同じadvisory payloadをpureに生成できるが、birthの`inconclusive`経路はmutation前rejectのためemitterを呼ばない。classified経路の既存human/JSON/state/audit bytesは、nested/submodule観測がない場合に完全一致させる。

## Submodule observation pipeline

`.gitmodules` parserはline-orientedなpure functionとする。`[submodule "name"]` sectionの`path`と任意`url`だけを受理し、コメント・未知key・非submodule sectionは無視する。malformed contentはthrowせずparseできたentryだけを返す。ただしfileが存在してparse可能entryが0件なら`UNPARSEABLE_GITMODULES` advisory付き`inconclusive`とし、Greenfieldへ縮退しない。unsafe pathだけが書かれたfileも同じ扱いである。

各submoduleは`root/path/.git` entryの実在で初期化状態を判定する。directoryがない、空、`.git`なしの場合は`initialized: false`である。実行するのは観測だけであり、remedy文字列`git submodule update --init --recursive`を表示してもコマンド自体は起動しない。

未初期化pathの表示はsorted orderで先頭5件まで列挙し、残りは`(+N more)`で境界づける。submoduleがparse可能なら、未初期化でもLanguagesは実scan結果のまま保持し、コード未取得なのに言語を推定しない。

## Projection rules

同一`WorkspaceScan` snapshotから以下をpure projectionする。

| Consumer | Projection |
|---|---|
| intent birth / state | `classified`だけProject Type、Languages、Frameworks、Build Systemをcommit。`inconclusive`は全mutation前reject |
| `detect --json` | 両variantを明示。classified既定bytesは不変、観測時だけ`nestedRoot`、`nestedCandidates`、`submodules`、`advisories`をadditive出力 |
| doctor | 両variantのSubmodules rowとscan advisory。未初期化はadvisory、inconclusiveは分類不能を明示 |
| `WORKSPACE_SCANNED` projector | 両variantから単一nested root、候補一覧、submodule件数、advisory payloadをpure生成。birth reject時はemitしない |

signalなし・`.gitmodules`なし・nested hitなしでは、既存のstate、human-readable output、audit Detailsをbyte-identicalに保つ。additive JSON keyは観測がある場合だけ出し、空値の常時追加でsnapshotを壊さない。

## Decision and failure table

| Root signal | Parse可能submodule | Nested hits | 結果 |
|---|---:|---:|---|
| あり | 任意 | 未走査 | Brownfield、root attribution |
| なし | 1件以上 | 未走査 | Brownfield、submodule attribution |
| なし | 0 | 1 | Brownfield、`nestedRoot`確定 |
| なし | 0 | 2件以上 | Brownfield、候補advisory、`nestedRoot`なし |
| なし | 0 | 0 | Greenfield、既存出力不変 |
| 読取不能あり | 任意 | 任意 | `inconclusive`、advisory、birth/state全mutation前reject |
| 読取完了 | `.gitmodules`存在・parse 0件 | 任意 | `inconclusive`、`UNPARSEABLE_GITMODULES`、Greenfield縮退禁止 |

## Verification scenarios

- empty、top-level source、単一nested、複数nested、depth-2 only、manifest-only、excluded-only、symlink、permission failureをfixture化する。
- nested内のtop-level Python 4件と`src/` TypeScript 3件を対照にし、二重集計でprimary languageが反転しないことを固定する。
- `.gitmodules`なし、malformed、unsafe pathのみ、未初期化、全初期化、6件以上の表示境界をpure parserとCLI integrationの両方で検証する。存在+parse 0件は必ず`inconclusive`である。
- birth、detect JSON、doctor、auditが同一snapshotを投影し、未初期化でREをGreenfield SKIPしないことを確認する。
- root列挙不能、signal metadata読取不能、nested候補permission failure、`.gitmodules` parse 0件でbirth/stateが同じtyped errorを返し、state/plan/graph/audit/workspace bytesが全て不変であることをnegative controlとして実証する。
- scan前後のworkspace tree bytesを比較し、permission failureと未初期化submoduleのどちらでもsource tree書込0を実証する。
- nested/submodule観測なしのclassified fixtureで、human output、`detect --json`全体、state、auditのgolden bytesを変更前と比較する。

## Review — Iteration 1

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T13:47:19Z`
- Verdict: **NOT-READY**

### 評価

FR-3 items 11–12に対するdepth-1限定探索、単一候補だけの確定、複数候補の非自動選択、`.gitmodules`の安全な相対path検証、submodule非初期化、C3の単一`WorkspaceScan`投影、U06のread-only境界は、3成果物間で概ね一貫している。通常の無信号経路でstate・human-readable output・audit Detailsをbyte-identicalに保ち、観測時だけJSON fieldを加える境界も実装可能な粒度で示されている。

### Blocking issues

1. **不完全観測時のfail-closed契約が閉じていない。** `read/lstat/parse failure`はadvisoryへ縮退し「読めた証拠だけで分類」する一方、`WorkspaceScan.projectType`は`Greenfield | Brownfield`の二値しかなく、証拠を読めなかった場合にGreenfield判定とbirth/state投影を禁止する状態または規則がない。scan関数自身が書込0でも、誤ったGreenfield投影が後続のscaffold判断を許せるため、read-only境界だけではfail-closedにならない。少なくとも、観測不完全を表す明示状態または`Greenfield`由来のmutationを禁止するprojector契約と、root列挙不能・signal metadata読取不能・malformed `.gitmodules`のみ存在するケースの統合検証が必要である。
2. **全`consumes`の実質利用が証明されていない。** 各成果物先頭で6入力名を列挙しているが、`unit-of-work-story-map.md`と`components.md`は、どのworkflow・rule・entity判断を拘束したかが本文から追跡できない。単なる名称参照はsubstantive useではない。6入力それぞれについて、採用した具体的制約、対応する設計箇所、該当なしの場合はその理由をtraceabilityとして示す必要がある。

### Non-blocking observations

- `UNPARSEABLE_GITMODULES`が、構文不正・unsafe path除外・parse可能entry 0件のどこまでを表すかを固定すると、projection間のmessage差異を防ぎやすい。
- byte-identical検証はstate・human output・auditに加え、無観測時の`detect --json`全体についてgolden bytesを置くと境界が明確になる。

### Required changes for Iteration 2

1. 不完全観測をGreenfieldとして消費させないfail-closedな状態・projector規則・統合scenarioを3成果物へ一貫して追加する。
2. 6つの`consumes`を具体的な設計判断へ対応付けるtraceabilityを追加し、名称列挙だけでない実質利用を示す。

## Review — Iteration 2

**Verdict:** READY  
**Reviewer:** `amadeus-architecture-reviewer-agent`  
**Reviewed at (UTC):** `2026-07-20T13:59:43Z`  
**Iteration:** 2

### Iteration 1 findings の再評価

| # | 前回指摘 | 状態 | 再評価 |
|---|---|---|---|
| 1 | 不完全観測時のfail-closed契約が未閉鎖 | Resolved | `WorkspaceScanResult`はC3境界内で`classified \| inconclusive`に分岐し、`projectType`はclassified variantだけが保持する。birth/stateはexhaustive matchでinconclusiveをstate・plan・graph・audit・workspaceの全mutation前にtyped errorとして拒否する。root列挙不能、signal metadata読取不能、候補読取不能、`.gitmodules`存在かつparse 0件のnegative controlとbytes不変検証も定義済みである。 |
| 2 | 全6 consumesの実質利用が未証明 | Resolved | 3成果物はいずれも6入力を具体的なworkflow、rule、entity判断へ対応付けている。特に`unit-of-work-story-map.md`はU06/U12責務分離、`components.md`はC3単一snapshotと既存consumer再利用の拘束として実質利用されている。 |

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | READYを妨げる新規findingなし。 | — |

### 独立評価

1. **C3 fail-closed境界:** READY。判別unionはC3のimmutable、invocation-local snapshotに閉じ、二値`projectType`への早期collapseを許さない。birth/stateのcommit pathはclassifiedに限定され、inconclusive時のpartial writeをstate・plan・graph・audit・workspaceのbyte比較で拒否できる。
2. **projectorと既定bytes互換:** READY。detect、doctor、auditはconsumer別に再走査せず同一snapshotをpure projectionする。inconclusive birthではaudit emitterを呼ばず、nested/submodule観測なしのclassified経路ではhuman output、detect JSON全体、state、auditのgolden bytesを不変にするため、NFR-3との整合が取れている。
3. **全6 consumesのtraceability:** READY。`unit-of-work.md`はUnit境界と3公開seam、`unit-of-work-story-map.md`はU06/U12責務分離、`requirements.md`は検出・安全・互換契約、`components.md`はC3 ownerと既存consumer再利用、`component-methods.md`は型と関数境界、`services.md`はread-onlyかつinvocation-localな非UI/非DB境界として、それぞれ設計判断へ追跡できる。
4. **3成果物間の整合:** READY。workflowの各分岐はBR-U06-01〜24と対応し、`WorkspaceScanResult`、`ClassifiedWorkspaceScan`、`InconclusiveWorkspaceScan`、candidate、submodule、advisory、`ReadOnlyFs`の型がその規則を実装可能な形で支える。状態遷移、所有境界、非機能境界に相互矛盾はない。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| validation_tools | N/A | stage frontmatterに`validation_tools`の指定はない。 |
| Stage sensors | PASS（事前実行済み） | 修正後のrequired-sections、upstream-coverage、answer-evidenceがPASS済みであり、独立レビューの構造・上流参照評価とも整合する。 |

### Summary

E-USSU06FD1裁定Aは、型、business rule、workflow、negative controlへ一貫して反映された。Iteration 1のblocking issuesは解消され、開発者は追加のアーキテクチャ判断なしに実装へ進める。
