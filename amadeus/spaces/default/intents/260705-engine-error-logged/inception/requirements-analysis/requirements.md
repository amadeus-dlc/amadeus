# Requirements — エンジンエラーの ERROR_LOGGED 自動記録（260705-engine-error-logged）

対象 Issue: [#431](https://github.com/amadeus-dlc/amadeus/issues/431)

## 意図分析

全ツール CLI が `error()` → `emitError()` 経由で ERROR_LOGGED を audit に自動記録する中、`amadeus-orchestrate.ts` だけが記録しない非対称がある。
error directive と未捕捉例外の証拠が会話ログにしか残らず、後からの原因分析と skill バグ追跡ができない。

## 機能要求

- R001: `emit()` が error directive（kind: "error"）を出力するとき、best-effort で ERROR_LOGGED を audit へ追記する（Tool = amadeus-orchestrate、Command = 実引数、Error = directive.message。questions Q1 = A で全件記録）。
- R002: トップレベル catch（import.meta.main）でも、非 0 終了の前に同じ best-effort 記録を行う。
- R003: 記録は emitError の既存契約に合わせる: state file が cwd に無ければ no-op、記録失敗は握りつぶす（questions Q2 = A、Issue 実施候補 3）。
- R004: directive の出力契約を壊さない: stdout には完全な directive JSON のみ（audit 追記は stdout に何も出さない）。error directive の内容・exit code も不変。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI を駆動する。RED 先行（修正前は error directive 発行後も audit に ERROR_LOGGED が無いことを確認する）。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: parity は `tools/aidlc-orchestrate.ts` 宣言済み（#486）のため追加不要（確認のみ）。

## 受け入れ条件（Issue と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | workflow がある状態で next / report が error directive を返すと、audit shard に ERROR_LOGGED（Tool: amadeus-orchestrate、message 含む）が追記される | R001 |
| 2 | 未捕捉例外の非 0 終了前に ERROR_LOGGED が追記される | R002 |
| 3 | state 不在の workspace では記録しない（emitError と同契約） | R003 |
| 3b | audit 書き込み自体の失敗も握りつぶし、stdout の directive 契約と exit code を汚染しない（実装は記録全体の try/catch で担保） | R003 / R004 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

SKILL.md の conductor 指示の変更（error directive の扱いは従来どおり「表示して停止」。記録はエンジン側で完結する）、他ツールの emitError の変更、doctor 側の表示拡張（#432 で実装済みの drops とは別系統）。
