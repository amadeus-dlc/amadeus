# Decisions (ADRs) — 260820-fmc-drift-batch

上流入力: `requirements.md`(FR + §12a FOLLOW-UP)、codekb `architecture.md` / `component-inventory.md`(現行機構)。`stories` / `team-practices` は不在(設計どおり)。各 ADR の裁定 provenance は `application-design-questions.md`(AD Q1〜Q3、AUTO_DECIDED)。

## ADR-1: AUTHORING_ROUTES の正本は新設 leaf モジュール、両者が import(AD Q1=C 改訂裁定 auto-decision-c056d2fd631a02129620618b46eda672 — 実測により初回 A を撤回)

- **Context**: 同一定数が2箇所で定義され(cg2-agreeing-predicate-drift クラス)、1定義集約の実施者が unit ownership と交差する疑いを RA §12a MAJOR-1 が指摘。XR-260820-2289 refinement 5 は「route 依存化時に両方を棚卸し」を要求。**import グラフの実測**(2026-08-20、observed 断面): `git grep -n -F "tla-applicability" -- plugins/formal-model-check/tools/tla-registration.ts` → 2 hit(`:18` runtime import `verifyHumanApproval`、`:19` type import)/ exit 0。逆方向 `git grep -n -F "tla-registration" -- plugins/formal-model-check/tools/tla-applicability.ts` → 0 hit / exit 1(対照 `amadeus-formal-verif-model-map` 1 hit で述語健全)。**registration → applicability の依存が既在**のため、当初採択の A 案(registration 正本 + applicability が import)は循環 import を作り不成立。
- **Decision**: 定義だけを持つ leaf モジュール `plugins/formal-model-check/tools/authoring-routes.ts`(仮名 — FD で確定)を新設して正本とし、両ファイルが import する。作業分担: leaf 新設 + `tla-registration.ts:87` の import 置換 = revise-model-commit unit(新規ファイル + 自己所有ファイル)、`tla-applicability.ts:302` の import 置換 = applicability-arms unit(自己所有ファイル、直列末端)。leaf は他 import を持たないため循環は構造的に不可能。初回裁定が C へ付けた P5 反対(「2ファイル間の共有は export/import で足りる」)は、実測された既在の逆方向依存により直接 export/import が循環で成立しないことが確定した時点で解消 — leaf は P5 を満たす最小の成立形である。また FR-REG-5 の担当 unit 記述(requirements.md — 集約は applicability-arms が実施)は RA §12a FOLLOW-UP MAJOR-1 の差戻しにより本 ADR が改訂する: 集約は2 unit へ分割し、revise-model-commit の write scope に leaf 新規ファイルを追加する(申告済みの設計改訂であり無申告の逸脱ではない)。
- **Consequences**: ownership 交差ゼロ(reg unit の書込 = leaf + registration、arms unit の書込 = applicability)。C2 → C1 の順序依存辺は維持(leaf は C2 が作るため、C1 の import 切替は C2 着地後)。両 unit の受け入れ基準に census(`git grep -n -F 'AUTHORING_ROUTES' -- plugins/formal-model-check/tools/` — 是正後の期待 = 5 hit: 定義1[leaf] + import 2[registration/applicability 各1] + 消費2。現行実測は 4 hit = 定義2 + 消費2 [codekb architecture.md:6190])を置いて機械検出。
- **Alternatives Rejected**: (A) registration 正本 — 実測済みの registration→applicability 既在依存と衝突し循環を作る(本 ADR の Context に実測述語)。(B) applicability 正本 — 方向は循環しないが、export が直列末端 unit(arms)の着地まで存在せず、先行する reg unit が import できない(実装順序と矛盾)。
- **Reversibility**: 高(leaf の吸収・移設は後から可能)。
- **セキュリティ/コンプライアンス影響**: なし(NFR-3 の判定どおり適用可能な数値 NFR・セキュリティ要件は宣言されていない。認可・入力検証面に非接触)。

