# Application Design: アーキテクチャ決定記録（ADR）

`application-design-questions.md` の回答 Q1〜Q4（人間承認 2026-08-04T14:13:48Z / 14:18:56Z）を正本として、各決定を ADR 形式（Context / Decision / Consequences / Alternatives Rejected）で記録する。`memory/phases/inception.md` § Architecture Standards に従い、各 ADR に最低 2 つの代替案、セキュリティ・コンプライアンス影響、可逆性評価を含める。上流は `inception/requirements-analysis/requirements.md`、`codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`、team-practices（`memory/team.md`、`memory/project.md`）である。

## ADR-1: authoring 責務の hybrid 配置（Q1）

- **Context**: `codekb/amadeus/architecture.md` の現行断面では、要求・設計から TLA+ モデルへの供給責務を持つ owner が存在しない（`component-inventory.md`「formal model authoring owner 欠落」）。FR-001 は適用判定を、FR-002〜FR-010 は authoring〜登録を要求する。判定は全 intent が通る Requirements Analysis に自然に属する一方、authoring 作業は形式検証固有で重い。
- **Decision**: Requirements Analysis が適用判定を所有し、新設の独立 plugin authoring stage（C7、`plugins/formal-model-check/stages/` 配下）が author / revise / proof / review / registration を所有する hybrid 構成とする。**判定の注入機構**は、engine が requirements-analysis で既に適用している plugin advisory checkpoint 契約（stage-protocol §11a `await-advisory-choice`）とする: plugin の readiness 評価が C9/C1 由来の advisory を供給し、checkpoint の formal_checks が `tla-authoring.ts hold` / `applicability` を実行する。core の stage 定義ファイルは一切編集しない。
- **Consequences**: 全 intent は軽量な判定だけを常時通過し、形式検証対象の intent だけが authoring stage を実行する。「Requirements Analysis が判定を所有する」は「RA の checkpoint 面で判定が走り receipt が発行される」ことを意味し、core stage 文書の変更ではない — 変更面は plugin 側（tools + stages + plugin.json manifest + advisory code）に閉じる（components.md § 新規コンポーネント一覧の配置 4 面）。判定 receipt が 2 つの stage の境界物となるため、receipt schema が両者の契約になる。
- **Alternatives Rejected**:
  - **B: 既存 stage への overlay のみ** — Requirements Analysis と Functional Design に authoring 責務を分散する案。全 intent の主経路に重い形式検証作業が混入し、責務分離（NFR-004）と保守性を損なう。authoring の反復（revise・再 proof）が stage 再実行と衝突する。
  - **C: 独立 stage へ判定も移す** — 判定と作業を単一 stage に集約する案。形式検証非対象の intent が判定を受ける場所がなくなり、FR-001 の「全変更に対する明示判定」が成立しない。非対象 receipt（FR-005）の発行点も失われる。
  - **D: core の requirements-analysis stage 定義へ判定 step を直接編集** — stage 文書は immutable な framework 成果物であり（stage-protocol §13）、plugin 由来の責務を core 文書へ焼き込むと framework 更新と衝突する。requirements.md §6 の canonical 配置制約にも反する。
- **セキュリティ / コンプライアンス影響**: 判定 receipt と authoring 成果物はすべて record dir / evidence store に永続化され、既存の監査規律（audit shard、per-clone sharding）に載る。新規の権限・秘密情報は不要。
- **可逆性**: 中。stage の追加は scope grid と plugin stage 文書に閉じるため撤去可能だが、発行済み receipt / bundle は監査記録として残る（撤去しても履歴は無効化しない）。

## ADR-2: stable ID 単位の canonical content digest（Q2）

