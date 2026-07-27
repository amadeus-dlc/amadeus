# Decisions (ADR) — solo-election

上流入力(consumes 全数): requirements.md(FR-05/07/11)、components.md、component-methods.md、architecture.md(現行 hold 語彙の実測)、component-inventory.md(tie/block の解決語彙の所在 — ADR-1 棄却理由の根拠)、team-practices.md(ADR-3 の t242 契約不変判断が practices 変更なし評価と整合することの確認)。

## ADR-1: split hold は新 HoldReason として追加する

- **Context**: FR-05(iii) の賛成1・反対1は現行 tally では established になる。hold で表現する語彙が必要。
- **Decision**: `HoldReason` に `"split"` を追加し、解決語彙は block と同型(adopted/rejected/reopen)。
- **Consequences**: 状態機械の結果値が1増える。波及先(レビュー独立再列挙で確定): (a) FormalElection.tla の意味論拡張(Voters 2体インスタンス・HoldReasons "SPLIT"・HoldReason(r) 2体分岐)— **model-map.json のハッシュ再発行だけでは形式検証は何も検証しない**(model-completeness センサーはドリフト検査のみ)。tally spec 変更につき two-layer-verification-posture(Mandated)の TLC 完全探索を build-and-test 段で発動する (b) HOLD_RESOLUTIONS への split キー(型検査が強制) (c) t234 の2体 DEF fixture 既存アサーション書き換え。render/verify は reason 非依存で変更不要(components.md 実測)。意味論が正直で record 上も読める。セキュリティ/コンプライアンス影響なし(新規外部入力なし)。
- **Alternatives Rejected**: (a) `tie` への相乗り — tie の解決は choice:<n>(勝者選択)で、スプリットの「採用/棄却/再審」意味論と不一致。既存 tie 消費者の挙動も汚染する。 (b) `block` への相乗り — block は GoA 8 の反証可能根拠必須という別契約を持ち、混用は監査の意味を壊す。

## ADR-2: 2体規則のキーは宣言 voters 数(輸送非依存)

- **Context**: §12a iteration 1 C-1 → ユーザーエスカレーション → W-04 改訂裁定(2026-07-27T14:28:11Z、仕様バグ修正として2体全般適用)。
- **Decision**: `election.voters.length === 2` で分岐(resolved 票数でも voterKind でもない)。
- **Consequences**: member 2体選挙も同一規則(偶数設計と一貫)。3体以上は FR-06 で不変固定。
- **Alternatives Rejected**: (a) 全票 voterKind=subagent キー — W-04 改訂裁定と矛盾(team 2体の仕様バグを残す)。 (b) resolved 票数キー — 棄権や未着で実効票数が変わると規則が動的に切り替わり、同一選挙内で判定が揺れる(parse-don't-validate に反する動的解釈)。

## ADR-3: ソロ手順は SKILL 内挿+規則本体は TS(t242 契約不変)

- **Context**: Q3=A 裁定。t242 が H2 4節・禁止語彙・人間委譲文言を機械固定。
- **Decision**: 手順(spawn テンプレ・同期完遂・再spawn・降格告知)は既存4節へ内挿し、集計・状態遷移の規則は一切 SKILL に書かない(C-02)。
- **Consequences**: t242 green のまま。SKILL の可読性はやや下がる(節が長くなる)が契約変更ゼロ。
- **Alternatives Rejected**: t242 REQUIRED_SECTIONS の5節化 — 契約変更+全 SKILL 投影面の再検証コストに対し、内挿で十分な情報量が確認できたため(Q3 裁定)。

## ADR-4: 再議論の再投票は同一個体 resume(Q1=A 裁定の設計固定)

- **Context**: Q1=A。amend ballot は同一 voter 名前提(resolveBallots)。
- **Decision**: discussed 解決後、conductor は各 subagent を resume し、相手票の留保・rationale を verbatim で渡す。resume 不能(セッション喪失等)の場合のみ新規 spawn で同一 voter 名を引き継ぎ、その旨を record に残す(降格の loud 化)。
- **Consequences**: 議論の意味論保存。resume 実装はハーネス機能(SendMessage/Agent 再開)に依存 — spawn 不能系と同じ降格経路を持つ。
- **Alternatives Rejected**: 常に新規 spawn — 議論が初回投票の再演になり discussion-needed の意味を空洞化(Q1 裁定で棄却済み)。
