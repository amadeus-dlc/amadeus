# Application Design: コンポーネント設計

対象: Issue [#2161](https://github.com/amadeus-dlc/amadeus/issues/2161)「要求からTLA+モデルを供給・改訂するauthoring工程」。上流は `inception/requirements-analysis/requirements.md`（FR-001〜FR-013、NFR-001〜NFR-006）、`codekb/amadeus/architecture.md` の TLA+ authoring value chain 現行断面、`codekb/amadeus/component-inventory.md` の TLA+ authoring 関連コンポーネント棚卸し、および `application-design-questions.md` の回答 Q1〜Q4 である。team-practices（`memory/team.md`、`memory/project.md`、`memory/phases/inception.md`）の functional domain modeling スタイル（type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result）を全新規コンポーネントへ適用する。

## 設計方針の要約

- **Q1（hybrid 配置）**: Requirements Analysis が形式検証の適用判定（FR-001）を所有し、独立した plugin authoring stage が新規作成・改訂・proof・review・registration（FR-002〜FR-010）を所有する。
- **Q2（identity 粒度）**: stable ID（FR-xxx、design cid 等）ごとの canonical content digest と sorted aggregate digest を trace rows と共に versioned evidence bundle へ格納する（FR-006、FR-007）。
- **Q3（原子性）**: content-addressed evidence bundle を先に確定し、検証済み bundle を参照する `model-map.json` の atomic replace を唯一の visibility point とする（FR-010）。
- **Q4（import closure）**: plugin projection 時に entrypoint から相対 import を再帰走査し、manifest / bundle / ownedPaths の欠落を fail-closed にする汎用 guard を追加する（FR-011、NFR-005）。

既存の `formal-model-check` executor、verdict normalization、`FormalElection` / `MirrorLifecycle` の source byte identity・verdict identity は保護境界とし、変更しない（FR-013、NFR-004）。

## 新規コンポーネント一覧

配置は次の 4 面に分かれる: (1) `plugins/formal-model-check/tools/`（C1〜C6、C9 の実体）、(2) `plugins/formal-model-check/stages/`（C7 stage 文書）、(3) `plugins/formal-model-check/plugin.json`（新 tool 群 + 既存欠落 2 module の manifest 追記、および C9 を plugin readiness 評価へ結線する advisory code の宣言）、(4) `scripts/plugin-projection.ts`（C8 の組み込み。projection 基盤）。canonical 変更はすべて正本ソース（`packages/framework/core/` または plugin source）へ置き、`dist/` とセルフインストール面は `bun run build` の生成物とする（project.md § Way of Working）。core の stage 定義ファイル（`amadeus-common/stages/`）は変更しない（decisions.md ADR-1 / ADR-6）。

| # | コンポーネント | 種別 | 主責務 | 主対応 FR |
|---|---|---|---|---|
| C1 | ApplicabilityJudge | pure decision core + CLI | 対象 identity に対する適用判定の 4 分岐（新規 authoring / 改訂 / `--impl-only` / 非対象）と applicability receipt の生成 | FR-001, FR-004, FR-005 |
| C2 | IdentityDigest | pure module + CLI | requirement / design の stable ID 単位 canonical content digest、sorted aggregate digest、staleness 比較 | FR-006, FR-007, FR-003 |
| C3 | TraceCoverage | pure module + CLI | 対象 stable ID 全数 → named invariant の trace rows 評価。未対応・孤立 invariant・重複 ID を coverage failure として fail-closed | FR-006 |
| C4 | EvidenceBundle | store module + CLI | evidence store の単一書き手。full authoring bundle（5 receipt）と terminal route receipt（`--impl-only` / 非対象の 2 経路）の 2 種を content-addressed・versioned に構築・検証・読取。直前 evidence への predecessor 参照（先頭は root marker） | FR-004, FR-005, FR-008〜FR-010, NFR-002 |
| C5 | ProofObligations | orchestration module + CLI | TLC 完全探索・falling proof・vacuity proof・reduction evidence の完了条件評価。既存 TLC toolchain（executor 側）を子プロセスとして再利用 | FR-008 |
| C6 | RegistrationCommitter | CLI | 全前提（適用判定・coverage・鮮度・proof・review・人間承認）が current な場合に限る `model-map.json` の atomic replace と `formal-model-check` への handoff 成立 | FR-010 |
| C7 | AuthoringStage | plugin stage 文書 + conductor protocol | C1〜C6 を束ねる独立 plugin authoring stage。独立 reviewer と人間ゲートの提示位置 | FR-002, FR-003, FR-009, FR-012 |
| C8 | ImportClosureGuard | pure module + projection 組込 | manifest 記載の全 entrypoint から相対 import を再帰走査し、closure が manifest / bundle / ownedPaths に含まれない場合に projection を fail-closed で停止 | FR-011, NFR-005 |
| C9 | AuthoringHoldEvaluator | pure decision core + CLI | 現在 identity・model-map・evidence store・applicability receipt から hold 状態（authoring 未完・stale evidence・判定未実施）を決定論的に評価し、既存 engine advisory checkpoint（requirements-analysis / functional-design / build-and-test の 3 点、stage-protocol §11a の fail-closed 契約）へ advisory + formal_checks を供給する。hold 解除の唯一の経路は C9 の「hold なし」verdict | FR-001, FR-003, FR-007 |

既存 2 module（`plugins/formal-model-check/tools/tla-model-receipt.ts`、`tla-module-deps.ts`）の manifest 登録修復は C8 の導入と同一 intent 内で行う（FR-011。`component-inventory.md` の「canonicalに存在、composedに欠落」行の解消）。

## 各コンポーネントの責務と境界

### C1: ApplicabilityJudge（適用判定）

- **目的**: 現在の対象 identity（C2 の digest 群）と変更内容の宣言を入力に、FR-001 の 4 経路のいずれか一つへ決定論的に分岐し、判定 receipt を永続化する。
- **所有**: 判定規則（closed な判定表）、applicability receipt schema、fail-closed 判定（判定不能・証拠不足は typed failure）。
- **公開面**: pure な判定関数と、Requirements Analysis の advisory checkpoint（C9 の formal_checks）から呼ばれる CLI（`tla-authoring.ts applicability` サブコマンド）。
- **境界**: 判定「後」の作業（モデル作成・proof 等）は所有しない（Q1 の hybrid 構成で C7 側）。receipt の永続化も所有しない — 生成した receipt 内容は C4（evidence store の単一書き手）へ渡して永続化する。無関係な既存モデルの成功を判定材料にしない（requirements.md §2.4）。
- **非対象経路**: FR-005 の非対象 receipt（理由 + 対象 identity + 人間承認）もここが生成し、C4 が terminal route receipt として evidence store へ永続化する。承認欠落は未完了として fail-closed。`--impl-only`（FR-004）も同じ terminal route receipt 経路を使う。

### C2: IdentityDigest（identity 正規化と鮮度）

- **目的**: requirements.md / design 成果物から stable ID 単位の canonical content を正規化抽出し、ID ごとの content digest と全体の sorted aggregate digest を計算する（Q2）。
- **所有**: 正規化規則（Markdown セクション → canonical bytes）、digest 計算、旧 evidence の staleness 判定（FR-007: 記録 identity と現在 identity の不一致 = stale）。
- **公開面**: pure 関数群（`normalizeStableId`、`contentDigest`、`aggregateDigest`、`compareIdentity`）。ブランド型（`StableId`、`ContentDigest`、`AggregateDigest`）+ スマートコンストラクタで不正値を型で拒否する。
- **境界**: どの ID 集合を対象にするかの選定は C1/C7 の入力宣言に従う。Git commit SHA は identity に使わない（decisions.md ADR-2 の Alternatives Rejected）。

### C3: TraceCoverage（全数トレーサビリティ）

- **目的**: 対象 stable ID の全数が登録モデルの named invariant 1 件以上へ対応することを trace rows で評価する（FR-006）。
- **所有**: trace row schema（stable ID × invariant 名 × 根拠）、coverage 判定（未対応 ID・孤立 invariant・重複/解決不能 ID を列挙する typed failure）。
- **境界**: invariant の導出そのもの（モデル作成）は C7 の authoring 作業。C3 は評価のみを行う referee。

### C4: EvidenceBundle（content-addressed evidence store の単一書き手）

- **目的**: evidence store（`specs/tla-evidence/` 配下。既存 activation advisory の監視 glob `specs/tla/**` の**外**に置き、evidence 書込が既存 advisory を発火させない）へ、次の 2 種の evidence を content-addressed・versioned に保存する（Q3 前半）。
  1. **full authoring bundle**: applicability receipt、trace rows、proof evidence、review receipt、human approval receipt の 5 点を束ねる（author / revise 経路）。
  2. **terminal route receipt**: applicability receipt + human approval の 2 点（`--impl-only` / 非対象の終端 2 経路。FR-004、FR-005 の「永続 receipt」の保存先）。
- **所有**: evidence レイアウト、digest 計算（canonical 直列化の**全 bytes**を対象とし、NFR-002 の生成時刻・生成主体も digest 対象に含める — 完全性を冪等再実行より優先する）、evidence 検証（必須 receipt の欠落・digest 不一致・identity 不一致を typed failure で列挙）、predecessor 参照（直前 evidence の digest。系列の先頭は明示的な root marker とし、暗黙 null にしない — requirements-analysis レビューの NIT 対応。terminal route receipt も同じ predecessor 連鎖に参加する）。
- **公開面**: `build`（bundle 種別を引数に取る）/ `verify` / `read` の 3 操作。書込は一時領域で全構成要素を確定してから最終位置へ配置し、部分 evidence を観測させない。
- **境界**: evidence store の書き手は C4 ただ一つ（C1/C7 は内容を生成するだけで書かない）。bundle の「参照」を model-map へ書くのは C6。C4 自身は model-map に触れない。staleness（FR-007）は terminal route receipt にも適用される — receipt が束ねる identity が現在と不一致なら C9 が stale と判定する。

### C5: ProofObligations(proof 完了条件)

- **目的**: FR-008 の 5 条件（TLC 完全探索成功・named invariant ごとの falling proof・vacuity proof・reduction が意味を失わない evidence・identity への結び付け）を評価し、proof evidence を C4 へ供給する。
- **所有**: proof 完了条件の判定表と proof evidence schema。
- **境界**: TLC 実行そのものは既存 toolchain（`tlc-toolchain.ts` / `fs-tlc-toolchain.ts` 系）を子プロセス契約のまま再利用し、再実装しない（requirements.md §8 対象外、NFR-004）。falling / vacuity の変異 `.cfg` 生成は既存 module 依存（`tla-module-deps.ts`）の閉包内で行う。

### C6: RegistrationCommitter（原子的登録と handoff）

- **目的**: C4 の検証済み bundle を参照する `model-map.json` エントリの atomic replace を唯一の visibility point として実行する（Q3 後半、FR-010）。
- **所有**: 登録前提の全数検査（applicability・coverage・staleness・proof・review・human approval がすべて current）、temp-file + rename による atomic replace、失敗時の未登録維持。
- **境界**: 既存 model-map v2 schema・completeness sensor の検証責務は変更しない。登録後の実行は既存 `formal-model-check` stage の責務（FR-013）。

### C7: AuthoringStage（独立 plugin authoring stage）

- **目的**: `plugins/formal-model-check/stages/` に新設する authoring stage として、author / revise 経路の作業（invariant 導出、`.tla` / `.cfg` / reduction manifest / trace evidence の作成）、C3/C5 referee の実行、モデル作成主体から独立した reviewer のレビュー（FR-009）、人間ゲート、C6 呼出しを所有する（Q1）。
- **所有**: stage 文書（QUESTION-ONLY / ARTIFACT-ONLY を含む stage protocol 準拠の手順）、halt 条件（referee の typed failure は成功へ暗黙変換しない）。
- **境界**: 適用判定は所有しない（C1 = Requirements Analysis の checkpoint 側）。hold の強制も所有しない（C9 + engine checkpoint が担う — C7 は hold が解除されるべき作業を「完了させる」側であり、「止める」側ではない）。既存 `formal-model-check` stage の決定論的実行責務も所有しない（NFR-004 の責務分離）。
- **未知題材 E2E（FR-012）**: `FormalElection` / `MirrorLifecycle` 以外の未知題材 fixture を使い、C1→C7→C6→既存 executor の全経路を composed runtime で実測する検証をこの stage の受け入れに含める。

### C9: AuthoringHoldEvaluator（hold 強制の owner）

- **目的**: FR-003 / FR-007 / AC-001 / AC-002 / AC-006 の「〜まで hold を解除しない」を強制する唯一の owner。現在 identity（C2）、model-map、evidence store、applicability receipt を入力に、hold 状態を決定論的に評価する。
- **hold 判定表（closed）**:
  1. 適用判定 receipt が現在 identity に対して存在しない → hold（判定未実施。route=author-new の新規題材で `.tla` が存在しないケースを含む — 既存 advisory の hash 監視では検出できない空白を C9 が塞ぐ）
  2. receipt の route が author-new / revise で、対応する current な full authoring bundle + 登録が未完 → hold（FR-002、FR-003、AC-001、AC-002）
  3. evidence（bundle / terminal route receipt）の記録 identity が現在 identity と不一致 → hold（stale。旧 verdict の存在では解除しない — FR-007、AC-006）
  4. route が impl-only / non-target で current な terminal route receipt が存在 → hold なし（FR-004、FR-005）
  5. 全条件 current → hold なし
- **強制点**: 既存 engine の advisory checkpoint 機構（stage-protocol §11a `await-advisory-choice`。requirements-analysis / functional-design / build-and-test の 3 checkpoint で発火し、fail-closed・人間相関必須・provenance 検証済みの解除のみ許可）へ、plugin readiness 評価経由で advisory + formal_checks（C9/C1 の CLI 実行）を供給する。**checkpoint 機構そのもの（engine 側の発火点・directive 契約・解除規則）は無変更**で、plugin 側の評価器と advisory code を追加する（decisions.md ADR-6）。
- **公開面**: pure な評価関数 + CLI（`tla-authoring.ts hold` サブコマンド。checkpoint の formal_checks として実行され、hold なし = `NOT_DETECTED` 相当、hold あり = `DETECTED` 相当の typed verdict を返す）。
- **境界**: hold の評価のみを所有し、authoring 作業（C7）や登録（C6）は行わない。人間の risk defer（checkpoint 契約に既存の明示的な延期）を上書きしない — defer の記録と提示は engine checkpoint 側の既存責務。

### C8: ImportClosureGuard（projection 時 import 閉包検査）

- **目的**: plugin projection（`scripts/plugin-projection.ts`）実行時に、manifest（`plugin.json`）記載の全 tool entrypoint から相対 import を再帰走査し、閉包内 module が manifest / bundle / ownedPaths のいずれかに欠ける場合 projection を fail-closed で失敗させる（Q4、FR-011）。
- **所有**: 再帰 import 走査（静的解析、相対 import のみ対象）、欠落 module の全数列挙 diagnostic。
- **公開面**: pure 関数（`resolveImportClosure(entrypoints, readFile)`）+ projection への組込点。単体で検査できる CLI 面も持つ。
- **境界**: 外部パッケージ import（bare specifier）は閉包対象外（Bun runtime 解決）。composed runtime の E2E は補完検証であり、一次検出はこの静的 guard が担う（decisions.md ADR-4）。

## 既存コンポーネントとの整合

`codekb/amadeus/component-inventory.md` の棚卸しに対する差分は次のとおり。

- **formal model authoring owner（欠落）** → C7 + C1〜C6 で充足。hold 強制の owner は C9。
- **plugin import-closure guard（欠落）** → C8 で充足。
- **`tla-model-receipt.ts` / `tla-module-deps.ts`（manifest 未登録）** → manifest 修復 + C8 が再発を恒久防止。
- **plugin activation / advisory** → engine 側の checkpoint 機構（発火点・directive 契約・fail-closed 解除規則）は無変更。plugin 側の readiness 評価に C9 由来の新 advisory code を追加する（`architecture.md`:10 の「要求本文・design identity を判定せず、authoring を起動しない」空白を C9 が埋める）。これは既存機構の**利用**であり、engine コードの変更ではない。
- **model-map v2 / completeness sensor、`formal-model-check` executor（既存）** → 無変更で再利用。model-map エントリへの bundle 参照フィールド追加（ADR-3 の確定事項）が既存 schema 検証・sensor に与える影響は Functional Design で `amadeus-formal-verif-model-map.ts` の exactObject 制約を実読して確定し、FR-013 / AC-008 の回帰テストで守る。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`（FR/NFR/AC の正本）
- `inception/application-design/application-design-questions.md`（Q1〜Q4 回答、人間承認 2026-08-04T14:13:48Z / 14:18:56Z）
- `codekb/amadeus/architecture.md`（現行 value chain 断面と断線）
- `codekb/amadeus/component-inventory.md`（欠落コンポーネントの棚卸し）
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T16:48:14Z
- **Iteration:** 1
- **Scope decision:** none

C1〜C8の責務分割・非循環依存・保護境界(FR-013)・ADR形式は要求水準を満たすが、(1) FR-003/FR-007/AC-001/AC-002/AC-006のhold強制のownerが不在、(2) impl-only/非対象2経路の永続receiptの保存先が設計に存在しない、(3) FR-001判定のRequirements Analysisへの注入機構がADR-1内で自己矛盾、の3点が実装者がarchitectへ問い直さず進めない設計欠落でありBLOCKER。

### Findings

- BLOCKER | components.md §C7 / component-methods.md §C7 — hold/gate強制のownerが不在。FR-003/FR-007/AC-001/AC-002/AC-006のhold解除拒否がC6の登録拒否への写像のみで、authoring起動強制と下流進行停止を所有するcomponentがない。activation/advisoryは無変更宣言(components.md:94)だが、既存advisoryはspecs/tla/** hash変化のみ通知しauthoringを起動しない(codekb architecture.md:10)ため、route=author-newの新規題材はholdなしで通過する。C1 receiptを消費して進行を止める強制点の所有componentを明示すること。
- BLOCKER | component-methods.md §C4 / components.md §C1 / component-dependency.md §共有リソース — impl-only/non-target receiptの永続先が設計に存在しない。C4 buildは5 receiptが揃わない限りbundleを配置せず、終端2経路のreceiptを構造的に保持できない。共有リソース表にreceipt storeの行がなくC1に書込メソッドもない。FR-004/FR-005/AC-003/AC-004/NFR-002に対し、store・単一書き手・identity束縛・staleness適用の有無を決めること。
- BLOCKER | decisions.md §ADR-1 / components.md §新規コンポーネント一覧 — FR-001判定をRequirements Analysisへ差し込む配置と機構が未定義かつ自己矛盾。ADR-1 Decisionは判定所有をRAに置くが、Consequencesは「stage graphへの影響はplugin stage追加に閉じ、既存stageの責務は動かない」と述べ、配置一覧もcore stage定義とplugin.json manifestへの変更を含まない。判定stepの注入方式(core stage編集/plugin由来overlay/hook/sensor)を裁定しrequirements.md §6のcanonical配置制約と整合させること。
- FOLLOW-UP | component-dependency.md §共有リソース — evidence storeをspecs/tla/evidence/配下に置く案は既存activation advisoryの監視glob(specs/tla/**)と衝突し、evidence書込のたびにadvisoryが発火して無変更宣言の観測挙動を変える。監視glob外へ置くか除外根拠を示すこと。
- FOLLOW-UP | component-methods.md §共通規約/§C4・services.md・decisions.md §ADR-3 — content-addressed bundleのdigest入力にNFR-002の生成時刻が含まれるか未定義。含まれる場合「再実行は同一パスに収束」「衝突しても同一bytes」の主張が崩れる。digest対象のcanonical fieldと非digest metadataを分離して明示すること。
- FOLLOW-UP | services.md §スケーリングと運用特性 — 並行安全性の根拠「content-addressedのため衝突しても同一bytes」はevidence storeのみに妥当し、model-map.jsonはRMW+renameの後勝ちでlost updateし得る。C6側の競合検知(登録前再読込と差分検査)を併記すること。
- FOLLOW-UP | component-methods.md §C1 ApplicabilityReceipt — NFR-002が要求する生成時刻と直前evidence参照が型に存在しない。bundleを形成しない終端2経路のreceiptに連鎖の起点が残らない。receipt型にroot marker相当と生成時刻を持たせるかbundle層で補う根拠を書くこと。
- FOLLOW-UP | components.md §C2/C3/C5・services.md §サービス一覧 — refereeの起動面が欠落。C3/C5にCLIがなく唯一の呼び手がC7、C2もpure module + CLIと分類されながらsubcommand未定義。conductorから呼べるsubcommandを宣言すること。
- FOLLOW-UP | decisions.md §決定横断の整理 — ADR-3が「検証済みbundleへの参照を含むmodel-map.json」を可視化点と定める以上、参照フィールド追加は条件付きでなく確定事項。既存model-map v2/completeness sensorが未知フィールドを拒否しないか(FR-013/AC-008)を含めて確定させること。
- FOLLOW-UP | decisions.md 末尾注記 — requirements.md §9は6項目すべてをApplication Designの決定事項とするが、item 6(未知題材fixture選定)をUnits Generation/Functional Designへ送っている。逸脱理由は妥当だがFR-012/AC-007の受け入れ主体stageを明示して合意すること。
- NIT | component-dependency.md §依存マトリクスC1行 — C1→C2を同期呼出しとするが、ApplicabilityInput.subjectIdentityは算出済みAggregateDigestを値で受け取る形でC1はC2を呼ばない可能性がある。表記を型依存に揃えるか呼出し主体を統一すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T17:02:14Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1の3 BLOCKERはいずれも決着し、C9 AuthoringHoldEvaluator・evidence storeの2 kind化(単一書き手C4)・ADR-1の判定注入機構(既存plugin advisory checkpoint、core stage無編集)が5成果物に一貫して現れている。ADR-6/ADR-7も代替2件以上・可逆性・セキュリティ影響を備え、実装者がarchitectへ問い直さず進めない欠落は残っていない。改訂の波及漏れ5件(依存表・データフロー・サービス構成・受け入れ主体の記述側不整合)と、C9が依拠する§11a checkpointのfail-closed機械強制の実読確認をFunctional Design着手前のFOLLOW-UPとして挙げる。

### Findings

- FOLLOW-UP | decisions.md §ADR-6 / components.md / services.md — hold強制が依拠する「既存§11a checkpointはfail-closed・人間相関必須で迂回不能」という前提を、codekb履歴断面(component-inventory.md:29の degraded 記述、260803-advisory-human-choice時点)が現行HEADで解消済みかを含めFunctional Designで実読確定すること。(1)checkpointの解除が状態機械側で機械強制されるか、(2)新advisory codeとformal_checksをplugin.json宣言だけで結線できengine変更不要か。否定される場合はADR-6のDecision再検討(Alternative Cの再評価)が必要。
- FOLLOW-UP | component-dependency.md §依存マトリクス・§データフロー / services.md §S1 — terminal route receiptの書込経路が図表に現れていない。impl-only/非対象の2経路はC7を通らないため図表上はC4.build(terminal-route-receipt)の呼び手が不在。checkpoint/S1→C4 buildの辺の追加と、S1構成表記(C1+C2のまま永続化責務を負っている)の是正を行うこと。
- FOLLOW-UP | component-methods.md §C4 / §C9 — evidence storeの列挙・系列head解決のownerが未宣言。C9のevaluateはevidenceIndexを、C4のbuildはpredecessorを要求するが解決主体がない。C4にlist/head相当を加えるかindex生成のownerを名指しし、C9/C7がC4所有のレイアウト知識を再実装する乖離リスクを塞ぐこと。
- FOLLOW-UP | components.md §C7 / decisions.md 末尾注記 — FR-012/AC-007の受け入れ主体が2か所で食い違う(C7 stageの受け入れ vs build-and-test stage)。単一の受け入れ主体に寄せるか「C7の受け入れ基準として定義し判定はbuild-and-testで行う」と明示的に書き分けること。
- FOLLOW-UP | component-dependency.md §通信パターンの分類 — C1→C2を依然「同期pure関数呼出し」に分類しており型依存のみの結論と不整合。C9→C2、C9→C4(verify/read)も同表に未掲載。表をマトリクスと揃えること。
- NIT | component-methods.md / component-dependency.md 冒頭 — 対象範囲が「C1〜C8」のままC9追加を反映しておらず、節順もC9→C8で番号順に読めない。
- NIT | component-methods.md §C9 — no-holdの根拠型がEvidenceBundleRef固定で、terminal route receiptを根拠にする場合もbundle語彙で表現される。2 kind化後はEvidenceRef系の名称に寄せること。