- **Context**: FR-006 は requirement / FR / cid / 裁定 / design identity の全数を named invariant へ追跡可能にすること、FR-007 は identity 変化による staleness の自動判定を要求する。identity の粒度が粗いと無関係な編集で全 evidence が stale 化し、細かすぎると対応表の維持が破綻する。
- **Decision**: stable ID（FR-xxx、cid 等の恒久識別子）ごとに正規化済み本文の content digest を計算し、辞書順 sort 済み集合の aggregate digest と trace rows を versioned evidence bundle に格納する（C2 + C3 + C4）。
- **Consequences**: staleness 判定が「どの ID が変わったか」の粒度で可能になり、無関係な文書編集（誤字修正等、ID 本文の canonical bytes に影響しない変更）は stale を引き起こさない。逆に ID 本文の意味変更は必ず digest に現れる（FR-003 の検出根拠）。正規化規則が契約となるため、その仕様と実装は Functional Design で単一 module（C2）に固定する。
- **Alternatives Rejected**:
  - **B: ファイル全体の digest** — requirements.md 1 バイトの変更で全 evidence が stale 化し、staleness が実用上ノイズ化する。FR-006 の「未対応 ID の特定」もできない。
  - **C: Git commit SHA** — SHA は内容以外（コミット順序・メタデータ）にも依存し、rebase / squash で不安定。`codekb/amadeus/component-inventory.md` の no-silent-drop 節が示すとおり、ブランチ SHA を台帳へ永続化する設計は squash マージ運用で「着地した瞬間に到達不能へ反転する」既知の欠陥クラスであり、同じ轍を踏む。
- **セキュリティ / コンプライアンス影響**: digest は SHA-256 系の一方向 hash であり、内容の秘匿ではなく完全性（改竄検出）を担保する。NFR-006 の改竄 fixture は「bundle 内 receipt の byte 変更 → digest 不一致で fail」として実装する（requirements-analysis レビュー FOLLOW-UP の対応先）。
- **可逆性**: 中。digest 方式の変更は bundle schema version の増分で吸収できる（versioned bundle が前提）。既発行 bundle の再解釈は不要（predecessor 連鎖で世代が分かる）。

## ADR-3: content-addressed bundle 先行確定 + model-map atomic replace（Q3）

- **Context**: FR-010 は「部分更新を complete として観測させない」原子的登録を要求する。evidence（複数ファイル）と `model-map.json`（単一ファイル）を同時に整合させる必要があるが、ファイルシステムに跨る多ファイル トランザクションは存在しない。
- **Decision**: (1) evidence bundle を一時領域で全構成 receipt 確定後に content-addressed パスへ配置し、(2) 検証済み bundle への参照を含む `model-map.json` を temp-file + atomic rename で置換する。可視化点は (2) の rename ただ一つとする（C4 + C6）。
- **Consequences**: 読み手は「model-map に載っている = 完全な evidence が存在し検証済み」という単一の不変条件だけを信頼すればよい。(1) と (2) の間のクラッシュは「bundle は存在するが未参照」という無害な状態になり、ゴミ回収は任意。bundle digest は canonical 直列化の全 bytes（NFR-002 の生成時刻・生成主体を含む）を対象とするため、クラッシュ後の再実行は新 digest の evidence を生むが、旧 evidence は未参照のまま無害（完全性を冪等再実行より優先 — component-methods.md § C4）。model-map 側は C6 の rename 直前再読込 + 差分検査で並行 lost update を拒否する。この決定により model-map エントリへの bundle 参照フィールド追加は**確定事項**であり、既存 schema 検証（exactObject 制約）・completeness sensor への影響確認と schemaVersion 裁定を Functional Design の明示タスクとする（FR-013 / AC-008 の回帰で防護）。
- **Alternatives Rejected**:
  - **B: 順次直接更新 + 失敗時 rollback** — rollback 自体が失敗し得るため部分状態が観測可能になり、FR-010 に反する。crash 時の状態数も増える。
  - **C: append-only transaction log + replay** — 新規の log 基盤・replay 実装・compaction 運用を持ち込む。要件は「登録の原子性」だけであり、`memory/phases/inception.md` の規模正当化（既存で代替できない根拠のある場合のみ新機構導入）を満たさない。
- **セキュリティ / コンプライアンス影響**: content addressing により bundle の改竄は参照 digest との不一致として検出される（NFR-003）。監査者は model-map → bundle → predecessor の連鎖で全世代の判断を復元できる（NFR-002）。
- **可逆性**: 高（登録単位）。誤登録は旧 bundle を参照する model-map への再 atomic replace（通常 PR + revert）で回復でき、`memory/project.md` の「version-controlled append-only 生成物は git revert で回復」規律に一致する。

## ADR-4: projection 時の再帰 import-closure guard（Q4）

