# Units Generation Grilling

**Interaction Mode:** Grill me  
**Restarted:** 2026-07-13T10:34:07Z  
**Depth:** Standard

Guide meで事前作成した質問と回答は利用者の指示により破棄した。以降は各質問を調査後に1問ずつ追記し、回答を直ちに記録する。

## Q1. Native capabilityのUnit境界

要件FR-11〜FR-14は4 driverそれぞれの受入証跡を要求するが、Unitをdriverと1対1にするとは規定していない。承認済みApplication DesignはAgent TeamsとUltra Codeを共有probe/parserを持つ1つのC-05 `ClaudeDriverAdapter`へまとめ、初期実装ではprovider adapter群を同じ`amadeus-swarm-driver-runtime.ts`へ置く。独立worktree間の同一file競合を減らし、共有変更理由を凝集するため、Unit境界はprovider componentへ合わせ、Unit内で2つのClaude driverを別acceptance sliceとして検証することを推奨する。どの境界を採用するか？

- A. **provider単位で3 Unitにする（推奨）** — Claude Unit内でAgent Teams/Ultra Codeを別acceptance sliceにし、Codex、Kiroと並べる
- B. 4 native driverを別Unitにする — Agent TeamsとUltra Codeを分けるが、共有Claude adapter/fileに依存関係を設ける
- C. adapter layerを1 Unitにする — 4 driverを同じUnitでまとめて実装する
- X. Other (please specify)

[Answer]: A — provider単位で3 Unit（2026-07-13T10:41:28Z、Mode: Grill me）

## Q2. Provider Unitの変更境界

調査すると、承認済みApplication Designはprovider adapter群を初期段階では単一の`amadeus-swarm-driver-runtime.ts`へ置く。一方、Q1で確定した3つのprovider Unitを同じbatchで並行実装する場合、各worktreeが同じファイルを変更してmerge conflictを起こしやすい。公開境界C-01とclosed registryは維持したまま、provider固有adapterだけを内部ファイルへ分ける限定的な配置変更を推奨する。これはplugin SDKの新設ではなく、Unit境界と変更境界を一致させるための設計精緻化になる。どの方針を採用するか？

- A. **provider固有adapterを内部ファイルへ分ける（推奨）** — `runtime.ts`をcomposition rootとして残し、Claude、Codex、Kiroの内部実装を別ファイルにする
- B. 単一`runtime.ts`を維持する — provider Unit間に依存を設けて直列化し、同一ファイルの並行変更を避ける
- C. Q1を見直してprovider実装を1 Unitにまとめる — 単一ファイルとの凝集は保てるが、provider間の独立実装とbatch並列性を手放す
- X. Other (please specify)

[Answer]: A — provider固有adapterを内部ファイルへ分離（2026-07-13T10:47:32Z、Mode: Grill me）

## Q3. 共通基盤のUnit境界

要件と承認済みApplication Designを照合すると、共通基盤には性質の異なる2つの変更理由がある。C-02〜C-04のcontract・selector・legacy互換は副作用のない決定的policy（FR-01〜FR-10、FR-16）であり、C-01の実行lifecycleとC-08〜C-11のevidence・checkpoint・audit・referee連携はlock、atomic write、crash再開を持つstateful境界（FR-15、FR-18〜FR-21）である。前者と後者は2 Unitへ分ける一方、checkpointとauditは原子性を跨ぐため同じUnitに保つことを推奨する。どの境界を採用するか？

- A. **共通基盤を2 Unitにする（推奨）** — 「contract・selector・legacy policy」と「実行lifecycle・evidence・attempt・audit・referee連携」に分ける
- B. 共通基盤を1 Unitにする — C-01〜C-04とC-08〜C-11を一括し、境界数を減らす代わりに変更範囲を広くする
- C. 共通基盤を3 Unit以上に細分化する — selector、persistence/audit、referee integrationなどへ分けるが、原子的invariantがUnitを跨ぎやすくなる
- X. Other (please specify)

[Answer]: A — 共通基盤を2 Unitに分割（2026-07-13T10:49:18Z、Mode: Grill me）

## Q4. Provider Unitをどこまでvertical sliceにするか

既存配置を確認すると、Claude、Codex、Kiro/Kiro IDEはそれぞれ別のharness SKILLとmanifestを持ち、共通toolはmanifestから一方向に投影される。provider Unitをadapter内部だけに限定すると、native driverが実際のconductorから起動できるかの受入条件（FR-11〜FR-14、FR-23）が別Unitへ分断される。一方、各provider Unitが対応harnessの呼出し・投影・provider固有testまで所有すれば、Q2で分離したファイル境界のままend-to-endで検証できる。共有docsや全harness横断driftは後続のrelease closure Unitへ集約することを推奨する。どの境界を採用するか？

