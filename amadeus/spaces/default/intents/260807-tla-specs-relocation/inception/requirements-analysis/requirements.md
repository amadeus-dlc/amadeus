# Requirements — Intent 260807-tla-specs-relocation

## 上流参照(consumes 全数)

- `amadeus/spaces/default/codekb/amadeus/business-overview.md` — プロダクト目的と仕様層の位置づけ
- `amadeus/spaces/default/codekb/amadeus/architecture.md` — spec 解決の現行3系統(activation / sensor / loader)と watch 結合
- `amadeus/spaces/default/codekb/amadeus/code-structure.md` — `specs/tla` 参照の全域分布(826 occurrences / 264 ファイル、actionable 分類)と変更クラス A–F
- ユーザー入力(Intent 説明文): Issue #2398 の実施を self-refactor scope で指示(起票文は完了条件5件を持つ既決文書)
- 明確化の裁定系譜: E-TSR-RA1(4問一括、2-0 established)→ decide-question 4件(unreviewed)。留保3件は §留保の転記 に逐語で載せ、各 FR に反映済み

## 上流前提の訂正申告(RE 実測に基づく)

Issue 本文の実測値はおおむね正確だが、以下は RE(observed `d98dd9039`)で訂正する(cid:requirements-analysis:approval-lineage-citation)。いずれも Issue の目的・完了条件を変えない。

1. model-map.json の登録は **2 モデル**(FormalElection / MirrorLifecycle)。MirrorLifecycleAsImplemented は意図的未登録で `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts:106` が pin している(Issue の「3 モデル+model-map」はファイル数としては正しいが登録数としては不正確)。
2. model-completeness センサーの matches glob の所在はステージ frontmatter ではなく **センサー定義 `packages/framework/core/sensors/amadeus-model-completeness.md:8`**。ステージ側は `plugins/formal-model-check/stages/formal-model-check.md:14-16` の `sensors:` 宣言のみ。
3. `.github/workflows/ci.yml` に `specs/tla` リテラルは **0 件**。パス結合は runner 側 **`plugins/formal-model-check/tools/ci-model-check-domain.ts:189`**(`scripts/` 配下に同名ファイルは存在しない)。
4. model-map v2 validator の正準パス固定は `:250` 単点ではなく、model/cfg 側は `parseAssetIdentity`(`amadeus-formal-verif-model-map.ts:171`)が `:335`/`:337` の生成値へピンする形、auxiliaries 側が `:247`/:250/:272。

## Intent analysis

仕様(RFC・TLA)の置き場を 1 つの正準ツリー `amadeus/spaces/<space>/specs/{rfc,tla}` に統一する。現状 TLA+ 仕様はリポジトリルート直下 `specs/tla/` に孤立しており、#2396(RFC プラグイン、OPEN)が `amadeus/spaces/<space>/specs/rfc/` を定めるのに合わせて TLA 側を移設する。space 配下には memory(プロセス規範)・codekb(観測)・knowledge(チーム知識)の層があり、specs はそこに並ぶ「プロダクト規範」層として配置される。対象は配置(パス)の正準化のみで、モデルの意味論・TLC 実行契約・verdict 語彙は不変(Issue 既決)。

## Functional requirements

### FR-1: 仕様ファイルの移設(move)

- `specs/tla/` 配下 9 ファイル(FormalElection.{tla,cfg}、MirrorLifecycle.{tla,cfg}、MirrorLifecycleAsImplemented.{tla,cfg}、MirrorLifecycleCore.tla、MirrorLifecycleVacuity.cfg、model-map.json)を `amadeus/spaces/default/specs/tla/` へ `git mv` する。未登録 2 資産(AsImplemented.{tla,cfg}、Vacuity.cfg)も同梱する(登録方針の維持は t-formal-verif-mirror-model-registration:106 が guard)。
- `specs/tla/` 内コメントの自己参照 5 行(MirrorLifecycle.cfg:2、MirrorLifecycle.tla:8、MirrorLifecycleAsImplemented.tla:17、MirrorLifecycleCore.tla:11,539)を新パスへ書き換える。
- AC: `git ls-tree -r HEAD -- specs/` が空、`amadeus/spaces/default/specs/tla/` に 9 ファイルが存在する。

