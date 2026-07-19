# Requirements — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

全 FR は decision-log D-01〜D-14(ユーザー直接裁定)と RE scan-notes の実測へ遡及する。委任の境界: U-02(構造化票形式)は本書 FR-3a で**確定済み**であり、真に未決で application-design へ委任するのは **U-01(ツール配置)と U-03(選挙記録ファイルの物理配置)の2点のみ**。

## アーキテクチャ原則(最上位要件)

**FR-0: directive-driven・AI 無知識プロトコル** — 選挙プロトコルの正本は TS(状態機械+型+テスト)であり、AI は選挙手順の知識を持たずに完走できる。ツールは「次にやる1手」を型付き指令で返し(配布せよ/未着 N 名/開票せよ/この persist 文でノルム PR を出せ)、AI は指令の実行と報告のみを行う(amadeus-orchestrate の next/report ループと同型 — architecture.md の指令ループ実証の再適用)。
**受け入れ基準**: 選挙ノルム(team.md の該当 cid 群)を一切参照しない fresh なセッション断面が、SKILL とツール指令のみで選挙1件(起票→配信→収集→開票→記録)を完走できることを e2e で実証する。fresh 断面の構成方法(ノルム import なしの subagent 等)は application-design で具体化する(申し送り)。

## 機能要件

