# Requirements — Amadeus Grilling 統合

**Intent**: mattpocock の grilling スキルを Amadeus Grilling として統合する
**Date**: 2026-07-06 / **Stage**: requirements-analysis (2.3) / **Depth**: Standard

**Upstream トレーサビリティ**: 本要件は `ideation/intent-capture/intent-statement.md`(課題: 選択式の浅さ、成功指標4点)と `ideation/scope-definition/scope-document.md`(In/Out 境界、全Must、ハイブリッド終了条件)に由来し、codekb の `business-overview.md` / `architecture.md` / `code-structure.md`(RE 成果物)の技術制約を反映する。

## Intent Analysis

達成したいのは機能の追加ではなく**設計判断の質の底上げ**である。intent-statement の課題分析のとおり、既存の Guide me(選択式)では提示された想定内の回答から選んで先へ進んでしまい、隠れた前提・未検討の代替案が表面化しないまま成果物が生成され、承認ゲートでの手戻り(Request Changes)や承認後の認識ズレとしてコストが顕在化する。grilling の規律(1問ずつ・推奨回答つき・事実は自己調査し判断だけ問う・共通理解の確認まで)をAmadeus の既存契約(質問ファイル= source of truth、監査ログ)の上に載せることで、対話の**深さ**とトレーサビリティを両立させる。受益者は二層: 自チームのドッグフーディング(一次)と、dist 配布で同じ体験を得る外部導入チーム(二次)。

## 機能要件(FR)

### FR-1: Grill me 対話モード

- **FR-1.1** stage-protocol.md §3 のモード選択に第4の選択肢「Grill me」を追加する。全ゲート付きステージで選択可能とし、Construction / Operation フェーズでは選択肢の説明文に「例外的な利用」であることを明示する。
  - 合否基準: 任意のゲート付きステージでモード選択肢に Grill me が表示され、選択すると Step 3d(grilling 対話)が開始される。
- **FR-1.2** grilling 対話は質問を**1問ずつ**提示する。1回の構造化質問呼び出しに複数質問を同梱しない。
  - 合否基準: Grill me セッション中の AskUserQuestion 相当呼び出しはすべて questions 配列長 = 1。
- **FR-1.3** 各質問は**推奨回答つき**で提示する: 質問文に推奨の根拠を述べ、先頭選択肢に「(推奨)」を明記する。
  - 合否基準: 提示された各質問に根拠文と「(推奨)」付き先頭選択肢が存在する。
- **FR-1.4** **事実と判断を分離**する: 事実(コードベース・成果物・codekb から確定できる情報)はエージェントが自己調査し、ユーザーには判断のみを問う。自己調査で確定できない場合は推定(確度つき)を提示して確認を求め、ユーザーが不同意なら通常質問に降格する。
  - 合否基準: 事実確認だけの質問が提示されない(調査可能な事実をユーザーに問うたらプロトコル違反)。推定提示→不同意→質問化のフローが規定されている。
- **FR-1.5** 回答は既存契約どおり質問ファイルの `[Answer]:` タグへ**即時書き戻す**。grilling が動的に生成した追撃質問も、提示前に質問ファイルへ追記してから問う(空 `[Answer]:` タグによる Stop フックの human-wait 判別規約を維持)。
  - 合否基準: セッション終了時、質問ファイルに全質問と全回答が揃っている。中断時、未回答質問が空 `[Answer]:` タグとしてファイルに存在する。
- **FR-1.6** **終了条件はハイブリッド**: depth 設定を質問量の目安としつつ、ユーザーは「続けて」で延長、「done」でいつでも打ち切りできる。目安の数値(Minimal ~2-4 / Standard ~5-8 / Comprehensive ~8-12+)は本ステージの新規導入ではなく、stage-protocol.md §3 の既存 depth 契約(Depth-aware question generation の表)をそのまま参照する。
  - 合否基準: depth 目安到達時に継続確認が入る。「done」で即時に終了フローへ移る。
- **FR-1.7** 終了時は**共通理解の確認が必須**: 合意サマリ(全決定事項の一覧)を提示し、ユーザーの明示確認を得てから成果物生成へ進む。確認前に成果物を生成しない。
  - 合否基準: 合意サマリ提示→明示確認→生成、の順序が常に守られる。修正要求時はサマリ再提示。

### FR-2: スタンドアロンスキル /amadeus-grilling

- **FR-2.1** `core/skills/amadeus-grilling/SKILL.md` として実装し、read-only セッションスキルの既存契約(frontmatter: `user-invocable: true`, `classification: read-only`)に従う。ワークフローのステージポインタを進めず、監査イベントを発しない。
  - 合否基準: スキル実行後、amadeus-state.md の Current Stage と監査ログが不変。
- **FR-2.2** 入力は引数で対象(ファイルパス/テーマ)を指定する。対話規律は FR-1.2〜FR-1.4、FR-1.6〜FR-1.7 と同一(監査ログ義務 FR-3 はワークフロー外のため適用外)。
  - 合否基準: `/amadeus-grilling <対象>` で grilling 対話が開始され、同じ1問ずつ規律で進む。
- **FR-2.3** 出力は端末のみ。ユーザーが**明示要求したときのみ**合意サマリを指定パスへ書き出す(outcomes-pack と同じ例外型)。
  - 合否基準: 明示要求なしにファイルが作られない。
- **FR-2.4** 全4ハーネス(claude / codex / kiro / kiro-ide)の manifest に配布行を追加し、package.ts の配布契約に乗せる。
  - 合否基準: `bun scripts/package.ts --check` パス、4ハーネスの dist に skills/amadeus-grilling が存在。

