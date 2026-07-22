# Decisions(ADR)— 260722-tla-plugin

上流入力(consumes 全数): requirements(裁定出典)、architecture(P0実測)、component-inventory、team-practices

## ADR-1: plugin ステージの engine 配線は graph compile の walk 拡張

- Context: compose 済み plugin ステージは compile の walk(amadeus-common/stages のみ)から不可視(P0実測)。
- Decision: `compileStageGraph` に `plugins/*/stages/*.md` の走査を追加(C-1)。formal-model-check 固有分岐なしの汎用機構。
- Consequences: 将来の任意 plugin ステージが自動で engine 到達可能。drop 後の compile は 0-plugin baseline と byte-identical(FR-1.3 でピン)。slug 衝突は compile 段でも loud reject(inspectPlugin と二重防衛)。
- Alternatives Rejected: (b) compose 投影先の phase-nested 化 — plugin 名前空間の素性(no-clobber 基盤)を破壊。(c) コアステージ化 — intent-capture Q3 裁定(plugins/供給)と矛盾。
- Reversibility: 高(walk 追加の除去で戻る)。
- Security/Compliance: plugin ステージは compose の inspect(same-name/clobber/unknown-seam 拒否)を通過したファイルのみが対象 — 新たな信頼境界を作らない。
- 裁定: requirements Q1(2026-07-22T12:19:37Z 承認)。

## ADR-2: .tla モデルは repo 所有の specs/tla/ に配置

- Context: モデルは選挙プロトコル実装の形式仕様。plugin は compose/drop で出入りする。
- Decision: specs/tla/FormalElection.{tla,cfg} + model-map.json(C-5)。
- Consequences: plugin drop でも仕様資産が残る。sensor の対応追跡が repo 内で完結。
- Alternatives Rejected: plugin バンドル内配置 — drop で仕様資産喪失。
- Reversibility: 高(ファイル移動)。
- 裁定: requirements Q2。

## ADR-3: 完備性 sensor はコア供給、対応追跡は sha256 登録簿

- Context: plugin の sensors シームは id 文字列のみ運ぶ(実測)。ドリフト検出には決定的述語が要る。
- Decision: コア sensor(manifest+実装の通常3手順)。対応追跡は model-map.json に実装ファイルの sha256 を記録し再計算照合(C-6)。登録簿の更新者はモデルを更新した開発者(updateModelMap subcommand — 起動者明記)。map 不在は FAILED(fail-closed)。
- Consequences: sensor は plugin 不在でも単独有意義。sha256 照合は false negative なし(バイト変更は必ず検出)、false positive はコメント等の非意味変更でも赤 — advisory severity のため人間がゲートで裁定可能。
- Alternatives Rejected: plugin 同梱+sensor 発見経路拡張 — スコープ増・供給経路の新規実装リスク。AST 差分等の意味論比較 — 複雑で検証劇場リスク。
- Reversibility: 中(登録簿様式の変更は sensor と同時更新が必要)。
- 裁定: requirements Q3(検査対象は intent-capture Q4)。

## ADR-4: CI は ci.yml の workflow_dispatch 専用ジョブ

- Context: 二層検証態勢(既決)は日常 CI に形式検証を乗せない。intent は ci.yml 統合を指示。
- Decision: ci.yml へ workflow_dispatch トリガー追加、formal ジョブは `if: github.event_name == 'workflow_dispatch'` でのみ実行(C-7)。formal-verification.yml 削除。
- Consequences: 1ファイル管理と非常時発火の両立。push/PR の既存バンド不変(FR-5.4)。
- Alternatives Rejected: 別ファイル改名維持 — intent の「ci.yml へ統合」と不整合。
- Reversibility: 高。
- 裁定: requirements Q4。

## ADR-5: TLC 供給は公式 temurin イメージ(digest固定)+公式 tla2tools.jar(チェックサム固定)

- Context: feasibility Q5(既成イメージ)の前提を設計段で実測したところ、権威ある既成 TLC イメージは不在(ghcr.io/tlaplus/tlaplus 不在、Docker Hub は個人イメージ stars 0〜1 のみ)。公式一次配布物は tla2tools.jar。
- Decision: eclipse-temurin(Docker 公式、digest 固定)をコンテナに、tla2tools.jar を GitHub Releases から版+チェックサム固定で取得(C-7)。
- Consequences: 両方とも一次供給元の公式物でサプライチェーン統制が強い。「Docker イメージを使う」(feasibility Q4)を満たす。イメージ・jar の具体版/digest/チェックサム値は実装時に実測して固定(sha-no-manual-expansion — 手動展開禁止)。
- Alternatives Rejected: 個人イメージ digest 固定 — メンテ継続性なし。自前 Dockerfile — ビルド基盤の維持コスト、公式2物の組合せで足りる。
- Reversibility: 高。
- 裁定: application-design Q1 再裁定(2026-07-22T12:32:22Z — feasibility Q5 の具体化、前提不成立の差し戻しから)。

