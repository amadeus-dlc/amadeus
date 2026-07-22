# Business Logic Model — plugin-projection

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U09はC5 Distribution Projectionとして、`plugins/<name>/`のauthoring sourceを発見し、既存packagerの6 harness buildへ決定的に組み込み、配布用の`dist/plugins/`と既存4 harnessのself-install面を同期する。`unit-of-work.md`が定める公開seamは`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`である。

U09はprojectionとdrift検査だけを所有する。C1が検証済みplugin/stage contractを供給し、U10がprojected bundleのcompose/doctor/drop、U11が`test-pro` sourceとend-to-end fixture、U12が全体ledger closureを担う。plugin manifestの第二parser、hostへのruntime composition、reference plugin内容、marketplace、network fetchはU09へ持ち込まない。UI、database、network serviceもない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | U09責務、4公開seam、6 package/4 self-install、drift、0-plugin baseline | 目的と境界、Projection pipeline |
| `unit-of-work-story-map.md` | FR-6 item 19のprimary ownerはU09、U11/U12は検証・closure consumer | 目的と境界、Verification scenarios |
| `requirements.md` | source/host/dist所有境界、byte/orphan/unreferenced drift、NFR-1/3/4/8 | Projection pipeline、Failure table |
| `components.md` | C5 owner、既存`package.ts`/`promote-self.ts`再利用、generator-only write | Ownership model、Compatibility rules |
| `component-methods.md` | 4 public関数の正準signature、C5内部self-install helper、canonical sort、0-plugin byte parity | Public seam、Deterministic ordering |
| `services.md` | author→validate→project→promote→verify、build-time batch、DB/networkなし | End-to-end flow、Failure table |

## Public seam

```ts
function discoverPluginSources(root: string, io: ReadOnlyFs): readonly PluginSource[];
function buildPluginProjection(plugin: PluginSource, harness: HarnessName): ProjectionResult;
function buildHarnessTree(manifest: HarnessManifest, plugins: readonly PluginSource[]): BuildResult;
function checkHarnessTree(name: HarnessName): readonly Drift[];
```

`buildSelfInstallProjection(name: SelfInstallHarness): BuildResult`はpublic seamではなく、既存closed listの4面を投影するC5内部helperである。この区分はE-OC1再裁定A（`2026-07-20T14:09:08Z`）に従う。

`discoverPluginSources`はdirectory名をcanonical sortし、C1のvalidation resultがvalidなsourceだけを後段へ渡す。不正manifest、重複plugin identity、root外pathはbuild開始前にloud failureとする。`buildPluginProjection`はhost固有path/token変換を既存`HarnessManifest`へ委譲し、plugin自身へharness別分岐を埋め込まない。

`buildHarnessTree`は既存core/harness buildへplugin projectionを一つの追加入力として渡す。pluginsが空なら既存`buildTree`と同じ制御経路・順序・serializationを使い、条件分岐から空directory、manifest key、改行などを追加しない。

## Projection pipeline

1. `packages/framework/harness/*/manifest.ts`を持つharnessを既存discoveryで列挙し、name順に固定する。対象はclaude、codex、cursor、kiro、kiro-ide、opencodeの6面である。
2. repository rootの`plugins/<name>/`を列挙する。plugin identityとartifact pathはC1の検証済みcontractだけを使用する。
3. 各sourceをC1 schemaで一度validateする。全pluginがvalidになるまでdistやself-installへ書き始めない。
4. pluginをname順、artifactをrelative path順、manifest fieldをcanonical key順に正規化し、`dist/plugins/<name>/`のharness-neutral bundleを構築する。
5. 各plugin bundleを各`HarnessManifest`へ投影する。token置換、rules rename、frontmatter追加、host root mappingは既存packagerの変換規則を再利用する。
6. 6 harnessのbuild treeはtemp rootで全生成し、期待path集合とread source集合を同時に記録する。成功したharnessだけの部分更新はしない。
7. write modeは既存clean-sweep ownershipでgenerated treeを置換する。check modeはtemp buildとcommitted distを比較し、missing/differs/orphan/unreferencedをsorted resultとして返す。
8. self-installは`claude | codex | cursor | opencode`のclosed listだけを`promote-self.ts`へ渡す。kiro、kiro-ideはpackage対象だがself-install対象ではない。

