# Delivery Planning Grilling

**Interaction Mode:** Grill me  
**Started:** 2026-07-13T11:47:04Z  
**Depth:** Standard

## 上流参照

本Grillingは`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`を根拠にした。`stories`と`mockups`はscopeでSKIP済みであり、requirements内のUSR／RELとCLI interactionを代替入力として扱った。

## Q1. 配送順序の原則

**状態:** 回答済み — 1. 基盤先行＋リスク先行

DAG により U-01 → U-02 は先行必須です。一方、最大の不可逆な不確実性は selector の実装ではなく、各 CLI のネイティブ証跡フィールドを実環境で安定して取得できるかにあります。配送順序の主原則をどれにしますか？

1. **基盤先行＋リスク先行（推奨）** — U-01/U-02 で安全な seam を作り、その後はネイティブ証跡の不確実性が高い provider から実証し、U-06 で閉じる。根拠のない数値スコアは使わない。
2. **Walking Skeleton 最優先** — U-01/U-02 と provider 1件を最初の大きめ Bolt にまとめ、実ネイティブ経路を最初に端から端まで証明する。
3. **WSJF／価値スコア順** — provider ごとに価値・時間制約・リスク低減・規模を数値化して順序を決める。
4. **その他** — 別の原則を指定する。

**決定:** U-01/U-02で基盤を確立し、その後はネイティブ証跡の不確実性を優先してproviderを実証する。根拠のないWSJF数値は採用せず、U-06を最終収束点とする。

## Q2. 基盤Boltの粒度

**状態:** 回答済み — 1. U-01とU-02を別Boltにする

U-01はL、U-02はXLで、どちらも独立した受入条件を持ちます。このintentは既存package／distribution pathを使うbrownfieldのため、最初のBoltで形式的なWalking Skeletonを作る義務はありません。基盤をどう切りますか？

1. **U-01とU-02を別Boltにする（推奨）** — contract／selectorを先に固定し、次のBoltでlifecycle／production registryを組む。レビューと失敗範囲を小さくし、最初のnative Walking Skeletonはprovider Boltで成立させる。
2. **U-01とU-02を1つの基盤Boltにまとめる** — dependency-linkedな基盤を一度で作るが、L＋XLとなり変更・検証・レビューが大きくなる。
3. **U-01、U-02、provider 1件を最初のBoltにまとめる** — native end-to-endを最初から証明できるが、Q1の基盤先行方針を上書きし、最初のBoltが過大になる。
4. **その他** — 別の境界を指定する。

**決定:** U-01をcontract／selector Bolt、U-02をlifecycle／production registry Boltとして分離する。基盤の受入点を2つにし、最初のnative Walking Skeletonはprovider Boltで成立させる。

## Q3. 最初に実証するprovider

**状態:** 回答済み — 1. Codex Ultra

基盤収束後、どのproviderを最初のnative Walking Skeletonにしますか？ 最初のproviderは、実装優先順位というより「このintentの前提が成立するかを最速で反証できる対象」です。

1. **Codex Ultra（推奨）** — resolved modelのUltra受理とnative multi-agentの両方を通常の`xhigh`／Unit別`codex exec`から区別する。現在のCodex環境でdogfoodでき、失敗時に主要前提を最速で再審議できる。
2. **Claude Agent Teams＋Ultra Code** — 2つのnative modeを同一providerで実証し、最も広いmode surfaceを先に閉じる。
3. **Kiro subagent** — trust、parent/child session metadata、balanced waveを先に検証し、外部metadata依存を早期に閉じる。
4. **3 providerを同時開始** — provider間の順序を置かず、一斉に不確実性を調べる。並列負荷と失敗原因の切り分けは増える。
5. **その他** — 別の順序を指定する。

**決定:** U-04 Codex Ultraを最初のnative Walking Skeletonとする。resolved modelのUltra受理とnative multi-agent委譲をproduction registry経由で実証し、通常の`xhigh`／Unit別`codex exec`との区別が成立しなければ、他providerの本実装へ進む前にscopeを再審議する。

## Q4. Provider Boltの並列度

**状態:** 回答済み — 1. 実装は並列、live proofは直列

U-04のnative proofが通った後、U-03 ClaudeとU-05 Kiroをどう進めますか？ 両者はsource ownership上は独立していますが、credentialed live proofは同じmacOSホストのCPU、process、user-global stateを使います。

1. **実装は並列、live proofは直列（推奨）** — U-03/U-05を別Boltとして同時に実装・fake検証し、macOSのcredentialed native proofだけを1 providerずつ実行する。速度と証拠の切り分けを両立する。
2. **すべて直列** — U-04→U-03→U-05の順に実装からlive proofまで完了させる。切り分けは最良だが待ち時間が最大になる。
3. **実装もlive proofも完全並列** — U-03/U-05を同時完了させる。最速だが、資源競合やuser-global stateの影響を診断しにくい。
4. **その他** — 別の並列制御を指定する。

