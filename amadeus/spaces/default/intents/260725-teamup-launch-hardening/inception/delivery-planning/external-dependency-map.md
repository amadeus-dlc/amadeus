# External Dependency Map — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — NFR-3（actas 排他ロック）と FR-7（部分失敗のロールバック）を主要リスクの根拠とした。
- `components.md` — 変更対象コンポーネントを引き、リスクが顕在化する箇所を特定した。
- `unit-of-work.md` — 各ユニットの完了の定義を引き、リスク緩和の検証点と対応づけた。
- `unit-of-work-dependency.md` — 依存辺ゼロと配布同期の交差を引き、順序決定の根拠とした。
- `unit-of-work-story-map.md` — US-2 の順序制約を引き、Bolt 1 内部順序のリスク根拠とした。
- `team-practices.md` — 落ちる実証・配布同期・検証コマンドの実務を、各リスクの緩和手段とした。

測定 ref: HEAD `304bae2eb`。agmsg は repo 外 read-only（読取 2026-07-25）。

## 外部依存の一覧

| 依存 | 所在 | バージョン管理 | 本 intent での変更 |
|---|---|---|---|
| agmsg スキル | `~/.agents/skills/agmsg/`（repo 外） | **なし**（本リポジトリの管理外） | **変更しない**。呼び出し方（初期プロンプトの形）のみ変わる |
| herdr | 外部 CLI | なし | 変更しない |
| git | システム | なし | 変更しない（`worktree add` の呼び出し方が並列化される） |
| bun / TypeScript / Biome | `package.json` | あり | 変更しない |

## agmsg への依存の詳細（Bolt 1）

本 intent で最も重い外部依存。**契約は agmsg 側が握っており、こちらから変えられない。**

| 依存点 | 契約 | 実測による裏付け |
|---|---|---|
| `delivery.sh set monitor <type> <project>` | delivery mode を `monitor` にする。**actas が watcher を起動する前提条件** | `team-up.sh:876-879`（実行行 `:877`）が既に呼んでいる。feasibility 実験1（未設定）と実験2（設定済み）の対照で前提条件であることを実証 |
| 初期プロンプト `/agmsg actas <role>` | claude-code ドライバの actas フロー（`template.md:143` step 5d）が、delivery mode が `monitor` または `both` のとき `watch.sh <sid> <project> claude-code <role>` を起動する | feasibility 実験2で sentinel が T+32.2秒 に出現 |
| ready sentinel `ready.<team>__<role>` | actas モードの watcher が `watch.sh:307` で書き、cleanup で消す | 実験2で内容（session_id）まで確認 |
| actas 排他ロック | `actas-claim.sh` が事前クレーム。他 live セッション保持時は `status=held` で **abort** | **未検証**（R-2） |

### この依存が壊れる条件

- **agmsg が更新され、actas フローの挙動が変わる。** repo 外・バージョン管理外のため、こちらでピン留めできない。
- **インストール済み `SKILL.md` の actas 節が codex 向け記述である**（`:110-115`）という二層構造。claude-code の挙動はドライバテンプレート側が規定するが、この分離は agmsg の内部事情であり保証されていない。

### 緩和

- 本 intent は agmsg を**変更しない**。実測して合わせるのみ（`cid:application-design:external-seam-vocab-measurement`）。
- 検証が失敗しても**起動自体は完了する**設計（ADR-5: 検証は `mux_attach` の後ろ）。agmsg 側の変化で検証が壊れても、利用者はアタッチして作業できる。
- 検証の失敗は無言にせず、診断メッセージと非ゼロ終了で表明する（no-silent-success）。

## git への依存の詳細（Bolt 2）

| 依存点 | 契約 | 実測による裏付け |
|---|---|---|
| `git worktree add` の並列実行 | 並列実行しても**失敗しない**が、並列度を上げすぎるとスループットが劣化する | feasibility の並列度スイープ: 全並列度で成功 7/7・stderr 0 bytes、並列度4で 3.32秒、並列度7で 7.55秒 |

### この依存が壊れる条件

- git のバージョンによりロック粒度が変わり、並列度4の最適性が失われる。
- 異なるファイルシステム（Linux/ext4 等）で特性が変わる（R-6）。

### 緩和

- 並列度は**上限**として設計する。最適値を外しても、上限があること自体が退行（無制限 fan-out）を防ぐ。
- 失敗しても部分失敗のロールバックが働く（FR-7）。

## 配布物への依存（両 Bolt）

正本 `packages/framework/core/tools/team-up.sh` → `dist/` 6面 + self-install 4面 = 計11コピー。

これは外部依存ではなく**内部の生成物**だが、両 Bolt が同一ファイルを触るため唯一の交差点になる。`bun scripts/package.ts` / `bun run promote:self` で再生成し、`dist:check` / `promote:self:check` で検査する（`project.md` Mandated）。
