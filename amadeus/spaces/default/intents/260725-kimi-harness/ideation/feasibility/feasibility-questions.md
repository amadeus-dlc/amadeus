# Feasibility 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全3問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話で1問ずつ回答を受領)。合意サマリのユーザー承認タイムスタンプ: 2026-07-25T06:19:25Z(「1」= 確認OK)
> モード: Guide me(対話式)
> 実測済みの前提(質問対象外):
> - kimi バイナリ 0.28.1 が実在(`~/.local/share/mise/installs/npm-moonshot-ai-kimi-code/0.28.1/bin/kimi`)。最新リリースは 0.29.1(2026-07-24)
> - `~/.kimi-code/config.toml` が実在し、既存の `[[hooks]]` ブロックが14件ある — managed block マージは既存ブロックと共存必須
> - changelog 実測: plugin hooks は 0.20.1 で導入済み、AskUserQuestion の回答フィードバック改善は 0.23.0、`kimi -p` 挙動統一は 0.24.2
> - 公式 docs 実測: hooks 16イベント・Claude 型 stdin payload、プロジェクトレベル config 機構なし(overrides 明記)、`.kimi-code/{skills,agents}/` 自動検出

## Q1. 開発中の実機検証で、実際の `~/.kimi-code/config.toml` に managed block を追加して hook 配線テストを行ってよいか

事実(自己調査): Kimi の `[[hooks]]` はユーザーレベル config.toml にしか書けない(プロジェクト config 機構なし)。live capture(hook payload の実機採取)には実際の配線が必須。ユーザーの実 config には既存ブロック14件があり、書き込みは外部境界(team.md P4: 人間の明示承認を置く)。

- A. 許可(推奨): 実 config への managed block 追加を許可する。作業前にバックアップを取得し、マーカーコメントで囲み、完了後または要求時に除去する手順を伴う
- B. 隔離環境のみ: `KIMI_CODE_HOME` を差し替えた隔離データ root でのみ配線テストを行い、実 config には触れない(live journey も隔離側で実行)
- C. 配線テスト禁止: payload 形状は docs と推測のみで adapter を作り、live capture は将来intentに委ねる
- X. Other (please specify)

[Answer]: A — 許可(実 config への managed block 追加。作業前バックアップ・マーカー囲み・完了後/要求時の除去手順付き)(2026-07-25, Guide me)

## Q2. live 検証(kimi 実機セッション・journey 実走)のクレジット消費の許容範囲

事実(自己調査): 既存の kiro 系 live journey は「SPENDS Kiro credits」と明記され `AMADEUS_KIRO_*_LIVE=1` ゲートで管理されている(tests/e2e 実測)。kimi の live 検証も同様にモデル呼出しコストを伴う。kiro は TUI(tmux)・ACP・IDE の3系統だが、kimi は `kimi -p` 非対話駆動が使えるため journey の単価は比較的安いと推定される(推定・未実測)。

- A. probe + journey 実走まで許容(推奨): 開発中の payload probe(数回の短いセッション)と、完成した journey のローカル実走(マージ前1回以上)を許可する
- B. journey 実走のみ: probe は隔離環境で最小化し、クレジット消費は journey 実走のみに限定する
- C. 最小限: journey 1本の実走1回のみ。追加実走は都度承認を求める
- X. Other (please specify)

[Answer]: A — probe+journey実走まで許容(開発中の payload probe と journey のローカル実走・マージ前1回以上)(2026-07-25, Guide me)

## Q3. doctor が検査する kimi バージョンフロアの方針

事実(自己調査): codex は `MIN_CODEX = [0,139,0]` を doctor で pin している(amadeus-utility.ts 実測・subagent 報告)。kimi の hooks/agents/skills は 0.20.x 時点で存在するが、実機検証は 0.28.1 で行う。実測主義(team.md P2)では「検証したバージョンを下限とする」が最も正直。

- A. 実測バージョン下限(推奨): doctor の下限は実機検証に使ったバージョン(例: 0.28.1)とする。それ未満は「未検証」として警告または失敗にする
- B. 機能導入ベース: hooks/agents/skills が揃った最古のバージョン(changelog 由来、例: 0.20.1)を下限とし、それ未満のみ失敗にする
- C. フロアなし: バージョン検査は行わず、機能 probe(hook が実際に動くか)だけを検査する
- X. Other (please specify)

[Answer]: A — 実測バージョン下限(doctor の下限は実機検証バージョン 0.28.1。未満は未検証として警告/失敗)(2026-07-25, Guide me)