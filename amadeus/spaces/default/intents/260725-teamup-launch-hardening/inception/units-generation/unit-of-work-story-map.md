# Unit of Work Story Map — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`

- `components.md` — 各ユニットが触るコンポーネントを、下記ジャーニー上の作業へ対応づけた。
- `component-methods.md` — 各関数の契約を、受け入れシナリオの検証点へ落とした。
- `services.md` — 外部サービスとの契約変化を、利用者から見える挙動の変化として記述した。
- `component-dependency.md` — ユニット間に依存がないことを引き、ストーリーを独立に配置した。
- `decisions.md` — ADR-5（検証を attach 後へ + タイムアウト縮小）を、ジャーニー上の待ち時間の変化の根拠とした。
- `requirements.md` — FR/NFR を各ストーリーの受け入れ基準へ対応づけた。

測定 ref: HEAD `5c06db654`。

## 利用者ジャーニー: チームを起動して作業を始める

| # | 段階 | 本 intent での変化 |
|---|---|---|
| 1 | `bash team-up.sh` を叩く | — |
| 2 | worktree が作られる | **U2 がここを速くする**（7人構成で 7.39秒 → 3.3秒前後） |
| 3 | herdr セッションとペインが立つ | — |
| 4 | Ghostty が開きアタッチできる（**利用者が作業を開始できる時点**） | 段階2の短縮ぶん早まる |
| 5 | 各メンバーの Claude Code が起動し watcher が arm する（実測 約32秒） | 現行は arm されない |
| 6 | 検証が結果を報告する | **U1 がここを機能させる**（現行は実行すらされない） |

**現行の問題**: 段階6が構造的に成功しえないため #1384 の保護が不在。かつ段階2が起動時間の支配項。

**本 intent 後**: 段階4が段階2の短縮ぶん早まり、段階6が段階4の**後ろで**実際に機能する（ADR-5）。

## U1 のストーリー

### US-1: メンバーの watcher が確実に arm されたことを知りたい

**As a** Team Mode の利用者 / **I want** 各メンバーの agmsg watcher が実際に受信可能になったことを確認したい / **So that** leader からの配信が取りこぼされていないと確信して作業を始められる

- **Given** 既定構成（claude runtime / agmsg backend）でチームを起動する
- **When** 全メンバーの Claude Code が起動し `/agmsg actas <role>` を処理する
- **Then** 各メンバーの ready sentinel が生成され、検証が成功して exit 0 になる

対応要件: FR-1, FR-2 ／ 検証: 実 launch での sentinel 出現と exit code

### US-2: 検証のために起動を待たされたくない

**As a** Team Mode の利用者 / **I want** watcher の検証が終わるのを待たずにチームへアタッチしたい / **So that** 起動コマンドを叩いてすぐ作業に入れる

- **Given** チームを起動する
- **When** worktree とペインの生成が終わる
- **Then** 検証の完了を待たずに Ghostty が開き、アタッチできる

対応要件: FR-3, FR-4, NFR-1, NFR-2 ／ 検証: アタッチ到達時間が 5.87秒（3人構成）から悪化しない

### US-3: watcher が arm されなかったとき、何をすべきか分かりたい

**As a** Team Mode の利用者 / **I want** どのメンバーが arm されなかったか、どう回復するかを知りたい / **So that** 手動で復旧できる

- **Given** 一部メンバーの watcher が arm されない
- **When** 検証がタイムアウトする
- **Then** 未 arm のメンバー名と、そのメンバーが実行すべきプロンプトが表示され、非ゼロで終了する

対応要件: FR-1, FR-2（診断メッセージ2行の更新）／ 検証: 診断出力が actas 移行後の事実と一致する

### US-4: この欠陥クラスの再発を防ぎたい

**As a** 本リポジトリの保守者 / **I want** テストが agmsg の実挙動（モード差）を検証していてほしい / **So that** 「検証が構造的に成功しえない」という欠陥が再び CI をすり抜けない

- **Given** テストスイートを実行する
- **When** monitor モードと actas モードの両方を通す
- **Then** 「monitor では sentinel が書かれない / actas では書かれる」というモード差が検証される

対応要件: FR-5 ／ 検証: 該当テストの存在と、落ちる実証

## U2 のストーリー

### US-5: チームの起動を速くしたい

**As a** Team Mode の利用者 / **I want** worktree の作成を待つ時間を短くしたい / **So that** 起動コマンドからアタッチまでの体感が軽くなる

- **Given** 7人構成（leader + engineer×6）でチームを起動する
- **When** worktree が作成される
- **Then** 直列 7.39秒 に対し 3.3秒前後で完了する

対応要件: FR-6, NFR-1 ／ 検証: 実測時間と同時実行数の上限

### US-6: 起動が途中で失敗しても、中途半端な状態が残らないでほしい

**As a** Team Mode の利用者 / **I want** worktree 作成が部分的に失敗したとき、作られたものがすべて片付いてほしい / **So that** 再実行の前に手作業で掃除しなくてよい

- **Given** 一部の `git worktree add` が失敗する
- **When** `create_run` が非ゼロで返る
- **Then** 成功していた worktree もすべて巻き戻され、`RUN_ROOT` / `RUN_RECORD` が残らない

対応要件: FR-7 ／ 検証: **失敗注入**によるロールバックの実証

### US-7: どのメンバーで失敗したか知りたい

**As a** Team Mode の利用者 / **I want** 並列実行で失敗したメンバーを特定したい / **So that** 原因（ブランチ名の衝突、ディスク不足など）を調べられる

- **Given** 並列 worktree 作成で一部が失敗する
- **When** エラーが出力される
- **Then** どのメンバーの作成が失敗したかが一意に特定できる

対応要件: FR-8 ／ 検証: 失敗注入時の stderr 内容

## ストーリーとユニットの対応

| ストーリー | ユニット | 優先 | 独立性 |
|---|---|---|---|
| US-1, US-3, US-4 | U1 | Must | U2 に依存しない |
| US-2 | U1 | Must | **US-1 と同時に出荷する必要がある** — actas 移行だけ入れて待機位置を変えないと US-2 が退行する（ADR-5） |
| US-5, US-6, US-7 | U2 | Must | U1 に依存しない |

**US-2 は U1 内での順序制約**である。`intent-backlog.md` の B-3（待機設計の変更）を U1 の先頭に置くことで、US-1 の実装によって US-2 が壊れる窓を作らない。
