# Team Allocation — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR-1〜FR-8 / NFR-1〜NFR-8 を各 Bolt の完了条件へ割り当てた。
- `components.md` — 各 Bolt が触るコンポーネントの一覧を引き、変更面と配布同期の範囲を確定した。
- `unit-of-work.md` — 2ユニットの作業項目・規模見積り（数値）・完了の定義をそのまま Bolt へ写した。
- `unit-of-work-dependency.md` — 依存辺ゼロと「唯一の交差点は配布同期」という判定を、順序と直列化の根拠とした。
- `unit-of-work-story-map.md` — US-1〜US-7 を各 Bolt の利用者価値の確認軸とした。特に US-2 が U1 内の順序制約である点を Bolt 1 の内部順序へ反映した。
- `team-practices.md` — 検証コマンド群・配布同期・落ちる実証・PR 単位の実務を、各 Bolt の Definition of Done へ組み込んだ。

測定 ref: HEAD `304bae2eb`。

## 運用形態

**ソロモード**（`AMADEUS_OPERATING_MODE` 未設定、`team.md` § Operating Modes）。

`team-practices.md` が記録するとおり、エージェント選挙・定足数・クロスレビュー2名・delegate 配送は適用しない。named mob は存在せず、Team Formation はスコープで SKIP されている。

## 役割の割り当て

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor | 本セッション（Claude Code） | 全ステージのオーケストレーション、成果物の起草、検証の裏取り |
| builder | conductor が subagent（`amadeus-developer-agent`）へ委任 | Bolt ごとに dispatch。逸脱は実装前に停止して報告させる（`cid:code-generation:deviation-stop-before-implement`） |
| reviewer | §12a reviewer subagent（`amadeus-architecture-reviewer-agent`） | 各ステージで独立検証。verdict は最終テキスト + record 外 scratch へ併書 |
| 意思決定者 | **ユーザー本人** | 設計判断・スコープ判断・マージ承認。すべて AskUserQuestion 経由の直接裁定 |

## 独立検証の担保

ソロモードではクロスレビュー2名が成立しないため、以下で代替する。

- **§12a reviewer subagent**: 各ステージで独立に file:line を照合し verdict を返す。本 intent ではここまでに Critical 1・Major 3・Minor 5 を検出しており、機能している。
- **RE の直列2段**: Developer スキャン → Architect 独立検証（`cid:reverse-engineering:c3`）。行番号シフトの見落とし3件を捕捉した。
- **conductor による機械的総当たり照合**: 成果物の全 file:line を実ファイルへ突き合わせる。off-by-one を2件自己捕捉した。

## Construction のスケジュール

Bolt 1 → Bolt 2 の直列。各 Bolt はゲート付き。

**所要の見積りは置かない。** `approval-handoff` で確約したとおり、named mob も稼働時間の前提も存在しないため、スケジュールを数値で約束しない（`cid:approval-handoff:c3`）。順序と依存のみを確定する。

## エスカレーション

判断を要する事項（設計判断、スコープ変更、不可逆操作、マージ承認）はすべてユーザーへエスカレーションする。conductor は既決裁定の機械的執行のみ自律で行う。