### FR-2: spec root の単一解決経路と active-space 連動(Q1=A・留保3)

- watch 基底・model-map ロード・センサー対象・TLA loader のすべてを `amadeus/spaces/<activeSpace>/specs/tla/` に解決する。解決規則は `activeSpace()`(`packages/framework/core/tools/amadeus-lib.ts:1122`)のカーソル連動とし、`intentsDir` 等と同じ既存規則の適用で新機構を発明しない。
- **spec root 解決の単一経路化は本移設実装の一部として新設する**(留保3)。現行は3系統独立 — activation の `specRootForHost`(`amadeus-plugin-activation.ts:100-102`)、sensor の `MODEL_MAP_RELATIVE_PATH`(`amadeus-sensor-model-completeness.ts:37`、rootReal 基準 :247-250)、loader の `findRepositoryRoot` walk-up(`tla-model-loader-internal.ts:134-153`。`:140` の `specs/tla` 存在チェックを含む root 判定条件の変更は必須であり変更面に列挙する)— であり、これらを共有 resolver へ収斂させる。単一チーム運用(default のみ)ではパス移設以外の挙動差を出さない。
- AC: 3系統が同一 resolver 経由で同一の spec root を得ることを示すテストがある。space 切替時は切替先 space の specs を対象にする。

### FR-3: watch 基底の再宣言(Q3=A)

- spec-hash watch の基底を所有ルート `amadeus/spaces/<activeSpace>/specs/` で明示宣言し、監視 glob は `tla/**` とする(cid:code-generation:cg-watch-root-separation「監視 glob の基底は所有ルートで明示宣言」に適合)。`dirname(hostRoot)` = リポジトリルート基底の長い glob 形(B案)は採らない。
- AC: 新パス配下の spec 変更で spec hash drift advisory(「spec hash CHANGED」系文言)が発火する。旧基底での監視は行われない。

### FR-4: specs/tla-evidence の同移設(Q2=A・留保1)

- `DEFAULT_STORE_ROOT`(`plugins/formal-model-check/tools/tla-evidence.ts:434`)の正準値を `amadeus/spaces/<space>/specs/tla-evidence/` に移す。watch 除外(260804-tla-authoring ADR)は新 root 基準で維持する。
- store root 解決は Q1 と同一の active-space 規則に従い、fallback 使用側 `tla-authoring.ts:189`(`return raw ?? DEFAULT_STORE_ROOT;`)を含めて activeSpace 解決を挟む(留保1)。
- AC: evidence store が `amadeus/spaces/default/specs/tla-evidence/` に生成され、spec hash watch の対象外であること(新パス配下の evidence 変更では drift advisory が鳴らない)。

### FR-5: model-map の path 更新と digest 再ピン

- `model-map.json` の `path` 値(:7,:11,:60,:64,:69)を新正準パスへ書き換える。`identity` はコンテンツ base の canonical ハッシュ(`amadeus-formal-verif-model-map.ts:33-43`)のためパス移動では変わらない。
- v2 validator の正準パス生成(`tlaModelPath`/`tlaCfgPath` へのピン `:335`/`:337`、auxiliaries `:247`/:250/:272)を新パス規約へ更新する。core 側 `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` を正本として編集し、plugin 側鏡像は `bun run build` で byte-identical 再生成する(guard: t-package-generated-plugin-sources)。
- AC: map ロード時の identity 照合が新パスで green、旧パスを値に持つ map は validator に reject される。

### FR-6: 移設告知(Q4=A・留保2)

- FR-2 の単一解決経路において、旧 `specs/tla/` に spec を検出した場合は **fail-closed** のエラーで停止し、新パスへの移設手順を明示する。無音の二重読み・後方互換シムは設けない(Issue 完了条件の既決。留保2により根拠引用は org.md Forbidden ではなく本 Issue 完了条件とする — `org.md` の Forbidden 節は実測で空)。
- AC(落ちる実証): 旧 `specs/tla/` に spec を置いた workspace で spec 解決が移設手順付きエラーで停止すること。旧パス参照の残存 0 を全域 grep(`git grep` over tracked files、歴史記録を除く)で確認すること。