### FR-1: 起票(S-01)
- FR-1a: 選挙定義(種別=明確化/§13/ブロッカー/0件確認、質問文、選択肢、投票者集合、期限方針)を構造データとしてファイル正本に作成する(C-07)
- FR-1b: 選択肢は**内部 No と表示番号を分離**し、投票者ごとに表示順をシャッフルした配布ビューを生成する(#1135 取込)。票は内部 No で記録し、集計は表示順に依存しない
- FR-1c: blind 性 — 配布ビューに推奨マーカー・先行票・他者の回答状況を含めない(C-02)
- 受け入れ: 同一選挙で投票者2名の配布ビューの表示順が決定的シード下で異なりうること、票の内部 No 写像が全シャッフルで恒等に集計されることをテストで固定

### FR-2: 配信(S-02)
- FR-2a: agmsg には「選挙 ID+配布ビューのパス(または内容参照)」の短通知のみを送る(C-07 — verbatim/truncate クラスの構造排除)
- FR-2b: 配信対象・時刻は選挙記録に自動記帳される(手書き転記なし — C-04)
- 受け入れ: (i) 生成される通知 payload が選挙 ID+パス参照のみで構成され、質問文・選択肢テキストを一切含まないことを型とテストで固定(含めた実装は落ちる実証で赤) (ii) 配信記帳が送信実行の結果からのみ生成されること(送信せずに記帳する経路が存在しない)をテストで固定

### FR-3: 投票収集(S-03)
- FR-3a: 構造化票形式 — 必須フィールド: 選挙 ID・投票者・voter 種別(member/subagent — D-12)・選択(内部 No)・GoA(1-8)・留保文(GoA 2/3/6 は必須、それ以外は任意)・根拠自由文
- FR-3b: 不正票(未知の選挙 ID・未知の投票者・範囲外 GoA・GoA 2/3/6 で留保欠落・parse 不能)は受理拒否し、拒否理由を返す(fail-closed)。二重票は最新優先ではなく**拒否**し、訂正は明示の再提出フローで受ける
- FR-3c: 受付台帳 — 投票済み/未着の一覧を随時照会可能(ack 機械化。未着の可視化が催促判断の材料)
- FR-3d: 後着票 — 開票後に着いた票は「後着」として記録に追記され、集計値は別記される(early-tally-with-block-reopen 対応: 後着 GoA 8 は再審要フラグを立てる)
- 受け入れ: 不正票5クラス+二重票の拒否、後着票の記録追記と GoA 8 再審フラグを「落ちる実証」テストで固定

### FR-4: 開票(S-04)
- FR-4a: GoA 集計の決定的計算 — 賛成側 1-3/6、反対側 7-8、棄権 4 は定足数除外、GoA 8 が1票でも成立保留(gradients-of-agreement-scale の写像)
- FR-4b: 開票結果は「成立(採用/不採用)/保留(要人間: タイ・ブロック・定足数不足)」の判別ユニオン。保留理由を型で運ぶ(C-01 — 人間裁定の保存)
- FR-4c: early tally — 未着票があっても賛成側多数が確定した時点で開票可能(開票時点の票集合を記録に固定)
- 受け入れ: 全 GoA 分岐・タイ・ブロック・定足数・early tally・型不正入力(verification-numeric-parse)の網羅テスト

### FR-5: 記録生成(S-05)
- FR-5a: 票タイムライン(配信→各票→開票→後着)・GoA 度数分布行・persist 文素案を票データから自動生成する。GoA 行は `parseGoaLine`(norm-metrics.ts:688)の入力スキーマと byte 互換(C-08 — 蒸留ラウンドの下流を壊さない)
- FR-5b: 開票時に全票を一括ファイル化する(S-07 — blind 解除・監査可能性の回復)。票の根拠自由文も保存する
- 受け入れ: 生成した GoA 行を parseGoaLine が round-trip で parse できることをテストで固定

### FR-6: 照合(S-06)
- FR-6a: 留保必須票(GoA 2/3/6)の件数と persist 文中の転記件数の機械照合(reservation-transcription-count-check の機械化)
- FR-6b: 票数・度数分布・タイムライン単調性の整合検査(自己の生成物への self-check として常時実行+外部文書への検査 CLI)
- 受け入れ: 転記欠落・件数不一致・時系列逆行を注入した「落ちる実証」

### FR-7: 輸送抽象(D-12)
- FR-7a: 投票者インターフェースは輸送抽象 — team モード: agmsg メンバー(leader 宛私秘 — D-09)/ solo モード: spawn したサブエージェント(構造的隔離が blind 性を保証)
- FR-7b: 票・開票・記録の形式は両モード完全共通。voter 種別は記録に必須属性として残り、裁定の重みの解釈は消費側(人間/PM)に委ねる
- 受け入れ: 同一選挙定義を両輸送で流し、記録スキーマが同一であることをテストで固定

### FR-8: SKILL 薄ラップ(S-08)
- FR-8a: `contrib/skills/` 配置(dist 非対象の overlay チャンネル — promote-self.ts:45-46 実測、amadeus-upstream-sync 前例)。SKILL は「ツールの指令ループに従う」薄い記述のみで、選挙手順の知識を SKILL 本文に持たない(FR-0 の系)
- FR-8b: TS 本体の配置(contrib 一体 vs scripts 分離)は application-design で確定(RE Architect 申し送り = U-01)
- 受け入れ: (i) SKILL 本文(SKILL.md)に選挙手順の規則語彙(GoA の数値集計規則・賛成/反対の閾値・シャッフル手順・開票条件分岐)が現れないことを禁止語彙 grep 検査で固定(vocabulary-collision 回避の語彙設計込み) (ii) SKILL 本文はツール指令の転送ループと判断点の人間委譲のみを記述する(検査は application-design で確定する SKILL 構造契約に対する required-sections 型チェック)

## 非機能要件

- NFR-1: 選挙ツール本体は gh 非依存(ノルム PR 作成は leader の既存フロー)。Bun 直接実行・判別ユニオン Result・Biome/tsc 既存ゲート準拠(team-practices live 適用)
- NFR-2: テストは tests/ 配下・既存 4層 runner。実 FS を触るテストは integration 層(fs-tests-integration-first)。落ちる実証は FR-3b/FR-4/FR-6 の受け入れに内包
- NFR-3: 決定性 — 同一の票集合からの開票・記録生成は常に同一出力(シャッフルは選挙 ID+投票者からの決定的シード)
- NFR-4: 既存様式との互換破壊なし — parseGoaLine/parsePmCidLine のスキーマ変更を要求しない(変更が必要になったら実装前停止→裁定)

## トレーサビリティ

| 要件 | 由来 |
|---|---|
| FR-0 | D-13(directive-driven 原則)+D-01(全体機械化) |
| FR-1 | D-01+S-01+D-08(ファイル正本)+#1135(FR-1b シャッフル)+D-09/C-02(FR-1c blind) |
| FR-2 | D-08(短通知)+S-02+C-04(自動記帳) |
| FR-3 | D-06(構造化票)+S-03+D-12(voter 種別)+team.md 後着票運用の写像(FR-3d) |
| FR-4 | gradients-of-agreement-scale(team.md 既決)の写像+S-04+C-01(FR-4b 保留) |
| FR-5 | S-05/S-07+C-08(parseGoaLine 互換 — norm-metrics.ts:688 実測)+D-09(FR-5b 開票時公開) |
| FR-6 | S-06+reservation-transcription-count-check ほか照合ノルムの機械化(D-04 縮約方針の対) |
| FR-7 | D-12(ソロ選挙・輸送抽象・voter 種別) |
| FR-8 | D-07(チーム内ツール)+RE 実測(contrib overlay = promote-self.ts:45-46)+U-01 委任 |
| 成功指標 | D-03(違反カウントゼロ+照合指摘ゼロ) |
| 起源 Issue | #1137(全体)・#1135(FR-1b)— 着地時 close-after-landing |
