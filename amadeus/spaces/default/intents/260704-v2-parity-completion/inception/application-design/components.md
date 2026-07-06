# Components：260704-v2-parity-completion

## 一覧

| コンポーネント | 責務 | 対応する要求 |
|---|---|---|
| C-ENG（Engine Runtime） | 本家 `.claude/tools/` の TS ツール 26 個（orchestrate、state、directive、audit、utility、bolt、jump、swarm、learnings ほか）と `tools/data/` を保持し、状態遷移、ルーティング、gate 判定、audit 記録を決定論的に実行する | R001、R011 |
| C-DEF（Stage Definitions） | 本家 `.claude/aidlc-common/`（conductor.md、stage 定義 31 個、protocols）を保持し、ステージの consumes / produces、sensor 宣言、scope 対応の単一ソースになる | R001、R005、R006 |
| C-SEN（Sensor Suite） | 本家 `.claude/sensors/` 4 定義と sensor 系ツール、sensor-fire hook で、stage 完了時の即時検査（必須節、上流参照、linter、type-check）を実行する | R007 |
| C-HOOK（Hook Wiring） | 本家 hooks 11 個を `.claude/hooks/` に置き、`.claude/settings.json` へ aidlc-* 名前空間でマージして、session / audit / sensor / statusline の自動配線を行う。既存 hook 設定と共存する | R001（C001） |
| C-BRIDGE（Grilling Bridge） | エンジン directive が questions ファイルを要求する場面を amadeus-grilling プロトコル（一問ずつ、推奨回答つき）へ接続し、確定回答を `[Answer]:` タグで questions ファイルへ記録する。プロンプト層（conductor 補足規範と skill 文言）だけで実現し、エンジンコードは改変しない | R002 |
| C-SKILL（Skill Set） | 本家 38 skill を amadeus-* へ改名して適応コピーし、既存の source → 昇格モデル（`skills/` → `.agents/skills/` → `.claude/skills/` symlink）で配布する | R003 |
| C-RET（Skill Retirement） | 独自 skill 5 個の削除、amadeus-steering の退役（Space bootstrap を 0.1、memory 昇格を 2.2 へ畳み込み）、契約文書からの参照除去を行う | R004 |
| C-VAL（Validator Adaptation） | amadeus-validator を新成果物契約（v2 配置、questions 形式、per-clone audit shard、phase-check）へ追従させ、必須節定義を C-DEF の stage 定義から読む。旧形式の完了済み record は検査対象外にする | R006、R007 |
| C-PAR（Parity Checker） | 基準 commit の本家 `dist/claude/` と当リポジトリの skill 一覧と成果物一覧を、名前写像と除外リストを適用して突き合わせる検査スクリプト。npm script から実行できる | R008 |
| C-DOC（Norm Documents） | AMADEUS.md、`.agents/rules/`、Skill Language Policy、sensor-learn-mapping、backward-compatibility.md を新契約へ改定する | R009 |
| C-EX（Examples Regeneration） | examples 4 snapshot を新契約の real provider で再生成し、provenance の staleReason を解消する | R010 |