- A. **providerごとのvertical sliceにする（推奨）** — 各Unitがprovider adapter、対応harness conductor/manifest、fake CLI integration、provider固有live proofを所有し、共有docs・全体driftだけをrelease closure Unitへ残す
- B. provider Unitはadapterだけにする — harness呼出し、manifest、integration/live proofを横断integration Unitへ集約する
- C. harness統合をstateful共通基盤Unitへ含める — C-01 lifecycleと全harnessの呼出し変更を同じUnitで扱う
- X. Other (please specify)

[Answer]: A — providerごとのend-to-end vertical slice（2026-07-13T10:52:05Z、Mode: Grill me）

## Q5. Release closureのUnit境界

FR-24〜FR-26と既存build経路を確認すると、`package.ts --check`は全harness生成treeをbyte単位で検査し、`promote-self --check`はClaude/Codexのproject-local installをまとめて検査する。共有docs・migration guide・環境変数例・0.2.0削除Issueも、4 native driverの最終契約が揃って初めて確定できる。これらは新しいruntime behaviorではなく、「全providerを配布可能な1つの契約として閉じる」という同じ完了条件を持つため、1つのRelease/Migration Closure Unitへ凝集することを推奨する。どの境界を採用するか？

- A. **Release/Migration Closureを1 Unitにする（推奨）** — closed registryの最終配線、共有docs、全harness package/dist/self-install drift、macOS/Linuxの全体matrix、0.2.0削除Issueをまとめる
- B. closureを2 Unitに分ける — 「registry・配布検証」と「docs・migration・0.2.0 Issue」を分離する
- C. closureを設けない — 共有作業を3つのprovider Unitへ分散する
- X. Other (please specify)

[Answer]: A — Release/Migration Closureを1 Unitに凝集（2026-07-13T10:56:42Z、Mode: Grill me）

## Q6. Unit DAGとbatch候補

ここまでの選択から、構造上の依存は6 UnitのDAGとして表せる。U-01「Driver Contract & Selection Policy」をU-02「Swarm Execution Lifecycle」が利用し、U-03「Claude Native Driver」・U-04「Codex Native Driver」・U-05「Kiro Native Driver」はU-02の共通実行契約を利用する。U-06「Release & Migration Closure」は3 providerすべての最終契約を束ねる。provider間にはcode/data ownership上の依存がなく、Q2で変更ファイルも分離したため、U-03〜U-05間にedgeを置かないことを推奨する。この場合、3 providerが同時にreadyになったときだけengineがmulti-Unit batchとして導出し、batch自体はUnitの親や永続成果物にならない。どのDAGを採用するか？

- A. **provider間を独立にする（推奨）** — `U-01 → U-02 → {U-03, U-04, U-05} → U-06`。3 providerを同じready batch候補にする
- B. providerを直列依存にする — Claude、Codex、Kiroの順などでedgeを設ける。CLI負荷は抑えられるが、実装依存ではないschedule都合をDAGへ混ぜる
- C. closureをproviderと並行可能にする — U-06をU-02だけへ依存させるが、最終driver契約前にdocs・distを閉じる危険がある
- X. Other (please specify)

[Answer]: A — provider間を独立させるDAG（2026-07-13T10:57:39Z、Mode: Grill me）

## 継続確認

Standard深度の6問で、Unit境界、provider固有の変更境界、vertical slice、release closure、依存DAGを決定した。追加で深掘りするか、合意事項の要約確認へ進むか？

- A. **合意事項の要約確認へ進む（推奨）** — 現時点でUnits Generationに必要な構造判断は揃っている
- B. 追加でGrill meを続ける — 未確定と考える論点をさらに質問する
- C. Interviewを終了する — 要約確認を行わず中断する
- X. Other (please specify)

[Answer]: A — 合意事項の要約確認へ進む（2026-07-13T10:58:26Z、Mode: Grill me）

## 合意要約兼Unit分解計画

### Unit候補

1. **U-01 Driver Contract & Selection Policy** — driver値、env検証、topology分類、決定的`auto`、floor、0.1.x legacy互換、deprecation policyを所有する。I/Oを持たないcontract・selectorを中心にする。
2. **U-02 Swarm Execution Lifecycle** — C-01 coordinator、adapter契約、native evidence検証、attempt checkpoint、audit、crash再開、referee envelope連携を所有する。checkpointとauditの原子性を同じUnitへ閉じる。
3. **U-03 Claude Native Driver** — 分離したClaude内部adapter、Claude harness conductor/manifest、Agent TeamsとUltra Codeのfake CLI integrationおよびmacOS live proofを所有する。
4. **U-04 Codex Native Driver** — 分離したCodex内部adapter、Codex harness conductor/manifest/evidence hook、Codex Ultraのfake CLI integrationおよびmacOS live proofを所有する。
5. **U-05 Kiro Native Driver** — 分離したKiro内部adapter、Kiro/Kiro IDE conductor/manifest、trust・balanced waveのfake CLI integrationおよびmacOS live proofを所有する。
6. **U-06 Release & Migration Closure** — closed registryの最終配線、共有docs、全harness package/dist/self-install drift、macOS/Linux全体matrix、0.2.0で旧変数を削除するGitHub Issueを所有する。

