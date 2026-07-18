# Requirements — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md, scope-document.md, business-overview.md, architecture.md, code-structure.md, team-practices.md

## Intent 分析

intent-statement.md の Problem Statement のとおり、dogfooding 運用中に実測された2欠陥の fix バッチである。目標は機能追加ではなく**既文書化仕様への回復**(バグ修正 — 仕様変更エスカレーション非該当):

1. **#1170(P2/S3)**: 並行セッションの sync-statusline hook 経由 `set-status` が、古い TaskUpdate スナップショットで共有 `amadeus-state.md` を巻き戻す。RE(re-scans/260717-state-mirror-fixes.md)で機序確定 — `handleSetStatus`(amadeus-utility.ts:3666-3690)は withAuditLock ドメイン外の唯一の非エンジン state ライターで、無ロック read-modify-write+audit 非 emit のため「audit 健全・state のみ乖離」という症状形状になる(architecture.md の state 書込アーキテクチャ= engine RMW は全て withAuditLock 保護、と非対称)
2. **#1172(P3/S4)**: `countStageProgress`(scripts/amadeus-mirror.ts:87-105)が checkbox `[S]`(実コーパス0件の jump marker)のみを分母除外し、scope-SKIP の実様式 `- [ ] <stage> — SKIP`(717件実測)を混入させ 18/32 を表示(期待 18/18。現 HEAD では #1170 の巻き戻りによりさらに 17/32 — 前提 A-3 参照)

対象顧客・成功指標は intent-statement.md の裁定(Q2=A/Q3=A)を継承する。business-overview.md の品質契約(audit-first、ユーザー可視契約のテストカバー)に整合させる。

## 機能要件

### FR-1: set-status の後退書き込み抑止(#1170)

- **FR-1a(不変条件)**: `set-status` 経路は、Stage Progress checkbox が `[x]`(completed)または `[?]`(awaiting-approval)のステージを `[-]`(in-progress)へ戻さない。また `Current Stage` を、checkbox `[x]` のステージへ変更しない。
- **FR-1b(前進系の非抑止)**: 未着手(`[ ]`)ステージの in-progress 化、および `Current Stage` の前進方向更新は従来どおり成功する(両側実測 — feasibility raid-log R1 の緩和を継承)。
- **FR-1c(検出時挙動)**: 後退を検出した場合、`set-status` は state を一切書かず(書き込み全体を no-op)、stderr へ advisory 1行を出力し exit 0 で終了する(E-SMF-RA Q1=A 裁定、2026-07-17T23:27:53Z 開票 3/3。根拠: 書込全成分が単一 `--stage` 引数から導出されるため部分書込に有効な部分集合が存在せず、hook 高頻度経路で exit 1 はノイズ過大。stdout-directive-stderr-advisory 準拠、half-write を作らない)。
- **FR-1d(判定元と順序)**: 後退判定は state 現在値との比較で行う(E-SMF-RA Q2=A 裁定、同開票 3/3)。**順序要件(裁定留保の転記 — 必須)**: 比較は lock 取得後に再 read した現在値に対して行う — `lock → read → compare → write` の順とし、withAuditLock 参加+ロック内再 read スナップショット比較により TOCTOU をロック保持者間で閉じる(e4 留保 GoA2、e3 同旨根拠)。エンジン RMW ハンドラの既習様式(amadeus-state.ts:251-266 の C2b)に倣う。
- **FR-1e(適用範囲)**: ガードは `set-status`(hook 経路)にのみ適用し、エンジンの RMW ハンドラ(withAuditLock 保護の advance/approve/reject 等)の挙動は変更しない。エンジン側の正当な後退遷移(reject による `[R]` 化等)を阻害しない。

### FR-2: countStageProgress の SKIP 分母除外(#1172)

- **FR-2a**: 行末サフィックス `— SKIP` を持つステージ行を分母(total)から除外する。既存の checkbox `[S]`(jump-skip)除外は維持する(両条件併用 — scope-document In-Scope 2 の裁定)。
- **FR-2b(テスト可能な期待値)**: intent 260717-mirror-issue-tool の実 state(in-scope 18 全承認)相当の fixture で `{approved: 18, total: 18}` を返す。
- **FR-2c(fixture 実様式)**: unit テストの fixture は「`[S]` かつ `— EXECUTE`」(jump-skip)と「`[ ]` かつ `— SKIP`」(scope-skip)の両様式を含む(intent-capture 持ち越し所見の採用。t232 の捏造 `[S]`+`— SKIP` 形 fixture は実様式へ是正 — format-currency-grep 準拠)。

### FR-3: 260717-mirror-issue-tool record の state 修復

- **FR-3a**: コミット 5a0cd1e6e で固定された乖離(`[x]→[-]` nfr-requirements、`In Progress`、`Active Agent`)を audit(正本)と整合する値へ復元する。復元値は当該 record の audit シャードの GATE_APPROVED / STAGE_COMPLETED 列から導出する(実測転記 — 検証劇場 Forbidden)。
- **FR-3b**: 実施単位(修正 PR 同梱か別コミットか)は設計段で確定する(raid-log R4 の留保を保存)。