**決定:** U-04完了後、U-03/U-05は別worktree／別Boltで実装とdeterministic fake検証を並列化する。credentialed macOS live proofは1 providerずつ直列実行し、証拠と失敗原因を分離する。

## Q5. Native証跡schemaの確定時期

**状態:** 回答済み — 1. Provider実装着手時にschema discovery gate

Claude Ultra／Kiroのstable field pathとCodexのUltra／Subagent相関は、認証済みローカルfixtureでしか確定できません。各provider Boltのどこで外部依存をhard gateにしますか？

1. **Provider実装着手時にschema discovery gate（推奨）** — 非機密の最小live runで必要field pathと相関可能性を先に固定し、取得不能ならparser実装前にそのBoltを停止する。その後に実装し、Bolt exitでも完全live proofを必須にする。
2. **Provider Boltのexitだけで検証** — Application Designの想定schemaで先に実装し、完了時のlive proofで確定する。着手は速いが、外部schema差異による手戻りが増える。
3. **U-06のrelease gateまで延期** — provider Boltはfake evidenceだけで完了し、全live proofを最後にまとめる。承認済みのprovider Unit完了条件を変更するため、Requirements／Units Generationへのscope returnが必要になる。
4. **その他** — 別のgate位置を指定する。

**決定:** 各provider Boltは、非機密の最小live runによるschema discoveryをentry gateとする。field pathと相関可能性を固定してからparserを実装し、Bolt exitではproduction registry経由の完全live proofを必須とする。認証不足・surface不明・証跡欠落はpassにしない。

## 追加決定. Pre-code checkpoint PR

**決定:** 最初のCode Generationへ入る直前に、そこまでのAI-DLC成果物をcheckpoint PRとして作成する。PRを承認・mergeし、merge済み`main`を実装失敗時の復帰点とする。Code Generationはcheckpoint merge後に新しいBolt branchから開始し、checkpoint PRへ実装差分を混在させない。

## Q6. Provider外部依存が失敗した場合の波及

**状態:** 回答済み — 1. 失敗をprovider Boltへ隔離し、もう一方は続行

U-04 Codexの失敗はintentの主要前提を崩すため全体停止と決めています。その後、並列に進むU-03 ClaudeまたはU-05 Kiroの一方だけがschema discovery／live proofで停止した場合、もう一方をどう扱いますか？

1. **失敗をprovider Boltへ隔離し、もう一方は続行（推奨）** — blocked Boltをparkし、独立providerの証拠獲得は続ける。U-06は全provider完了まで開始せず、floorやfakeをnative成功として代用しない。
2. **どちらか一方の失敗でintent全体を即時停止** — 追加作業を抑えるが、独立providerの検証情報を得られず、再計画時の不確実性が残る。
3. **利用可能なfloorへ切り替えてBoltを完了扱い** — 進行は維持できるが、native driverの完了条件とfalse-success禁止に反するため、Requirementsへのscope returnが必要になる。
4. **その他** — 別の波及方針を指定する。

**決定:** U-03/U-05の一方が外部依存で停止した場合、そのBoltだけをparkし、もう一方の独立providerは証拠獲得まで続行する。U-06は全providerがnative完了条件を満たすまでblockedとし、floorやfakeを完了代替にしない。U-04 Codexの主要前提失敗だけはintent全体の再審議gateとする。

## Q7. 担当・独立レビュー・mob

**状態:** 回答済み — 1. Developer lead＋Architect重点レビュー、常設mobなし

Team FormationはSKIP済みのため、全Boltの実装担当は既定どおり`amadeus-developer-agent`です。ここでのmobは実装チームの作業方式であり、検証対象のAgent Teams／native multi-agentとは別です。レビュー体制をどうしますか？

1. **Developer lead＋Architect重点レビュー、常設mobなし（推奨）** — 全Boltはdeveloperが実装し、architectがU-01/U-02のcontract／runtime seamとU-03〜U-05のnative evidence境界を独立レビューする。delivery agentは順序とrisk gateを管理し、mobはblocking failure時だけ招集する。
2. **U-02と全provider Boltを常時mob** — developerとarchitectが設計からlive proofまで共同作業する。共有理解は深いが、独立レビュー性と並列速度が下がる。
3. **Developer単独＋自動checkのみ** — 最速だが、false native successやcontract ownership逸脱を独立視点で捕捉しにくい。
4. **その他** — 別のallocation／review方式を指定する。

**決定:** 全Boltは`amadeus-developer-agent`が実装をleadする。`amadeus-architect-agent`はU-01/U-02のcontract／runtime seamとU-03〜U-05のnative evidence境界を独立レビューする。delivery agentはsequencingとrisk gateを管理し、常設mobは置かず、blocking failure時だけ招集する。

## Q8. Grillingの継続

**状態:** 回答済み — 1. Grillingを終え、合意サマリーへ進む

