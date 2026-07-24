# Requirements — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(成功指標5点)、scope-document(C1〜C5・Won't)、business-overview、architecture(P0ギャップ・plugin機構・TLC実行契約)、code-structure(区間実測)、team-practices(変更なし判定)

裁定出典: intent-capture Q1〜Q5、feasibility Q1〜Q5、scope-definition Q1〜Q3、requirements-analysis Q1〜Q4(すべてユーザー承認TS付き — decision-log.md 参照)

## 既決ノルムからの申告済み逸脱(CI 実行環境)

既決ノルム cid:build-and-test:two-layer-verification-posture(team.md)および intent-statement 成功指標3 は形式検証の専用ジョブを「macOS + JDK + sandbox、workflow_dispatch」と記述していた。本 requirements はこのうち **実行環境面(macOS + sandbox)を Linux + Docker(digest 固定)へ意図的に変更**する。根拠は feasibility Q3 のユーザー裁定(2026-07-22T11:31:19Z 承認、原文 verbatim):

> 「githubのCI側はsandbox関係ないだろ。githubのCIではLinuxです。tlcをインストールするか、dockerイメージを使うことを想定しろや」

すなわち「macOS + sandbox」は実験時のローカル隔離手段の惰性引き継ぎであり(cid:feasibility:c5-experiment-constraint-classify として §13 persist 済み)、CI 本質要件は「TLC の完全探索が隔離された環境で決定的に走ること」である。GitHub ホステッドランナー自体が隔離環境のため sandbox-exec は CI に不要。既決ノルムの本質(workflow_dispatch 専用・日常 CI へ乗せない・単一形式モデルの完全探索)は不変。ローカル実行(macOS)では従来どおり JDK + sandbox-exec を用いる。intent-statement 側には本裁定への追記注記を付す。ノルム本文(team.md)の文言更新は次回ノルム整理・PM ラウンドで扱う。

## FR-1: plugin ステージの engine 配線(walk 拡張)【requirements Q1裁定】

- FR-1.1: `compileStageGraph`(amadeus-graph.ts — 現行 walk は `stagesDir()` 配下のみ: :1690-1694 `const stagesRoot = stagesDir();`)を拡張し、ホストの `plugins/*/stages/*.md` に compose された plugin ステージファイルも走査対象に含める。発見は汎用機構とし formal-model-check 固有のハードコードを持たない
- FR-1.2: plugin ステージの slug がコアステージと衝突する場合、compile は loud エラーで拒否する(既存 inspectPlugin の same-name-stage 拒否と二重の防衛線)
- FR-1.3: plugin を drop した後の compile はそのステージをグラフから除去し、コア 32 ステージの compile 出力は plugin 0 件時と byte-identical であること(0-plugin baseline 不変 — 既存 packager 契約の compile 面への拡張)
- FR-1.4: compose → compile → `amadeus-orchestrate next --stage formal-model-check --single` の E2E が成立すること(walking skeleton の受け入れ基準。t254 の verify スタブでは代替不可 — 実 compile+実 orchestrate で検証)

## FR-2: formal-model-check ステージ(plugins/ バンドル)【intent Q3裁定】

- FR-2.1: `plugins/<name>/`(名前は設計段で確定)に plugin.json + ステージファイル(stages 貢献)を持つプラグインとして供給する。compose / doctor / drop の全ライフサイクルが通ること
- FR-2.2: ステージは `--stage formal-model-check --single` で単独実行可能で、run-model-check.ts による完全探索の実行と結果報告を stage body とする。stock scope には属さない(opt-in)
- FR-2.3: opt-in runtime 依存の根拠をプラグイン文書(README 等)に適用面別に明文化する — ローカル実行(macOS)= JDK(temurin 26 メジャー)+ sandbox-exec、CI(Linux)= Docker(既成イメージ digest 固定)(Bun-only Forbidden の文書化要件 — feasibility Q1/Q2/Q4)。コア配布面(dist/ 全ハーネス)は plugin 0 件時 byte-identical を維持
- FR-2.4: sensors シームで完備性 sensor id をステージ frontmatter に宣言する(sensor 実体はコア供給 — FR-4)

## FR-3: .tla 外部化と run-model-check.ts【intent Q5・requirements Q2裁定】

- FR-3.1: FormalElection モデルを `specs/tla/FormalElection.tla`、設定を `specs/tla/FormalElection.cfg` として外部ファイル化する(repo 所有 — plugin drop でも残る)。tla-arm.ts の `MODEL_SOURCE`(:329)/ `CFG_SOURCE`(:641)埋め込みは外部ファイル読み込みに置換する(後方互換の二重保持はしない — org Forbidden)
- FR-3.2: 外部化直後に埋め込み版とのバイト一致を検証し(identity tag `amadeus.formal-verif.tla.module.v1` の同値)、既知欠陥(D4 等)注入で検出能力の連続性(7/7 の代表ケース再現)を1回実測する
- FR-3.3: `scripts/formal-verif/run-model-check.ts` を新設する(run-skeleton-ci.ts は実験資産として無改変保持 — intent Q2)。CLI 契約: `bun scripts/formal-verif/run-model-check.ts --model <path.tla> --cfg <path.cfg> --out <dir>` を最小契約とし、モデル可変・単一 run の完全探索を実行する
- FR-3.4: fail-closed 実行契約を保持する: 完全探索 COMPLETE + completion marker + state 統計が揃う場合のみ NOT_DETECTED、部分探索・timeout・統計欠損・ドリフト検出(SOURCE_DRIFT 等)は HARNESS_ERROR / 非0 exit(既存 fs-tlc-toolchain :77-79 の判定を再利用)
- FR-3.5: 実行環境を抽象化し、ローカル macOS は既存の sandbox-exec 実行系(argv 構築+drift 検証)、CI(Linux)は Docker コンテナ内実行(sandbox なし — ランナー自体が隔離環境、feasibility Q3 ユーザー裁定)を選択できる。選択は fail-closed 判定(FR-3.4)より下層に置き、判定コードは実行環境非依存〔文言更新 2026-07-22: application-design iteration 1 の実測で「DarwinSandboxExecProvider」は network-deny 自己診断プローブ専用と判明 — 抽象化対象の正体は run() 内の sandbox-exec argv 構築(ADR-6 TlcSpawnPlanner)。設計は decisions.md ADR-6 が正〕
- FR-3.6: exit code 契約: 0 = 完全探索完走かつ不変量違反なし / 1 = 不変量違反検出(反例あり)/ 2以上 = HARNESS_ERROR(実行不能・ドリフト・部分探索)。各系の出力文言は設計段で確定

