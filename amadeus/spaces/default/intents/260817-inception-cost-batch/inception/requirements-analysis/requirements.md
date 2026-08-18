# Requirements — インセプション固定費バッチ(#3181 + #2415)

## Intent 分析

上流入力 `ideation/intent-capture/intent-statement.md` が確定したとおり、本 intent の目的は self-fix 系ワークフローのインセプション固定費の構造的解消である: (1) クロスレビュー済み Issue エビデンスを RE/RA の第一級上流入力にして再導出をなくす(#3181)、(2) RE 差分リフレッシュ入力から codekb に寄与しない工程排出物を除外して自己増幅ループを断つ(#2415)。ユーザーは機能追加ではなく**時間の回収**を求めている — 成功はコード量ではなく、後続 intent の RE+RA active 時間の低下で測る。

事業文脈は codekb `business-overview.md` の記すとおり、Amadeus は AI-DLC ワークフローエンジン自体を成果物とするフレームワークであり、本変更はその開発ループ(ドッグフーディング)の固定費を下げる。現行機構の実測は本 intent の RE 差分スキャン記録(`codekb/amadeus/re-scans/260817-inception-cost-batch.md`、以下「scan record」)に確定済みで、`architecture.md`(ステージ契約と engine の compile 機構)・`code-structure.md`(stage 契約とテストの配置)が参照面を与える。

要件の一次資料: Issue [#3181](https://github.com/amadeus-dlc/amadeus/issues/3181)(クロスレビュー xrev-3181-20260817 ×2 CONFIRMED_WITH_REFINEMENTS)、Issue [#2415](https://github.com/amadeus-dlc/amadeus/issues/2415)(xrev-2415-20260818、収束 ESTABLISHED_WITH_REFINEMENTS)。#2415 の refinements(243,716 の内部不整合訂正、elections ストアの排出物クラス追加、「codekb 一切非寄与」前提への反例2件、pathspec 罠)は本書へ反映済みであり、再導出しない。

## 機能要件

### FR-EVD: Issue エビデンス上流入力(#3181)

- **FR-EVD-1**: issue-first の self-fix / self-feature intent で、起票 Issue 本文と独立2名クロスレビューコメントが record 内の一次入力成果物として取り込まれること。AC: 当該 intent の record に取り込み成果物が実在し、requirements.md の引用がそこへ解決する(第三者確認可能 — #3181 完了条件1)。
- **FR-EVD-2**: 取り込み成果物は stage graph の第一級 artifact kind として宣言されること — 産出 stage の `produces:` に載る。根拠: consume-only artifact は compile の hard error(scan record §3: `amadeus-graph.ts:1192-1204`、producersOf 制約)。AC: `amadeus-graph.ts artifacts` に producer 付きで列挙され、`/amadeus --doctor` が green。
- **FR-EVD-3**: requirements-analysis の stage 契約(`packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md`)の `consumes:` に issue-evidence 系 artifact が追加され、本文に「クロスレビューで確定済みの機序・file:line・受け入れ基準は再導出せず消費する」が明文化されること(#3181 完了条件2、`cid:requirements-analysis:c5` と整合)。AC: frontmatter と本文の grep で機械確認。
- **FR-EVD-4**: reverse-engineering の stage 契約にも issue-evidence の消費が明文化され、RE の Focus 宣言が Issue エビデンスから導出できること。AC: 契約本文の grep。現行 RE は `consumes: []`(scan record §3、契約 :20)。
- **FR-EVD-5**: 取り込みは既存 `amadeus-github-gateway.ts` の read 面(`viewArgv` / `parseIssueObject` / `readiness`)を再利用し、gh 不在・未認証・API 失敗は当該取り込みを loud fail としてワークフローは継続すること(gh-scripts-boundary / mirror fail-open ノルム)。AC: readiness 失敗時に取り込み不成立が可視記録され、後続ステージは Request 自由文 fallback で進行する。
- **FR-EVD-6**: 取り込み成果物に構造化 provenance(Issue 番号・コメント URL・target SHA・review-run-id・取得時刻)が記録されること。AC: 成果物のメタデータ節を fixture で検査。
- **FR-EVD-7**: RA の upstream-coverage 引用義務が issue-evidence にも及ぶこと(consumes 追加は引用義務の追加 — scan record §3 の sensor 実測)。AC: 引用欠落 fixture で upstream-coverage が FAILED になる。
- **FR-EVD-8**: 取り込みに検査・ゲートを新設する場合、落ちる実証(欠落 fixture で FAILED → revert)を伴うこと(#3181 完了条件3、team.md Mandated)。

### FR-EXC: RE 差分入力の除外規定(#2415)

- **FR-EXC-1**: RE の差分区間から codekb に寄与しないワークフロー排出物パスを除外する規定が、stage 契約のスキャン入力面(Step 2 の走査対象定義、現行 :104-112)に置かれること。除外の第一候補は `amadeus/spaces/*/intents/`。除外集合の最終範囲(intents 単独 / intents+elections+codekb の3面)は application-design の裁定事項とし、本要件は方向のみ固定する(クロスレビュー r2 勧告)。
- **FR-EXC-2**: 除外述語は `amadeus/spaces/` 配下の build 関連台帳(`specs/tla/model-map.json`、`specs/tla-evidence/`)を除外しないこと — blanket `amadeus/spaces/**` は不可(scan record §1 の実測: 当該2ファイルは bt-ledger-resync クラス)。AC: 述語を specs/tla パスへ適用し非除外を実測。
- **FR-EXC-3**: 除外が codekb 鮮度を落とさない根拠が成果物に明示されること。ただし「工程記録は codekb 9成果物のいずれにも寄与しない」には反例2件(`architecture.md` が他 intent 成果物を verbatim 引用 — xrev r1 実測)があるため、設計 provenance 引用の扱い(失う/別経路で残す)を application-design で明示裁定すること。無申告の退行としないこと。
- **FR-EXC-4**: 除外適用後の intent で、RE 差分入力の縮小率と RE 系 subagent 実時間(baseline 83.2 分/4 intent)の再測値が記録されること(#2415 完了条件2)。数値下限は課さない。代わりに帰属検査を AC とする: 除外された行の全てが宣言済み除外クラスへ帰属し、未帰属の除外がゼロであることを述語で検査(梯子裁定 Q2=A、`auto-decision-027632c7887ca3f395eb5b0bba17fab0`)。
- **FR-EXC-5**: 除外述語の pathspec 実装は `:(glob)` マジックまたは実スペース名を使うこと — 素の `amadeus/spaces/*/intents/` は git pathspec として 0 件無音マッチ(xrev r2 実測)。AC: 既知の非ゼロ区間へ述語を当てて正の件数が返ることを先に実測してから使用する。
- **FR-EXC-6**: 除外規定を機械検査・ゲート化する場合、落ちる実証を伴うこと(FR-EVD-8 と同一様式)。現状、差分を計算・フィルタするコードは存在しない(scan record §3: path 解決のみ)ため、機械化は新設になる。

### FR-MEAS: 効果測定(両 Issue 共通)

- **FR-MEAS-1**: #3181 の効果測定は、導入後の issue-first self-fix 5 intent(N=5)で RE+RA active 中央値を baseline と同一手法(audit の STAGE_STARTED→STAGE_COMPLETED ペアリング、連続イベント間隔 900 秒キャップ、park 控除)で再実測し、**中央値 35 分未満**(観測レンジ 24〜73 分の内側、baseline 47 分比 −25%)を目標とすること(梯子裁定 Q1=A、`auto-decision-c07be782efbca26ddd74f925eb78aede`)。
- **FR-MEAS-2**: すべての測定値は測定 ref(tree/SHA)と集計コマンドを併記すること(team.md 検証・実測規律)。本 intent 内では baseline の固定(47 分/intent、測定 ref = record ツリー HEAD 215855ea7、Issue #3181 記載の述語)までを成果物化し、N=5 の再測は後続 intent の実測で確定する。

## 非機能要件

- **NFR-1**: 後方互換レイヤー・移行シム・二重実装を追加しない。stage 契約の旧挙動(除外なし・Request 自由文のみ)は置き換える(org.md Forbidden)。
- **NFR-2**: 利用者側 Bun-only 前提を維持し、新規 runtime dependency を追加しない(project.md Forbidden)。
- **NFR-3**: 正本は `packages/framework/core/` を編集し、`bun run build` で全ハーネス dist・self-install 面を再生成、隔離2回ビルド再現性・source-only 境界・グラフ不変量検査を通すこと(project.md Mandated)。
- **NFR-4**: 実行可能な振る舞いの追加・変更は TDD 既定(合意済み seam へ失敗テスト → Red 実測 → 最小実装 Green)。契約 markdown のみの変更は適用外だが、前後 Green・drift check を行う(team.md Testing Posture)。

## 制約

- 2 Issue = 2 Unit(1 Issue = 1 Unit 原則)。units-generation / delivery-planning を EXECUTE する(engine-singleton 制約 `cid:code-generation:oq-singleton`)。
- 両 Unit は同一ファイル群(`reverse-engineering.md` / `requirements-analysis.md` / ノルム面)に触れる可能性があり、delivery-planning で共有ファイル競合の直列化を計画すること。
- self-feature スコープにつき最初の Construction Bolt に walking-skeleton gate を維持する(project.md Mandated)。
- PR は Bolt ごと・スカッシュマージ・merge queue 経由(org.md / CI ノルム)。

## 前提

- gh CLI は optional dependency(不在・未認証でもワークフローは停止しない — FR-EVD-5 の fail 挙動が吸収する)。
- 効果測定の完了(N=5 再測)は本 intent のスコープ外の後続実測であり、本 intent は測定手法・baseline・目標値の固定と測定可能な機構の導入までを担う。
- Issue #2415 本文の数値訂正(243,716 → 318,811 等)は本書とクロスレビューコメントが正とする。Issue 本文自体の改訂は任意の後続作業であり本 intent の AC に含めない。

## スコープ外

- RE / RA ステージの SKIP 化・軽量 scope 新設(`amadeus-self-fix.md` の evidence-mined 既決の再議になるため — #3181 代替案1)。
- codekb 更新の intent からの切り離し(#2415 代替案2 — 有力だが骨格変更であり別 intent)。
- `Always rerun for freshness` 鮮度契約そのものの変更(#2415 は入力面のみ)。
- チームモード関連ノルムの変更。

## 未解決事項(後続ステージへ)

- #3181 の実装形3案(record への artifact 化 / consumes 拡張の形 / CLI fetch)と #2415 の除外集合3面(intents / +elections / +codekb)は application-design で裁定(Issue 本文の明示規定)。
- FR-EXC-3 の設計 provenance 引用の扱いは application-design で裁定。
- functional-design を jump するかは application-design ゲート時点で判断(walking-skeleton アンカー制約の適応、intent-capture diary 記録済み)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-17T23:11:56Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md covers all 7 mandated sections with 16 testable FRs in the Standard band, cites 4 of 6 declared upstream artifacts substantively, and correctly defers implementation-form decisions to application-design; no blocking defects found, but citation precision and upstream-coverage completeness warrant follow-up.

### Findings

- FOLLOW-UP | requirements.md FR-EVD-2 cites amadeus-graph.ts:1192-1204 for the 'consume-only artifact is a compile hard error' claim, but codekb architecture.md section 6b and code-structure.md section 260817-B both cite the same fact at :1192-1198 (with :1200-1206 separately for the strict-mode escalation) - requirements.md's combined range does not match either citation precisely; recommend correcting to :1192-1198 or explicitly noting the two distinct sub-ranges.
- FOLLOW-UP | requirements.md's Intent analysis / functional-requirements sections cite only 4 of the 6 artifacts declared in requirements-analysis.md's own consumes: frontmatter (:14-29) - 'scope-document' (:17) and 'team-practices' (:28) are never referenced in prose. architecture.md section 6b independently flags that the stage file's upstream-coverage parenthetical at :185 lists only 3 artifacts and is itself stale/unsynced; if the sensor instead reads the full consumes frontmatter dynamically, the missing citations risk SENSOR_FAILED. Recommend either citing these two artifacts (if they exist for this intent) or adding an explicit Assumptions/Open-questions note that they don't apply (intent-statement.md already signals no scope-document was created - 'temp scope: not created').
- FOLLOW-UP | FR-EVD-8 and FR-EXC-6 (also FR-MEAS-1/FR-MEAS-2) embed a testable criterion in prose but omit the explicit 'AC:' tag used consistently by FR-EVD-1 through 7 and FR-EXC-1 through 5, creating formatting inconsistency against the Step 10 contract phrase 'FRs with acceptance criteria'. Content is substantively testable either way; recommend standardizing the tag for downstream consistency.
- FOLLOW-UP | FR-EXC-3's claim of 'two counterexamples (architecture.md verbatim-quoting other intents' artifacts - xrev r1 measurement)' does not specify what the two distinct counterexample instances actually are, only naming one source file; since this seeds a material application-design decision (whether design-provenance citations survive the RE input exclusion), recommend naming both instances explicitly for traceability.
- NIT | FR-EXC-5 prescribes a specific git pathspec implementation detail (':(glob)' magic or literal space names) rather than staying at requirement level; justified by measured evidence of a known 0-hit silent-match pitfall, so acceptable as a 'must not repeat known mistake' constraint rather than a premature design commitment.
