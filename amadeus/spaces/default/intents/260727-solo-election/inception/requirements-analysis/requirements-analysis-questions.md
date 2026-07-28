# Requirements Analysis — 質問ファイル (260727-solo-election)

モード: Grill me(2026-07-27 ユーザー選択)。grilling-protocol.md 準拠 — 質問は提示直前に動的追記、回答は受領直後に書き戻し。

質問の導出元(上流入力の実参照): 上流全数 = intent-statement.md(裁定 Q1-Q6)、scope-document.md(S-01)、business-overview.md(フレームワーク文脈 — 質問の新規論点なしを確認)、architecture.md(選挙サブシステム現在節)、code-structure.md(選挙5ファイル配置 — 変更面の特定)、team-practices.md(変更なし評価 — ノルム改定は M-05 実装スコープの線引き)。個別導出: Q1 は raid-log R-05(feasibility から引継ぎ)と architecture.md 現在節の transport 指令返却設計、Q2 は re-scans/260727-solo-election.md のストア実測(voter 名は election.json の voters 配列で自由文字列)と intent-statement.md の監査要件、Q3 は scope-document.md S-01 と intent-statement.md の spawn 不能ハーネス前提から導出した。

## Q1. 追加議論(GoA 5)後の再投票 — subagent は同一個体の resume か、新規 fresh spawn か?

背景: チームモードの追加議論ラウンドは同一メンバーが議論を経て再投票する(文脈の継続が議論の意味)。ソロ subagent では (a) resume は元個体の文脈(自票・根拠)を保持し「議論を踏まえた再考」に近いが、fresh 性を失う (b) 新規 spawn は独立性最大だが「議論」の意味論が消え、初回投票の再演になる。CLI の amend ballot は同一 voter 名からの再提出を前提とする(resolveBallots が voter 単位で最新票を採用)。

- A. 同一個体を resume — 議論の意味論を保存(チームモードと対称)。resume メッセージには追加議論の論点(相手票の留保・rationale)を verbatim で渡す
- B. 新規 fresh spawn(同一 voter 名を引き継いで amend 提出)— 独立性優先、議論は blind view への論点追記で代替
- X. Other (please specify)

[Answer]: A. 同一個体 resume — 議論の意味論を保存(チームモードと対称)。resume メッセージに相手票の留保・rationale を verbatim で渡す(2026-07-27、Grill me)

## Q2. subagent 投票者の識別子規約 — voter 名の様式は?

背景: election.json の voters 配列は自由文字列(ストア実測: member 名 e1〜e6 等)。ソロ選挙の voter 名は (a) 票の実行主体が事後追跡できること (b) member 名と衝突・混同しないこと (c) 選挙間で機械的に扱えることが要件。ballot には voterKind: "subagent" が別途記録されるため、名前自体に kind を重複符号化する必要は必須ではない。

- A. `s1` / `s2` の固定短名 — 最小・機械的。選挙ディレクトリで一意、voterKind が種別を担保
- B. `subagent-1` / `subagent-2` — 自己記述的で record 可読性が高い
- C. `<election-id>-s1` 形 — 選挙跨ぎでも全域一意(ただし冗長、CLI は選挙内一意で十分)
- X. Other (please specify)

[Answer]: B. `subagent-1` / `subagent-2` — 自己記述的で record 可読性優先(2026-07-27、Grill me)

## Q3. spawn 不能環境での降格告知の様式と、SKILL.md の t242 契約の扱い

背景: (i) Agent tool の無いハーネス/セッションでは自動発動3類型をどう扱うか — 現行挙動(ユーザーエスカレーション)への降格を「無音でなく loud に」告知する必要がある(S-01)。 (ii) RE 実測により SKILL.md の H2 4節は t242 BR-K3 の toEqual で機械固定されており、ソロ手順の記述は「既存4節への内挿」か「t242 契約の改訂(節追加を許す)」の裁定が要る。

- A. 内挿+1行告知 — ソロ手順は既存4節(起動/転送/人間委譲)へ内挿し t242 契約は不変。降格は選挙発動時に stderr/会話へ1行(「spawn 不能のためユーザー裁定へ降格」)
- B. t242 改訂+専用節 — SKILL.md に「ソロ輸送」節を追加し t242 の REQUIRED_SECTIONS を5節へ改訂(契約変更を伴うが手順の可読性最大)
- X. Other (please specify)

[Answer]: A. 内挿+1行告知 — ソロ手順は既存4節へ内挿し t242 契約不変。降格は発動時に loud な1行告知(2026-07-27、Grill me)

## 裁定の記録

- 全3問をユーザー本人が Grill me モードで裁定(ソロモード・選挙不要: ユーザー直接回答)。Q1=A(同一個体 resume) / Q2=B(subagent-1/2) / Q3=A(内挿+1行告知)
- ユーザー承認: 2026-07-27T14:18:02Z

## Q4(レビュー起点、ユーザーエスカレーション). FR-05 の適用キー — ソロ限定か2体全般か

§12a iteration 1 Critical C-1(FR-05 の輸送非依存キーが W-04 と無申告矛盾)を受け、AskUserQuestion で明示エスカレーション。ユーザー回答: 「あ、そうなんだ。仕様バグを見つけたという話ですよね?であれば、次いでに矛盾がないように修正したほうがいいかも」= 2体全般へ拡張(W-04 正式改訂の承認)。

[Answer]: 2体全般へ拡張 — team 2体の現行 tally 挙動はチームモード偶数設計と矛盾する仕様バグとして、本 intent で併せて修正。W-04 は本裁定を引用して改訂(2026-07-27、レビューエスカレーション)

- ユーザー承認: 2026-07-27T14:28:11Z