## FR-4: 完備性 sensor(コア供給)【intent Q4・requirements Q3裁定】

- FR-4.1: `.claude/sensors/amadeus-model-completeness.md`(id は設計段確定)+ 実装 `.ts` をコア框架の通常3手順(manifest / 実装 / stage frontmatter 参照)で追加する
- FR-4.2: 検査対象は「モデル⇔実装の対応完備性」: spec 面(選挙プロトコル実装ファイル群)の変更に対し .tla モデルが未更新のドリフトを決定的述語で検出する(具体的対応追跡機構 — 対応表/ハッシュ登録簿等 — は設計段で確定)
- FR-4.3: 落ちる実証: ドリフトを実際に注入して SENSOR_FAILED(赤)になること、および正当な状態(モデル同期済み)で赤くならないことの両側を実測してから完成扱いとする(org Mandated + G3)
- FR-4.4: sensor は advisory(既存 sensor 群と同じ)とし、verdict は audit の SENSOR_PASSED/FAILED 行で判定される

## FR-5: CI 統合と旧 workflow 退役【requirements Q4裁定】

- FR-5.1: `.github/workflows/ci.yml` に `workflow_dispatch` トリガーを追加し、formal-model-check ジョブは `if: github.event_name == 'workflow_dispatch'` 条件でのみ実行する。push / pull_request イベントでは formal ジョブが絶対に走らないこと(二層検証態勢の既決)
- FR-5.2: formal ジョブは ubuntu ランナー + Docker コンテナで `scripts/formal-verif/run-model-check-ci.ts` を実行する。コンテナは **公式 eclipse-temurin イメージ(digest 固定)+ 公式 tla2tools.jar(GitHub Releases、版+チェックサム固定)**〔更新 2026-07-22T12:32:22Z: 設計段実測で権威ある既成 TLC イメージの不在を確定し、ユーザー再裁定 — feasibility Q5 の具体化。application-design decisions.md ADR 参照〕
- FR-5.3: `formal-verification.yml` を削除する(履歴は git に残る)。復活はさせない
- FR-5.4: 既存 CI バンドの **push / pull_request 経路の挙動・所要時間は本変更で不変**。workflow_dispatch 対応のため `changes` ジョブに「BASE_SHA 空(dispatch)検知 → ci=false(既存バンド skip)」の最小分岐のみを申告付きで追加してよい〔改訂 2026-07-22: U4 FD レビューが dispatch 時の changes ハード失敗(BASE_SHA 空 → git diff exit 128)→ ci-success 連鎖失敗 → 実行全体赤表示を bash 再現で確定し、ユーザー裁定 A(最小分岐追加)で解消。他の既存ジョブ・push/PR 経路は diff ゼロのまま〕

## FR-6: 品質・配布ゲート(プロジェクト既定の適用)

- FR-6.1: 正本は `packages/framework/core/` / `scripts/` を編集し、`bun scripts/package.ts` と `bun run promote:self` で dist / self-install を同期する(Mandated)。walk 拡張(FR-1)は core tools の変更のため全6ハーネス dist 再生成を伴う
- FR-6.2: 検証コマンド: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` が green
- FR-6.3: 新規行の coverage: push 前にローカル lcov で diff 追加行の未カバー 0 を実測(local-lcov-pre-push)。spawn-only 経路は in-process seam を設計時から用意(fs-tests-integration-first / seam 系既決に従う)
- FR-6.4: テストは Test Strategy = Comprehensive に従い、新規コンポーネント(walk 拡張・run-model-check・sensor)に unit + integration を備える。実 FS を触るテストは integration 層に置く

## NFR

- NFR-1(再現性): run-model-check.ts の実行は同一入力(モデル/cfg/イメージ digest)に対し決定的な verdict を返す。イメージは digest 固定でのみ pull
- NFR-2(実行時間): FormalElection の完全探索は CI ジョブ timeout(30分 — 既存 formal-verification.yml と同値)内に完走する(実験実測で充足済み、A2 で Linux 再実測)
- NFR-3(安全性): 検証劇場の禁止 — verdict のハードコード・自己参照比較・消費されない検証フィールドを持たない(org Forbidden)。すべての green は実行結果由来
- NFR-4(可逆性): plugin の compose/drop は既存安全契約(上書きなし・宣言物限定・失敗時不変・アトミック回復)を維持する

## スコープ外(Won't — scope-document から継承)

実験資材退役、監査ロック/provenance モデル、Linux ネイティブ sandbox provider、形式検証の一律義務化、リリース・バージョン面

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-22T12:27:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration1のCritical1件(CI環境の無申告矛盾)とMinor3件を是正・閉包確認。逸脱申告節+verbatim引用で解消、横断照合で新矛盾なし。残指摘なし。

### Findings

- None
