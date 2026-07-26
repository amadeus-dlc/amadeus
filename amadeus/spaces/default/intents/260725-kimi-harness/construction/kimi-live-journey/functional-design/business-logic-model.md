上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — kimi-live-journey

unit-of-work.md の U6(完了定義: driver 新規作成・`AMADEUS_KIMI_PRINT_LIVE=1` ゲートで journey 1本以上・ローカル実走 green・決定的 tier では skip)と unit-of-work-story-map.md の FR-9 を、components.md C6 と component-methods.md の C6 インターフェース(runPrintSession/skipReason)に沿って手続き化する(requirements.md の FR-9 と CC-1 が根拠)。services.md の判定どおり driver は spawn + 出力回収の同期プリミティブ。

## driver フロー

1. `skipReason()`: `AMADEUS_KIMI_PRINT_LIVE !== "1"` または kimi バイナリ不在で理由文字列を返す(既存 driver と同じ契約)
2. `runPrintSession({ cwd, prompt, env })`: `kimi -p "<prompt>"` を spawn し、stdout/stderr/exit code を回収する
3. journey は dist/kimi を tmp のプロジェクトへ配置した環境で driver を呼び、ワークフローの基本経路を検証する:
   - journey 1(status): `/skill:amadeus --status` 相当の実行でエンジンの応答(JSON または status 文)が返る
   - journey 2(doctor): `/skill:amadeus --doctor` 相当で kimi arm のチェック結果が返る

## hermeticity の機構(明示)

- journey 環境は `KIMI_CODE_HOME` を tmp ディレクトリに向ける(`runPrintSession` の `env` 引数で注入)。これにより doctor arm が読む config は tmp 側のものになり、開発者の実 `~/.kimi-code/config.toml` を参照・変更しない(HOME 自体は変えず、Kimi のデータ root だけ差し替える)
- hook 配線の有無も tmp 側で制御できる: managed block 未配線の tmp 環境では hook は発火しない(fail-open)ことを前提に断言を設計する
- journey 2(doctor)の断言は決定的な2状態で行う:
  - (a) managed block 未配線の tmp 環境 → doctor が「managed block 不在」の手順 hint を報告する(決定的に再現できる)
  - (b) U3 のマージモジュールで tmp 環境に managed block を seeded した環境 → doctor の adapter 実在・managed block・バージョンの各チェックが pass する(機能 probe は advisory のため pass 判定に含めない)

## 実走手順

1. 実装後、`AMADEUS_KIMI_PRINT_LIVE=1` を付けてローカルで journey を実行し green を確認(CC-1 の許容範囲)
2. 決定的 tier(ゲートなし)では skipReason で skip されることを確認(既存の run-tests.sh 層で)

## 検証シーケンス

- driver の単体検証: skipReason の分岐・spawn 失敗時の扱い(決定的な部分のみ)
- journey 本体: 実走で green。CI では skip

## 決定木(エラー経路)

- `kimi -p` が非ゼロ終了 → journey 失敗として内容を記録(advisory にしない。live 検証の失敗は調査対象)
- タイムアウト → 既存 driver と同じく明示的なタイムアウトで打ち切り、理由を記録

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T12:06:34Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の major+minor は解消。hermeticity 機構(KIMI_CODE_HOME 差替)と doctor journey の2状態断言が明文化され、driver 契約・gate・invariant は FR-9/C6 と整合。残留意見(U6 の U1-U4 依存)は既存 DAG(B6 は B5 の後)で充足済み。

### Findings

- (minor / BLM hermeticity (b)) U6 の U1-U4 依存の明確化 → 対応済み(既存 DAG の直列順序で充足。追加変更なし)
