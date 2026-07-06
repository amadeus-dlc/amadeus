# API Documentation

> Reverse Engineering 成果物 — 分析対象: main @ 14c40c9c(現 HEAD 8d73e463)。Amadeus の「API」は HTTP ではなく、CLI サブコマンド契約・directive JSON・フックプロトコルの3面である。

## CLI サブコマンド契約(内部 API)

### amadeus-orchestrate.ts(2899行、エンジン中枢)

| サブコマンド | 性質 | 契約 |
|---|---|---|
| `next` | **純リード** | 現在状態から次の directive JSON を導出。状態を一切変更しない(再実行安全) |
| `report` | **遷移コミット** | ステージ結果を受け取り状態遷移を原子的にコミット。`--single` モードでは synthetic-id ペアをコミットし本流の Current Stage には触れない |

### amadeus-log.ts(監査記録の人間ゲート)

| サブコマンド | 発行イベント | ゲート |
|---|---|---|
| `decision` | DECISION_RECORDED | 質問**提示前**に発行する規約 |
| `answer` | QUESTION_ANSWERED | 回答**後**に発行。**HUMAN_TURN 在席ゲート**: 最後の QUESTION_ANSWERED 以降に HUMAN_TURN イベントが存在すること。例外: autonomous Construction・テストスイッチ。台帳なしは fail-open |

> grilling 統合上の注意: 在席ゲートは「1 human turn = 1 answer」を前提とした設計であり、高頻度連続回答との相互作用は設計時検証が必要(既知シグナル)。

### その他の主要ツール

- `amadeus-runtime.ts summary --json` — read-only スキルが数値を取得する唯一の正当ソース(LLM 側カウント禁止)
- `amadeus-audit.ts` — イベント型は VALID_EVENT_TYPES ホワイトリストで静的検証。新イベント型はこの列挙の編集が必要
- `amadeus-learnings.ts` — §13 学習admission ゲート(レイヤー矛盾の却下)
- `amadeus-swarm.ts` — swarm 収束レフェリー
- `amadeus-runner-gen.ts write|check` — ステージランナースキル生成とドリフトガード
- `amadeus-utility.ts help` — `/amadeus --*` ユーティリティの権威リスト

## directive JSON(凍結契約)

`amadeus-directive.ts` で定義。エンジン → コンダクター(LLM)の唯一のインターフェース。

```
kind: run-stage | ask | print | error | done | parked | invoke-swarm  (+ 予約 2)
```

- 凍結契約であり、拡張は予約 kind の消費または明示的な契約改定を要する
- コンダクターは directive を解釈して実行するのみで、状態ファイルへの直接書き込みは行わない

## フックプロトコル(11本)

| フック | イベント | 契約 |
|---|---|---|
| stop(forwarding-loop) | Stop | questions ファイルの**空 `[Answer]:` タグ**の有無で human-wait を判別する。このタグ規約が対話モード全体(および grilling 第4モード)の要 |
| mint-presence | UserPromptSubmit 相当 | HUMAN_TURN イベントを記録(在席ゲートの根拠) |
| sensor-fire | PostToolUse | compile 済み `sensors_applicable` を読み、該当センサーを発火(advisory) |
| その他 8 本 | セッションライフサイクル / 状態同期 / 状態検証 / サブエージェント追跡 / statusline | 監査シャード・状態整合の維持 |

## 対話モード契約(stage-protocol.md §3)

questions ファイルが**唯一の権威**。現行3モード:

| モード | プロトコル |
|---|---|
| Guide me | バッチ提示(claude annex: AskUserQuestion 1:1、上限4問×4択+ビルトイン Other)→ 即時 write-back → バッチ毎監査 |
| Edit file | ユーザーのファイル編集完了シグナルを待つ |
| Chat | 自由対話から決定抽出 + `Mode:chat` タグ |

- 深度別質問数: Minimal 2-4 / Standard 5-8 / Comprehensive 8-12+
- question-rendering annex はハーネスごとに4本(提示 UI の差異を吸収)
- **第4モード挿入点**: stage-protocol.md L258-298(mode 選択 question ブロック + Step 3d 新設)、空 `[Answer]:` タグの Stop フック判別は L313-323

## 外部向けユーザーインターフェース

- `/amadeus [記述|--status|--doctor|--stage|--phase|--scope|--depth|--test-strategy|--version|--help|compose]` — 単一入口
- `/amadeus-<stage>` ×32 相当 — 単一ステージ隔離実行(`--single`)
- `/amadeus-{session-cost,replay,outcomes-pack}` — read-only セッションスキル
- `/amadeus-init`, `/amadeus-{mvp,feature,bugfix,security-patch}` — パッケージングスキル