### FR-4: リグレッションテスト

- **FR-4a(#1170)**: 後退抑止の両側(後退が抑止される・前進が抑止されない)を実測するテストを追加する。並行競合の再現(set-status ∥ エンジン advance)は t145-state-lock-concurrency の既習様式(CLI 並列 spawn)に倣う。実 FS を使う検証は integration 層へ置く(fs-tests-integration-first)。
- **FR-4b(#1172)**: FR-2b/2c のとおり。単層 unit(純関数 countStageProgress)で足りる。
- **FR-4c(落ちる実証)**: 新設ガードは失敗ケース注入で実際に赤くなることを実証してから完成扱いにする(Mandated。注入は実行時に消費される行へ — inject-runtime-consumed-lines)。

## 非機能要件

- **NFR-1(互換)**: `set-status` の CLI 引数契約(`--stage/--project-dir/--intent/--space`)は不変。後退時 exit 0 のため、既存呼び出し元(sync-statusline hook)の変更は不要が原則 — 変更が必要になった場合は設計段で宣言する。
- **NFR-2(配布同期)**: code-structure.md の正本→生成物フロー(core 中立層/harness 表層境界)に従い、`packages/framework/core/tools/amadeus-utility.ts`(+hook を触る場合は `core/hooks/amadeus-sync-statusline.ts`)が正本。`bun scripts/package.ts` で dist 6ツリー(claude/codex/cursor/kiro/kiro-ide/opencode — 消費側棚卸しで grep 実測)再生成+`bun run promote:self`。`dist:check` / `promote:self:check` を検証列に含める(T2)。
- **NFR-3(Bun-only)**: 新規 runtime dependency を追加しない(T1)。#1172 は repo ローカル scripts のため配布面なし。
- **NFR-4(カバレッジ)**: push 前にローカル lcov で diff 追加行の未カバー 0 を実測(local-lcov-pre-push)。set-status は spawn 経路のため in-process seam(handleSetStatus の argv パラメータ化 export — seam-export-handler-amend 既習)で計測する(T4)。
- **NFR-5(audit 非干渉)**: audit シャードの形式・append-only 性に触れない(T5)。ガードは audit を emit しない現行の set-status 挙動を維持する(emit 追加は機構再設計 — Out of Scope)。

## 制約

- 横断制約 T1-T6(scope-document / constraint-register 継承): Bun-only、正本編集+dist×6/self-install 再生成、in-process seam テスト、落ちる実証、audit 形式非干渉。
- 検証コマンド列: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(project.md Testing Posture。適用プラクティスの写像は team-practices.md「適用プラクティス」節に従う — dist 同期・ロック様式・fixture 実様式・lcov 事前確認)。
- 消費側棚卸し(c4): set-status 文字列の出現面 = canonical(amadeus-utility.ts / amadeus-sync-statusline.ts / stage-protocol.md)+ dist 6ツリー+self-install(.claude/)。countStageProgress = scripts/amadeus-mirror.ts + tests/unit/t232 のみ(配布面なし)。

## 前提

- **A-1**: #1170 の書き手特定(sync-statusline)はユーザー実測(state Last Updated と hooks-health .last の秒単位一致)+RE のコード裏付け(唯一の非エンジンライター)で確定度: 高。
- **A-2**: set-status 同士の相互上書き(両者とも前進方向)の意味的裁定(どちらの stage 表示が勝つべきか)は症状(audit と乖離する巻き戻り)の範囲外であり、本 intent では扱わない(Out of Scope の一般機構化に属す)。ただし FR-1d の lock 参加により書き込み自体は直列化されるため、lost-update としての相互上書きは構造的に解消される(裁定留保の副次効果 — 意味的裁定の不在は残る)。
- **A-3**: 現 HEAD で countStageProgress の approved=17 となる件は #1170 の巻き戻り由来(FR-3 の修復で 18 へ回復し、FR-2 の検証は修復後 state で 18/18 を実測する — scope-document の順序制約)。

## Out of Scope

scope-document.md の Out of Scope を継承: state 書き込み機構全体の再設計・単調性検査の一般機構化(TOCTOU 残余含む)/ amadeus-mirror の機能拡張 / 他 open Issue の同乗 / (Ideation park 条項は 2026-07-17 のユーザー決定「残りフェーズ続行」で解除済み — Construction 進入済みの前提で本ステージを実施)。

## Open Questions(後続ステージへの申し送り)

- ガードの設置位置(handleSetStatus 側 / setCheckbox 側 / 両方)— application-design で確定(scope 留保の保存)。
- FR-3 の実施単位(PR 同梱 / 別コミット)— 設計段で確定(R4)。
- sync-statusline hook 側の変更要否(set-status の no-op 化で hook 無変更が原則だが、advisory の取り扱いで変更が必要になる場合は設計で宣言)。
- 後退 no-op イベントの運用可視性(hook は非ゼロ exit のみ recordHookDrop するため、exit 0 の no-op は --doctor 等の既存観測経路に現れない)は本 intent のスコープ外 — 必要が顕在化したら将来 Issue 化(Out of Scope の一般機構化に属す。reviewer Minor 4 の明示化)。