## Ownership model

| Surface | Owner | Write rule |
|---|---|---|
| `plugins/<name>/` | plugin authoring/C4 source boundary | 手書き正本。U09はread-only discovery |
| `dist/plugins/<name>/` | C5 projector | generatorだけが生成・sweep |
| `dist/<harness>/...` plugin surface | C5 + `HarnessManifest` | 6面を同一source snapshotから生成 |
| project-local self-install | `promote-self.ts` | 既存4面だけをgenerated distから反映 |
| composition record/host mutation | C4/U10 | U09は書かない |

source、harness-neutral bundle、host projectionは別identityを持つが、いずれも生成元の`PluginSource`へtraceできる。generated surfaceを次回sourceとして読み戻さず、手編集distを正としない。

## Deterministic ordering and compatibility

- harness、plugin、artifact、driftはそれぞれcanonical sortし、filesystem列挙順へ依存しない。
- 同一source bytes、C1 normalized manifest、harness manifest、packager versionから同一projection bytesを生成する。
- plugin 0件では既存6 harnessのファイル集合・内容・表示順・CLI出力をgolden baselineとbyte比較する。
- plugin 1件以上のときだけplugin-owned pathを期待集合へ追加する。空のplugin indexやdirectoryを常時生成しない。
- 6面package matrixと4面self-install matrixは別集合として検査し、一方の成功を他方の成功証拠に流用しない。

## Failure table

| 状態 | Build result | Mutation |
|---|---|---|
| plugin 0件 | 既存buildとbyte-identical | 既存generated treeだけ |
| valid plugin 1件以上 | 6面+`dist/plugins/`を決定生成 | 全validate後にgenerator ownership内だけ |
| malformed/duplicate/unsafe source | loud validation failure | dist/self-install不変 |
| projection path collision | loud collision failure | dist/self-install不変 |
| missing/different generated file | `MISSING` / `DIFFERS` drift | check modeは0 write |
| committed generated-only path | `ORPHAN` drift | check modeは0 write、write modeはsweep |
| discovered source未参照 | `UNREFERENCED` drift | check modeは0 write |
| kiro系self-install要求 | closed-union validation failure | project-local tree不変 |

## Verification scenarios

- 空の`plugins/`とdirectory自体なしの双方で、変更前の6 harness build bytesおよびCLI結果が一致する。
- fixture pluginを一つ与え、同じsource bytesから6 harness projectionと`dist/plugins/`が生成され、順序を入れ替えてもbytesが一致する。
- malformed manifest、duplicate identity、unsafe relative path、同一output path collisionを各々mutation前に拒否する。
- source削除、artifact rename、手編集dist、manifestから未参照のsourceをそれぞれMISSING/DIFFERS/ORPHAN/UNREFERENCEDへ分類する。
- claude/codex/cursor/opencodeだけがself-install対象で、kiro/kiro-ideはpackageに存在してもproject rootへ昇格しないことを6×4 matrixで固定する。
- U11の`test-pro`内容には依存せず、最小fixtureでU09単独のprojection contractを証明する。U12へFR-6 item 19のtargeted evidenceだけを渡す。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Runtime UTC: `2026-07-20T14:06:56Z`
- Verdict: **NOT-READY**

### Blocking findings

1. **E-OC1の質問0件承認範囲に未解決の公開seam矛盾がある。** `functional-design-questions.md` はC5の公開seamを `discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree` の4関数として既決化している。一方、directive.consumes正本の `component-methods.md` は `buildSelfInstallProjection` を含む5関数を定義する。本成果物は再確認せず5関数を「Public seam」に採用しており、「既決事項間の矛盾または新規design judgmentを検出した場合は停止し、E-OC1再確認または選挙へ付議する」という承認条件を満たさない。
2. **公開関数の型契約がdirective.consumes正本と一致しない。** 正本は `buildPluginProjection(plugin: PluginSource, harness: HarnessName)` および `buildHarnessTree(manifest: HarnessManifest, plugins: readonly PluginSource[])` だが、本成果物はそれぞれ `ValidPluginSource` / `HarnessManifest`、`readonly ValidPluginSource[]` に変更している。`business-rules.md` と `domain-entities.md` もこの変更後のvalidation境界を前提にしているため、3成果物間では概ね整合していても、6 consumesとの契約整合を満たさない。