### FR-3: 監査・記録(モード統合時)

- **FR-3.1** grilling の各回答を**1問ごと**に `amadeus-log.ts answer`(QUESTION_ANSWERED)で記録する。提示前の `decision`(DECISION_RECORDED)も既存契約どおり。
  - 合否基準: N 問の grilling セッション後、監査ログに N 件の QUESTION_ANSWERED が存在。
- **FR-3.2** 新しい監査イベント種別を追加しない(既存 VALID_EVENT_TYPES の範囲内で実現)。
  - 合否基準: amadeus-audit.ts の VALID_EVENT_TYPES に差分がない。

### FR-4: 帰属・ドキュメント

- **FR-4.1** 取り込むスキルファイル(規律定義の中核ファイル)に MIT 帰属コメント(mattpocock/skills 由来、原ライセンス表記)を含める。docs にクレジットを記載する。
  - 合否基準: 規律定義ファイルの先頭に MIT 帰属コメント(原リポジトリ URL とライセンス名を含む)が存在し、docs の該当ページにクレジット記載がある。
- **FR-4.2** docs の対話モード説明箇所(docs/guide の対話モード節、docs/reference/04-stage-protocol.md)に Grill me を追記する。スタンドアロンスキル `/amadeus-grilling` についても、session skills を列挙する README / CLAUDE.md / docs の該当箇所へ同一コミットで追記する(チームルール「ファイル追加時は docs/README を同一コミットで更新」)。
  - 合否基準: docs/guide の対話モード節と docs/reference/04-stage-protocol.md の両方に Grill me の記述が存在し、session skills を列挙する各箇所(README / CLAUDE.md / docs)に /amadeus-grilling が現れる。
- **FR-4.3** ユーザー可視変更としてバージョンバンプ3点セット(version.ts / README バッジ / CHANGELOG 見出し)を同一コミットで行う。
  - 合否基準: `tests/unit/t68-version-changelog-sync.test.ts` がパスする(三者同期はこのテストが機械的に強制する)。

## 非機能要件(NFR)

- **NFR-1(在席ゲート整合)**: FR-3.1 の1問ごとログは `amadeus-log.ts answer` の HUMAN_TURN 在席ゲート(1 human turn = 1 answer)と衝突しないこと。functional-design で実機検証し、衝突する場合は設計判断を人間ゲートに戻す。
- **NFR-2(ハーネスパリティ)**: 4ハーネスで同一の grilling 体験を提供する。ハーネス固有差分は question-rendering annex の既存抽象の範囲内に収める(annex の枠組み自体は拡張しない)。合否判定: 同一の規律定義ファイルが4ハーネスの dist に配布され(`bun scripts/package.ts --check` パス)、ハーネス固有記述が annex ファイル以外に現れない。
- **NFR-3(既存互換)**: 既存3モードの挙動を変更しない。既存テストのグリーンベースライン(既知失敗 t11/t38/t65/t66/t140/t174 ほかを除く)を維持する。
- **NFR-4(ビルド契約)**: core/ 編集→ `bun scripts/package.ts` → `bun run promote:self` →同一コミット。全ドリフトガード(`--check` / promote check / runner-gen check / t68)がパスする。
- **NFR-5(テスト)**: ハッピーパス+最低2つのエラー/エッジケース(例: 中断時の空 [Answer]: タグ、done 即時終了)をカバーするテストを追加する。

## Out of Scope

scope-document の Out of Scope を要件境界として転記する(本書単体で境界が読めること):

1. 既存3モード(Guide me / I'll edit the file / Chat)の挙動変更・削除
2. 新しい監査イベント種別の追加(FR-3.2 として要件化済み)
3. ハーネス別の挙動差し込み(question-rendering annex の既存の枠を超える拡張)
4. モード選択率などの利用計測基盤

## Open Questions(後段ステージへの引き継ぎ)

| # | 未解決事項 | 引き継ぎ先 | 失敗時の扱い |
|---|---|---|---|
| OQ-1 | 「1問ずつ+推奨回答」が question-rendering annex の枠内(バッチサイズ1+根拠の織り込み)で表現できるか(PU-1 スパイク) | functional-design | 不成立なら Out of Scope 3 と衝突するため人間ゲートで再判断 |
| OQ-2 | 1問ごとの QUESTION_ANSWERED ログが HUMAN_TURN 在席ゲートと衝突しないか(NFR-1) | functional-design(実機検証) | 衝突するなら粒度の設計判断を人間ゲートに戻す |

## 制約・前提

- **制約**: 質問ファイル= source of truth / 空 `[Answer]:` タグ規約 / read-only スキル分類規則 / 監査イベントのホワイトリスト、はいずれも既存契約であり変更不可。
- **前提(仮説)**: 「1問ずつ+推奨回答」は question-rendering annex の枠内(バッチサイズ1+説明文への根拠織り込み)で表現できる — PU-1 スパイクで検証(scope-document の Risks 参照)。
- **矛盾チェック**: Q1(1問ごとログ)と在席ゲートの潜在衝突は NFR-1 として明示化済み。Q4(全ステージ適用)と Construction の質問抑制ガイドラインは「注記つき提供」で解消済み。未解決の矛盾なし。

## 成功指標との対応

| intent-statement の指標 | 対応要件 |
|---|---|
| 機能完成(全ステージで完走) | FR-1.1〜1.7, FR-2.1〜2.4 |
| 手戻り減少 | FR-1.4, FR-1.7(前提の見落とし低減) |
| 定性評価 | ドッグフーディング(本ワークフロー以降で実測) |
| 監査完全性 | FR-1.5, FR-3.1〜3.2, NFR-1 |
