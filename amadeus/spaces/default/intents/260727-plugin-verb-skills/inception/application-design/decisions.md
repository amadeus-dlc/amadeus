# Decisions(ADR)— 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(FR-4 の観測可能契約と D3 委譲)、architecture.md(runner-gen/graph/t129 の実測)、component-inventory.md(既存資産)、team-practices.md(count-free・正本同期)

## ADR-1: #1598 の実現方式 — runner-gen の plugin 対応拡張+plugin CLI からの spawn 起動

**Context**: compose 済み plugin stage に `/amadeus-<slug>` runner が生成されない(#1598)。機序 = runner-gen は stage-graph.json を読むが、生成はリポジトリ開発フローでしか起動されず、GraphStage に plugin 識別子もない(RE 実測: isRunnableStage:88-90 は phase のみ判定、t129:203-209 は 29/3 の硬い数値)。runner-gen は全7ホストへ出荷済み(git ls-files 実測)。

**Decision**: (a) runner-gen を plugin 対応に拡張する — plugin stage の識別は **compile 時に GraphStage へ焼く判別フィールド(例 `plugin_source: true`。名称は実装時確定)を確定主案**とする。graph 側変更が過大な場合の縮退先は **composition record(`.amadeus-plugin-composition.json` の `CompositionRecord.ownedPaths` — amadeus-plugin-compose.ts:557,706,1079、`plugins/<name>/stages/<slug>.md` 形の実パス一覧)由来の slug 識別**とし、縮退時は申告する (b) plugin CLI の handleCompose/handleDrop が spawnRecompile 成功後に `amadeus-runner-gen.ts write` を spawn する(既存 spawn と同型・同順。drop 側も同一配線 — write の再生成+prune が plugin runner を除去する) (c) t129 の硬い数値は repo(plugin 不在)で不変のため触らない。plugin 導入ホストの検証は fixture/E2E(FR-4d)で行う。

**Consequences**: runner テンプレートは renderStageRunner の1定義のまま(canonical 1定義原則)。write の再生成は stock runner に対し冪等(同一 graph+同一テンプレート → バイト同一)であることを fixture でピンする。drop 側は再生成で plugin runner が compiled 集合から消え、prune 経路で除去される(compose⇔drop 対称)。

**Alternatives Rejected**:
- A案: plugin CLI が runner をインライン生成(テンプレート複製) — canonical 1定義に反し、テンプレート改修時の二重保守を作るため却下
- B案: runner-gen のノード path 由来判定 — **現状のデータモデルでは実行不能**: GraphStage/StageEntry に path フィールドは残らない(codekb architecture.md:74 の実測、reviewer iteration 1 の独立 grep でも StageEntry ブロックに該当なしを確認)。誤前提の縮退案として初版に記載していたが reviewer 指摘で削除
- C案: 何もしない(runner なし、`--stage <slug> --single` の手打ちのみ) — #1598 のユーザー裁定(同乗・フル実装)に反するため却下

**Security/Compliance**: runner 生成は compose の trust 検証**後**の graph からの導出であり、未検証素材から実行導線を作らない。生成先はホストのスキル面のみ。

## ADR-2: install のコピー冪等化 — 一時領域→rename+内容一致判定(drop との非対称は意図的)

**Context**: FR-1c/1d — 部分失敗の再試行が重複副作用なしに収束し、無音上書きを作らないこと。

**Decision**: コピーは `<staging>/.amadeus-plugin-install-tmp-<name>/` へ書いてから rename で `<staging>/<name>/` へ原子的に置く。既存時は stagingEntryState(absent / identical / different)で分岐(identical 続行・different fail・`--force` 置換)。drop は staging に触れない(composed 面の復元のみ — 既存挙動)。install⇔drop の staging 非対称は**意図的相違**としてここに記録し、docs(FR-5b)へ「staging の除去は利用者操作」と明記する。

**Consequences**: 再試行は (i) tmp 残渣 → 上書き再作成 (ii) rename 済み → identical 続行 → compose 再試行、のどちらでも収束。tmp dot-dir は buildHostSnapshot の `.amadeus-plugin-*` 除外(isEngineDotfile:195-197 実測)により compose の走査から構造的に不可視。

**Alternatives Rejected**:
- 直接コピー(tmp なし) — 途中失敗が「半分だけのプラグイン」を staging に残し、identical 判定を汚染するため却下
- 常時上書き — Q2 裁定 B 相当。無音置換のリスクでユーザー裁定により不採用(2026-07-27T15:47:53Z)

**Security/Compliance**: コピーは信頼判定前の素材配置。シンボリックリンクは追わずファイル実体のみコピー(dangling/悪意 symlink の混入防止 — 実装時に O_NOFOLLOW 系の既存 compose 検証と整合)。

## ADR-3: スキル投影は mirror 行列(全7面)・ハンドラは core 投影

**Context**: 投影範囲の既存パターン競合(mirror 7面 / election 3面)。

**Decision**: Q1 ユーザー裁定 A(2026-07-27T15:47:53Z)に従い全7面。claude は mirrorCoreSkillDirectory 様式、他6面は各 manifest への entry 追加(mirror の投影行列と同一集合を実装時に grep で再列挙して踏襲)。

**Consequences**: dist:check / promote:self:check が7面の drift を固定。**実装時是正(2026-07-28、builder 停止→conductor 裁定)**: claude 等4面の「helper registry(mirrorCoreSkillDirectory)」は Intent Mirror 専用 closed registry(projections.ts:1 verbatim、t285 が形状 pin)由来で plugin スキルには不適 — 配線は election 前例の literal entry(`{src,dst}` / emit.ts 配列の literal 名)×全7面へ確定(権威一次証拠による執行、実質 = 3系統・同一配列への追随は不変)。SKILL.md のハーネス列挙文言は7面を網羅するか導出形にする(FR-3c — mirror :14-17 の5面陳腐化を繰り返さない)。

**Alternatives Rejected**: claude 単独(B)/3面(C) — ユーザー裁定で不採用。plugin CLI が全面に実在する以上、導線の非対称は面ごとの利用体験差を生む。

**Security/Compliance**: スキルは固定 verb 組立てのみ。認証情報・外部送信なし。