### 依存DAG

`U-01 → U-02 → {U-03, U-04, U-05} → U-06`

U-03〜U-05間には依存edgeを置かない。3 Unitが同時にreadyならengineがmulti-Unit batchを導出する。batchはUnitの上位概念や永続成果物ではなく、一時的なready setである。実行資源や費用による順序はDelivery Planningへ委ね、構造DAGへ偽の依存を入れない。

### 設計整合

公開C-01とclosed C-04 registryは維持し、plugin SDKは作らない。承認済みApplication Designの初期4ファイル配置だけを限定的に精緻化し、`runtime.ts`をcomposition rootとして残しながらClaude、Codex、Kiroのprovider固有adapterを別の内部ファイルへ分ける。Units成果物の生成時に、Application Designの該当配置記述も同じ合意へ整合させる。

### 承認

この合意要約をUnits Generationの分解計画として承認し、成果物生成へ進むか？

- A. **承認して成果物生成へ進む（推奨）**
- B. 内容を修正する — 修正点を指定する
- C. Grill meへ戻る — 追加質問から再開する
- D. ここで中断する
- X. Other (please specify)

[Answer]: A — 承認して成果物生成へ進む（2026-07-13T11:21:37Z、Mode: Grill me）

## Q7. Application Design再承認後の回復補正

Code Generation入口の実機調査により、Agent Teamsはheadless `claude -p`ではなくinteractive PTY上の`claude`が必要と確定し、Application DesignへADR-009とprovider-neutralなtransport/capture lifecycleが追加された。6 UnitのDAGを維持しながら、この訂正をどこへ収めるか？

- A. **6 UnitとDAGを維持し、共通seamはU-02、Claude mode差はU-03へ置く（推奨）** — U-02の完了条件へclosed transport/capture lifecycleを追加し、U-03は完成済みcontractだけを消費する。新しいUnit/edgeは追加せず、回復時のPR packagingはDelivery Planningで扱う
- B. transport/capture専用Unitを追加する — 共通補正は独立するが、承認済みのstacked PR分割とUnit番号を変更する
- C. 共通seamをU-03へ置く — U-03からU-04/U-05への依存edgeを追加し、provider並列性を撤回する
- X. Other (please specify)

[Answer]: A — 利用者が「分割想定なら元の計画でOK」として6 Unitのstacked PR前提を承認済みであり、Application Designもその前提で承認したため（2026-07-14T09:23:29Z、Mode: Grill me）

## 再合意

Unit数、Unit ID、DAG、provider vertical sliceを維持する。U-02はclosed transport/capture union、binding、live control、capture lifecycleを完了条件として所有する。U-03はAgent Teamsのinteractive PTY、Ultra Codeのheadless実行、mode固有projection、fake/live proofだけを所有し、U-02共通runtimeを編集しない。回復時のBolt/PR packagingはUnit topologyと経済的sequencingを分けるためDelivery Planningへ委ねる。

## 今回Iteration 1 review後の所有権精緻化

reviewerは、U-03がU-02の共通seamを後補正しながらU-04/U-05と同時readyになる記述をhidden dependencyと判定した。6 Unit、provider vertical slice、DAGを維持するため、ADR-009のprovider-neutral transport/capture contractとruntimeはU-02の完了条件へ全面移管し、U-03から共通seamの編集権を除いた。U-03にはAgent Teams、Ultra Code、harness/legacy、live proofの4 review checkpointを設け、Claude provider境界内でrollback可能にした。

## Iteration 1 review後の所有権精緻化

reviewerは、U-06までproduction registry配線を遅らせると、U-03〜U-05が各providerのend-to-end/live proofを単独で完了できず、承認済みDAGにhidden cycleが生じると指摘した。承認済みの6 Unit、provider vertical slice、DAG、closed registry、plugin非提供を維持するため、U-01はversioned registration contract、U-02は3つの静的fail-closed provider slotを持つproduction registry assembly、U-03〜U-05は自分のslotの実装、U-06はplaceholder 0とmapping exhaustivenessの最終検証を所有するよう精緻化した。provider live proofはtest-only injectionではなく、対応harness conductorから公開C-01 CLIとproduction registryを通す。