## ADR-2: 実装境界は model-map モジュールから export し loader が import(AD Q2=A)

- **Context**: 境界述語が validator(`IMPLEMENTATION_PATHS`)/ loader(`implementationRoot` ハードコード)/ sensor glob の3面に複製され、validator/loader は 2026-08-11 から不整合(休眠バグ)。XR-260820-2929 は3面同時是正を要求。
- **Decision**: `amadeus-formal-verif-model-map.ts` の `IMPLEMENTATION_PATHS` + containment 判定を export して単一正本にし、loader はそれを import(既存依存方向のまま)。sensor glob は手書き維持 + drift テストで境界定義・登録 entries との整合を fail-closed 検査(RA Q3=A)。
- **Consequences**: validator/loader の不整合が構造的に消滅。境界変更は今後1箇所。sensor glob は宣言面として残るが drift テストが乖離を止める。
- **Alternatives Rejected**: (B) 境界専用小モジュール新設 — 現時点で coverage 母集団膨張の実測がなく過剰(膨張が実測されたら切替 — 判断は observed 数値)。(個別拡張 / manifest 生成物化は RA Q3 で棄却済み)
- **Reversibility**: 中(export 面が公開契約化するが、消費者は plugin 内2箇所のみ)。
- **セキュリティ/コンプライアンス影響**: なし(NFR-3 判定を引用 — 境界拡大は governed 検査の対象を増やす方向で、権限面の変更なし)。

## ADR-3: 2本の腕は判定 pipeline 内の段として統合(AD Q3=A)

- **Context**: #3186 の腕をどこに置くか。FR-ARM-7 は「既存の分類クラス・強制規則は変更せず発火述語のみ追加」と定め、receipt 契約(#3262)は判定 pipeline 終端に既在。
- **Decision**: `tla-applicability.ts` の terminal route 確定直前に armCheck(vocabularyDrift / defectRecurrence)+ coverageCheck 段を挿入。腕は登録済み全モデルに適用する一般形(FR-ARM-4 — 特定モデルのハードコード禁止)。新 CLI・新 sensor・新プロセスなし。検出時は revise-model 強制評価へ接続し、既存 route 語彙・receipt 契約を再利用。stage 契約(`stages/tla-authoring.md`)への発火述語の明文追加と FR-ARM-6 の整合明記も本決定の一部(C1 所有面)。
- **Consequences**: 配線面(plugin.json tools 宣言、t3078、spawn)が増えない。判定 pipeline の実行時間が微増(NFR-3: 数値 NFR 未宣言のため専用検査は作らない)。腕のテストは判定器の既存テストシームに乗る。
- **Alternatives Rejected**: (B) 独立 CLI — 配線・台帳(t3078/coverage)コストが増え、判定との2段呼出は receipt の二重化を招く。(C) sensor 実装 — advisory 止まりで「強制」契約を満たさない。
- **Reversibility**: 高(段の抽出は後から可能)。
- **セキュリティ/コンプライアンス影響**: なし(NFR-3 判定を引用。GitHub への実行時照会を行わない設計 [RA Q4=A] が情報流出面を閉じている)。

## 再利用棚卸し(reuse inventory — inception 規則)

新規機構ゼロで構成: 交差判定(#3261)・receipt(#3262)・provenance(#3263)・model-map vocabulary・issue-evidence 読取(#3181)・既存テストランナー/CI ジョブ/coverage ゲート/センサー発火(PostToolUse)をすべて再利用。新設は armCheck/coverageCheck 段・route 引数・export 2件・drift テスト1本のみ。adapter・登録スロットの先行着地なし(実装+配線が同一 intent 内で揃う)。

## 規模サマリ(数値、components.md の per-unit 見積の合算)

実装 +520〜750 / 削除 −300〜400 / テスト +900〜1200(削除・更新別途。t481/t527・RFC 面は components.md C4 の注記どおり未計上)。`ideation/scope-definition/intent-backlog.md` の PU 見積(FD 必須要素込み較正)と整合。