## ADR-6: 実行 provider 抽象(TlcSpawnPlan)と Docker 実行経路

- Context(iteration 1 レビューで実測訂正済み): TLC 本体の spawn は `FsTlcToolchain.run()` 内で `argv: ["/usr/bin/sandbox-exec", "-p", DARWIN_NETWORK_DENY_PROFILE, ...prepared.manifest.argv]` として **ハードコード**されている(fs-tlc-toolchain.ts:1289-1296)。既存 `DarwinSandboxExecProvider`(:380)は TCP/UDP/DNS の network-deny **自己診断プローブ専用**であり TLC spawn 経路ではない。さらに `prepare()`/`run()` は JDK snapshot drift・sandbox receipt drift 検証(:1263-1278)と一体化しており Darwin 前提。
- Decision: **`TlcSpawnPlanner` 抽象**を導入し、`run()` 内の argv 構築を planner へ委譲するリファクタを行う(fs-tlc-toolchain.ts の `prepare()`/`run()` は変更コンポーネント — components.md C-3b)。planner は2責務を持つ: (i) TLC 起動 argv のラップ(Darwin = sandbox-exec プレフィクス / Docker = `docker run --rm --network=none -v <ws>:/w <temurin@digest> java -cp /w/<jar> tlc2.TLC …`) (ii) 環境検証戦略(Darwin = 既存の sandbox probe + sandbox receipt drift + JDK snapshot drift をそのまま適用 / Docker = イメージ digest 一致検証+jar チェックサム検証を適用し、**sandbox receipt / ホスト JDK snapshot 検証は意図的に非適用** — コンテナ隔離+`--network=none`+digest 固定が同じ脅威(実行環境改竄・ネットワーク到達)を別機構で封じるため。非適用は宣言的に記録し無言スキップにしない)。normalize(COMPLETE→NOT_DETECTED / 他→HARNESS_ERROR)は planner 非依存で不変(FR-3.5)。
- Consequences: fail-closed 契約は両経路で同一コードパス(R1 封じ)。既存 Darwin 経路の挙動は byte-equivalent(リファクタは委譲のみ)。落ちる実証は両経路で実施。規模: C-3(planner 2実装 約180行)+ C-3b(fs-tlc-toolchain の run/prepare 委譲リファクタ 約120行変更)= 約300行(旧見積り150行から再算定)。
- Alternatives Rejected: 既存 DarwinSandboxExecProvider の interface 化のみ(旧案)— 実測で spawn 経路でないことが判明し不成立。コンテナ内で bun ごと全実行 — イメージ公式性を失う。sandbox なし直接実行フォールバック — 隔離性質の無言降格。
- Reversibility: 中(planner interface は argv 構築+検証戦略の2メソッドに限定)。
- 裁定: feasibility Q3 ユーザー裁定の設計具体化。iteration 1 Critical 是正(2026-07-22)。

## ADR-7: plugin の適用前提は self-hosted framework 開発リポジトリ

- Context: formal-model-check ステージ本体は `scripts/formal-verif/run-model-check.ts`(repo-root 所有)を呼ぶ。plugin 投影機構は汎用に6ハーネス dist へ配布されるが、スクリプトはバンドルに同梱されない。
- Decision: 本 plugin は **self-hosted amadeus framework 開発リポジトリ内でのみ compose される**ことを前提として明記する(README に記載)。他リポジトリ host での compose は対象外 — ステージ本体は scripts/ の不在を loud エラーで検出する(graceful degrade しない)。
- Consequences: FR-2.1 のライフサイクル検証は本リポジトリ内で行う。スクリプトの plugin 同梱(投影対象化)は将来 plugin が外部配布対象になった時の再設計事項。
- Alternatives Rejected: run-model-check.ts を plugins/ 配下へ同梱 — 検証対象(選挙プロトコル)も specs/tla/ も repo 所有であり、外部 host では実行文脈自体が成立しない。同梱はサイズと同期負担だけ増やす。
- Reversibility: 高。
- 裁定: iteration 1 Major 是正(2026-07-22、設計判断として conductor 確定 — 適用前提の明文化であり新規仕様変更ではない)。