Standard深度として7つの戦略判断が揃いました。承認済みUnitの受入条件からBoltごとのDoDとconfidence hypothesisを組み立てられます。次へ進みますか？

1. **Grillingを終え、合意サマリーへ進む（推奨）** — 7つの決定と追加checkpoint PR決定を統合し、明示確認後に配送計画を生成する。
2. **もう1問、BoltごとのDoD／confidenceを掘る** — 成果物生成前に、どの証拠で各Boltの仮説を棄却するかを追加で選ぶ。
3. **既存の判断を修正する** — 修正したいQ番号と新しい選択を指定する。
4. **その他** — 別の進め方を指定する。

**決定:** Standard深度のGrillingを終了し、Q1〜Q7とpre-code checkpoint PRの追加決定を統合した合意サマリーへ進む。

## Q9. 合意サマリーの確認

**状態:** 回答済み — 1. 合意し、成果物生成へ進む

以下をDelivery Planningの確定入力とする。

1. 順序は`U-01 → U-02 → U-04 → {U-03, U-05} → U-06`。基盤先行後にnative evidence riskを潰し、根拠のない数値WSJFは使わない。
2. 6 Unitを6 Boltへ1対1対応させる。U-01とU-02は別Bolt、U-04 Codex Ultraが最初のnative Walking Skeleton、U-03 ClaudeとU-05 Kiroは別Boltの並列wave、U-06がrelease closureである。
3. `batch`は製品runtimeのmulti-Unit executionを指す。Delivery Planning側でUnitの上位domain概念を新設せず、並列性はBolt execution waveとして表す。
4. U-04がUltra受理＋native multi-agentをfloorから区別できなければ、他providerへ進まずintent全体を再審議する。
5. U-04完了後、U-03/U-05は実装・fake検証を並列化し、credentialed macOS live proofはmutexで直列化する。両方が同時readyならClaudeを先にする。
6. 各providerはentryで最小live schema discovery、exitでproduction registry経由の完全live proofを必須とする。認証不足、surface不明、証跡欠落、fake、floorはnative成功の代替にならない。
7. U-03/U-05の一方がblockedならそのBoltだけをparkし、もう一方は続行する。U-06は全provider完了までblockedとする。
8. 全Boltは`amadeus-developer-agent`がleadし、`amadeus-architect-agent`がcontract／runtime seamとnative evidence境界を重点独立レビューする。常設mobは置かず、blocking failure時だけ招集する。
9. 最初のCode Generation直前にpre-code成果物だけのcheckpoint PRを作成・承認・mergeし、merge済み`main`を復帰点にする。実装は新しいBolt branchから開始する。
10. macOSで4 native modeの必須live proof、GitHub Actions Linuxでdeterministic fake fixtureを実行し、Windowsは今回の対象外とする。
11. 学習候補は選択しない（0件）。

このサマリーで正式なDelivery Planning成果物を生成してよいか。

1. **合意し、成果物生成へ進む（推奨）**
2. **一部を修正する** — 対象番号と修正内容を指定する。
3. **Grillingを再開する** — 追加で掘る論点を指定する。
4. **ここでparkする** — 現在の合意候補を保持して停止する。

**決定:** 合意サマリーをDelivery Planningの確定入力として承認し、正式成果物を生成する。

## Q10. ADR-009回復補正のstacked PR配置

**状態:** 回答済み — 1. U-02 PRを補正し、U-03 PRをrebaseする

Application Design再承認とUnits Generation Iteration 2 READYにより、provider-neutralなtransport/capture lifecycleはU-02、Claude mode固有実装はU-03と確定した。既存のstacked PRと「分割想定なら元の計画でOK」「worktreeを間違えない」「rebase」の利用者指示を同時に満たす配置はどれか？

1. **U-02の[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)へ共通補正を追加し、U-03の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)を更新headへrebaseする（推奨）** — 6 Unit／6 Bolt／1実装PRずつを維持し、U-03はClaude固有diffだけにする
2. U-03の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)へ共通補正も入れる — PRは増えないが、U-04/U-05へのhidden dependencyとreview境界逸脱を再発させる
3. 共通補正専用PRを追加する — ownershipは明確だが、1 Unit＝1 Bolt＝1実装PRの合意を崩し、現在のstackを増やす
4. その他 — 別のstack配置を指定する

**決定:** 1。U-02 common seamは[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)だけで補正し、[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)をrebaseする。#965はAgent Teams、Ultra Code、Claude harness/legacy、live proofの4 review checkpointを持つClaude固有PRとし、新しいUnit、Bolt、dependency edge、実装PRを追加しない。

## 再確認サマリー

Q1〜Q9の基盤先行＋risk-first、6 Unit＝6 Bolt、Codex principal-risk gate、Claude/Kiro parallel wave、live proof mutexは維持する。追加されたのは、ADR-009の共通seamをB-02へ戻し、B-04を更新済みB-02へrebaseする回復手順だけである。pre-code checkpoint [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)はmerge済みの復帰点として維持する。
