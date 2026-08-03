# Units Generation — Questions

> 上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。User Stories stage は SKIP のため、`requirements.md` の SC-01〜SC-07 を story-map の追跡単位として使う。本ステージは topology だけを決め、実装順序、critical path、value／risk 優先度は Delivery Planning に委ねる。
>
> ユーザー承認: 2026-08-02T03:40:42Z（4 Unit の Decomposition Plan を承認）

## Interaction Mode

5件の Unit 分解判断を、どの方法で回答しますか。

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — 各境界の反例とトレードオフまで深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me（2026-08-02T03:37:29Z、ユーザー回答「1」）

## Q1. Unit 境界戦略

どの変更境界で Unit を分けますか。

- A. 独立テスト可能な capability／change boundary（推奨）— `U1 static-gate-engine`、`U2 text-mutation-loud-failure`、`U3 mirror-persistence-propagation`、`U4 repository-adoption` の4 Unit。C1〜C6 は dormant adapter を避けるため U1 内で fixture-to-CLI 配線まで閉じ、異なる runtime module の #1874／#1878 は分離する
- B. Application Design の component ごと — C1〜C6、R1〜R4、CI を8〜11 Unitへ細分化する
- C. Issue ごと — #1979、#1874、#1878 の3 Unitとし、CI／配布を #1979 に含める
- D. 単一 Unit — gate、runtime fixes、CI／配布を一度に実装する
- X. Other (please specify)

[Answer]: A — 独立テスト可能な capability／change boundary の4 Unit（2026-08-02T03:38:23Z、Guide me、ユーザー回答「1」）

## Q2. Unit 粒度

Unit の大きさをどうしますか。見積りは authored source、focused tests、設定を含み、generated projection は別計上とする。

- A. 中粒度4 Unit（推奨）— U1: 1,200〜1,800行（L）、U2: 250〜450行（M）、U3: 150〜300行（S/M）、U4: 500〜850行（M/L）。各 Unit は単独の合否を持ち、総計2,100〜3,400行を上限目安にする
- B. 粗粒度2 Unit — gate＋adoption と runtime fixes、各1,000行超を許容する
- C. 細粒度7〜9 Unit — scanner、ast-grep、semantic、policy、各 runtime fix、CIを個別化する
- D. 単一 Unit — 2,100〜3,400行を一つの Construction pass で扱う
- X. Other (please specify)

[Answer]: A — 中粒度4 Unit、合計2,100〜3,400行（2026-08-02T03:38:57Z、Guide me、ユーザー回答「1」）

## Q3. Dependency topology と並行性

Unit 間依存をどう表現しますか。

- A. cycle-free な直接依存だけを記録し、独立集合を明示する（推奨）— U1／U2／U3 は相互に依存せず、U4 だけが U1／U2／U3 に依存する。複数の有効な topological order と並行可能集合を示すが、推奨実装順序は選ばない
- B. 4 Unit を全て直列依存にする
- C. dependency edge を持たず、Construction 時に判断する
- D. shared file があれば双方向依存を許可する
- X. Other (please specify)

[Answer]: A — cycle-free な直接依存だけを記録し、U1／U2／U3 を独立集合として明示する（2026-08-02T03:39:22Z、Guide me、ユーザー回答「1」）

## Q4. Unit 間 integration contract

Unit 間の連携点を何で固定しますか。

- A. versioned schema と既存 typed outcome（推奨）— U1 は `GateResult`／raw・approved evidence／baseline candidate schema、U2 は `ValidatedStageState`／`TextMutationResult`、U3 は既存 `MirrorOperationOutcome.warning.effect`、U4 は CLI exit／ledger digest／CI base revision／package drift contract だけを消費する。runtime Unit は gate を import しない
- B. 内部関数と source file を Unit 間で直接共有する
- C. stdout／stderr 文言だけを contract にする
- D. baseline JSON を全 Unit の共有可変 state にする
- X. Other (please specify)

[Answer]: A — versioned schema と既存 typed outcome を Unit 間 contract にする（2026-08-02T03:39:48Z、Guide me、ユーザー回答「1」）

## Q5. Deployment／distribution model

各 Unit をどう配備・配布しますか。

- A. 単一 monorepo への embedded delivery（推奨）— U1／U4 は contributor-side の短命 Bun CLI／CI、U2／U3 は既存 Amadeus runtime に組み込む。独立 service／package は作らず、canonical core から既存 package／promotion pipeline で harness projection を再生成する
- B. U1〜U4 を独立 npm package として公開する
- C. ast-grep／semantic engine を常駐 service 化する
- D. harness ごとに別実装を持つ
- X. Other (please specify)

[Answer]: A — 単一 monorepo への embedded delivery（2026-08-02T03:40:12Z、Guide me、ユーザー回答「1」）

## Ambiguity Analysis

- 曖昧語: 0件。Unit名、責務、数値規模、dependency edge、contract、配布境界を具体化済み。
- 回答間の矛盾: 0件。4 Unit と中粒度、並行可能集合、embedded delivery は整合する。
- 欠落: 0件。stage が要求する boundary、granularity、parallelism、integration、deployment の全判断を回答済み。
- 経済的順序: 意図的に未決。実装順序、critical path、walking-skeleton-first／risk-first 等は Delivery Planning で決める。

## Decomposition Plan Approval

4 Unit、DAG `U4 → {U1, U2, U3}`（U4 depends on U1/U2/U3）、明示 schema／typed outcome、単一 monorepo embedded delivery を成果物生成計画として確定する。

- A. Approve Plan（推奨）— 3成果物を生成する
- B. Revise Plan — 修正対象と内容を指定する
- X. Other (please specify)

[Answer]: A — Approve Plan（2026-08-02T03:40:42Z、Guide me、ユーザー回答「1」）