- **Context**: `plugin-projection.ts:208-226` は manifest 掲載済みファイルの存在・安全性だけを検査し、掲載漏れを検出しない。実害として `tla-model-receipt.ts` / `tla-module-deps.ts` が canonical に存在しながら composed runtime で missing import になっている（FR-011、Issue #2161 の M7/M8 BLOCKER 候補）。
- **Decision**: projection 時に manifest 記載の全 tool entrypoint から相対 import を再帰走査し、閉包内 module が manifest / bundle / ownedPaths に欠ける場合 build を fail-closed で停止する汎用 guard（C8）を追加する。今回の 2 module の manifest 修復は guard 導入と同一 intent で行う。
- **Consequences**: 掲載漏れというクラス全体が build 時に検出され、今後 plugin に tool を追加する際の drift を恒久防止する。projection の実行時間は閉包走査分だけ増えるが、静的解析のみで TLC 等の重い処理は伴わない。
- **Alternatives Rejected**:
  - **B: 2 module の手動 manifest 追加のみ** — 今回の症状は直るが、同じ欠陥クラスが次の module 追加で再発する。AC-007 の「composed runtime で missing import が発生しない」を将来にわたり保証できない。
  - **C: composed runtime の E2E 実行だけで検出** — 検出が build 後（あるいは利用者環境）まで遅れ、実行経路に乗らない import（条件分岐内等）を見逃す。E2E は補完検証として維持し（FR-012）、一次検出は静的 guard に置く。
- **セキュリティ / コンプライアンス影響**: guard は読取専用の静的解析であり、新規権限は不要。閉包の全数列挙 diagnostic は供給網（配布物）の完全性検査として機能し、NFR-005 の配布整合性を CI で機械強制する。
- **可逆性**: 高。guard は独立 module + projection への 1 組込点であり、撤去してもデータは壊れない（検査が消えるだけ）。

## ADR-5: 既存 executor 境界の無変更再利用（保護境界）

- **Context**: FR-013 / AC-008 は `FormalElection` / `MirrorLifecycle` の実行契約・source byte identity・verdict identity の不変を要求する。requirements.md §8 は TLC 実行器・verdict normalization の再実装をスコープ外とする。authoring 側（C5）は TLC 実行・falling/vacuity 評価を必要とする。
- **Decision**: C5 は既存 TLC toolchain（`tlc-toolchain.ts` 契約）を注入 seam 経由の child process として再利用し、executor plugin のコード・schema・verdict 経路には一切手を入れない。依存方向は authoring → toolchain の一方向のみとする（`component-dependency.md` の依存マトリクスで機械確認可能）。
- **Consequences**: 既存 2 モデルの回帰リスクが構造的に遮断される。toolchain 契約が authoring と executor の共有面になるため、toolchain の将来変更は両者への影響評価を要する（変更頻度は低い）。
- **Alternatives Rejected**:
  - **B: executor を拡張して authoring を内蔵** — 決定論的実行責務と生成的 authoring 責務が単一 component に混ざり、NFR-004 の責務分離に反する。既存 verdict identity への回帰リスクも増す。
  - **C: authoring 用に TLC ラッパを新規実装** — 同一機能の二重実装となり、`memory/phases/inception.md` の再利用棚卸し要求（既存で代替できない根拠がある場合のみ新規導入）に反する。
- **セキュリティ / コンプライアンス影響**: 既存 child-process 境界を維持するため、実行面の攻撃面・権限は不変。
- **可逆性**: 高。注入 seam の差し替えのみで toolchain 実装を交換できる。

## ADR-6: hold 強制は既存 advisory checkpoint 機構 + C9（新規ゲート機構は作らない）

