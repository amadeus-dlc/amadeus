# Tech Stack Decisions — install-flow

> ステージ: nfr-requirements (3.2) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(cli/wizard/applier の実装手段)・`business-rules.md`(BR-I02 の TTY 判定)、U1 tech-stack-decisions、NFR-005

| 領域 | 決定 | 根拠 |
|------|------|------|
| 引数解析 | `node:util` の `parseArgs` | Node 18.3+/bun 標準。依存ゼロ(NFR-005)。CLI 契約の flag 集合は小さい。**このAPI がプロジェクト全体の Node フロア(18.3)を決める**(権威ある記述は U1 tech-stack-decisions) |
| TTY 判定 | `process.stdin.isTTY` | BR-I02 のモード判定。標準 API |
| 対話プロンプト | `node:readline/promises` | 4択選択+テキスト入力+y/N 確認に十分。UI ライブラリ不採用(build-vs-buy C 案の棄却踏襲) |
| ファイル操作 | `node:fs/promises`(copyFile/mkdir/rename) | 標準 API。退避は copy-then-rename ではなく rename(同一ボリューム内、原子性が高い)→ その後コピー |
| md5(プラン時) | `node:crypto`(U1 と同一) | FR-008/016 契約 |
| 色・装飾 | なし(必要最小のプレーンテキスト) | frontend-components の方針(CI ログ可読性優先)。依存ゼロ |
