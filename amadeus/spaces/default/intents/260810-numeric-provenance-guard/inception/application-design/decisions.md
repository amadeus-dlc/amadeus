# Architecture Decisions — 成果物数値の provenance ガード

上流参照: `requirements.md` のD1-D3とFR-SEN/FR-SWP、`architecture.md` の既存センサー配線、`component-inventory.md` の共有Markdown utility不在とsensor tool先例。

## ADR-1: 1つのsensor tool moduleに責務を閉じる

### Context

数値claim走査、provenance解決、artifact分類、sweep、CLI adapterが必要である。一方、第1段は既存dispatcherの変更と共有述語engineの新設を対象外とし、現行sensorは各toolが走査ロジックを所有する。

### Options

- Option A — 単一tool module: 変更面と配布面が最小で、既存イディオムに合う。ファイル内の責務分離を明確にしないと肥大化しうる。後から分割可能。
- Option B — 複数source module: 責務は物理分離できるが、第1段だけの抽象化と投影面を増やす。後戻りは可能だが初期コストが高い。
- Option C — 共有sensor predicate engine: 将来の再利用余地は最大だが、#1237相当の別スコープを先取りし、既存sensor群へ波及する。ロックインが大きい。

### Decision

Option Aを採用する。`amadeus-sensor-numeric-provenance.ts` 内に論理責務を置き、pure evaluatorだけを安定した公開境界とする。manifestとstage frontmatter以外の既存機構は変更しない。

### Consequences

- 追加source面とintegration riskを最小化できる。
- 単一ファイル内でもScanner、Resolver、Classifier、Evaluator、CLIの所有権を混ぜない規律が必要になる。
- 共有化は実測された2番目のconsumerが現れた時点で別判断とする。

### Alternatives Rejected

Option Bは現時点で物理分割の便益が単一consumerを上回らない。Option Cは明示されたout of scopeと変更の局所性に反する。

### Reversibility

中。pure interfaceを維持すれば内部責務を後から別moduleへ抽出できるが、verdict contractとmapping schemaは下流テストに固定される。

## ADR-2: sweep成果物からTypeScript mapping定数を生成する

### Context

成果物種別×意味クラスのmodeと近傍窓 `W` はcorpus実測から決まり、runtime判定は決定的かつ高速でなければならない。code-generation実測で `p95 = min = 0` のlower-bound saturationが確認されたため、95% coverageとstrict interiorを同時に満たす導出規則もmapping contractに含める。mappingの根拠、runtime読込、配線stage集合のdriftを防ぐ必要がある。

### Options

- Option A — 生成済みTypeScript定数: runtime I/Oがなく型検査できる。生成元との一致テストが必要。再生成は容易。
- Option B — runtime JSON読込: 根拠ファイルを直接読めるが、配布path、schema検証、ファイル不在という新しいfail-open条件を増やす。変更は容易。
- Option C — runtime corpus再走査: 常に最新だが、性能・再現性・Build/Test承認済み分類を破る。運用上の後戻りが難しい。

### Decision

Option Aを採用する。Construction配下の機械生成sweep成果物を根拠の正本とし、runtime graphのdeclared producesから導出した `stage + record相対output pattern -> produces key`、mode、`W = max(nearest-rank p95, min + 1)`、配線stage集合をtool module内のreadonly mapping定数へ投影する。`W < max` の組だけをenforcementとし、upper-bound saturationはmeasurement-onlyを維持する。runtimeは `--stage` と `--output-path` だけからproduces keyを解決し、統合テストでbyte/集合一致を検証する。

### Consequences

- runtimeはO(成果物サイズ)の評価だけとなり、NFRの100KB線形性に集中できる。
- mapping変更にはsweep再実行と生成が必須になる。
- 根拠と実装の二重編集を防ぐ生成手順・drift testが完成条件になる。
- sweepは注入されたruntime graph snapshotからDesign-time Artifact Indexを作り、生成前Mapping、runtime Classifier、Evaluatorを読まない。共通受理述語で構造境界内の最短距離を打切りなしに測定し、生成済み`W`の適用はruntimeだけに限定する。

### Alternatives Rejected

Option Bは短命CLIに不要なruntime storage contractを追加する。Option Cは設計時分類とruntime評価の境界を壊し、性能予算にも適合しない。

### Reversibility

高。mapping consumerのinterfaceを保てば、将来JSONや生成moduleへ移せる。

## ADR-3: pure evaluatorへI/Oを注入し、CLIを薄く保つ

### Context

TDD、patch coverage、境界fixture、相対リンクの実在検証、CLI配送面の実証を両立する必要がある。CLI spawnだけではpredicateの失敗位置が見えにくく、実filesystemだけではunit testが不安定になる。

### Options

- Option A — exported pure evaluator + injected I/O: 判定を高速・決定的にテストでき、CLIはintegration testへ限定できる。依存型の設計が必要。seamの変更は容易。
- Option B — CLI-only: 公開APIは最小だが、全ケースがprocess/filesystem依存となりTDDとpatch coverageのコストが高い。後のseam導入は破壊的になりうる。
- Option C — evaluatorが直接filesystemへアクセス: APIは簡単だが、純粋な境界fixtureと性能計測範囲が曖昧になる。後の分離は可能。

### Decision

Option Aを採用する。`evaluateNumericProvenance` は `present(markdown) | missing` とcontextを値で受け、リンク実在確認だけを `EvaluationDeps` で受ける。`main` はflag読込、成果物のpresent/missing変換、JSON出力だけを担う。ファイル不在と読込時 `ENOENT` はAdapterがmissingへ変換し、Evaluatorが `pass: true, skipped: true` を生成するため、`fail` へ流さない。

### Consequences

- Red/Greenの大半をin-processで回し、配送面だけをintegration testで確認できる。
- evaluatorの入力型がdomain contractとなるため、不要なCLI詳細を混ぜない必要がある。
- I/O検出はAdapter、業務的なfail-open verdictはEvaluatorという境界が固定され、空Markdownとfile-not-foundを混同しない。

### Alternatives Rejected

Option Bは要件のTDD seamとpatch coverageに不利である。Option Cはリンク解決の許可root fixtureとregex性能計測を不要な実I/Oへ結合する。

### Reversibility

中。注入方法は変更できるが、pure evaluatorのnamed exportはテストconsumerが依存する公開面になる。

## 決定の整合性

3件のADRは一方向に整合する。ADR-1がsource境界を1つへ限定し、ADR-3がその中のI/O境界をpure evaluatorで深くし、ADR-2がruntime data dependencyを生成定数へ閉じる。これにより新規サービス、ネットワーク、datastore、AWS、UIを追加せず、既存dispatcherへの変更なしで要件を満たす。