- **Context**: FR-003 / FR-007 / AC-001 / AC-002 / AC-006 は「authoring・改訂・再 proof が完了するまで hold を解除しない」ことを要求する。C6 の登録拒否だけでは、そもそも authoring が起動されないまま下流工程（functional-design、build-and-test）が通過することを防げない（レビュー iteration 1 BLOCKER-1）。engine には既に fail-closed の advisory checkpoint 機構（stage-protocol §11a）が requirements-analysis / functional-design / build-and-test の 3 点に存在する。
- **Decision**: hold 強制の owner を C9 AuthoringHoldEvaluator とし、既存 advisory checkpoint 機構へ plugin readiness 評価経由で advisory + formal_checks を供給する。checkpoint の解除は C9 の `no-hold` verdict（完全・非部分・provenance 検証済み）のみが行い、人間の明示的な risk defer は checkpoint 契約の既存規則に従う。engine 側のコード・契約は変更しない。
- **改訂（2026-08-04T18:29:01Z 人間裁定 — bolt-plan.md Bolt 2 改訂追記と同一裁定の転記）**: FD U2 冒頭の実読確認で「plugin.json 宣言だけで結線でき engine 変更不要」の前提が否定された（advisory code の語彙・evaluator コマンドの供給面が engine 側固定だった）ため、Decision 末尾の「engine 側のコード・契約は変更しない」を「checkpoint 機構（発火点・解除規則）は無変更のまま、advisory 供給面の宣言読取一般化に限る小さな engine 変更（宣言 parse と formal-check route の2一般化点）を行う」へ改訂する。実装は BR-U2-08 として固定済み。
- **Consequences**: route=author-new の新規題材（`.tla` 未存在で既存 hash 監視が沈黙するケース）も、C9 の「applicability receipt 不在 = hold」判定で checkpoint に掛かる。hold の強制点が 3 checkpoint に限定されるため、checkpoint 間の作業（成果物の編集そのもの）は止まらない — 止まるのは工程の前進であり、これは既存 advisory 契約と同じ粒度。
- **Alternatives Rejected**:
  - **B: C6 の登録拒否のみで強制** — 登録は経路の最終段であり、authoring 未起動のまま下流が進む問題を検出できない（BLOCKER-1 の指摘そのもの）。
  - **C: 新規の engine gate 機構を追加** — 既存 checkpoint 機構と同型の停止機構を二重実装することになり、`memory/phases/inception.md` の再利用棚卸し要求と NFR-004 に反する。engine 変更は FR-013 の保護境界リスクも増やす。
- **セキュリティ / コンプライアンス影響**: checkpoint の解除に人間相関と provenance 検証を要求する既存契約に載るため、hold の迂回は engine 側で拒否される。C9 は読取専用で新規権限を持たない。
- **可逆性**: 高。advisory code と C9 の撤去で checkpoint 供給が消えるだけで、engine・既存 advisory は不変。
- **改訂(2026-08-04T18:29:01Z 人間裁定、U2 functional-design 冒頭の実読確認による)**: レビュー iteration 2 FOLLOW-UP が要求した実読確認の結果 — (1) §11a checkpoint の fail-closed・人間相関必須は現行 HEAD で機械強制されている(`amadeus-advisory-choice.ts:739-758` の HUMAN_TURN provenance 照合、`:672` + `amadeus-orchestrate.ts:4321/4805/4838` の report 拒否。本 intent セッションでのライブ実測含む)= 肯定。(2)「plugin.json 宣言だけで新 advisory code + formal_checks を結線でき engine 変更不要」= **否定** — advisory code 語彙は `amadeus-plugin-activation.ts` の spec-hash 判定に、formal_checks コマンドは `amadeus-advisory-choice.ts:563-587` に engine 側ハードコード(モデルパスまで FormalElection 固定)。裁定: **Decision を「engine の advisory 供給面を plugin.json 宣言読取へ一般化する小さな engine 変更を含む」形へ改訂する(案 A)**。C9 は宣言で結線し、同類の第 2 ハードコードを避ける。checkpoint 機構の発火点・directive 契約・解除規則(provenance 検証)は引き続き無変更。executor / verdict 経路の保護境界(ADR-5、FR-013)は不侵。宣言 schema と engine 側一般化点の設計は U2 functional-design が所有する。可逆性は中へ変更(engine の宣言読取面が加わるため)。

## ADR-7: 全 4 経路の receipt を単一 evidence store に永続化（terminal route receipt）

