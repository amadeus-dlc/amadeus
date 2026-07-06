# Component Methods：260704-v2-parity-completion

C-ENG、C-DEF、C-SEN、C-HOOK は本家のメソッド境界をそのまま使う（適応コピーであり、境界の再設計はしない）。
ここでは、当リポジトリ側で使う主要な入口と、新規に設計するコンポーネントのメソッド境界だけを定義する。

## C-ENG（Engine Runtime。本家定義の主要入口）

| メソッド | 入力 | 出力 | 責務 |
|---|---|---|---|
| `bun .claude/tools/aidlc-orchestrate.ts next <invocation>` | ユーザー起動文（verbatim） | run-stage directive（lead agent、consumes / produces、rules、sensors） | 次ステージの解決と実行指示の発行 |
| `bun .claude/tools/aidlc-orchestrate.ts report --stage <slug> --result <outcome>` | ステージ実行結果 | 状態遷移の記録 | 状態書き込みの唯一の入口 |
| `bun .claude/tools/aidlc-utility.ts intent-birth --scope <name> --arguments "<desc>" --label "<label>"` | scope、説明、label | Intent record と状態の初期化 | Birth の一括実行 |
| `bun .claude/tools/aidlc-log.ts decision / answer` | stage、質問または回答の要約 | audit イベント | 質問提示と回答の監査記録 |
| `bun .claude/tools/aidlc-validate.ts` | record | ステージ出力の存在検査結果 | produces と実ファイルの突き合わせ |

## C-BRIDGE（Grilling Bridge。新規、プロンプト層）

| メソッド | 入力 | 出力 | 責務 |
|---|---|---|---|
| 質問提示規範（conductor 補足） | directive の questions 要求、stage 定義の topic areas | 一問ずつの対話（推奨回答と理由つき） | 本家の「questions ファイルを作って一括回答を待つ」流れを、対話で一問ずつ確定する流れに置き換える |
| 回答記録規範 | 対話で確定した回答 | `[Answer]:` タグ付き questions ファイル（真実源）、`aidlc-log.ts decision / answer` の呼び出し | 確定結果を v2 形式へ着地させ、監査記録を残す |

## C-VAL（Validator Adaptation）

| メソッド | 入力 | 出力 | 責務 |
|---|---|---|---|
| `AmadeusValidator.ts <workspace> [dirName]` | workspace、対象 Intent | 検査結果報告 | 既存入口を維持したまま、検査規則を新契約へ差し替える |
| 必須節定義の読込 | C-DEF の stage 定義（frontmatter の produces と required sections） | 検査規則 | 必須節の単一ソース化（sensor と共有） |
| 旧形式除外判定 | `docs/backward-compatibility.md` の対象一覧 | 検査対象の絞り込み | 完了済み旧形式 record を fail にしない |

## C-PAR（Parity Checker）

| メソッド | 入力 | 出力 | 責務 |
|---|---|---|---|
| `bun dev-scripts/parity-check.ts` | 基準 snapshot（本家 dist/claude の一覧）、当リポジトリ、写像と除外定義 | 差分報告（ゼロで green） | skill 一覧と成果物一覧の双方向突き合わせ |
| 写像適用 | `parity-map.json`（名前写像 aidlc-* ↔ amadeus-*、除外リストと理由） | 正規化された比較キー | 意図的差分の管理を単一ファイルに集約する |