### FR-7: 参照面の一括更新

- 変更クラス B(path-rewrite)の全ファイルを更新する: core 6 ファイル(`amadeus-formal-verif-model-map.ts` / `amadeus-plugin-activation.ts` / `amadeus-sensor-model-completeness.ts` / `amadeus-advisory-choice.ts:894-895` / `tla-module-deps.ts` / sensors `amadeus-model-completeness.md:8`(glob。実装側エントリ `amadeus-election*.ts` / `amadeus-mirror-*.ts` は動かさない非対称編集))、plugin 10 ファイル(loader internal / module-deps / ci-model-check-domain:189(bind mount src/dst 双方)/ run-model-check-diagnostic:217 / tla-applicability:361 / tla-authoring:449 / tla-evidence:434 / ステージ formal-model-check.md:12,:34,:45-46 / README.md:16,:70,:91 / 鏡像 model-map)。
- AC: 全域 grep で旧パス参照残存 0(歴史記録・派生キャッシュを除く、FR-6 AC と同一検査)。

### FR-8: docs・配布規約の更新

- `docs/reference/21-formal-model-following.{md,ja.md}`、`22-formal-model-supply.{md,ja.md}`、`07-sensor-system.{md,ja.md}`、`docs/guide/19-plugins.{md,ja.md}` の該当行を更新し、`docs/amadeus-files.{md,ja.md}` の `amadeus/spaces/<space>/` layout 定義へ `specs/` エントリを新規追記する(英日ペア同期 — project.md Mandated)。
- plugin 利用者 workspace で新パスが規約として機能すること(INSTALL/README 記述 + plugin-conformance)を確認する。
- AC: 英日対訳ペアが同内容で更新されている。plugin-conformance 相当の検査が green。

### FR-9: 検証(落ちる実証)

- テスト 51 ファイル(unit 16 / integration 30 / e2e 2 / support 2 / harness 1)の fixture・期待値を新パスへ更新し、関連スイートが green であること。ベースライン: mirror-model-registration 7 / model-map-v2 27 / t402 19 / t403 12 = 65 pass(RE 実測)。
- 落ちる実証: (a) 旧パス配置 spec の非検出(FR-6)、(b) 新パス spec 変更での drift advisory 発火(FR-3)、(c) 旧パス値の map の validator reject(FR-5)。
- 配布面: `bun run build` の隔離2回ビルド再現性検査、`bun run source-only:check`、グラフ不変量検査を含める(project.md Mandated)。`dist/`・self-install 面の直接編集・コミットはしない。
- AC: 上記すべてが CI 相当のローカル実行で green。

## Non-functional requirements

- NFR-1: モデルの意味論・TLC 実行契約・verdict 語彙の不変(Issue 既決)。TLA ソースの内容変更は自己参照コメント5行と model-map path 値のみ。
- NFR-2: 新規 runtime dependency の追加なし(Bun-only 前提の維持)。
- NFR-3: 8 ハーネス配布の parity — 正本(`packages/framework/`)編集後に `bun run build` で全 self-install 面を再生成し、追跡ファイルが不変であること(project.md Mandated)。
- NFR-4: lint(Biome)・strict typecheck・関連テスト・coverage ゲート・複雑度検査を変更パスの要求どおり通すこと(project.md Mandated)。

## Constraints

- 歴史記録の書換禁止: `amadeus/spaces/*/intents/**`(audit jsonl 14 ファイルを含む 141 ファイル)、`amadeus/spaces/default/elections/**`(30 ファイル)、`memory/project.md:408` の learned エントリ。過去の advisory 文言・実測記録は当時の事実として残す。
- `amadeus/spaces/default/codekb/**` は派生キャッシュであり手書換しない(次回 RE で再導出)。
- テスト採番は **t481 以降**を使用する(observed の最大は t480、RE 実測)。
- CI workflow ファイル(`.github/workflows/ci.yml`)は `specs/tla` リテラルを持たないため変更不要(runner 側修正で追従)。
- #2396(RFC プラグイン)は OPEN であり、本 intent は TLA 側の移設のみを扱う。`specs/rfc/` 側の実装は作らない。