- **Context**: FR-004 / FR-005 は `--impl-only` / 非対象経路の「永続 receipt」を要求し、NFR-002 は各 evidence に identity・生成主体・人間承認・生成時刻・直前 evidence 参照を要求する。full authoring bundle（5 receipt）は終端 2 経路には存在しない構成要素（proof 等）を必須とするため、そのままでは保存先にならない（レビュー iteration 1 BLOCKER-2）。
- **Decision**: evidence store（`specs/tla-evidence/`、既存 advisory 監視 glob の外）に `authoring-bundle` と `terminal-route-receipt` の 2 kind を収容する。terminal-route-receipt は applicability receipt + human approval の 2 点構成で、同じ content-addressing・predecessor 連鎖・staleness 判定（C9 経由）に参加する。書き手は C4 に単一化する。
- **Consequences**: 4 経路すべての判断が同一の監査面（store + predecessor 連鎖）で復元可能になり（NFR-002）、C9 の hold 判定も単一 store の読取で完結する。store のレイアウトが 2 kind を区別する必要が生じるが、判別ユニオンで型に閉じる。
- **Alternatives Rejected**:
  - **B: record dir（intent record）へ保存** — record は intent-local であり、後続 intent の C9 / 監査者が横断参照する staleness 判定の読み手から遠い。intent を跨ぐ evidence 連鎖（predecessor）も張れない。
  - **C: 終端経路にも full bundle を強制** — proof / trace / review が存在しない経路に空の構成要素を要求することになり、「N/A placeholder を生成しない」既存規律（`memory/project.md`）と NFR-003（欠落の暗黙変換禁止）に反する。
- **セキュリティ / コンプライアンス影響**: 人間承認が receipt の必須構成要素であり、承認なしの terminal receipt は C4 が配置を拒否する（AC-004）。content addressing により改竄は検出可能。
- **可逆性**: 高。kind の追加は store レイアウトの加算的変更であり、既存 bundle と独立。

## 決定横断の整理

| ADR | 対応 FR/NFR | 可逆性 | 新規機構の導入 |
|---|---|---|---|
| ADR-1 hybrid 配置（checkpoint 注入） | FR-001〜FR-010, NFR-004 | 中 | plugin stage 1 つ + advisory code（ADR-6 改訂により供給面は宣言読取へ一般化 — ADR-6 改訂注記参照） |
| ADR-2 stable ID digest | FR-003, FR-006, FR-007 | 中 | pure module のみ |
| ADR-3 bundle + atomic replace | FR-010, NFR-002, NFR-003 | 高 | 新規 store 1 面（log/replay 等は不採用） |
| ADR-4 import-closure guard | FR-011, NFR-005 | 高 | pure guard 1 つ + projection 組込 |
| ADR-5 executor 無変更 | FR-013, NFR-004 | 高 | なし（再利用のみ） |
| ADR-6 hold 強制 = checkpoint + C9（改訂 2026-08-04T18:29:01Z: 宣言駆動化） | FR-003, FR-007, AC-001/002/006 | 中（改訂で変更） | pure evaluator 1 つ + engine の advisory 供給面の宣言読取一般化（小さな engine 変更 — checkpoint の発火点・解除規則は不変。ADR-6 改訂注記参照） |
| ADR-7 terminal route receipt | FR-004, FR-005, NFR-002 | 高 | store への kind 追加のみ |

後方互換レイヤー・移行シムは導入しない（`memory/phases/inception.md`: 根拠のない互換維持を design に持ち込まない）。model-map エントリへの bundle 参照フィールド追加は ADR-3 の確定事項であり、既存 schema 検証・completeness sensor への影響確認（exactObject 制約の実読と schemaVersion 裁定）を Functional Design の明示タスクとする。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`（FR-001〜FR-013、NFR-001〜NFR-006、§8 対象外、§9 設計へ送る未決事項 1〜5 への回答が ADR-1〜ADR-4）
- `inception/application-design/application-design-questions.md`（Q1〜Q4 の人間承認済み回答）
- `codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`（現行断線・既知欠陥クラスの反面教師）
- team-practices: `memory/phases/inception.md` § Architecture Standards、`memory/project.md`（revert 回復規律、規模正当化）、`memory/team.md`

（§9 の未決事項 6「未知題材 fixture の選定」は、requirements.md §9 が本 stage の決定事項と指定した項目からの明示的な逸脱として、Units Generation の gate で人間裁定する — 候補選定は実装単位の切り方に依存するため本 stage では固定しない。FR-012 / AC-007 の**受け入れ主体は本 intent の build-and-test stage** とし、composed runtime での E2E 実測をそこで判定する。）
