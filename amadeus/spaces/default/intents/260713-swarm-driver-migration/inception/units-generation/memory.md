## Interpretations

- 2026-07-13T10:25:18Z — `stories`はSKIP済みのため、unit-of-work-story-mapではrequirementsのUSR-01〜USR-10を利用シナリオとして扱う。
- 2026-07-13T10:25:18Z — Units Generationは依存topologyだけを定義し、実装順、価値順、walking skeleton、critical pathはDelivery Planningへ委ねる。
- 2026-07-13T11:27:09Z — provider Unitはadapterだけでなく対応harnessのconductor/projection、fake CLI integration、macOS live proofまでを含むvertical sliceとする。FR-11〜FR-14とFR-23をprovider別のtestable boundaryへ閉じるためである。
- 2026-07-13T11:27:09Z — `batch`はUnitの親ではなく、依存DAGと完了状態からengineが導出する一時的なready setと解釈する。Unit成果物にはbatch nodeを永続化しない。
- 2026-07-13T11:35:57Z — C-04のversioned registration contractはU-01、production registry assemblyはU-02、provider slot実装はU-03〜U-05、placeholder 0の最終検証はU-06が所有すると解釈する。このseamによりprovider Unitは公開C-01 production pathで単独収束できる。
- 2026-07-14T09:23:29Z — Application Design再承認後も6 Unitと`U-01 → U-02 → {U-03, U-04, U-05} → U-06`のDAGを維持する。Agent TeamsのPTY発見は新Unitではなく、U-03のClaude vertical sliceとU-02所有seamへの回復補正として扱う。
- 2026-07-14T09:31:39Z — Iteration 1 reviewを受け、provider-neutralなtransport/capture contractとruntimeはU-02の完了条件へ全面移管し、U-03は完成済みU-02 contractを消費するClaude固有vertical sliceだけに戻した。これによりprovider 3 Unitの同時readyをDAGどおり成立させる。

## Deviations

- 2026-07-13T10:25:18Z — 新規serviceや独立deploymentを前提にせず、既存`packages/framework`内の独立test/review境界としてUnitを設計する。Application Designで常駐serviceとAWS resourceが対象外と確定しているためである。
- 2026-07-13T10:34:07Z — 利用者の指示でGuide meの事前質問とQ1回答を破棄し、Grill meとして最初から再開した。破棄前の内容はauditにのみ残し、Unit判断には使わない。
- 2026-07-13T11:27:09Z — 承認済みApplication Designの「provider adapterを初期`runtime.ts`へ同居」する配置記述だけを精緻化し、provider固有adapterを別の非公開内部ファイルへ分けた。公開C-01、closed registry、runtime responsibility、plugin非提供は変更していない。
- 2026-07-13T11:35:57Z — Iteration 1 reviewを受け、U-06の「closed registry最終配線」を「全provider slot実装済みの最終検証」へ精緻化し、静的mapping自体はU-02へ置いた。6 Unit、依存DAG、release closureの境界を変えずhidden cycleを除くためである。

## Tradeoffs

- 2026-07-13T10:25:18Z — provider別vertical sliceと共有deep moduleを組み合わせる案を推奨する。純粋な技術layer分割より、Claude/Codex/Kiroのnative契約を個別に検証しやすい。
- 2026-07-13T11:27:09Z — 共通基盤は純粋なcontract/selectionとstateful lifecycleの2 Unitへ分ける一方、checkpointとauditは同じUnitへ残した。変更理由は分離しつつ、audit-first atomicityをUnit間contractへ漏らさないためである。
- 2026-07-13T11:27:09Z — Claude、Codex、Kiro間に依存edgeを置かず、release/migration closureだけを3 providerへ依存させた。CLI負荷や費用による直列化は構造依存ではなくDelivery Planningの判断だからである。
- 2026-07-13T11:35:57Z — provider-scoped test injectionでlive proofを成立させる案は採用せず、U-02がfail-closed placeholderを含むproduction registryを先に作る案を選んだ。各provider Unitのlive proofが実際のharness conductor、公開C-01、production registryを通る保証を保つためである。
- 2026-07-14T09:23:29Z — 承認済みstacked PR分割とreview境界を組み替えない代わりに、U-03の相対複雑度をLからXLへ上げた。共通補正はclosed transport/capture union、binding、live control、capture lifecycleへ限定し、common runtimeの所有権をU-02に残す。
- 2026-07-14T09:31:39Z — hidden dependencyを避けるため、U-03へ共通seam補正を同梱する案を撤回した。Unit topologyは6 Unitのまま保ち、回復時のBolt/PR packagingと経済的sequencingはDelivery Planningで決める。

## Open questions

- 2026-07-13T10:25:18Z — Unit境界、粒度、共通基盤の分割、配布所有、依存topology、deployment modelをQ1〜Q6で確定する。
- 2026-07-13T11:27:09Z — Q1〜Q6と合意要約の承認により上記論点はすべて解消した。Units Generation成果物に未解決の構造判断はない。
- 2026-07-14T09:23:29Z — Unit構造上の未解決事項はない。Agent Teamsのexact live schemaはUnit境界ではなくU-03 Code Generation入口のlive proof gateで検証する。