## Assumptions

- 単一チーム利用者が実在する唯一の populated space は `default` であり、移設の実対象は `amadeus/spaces/default/specs/tla/` である。マルチスペース時の切替規則は FR-2 の active-space 連動で一般形だけ定める。
- 配布先 workspace に旧パスで spec を持つ利用者は formal-model-check プラグインの opt-in 利用者に限られ、移設告知(FR-6)で検出・案内できる。
- Issue 本文の「CI ジョブ(.github/workflows/ci.yml:663-)とローカル runner のパス参照」は runner コード側の結合を指すと解釈した(訂正申告3)。

## Out of scope

- TLA モデルの意味論・TLC 実行契約・verdict 語彙の変更。
- RFC プラグイン(#2396)本体の実装、`specs/rfc/` の新設。
- `specs/` ルート直下の他用途の新設。
- `dist/`・self-install 面の直接編集(生成物は `bun run build` の出力)。
- 後方互換シム・シンボリックリンク併存・無音の二重読み(Issue の非採用案)。

## Open questions

- なし(設計段への引き渡し事項は FR-2 の単一 resolver の形・FR-6 の検出メッセージ文言・FR-4 の fallback 挟み込みの3点で、いずれも functional-design の設計事項として確定する)。

## 留保の転記(E-TSR-RA1、per-voter 3件)

1. (subagent-1 / Q2)「変更が `tla-evidence.ts:434` の定数1箇所+docs 2ファイルに閉じる」はやや楽観的。DEFAULT_STORE_ROOT は静的文字列であり、space 連動化には fallback 使用側 `tla-authoring.ts:189`(`return raw ?? DEFAULT_STORE_ROOT;`)で activeSpace 解決を挟む変更が必要 → **FR-4 に反映済み**。
2. (subagent-1・subagent-2 / Q4)推奨根拠の引用「org.md Forbidden」は実在しない(`org.md` の Forbidden 節は空)。根拠は Issue #2398 完了条件の「無音の二重読みはしない — 要求されない後方互換シムは追加しない」に修正して引用すること → **FR-6 に反映済み**。
3. (subagent-2 / Q4)選択肢A の「loader/activation/sensor が共有する1経路」は現状でなく設計目標。現行は3系統独立(activation `specRootForHost` / sensor `MODEL_MAP_RELATIVE_PATH` rootReal 基準 :247-250 / loader `findRepositoryRoot` walk-up :134-153)。「spec root 解決の単一経路化は移設実装の一部として新設」と明記し、loader の root 判定条件(`:140` の specs/tla 存在チェック)の変更必須を変更面に列挙すること → **FR-2 に反映済み**。

## トレーサビリティ(Issue 完了条件との対応)

| Issue 完了条件 | 対応 FR |
|---|---|
| `amadeus/spaces/<space>/specs/tla/` が正準置き場になり 3 モデル+model-map が移設される(digest 再ピン込み) | FR-1 / FR-5 |
| model-completeness センサー・spec-hash watch・CI ジョブ・ローカル runner・テストが新パスで green | FR-2 / FR-3 / FR-7 / FR-9 |
| 落ちる実証(旧パス非検出・残存0・新パス drift 発火) | FR-6 / FR-9 |
| 配布先 workspace でも新パスが規約として機能(INSTALL/docs + plugin-conformance) | FR-8 |
| 移行考慮(旧パス検出+案内、二重読みなし、互換シムなし) | FR-6 |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T10:46:43Z
- **Iteration:** 1
- **Scope decision:** none

必須セクション7件完備・Issue 完了条件5件のトレーサビリティ完備・留保3件は FR-2/FR-4/FR-6 に反映済み・30件の file:line 引用を HEAD d98dd9039 で実測し全件正確・上流 consumes 3件参照済み・訂正申告4件はコード実測と一致。BLOCKER なし。

### Findings

- FOLLOW-UP | §留保の転記は厳密な逐語転記ではなく要約転記(脇文を省略)。実質内容・file:line・明記指示は保持され FR 反映も確認済みで実害なし。questions ファイル §裁定の記録 に詳細転記あり