### Required changes

1. 4関数対5関数の矛盾をE-OC1へ再確認するか、選挙へ付議し、承認結果を質問票へ記録する。承認前にどちらかを公開契約として確定しない。
2. `buildPluginProjection` と `buildHarnessTree` の引数型を `component-methods.md` の正本へ戻す。型変更が必要なら、その理由・互換性・C1 validationとの責務境界を質問化して承認を得た後、3成果物を同じ契約へ更新する。
3. 修正後、U09=projection、U10=compose/doctor/drop、U11=`test-pro`/guide、U12=ledger closure、6 package/4 self-install、plugin 0件のcore+既存6 harness byte互換、byte/orphan/unreferenced driftの記述を3成果物横断で再照合する。現版ではこれらの観点自体に追加のblocking findingはない。

## Review — Iteration 2

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Runtime UTC: `2026-07-20T14:11:00Z`
- Verdict: **READY**

### 前回finding再評価

1. **解消 — 4 public seam対5関数。** E-OC1再裁定A（`2026-07-20T14:09:08Z`）が`functional-design-questions.md`へ記録され、3成果物はいずれも公開seamを`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`の4関数に限定した。`component-methods.md`にある`buildSelfInstallProjection`はC5内部helperとして一貫して扱われ、再裁定前の矛盾は残っていない。
2. **解消 — 公開signatureの無承認変更。** `business-logic-model.md`の4公開signatureは`component-methods.md`の正準signatureと一致する。`business-rules.md`は`ValidPluginSource`等への置換を明示的に禁止し、`domain-entities.md`も`PluginSource`を受ける契約へ復帰した。validationを必須にしつつ公開型を変更しない責務境界が3成果物で整合している。

### 独立評価

- **6 consumesの実質利用:** PASS。3成果物は6入力を列挙するだけでなく、`unit-of-work.md`の4公開seamとUnit境界、`unit-of-work-story-map.md`のFR-6 item 19 owner、`requirements.md`の互換性・drift・供給網制約、`components.md`のC5 ownership、`component-methods.md`のsignatureと内部helper、`services.md`のbuild-time workflowへ具体的にtraceしている。
- **Unit ownership:** PASS。U09はprojectionとdrift、U10はcompose/doctor/drop、U11はreference `test-pro`・end-to-end fixture・guide、U12は全体evidenceとledger closureに限定され、相互越境はない。
- **6 package / 4 self-install:** PASS。packageはmanifest discoveryされるclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-installはclaude/codex/cursor/opencodeのclosed 4面として、型・pipeline・rule・verificationが一致する。
- **0-plugin byte互換:** PASS。空配列と`plugins/` directory不在の双方について、既存`buildTree`のcore経路、既存6 harnessのfile set・内容・順序・CLI resultへ追加bytesを生じさせない設計であり、FR-6/NFR-3のbaseline契約を満たす。
- **drift:** PASS。byte差を`DIFFERS`、生成欠落を`MISSING`、generated-only残骸を`ORPHAN`、discovery済み未読sourceを`UNREFERENCED`として双方向集合比較とread-setから導出し、check mode write 0とcanonical sortまで3成果物で整合する。
- **3成果物整合:** PASS。workflow、BR-U09-01〜21、immutable value graphは同じvalidation-before-write、generator ownership、全体生成後commit、決定的順序、4公開seamを表現しており、blocking contradictionはない。

### 新規finding

- なし。

### Sensor評価

- `required-sections`: PASS。3成果物はいずれもH2見出しを2件以上持つ。
- `upstream-coverage`: PASS。3成果物すべてがdirective.consumesの6成果物を明記し、それぞれの採用制約を本文またはtraceability表へ実質反映する。
- `linter`: PASS（該当実装ファイルなし）。成果物はMarkdown設計であり、独立したTypeScript/JavaScript実装対象を追加していない。埋込TypeScriptは宣言形の設計snippetに限定される。
- `type-check`: PASS（該当実装ファイルなし）。公開signature snippetは`component-methods.md`の正準型名・引数・返却型と一致し、`ValidPluginSource`への変更は残っていない。
- `answer-evidence`: PASS。質問票は初回E-OC1承認とIteration 1後の再裁定Aを、それぞれ回答本文と実行時UTC timestamp付きで保持する。
