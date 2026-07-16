# 260709-canonical-settings 再スキャン記録

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260709-canonical-settings` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | 既存 CodeKB に対する diff-refresh |
| Base commit | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` |
| Observed commit | `e55cc25143717d84b3e7f1a543151f0b7c99b96f` |
| 距離 | 58 commits |
| 観測日 | 2026-07-16 |
| Focus | 型付き canonical settings 基盤（#623）の観測面 — 設定配置可能性、doctor 統合、既存 parse/validation 様式、JSON ロード様式、共通挙動設定の分散状況、dist/self-install 同期経路、env var 責務境界 |
| 実施体制 | Developer code scan → Architect synthesis の直列実行（cid:reverse-engineering:c3） |

## Base 選定と到達可能性

既存 `re-scans/*.md` の全 Observed commit を候補とし、各候補について `git merge-base --is-ancestor <candidate> e55cc25143717d84b3e7f1a543151f0b7c99b96f` を実行した。観測 HEAD の祖先である候補のうち `git rev-list --count <candidate>..HEAD` が最小のものとして `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（前 intent `260713-swarm-driver-migration` の observed、距離58）を採用した。

非祖先の候補（squash merge 後の別系譜 SHA）は base 候補から除外した。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer に限り用い、差分 base の真実源には使用していない（E-L63 の base 選定2則、cid:reverse-engineering:rescan-base-ancestry に準拠）。

祖先性・距離はいずれも Developer scan（`inception/reverse-engineering/scan-notes.md`）が `git rev-parse HEAD`／`git merge-base --is-ancestor`／`git rev-list --count` で実測済みであり、observed=`e55cc25...` は現 HEAD と一致確認済み。

## 差分の焦点所見

### 区間 diff の要約

- 区間規模は大きい（519 files, +98136/-1659）。主因は **upstream-v2 移行**（`amadeus-migrate.ts` +3823行の新規、`t224/t225/t226/t227` 等の移行テスト大量追加）であり、**本 intent（canonical settings）に直接関係する新規機構は区間内に存在しない**。
- 本 intent 観測面に関わる区間内変化で意味があるもの:
  - `.claude/tools/amadeus-utility.ts`（+275/-）— doctor に health-check row が増加（移行 doctor `AMADEUS_MIGRATION_DOCTOR` 分岐等）。`handleDoctor` の行構造・exit code 方針自体は不変。
  - `.claude/tools/amadeus-stage-schema.ts`（+69/-）— parse/validation の様式は不変（REQUIRED/OPTIONAL/RESERVED の三分、判別ユニオン `ValidationResult`）。
  - `.gitignore` は区間内で amadeus 関連パターンの意味変化なし（設定ファイル配置に影響する変更なし）。
- 結論: 設定ローダを新設する土台（既存 parse 様式・JSON ロード様式・doctor 行様式・env 読み様式）は base 時点で確立済みで、区間内で破壊的変化なし。

### フォーカス面ごとの現行事実（file:line は observed HEAD 実コード直読）

1. **設定配置**: `amadeus/spaces/default/` 直下は `codekb/`／`intents/`／`knowledge/`／`memory/` の4つのみで `settings.json` 相当は不在。`.gitignore:47-58` の amadeus パターンは cursor／machine-local runtime／intent 配下 `.amadeus-*` に限定され、`amadeus/spaces/<space>/settings.json` 等の新設 settings はどのパターンにも一致せず ignore されない（コミット可能、追加 gitignore 不要）。
2. **doctor 統合**: row 型 `DoctorCheck{pass,label,fix?}`（`amadeus-utility.ts:407-411`）、`handleDoctor(:676)` が `results.push` で追加、`process.exit(failed>0?1:0)`（:1958）でどの row fail でも exit 1。既存 `AMADEUS_DEFAULT_SCOPE` row（:875-892）が拡張の雛形。純関数 `export function xxxCheck(projectDir):DoctorCheck` が in-process テスト可能な既習様式。
3. **parse 様式**: 厳格＝`amadeus-stage-schema.ts` の判別ユニオン `{valid:true;data}｜{valid:false;errors[]}`（:55-57）＋ `KNOWN_FIELDS`（:120）＋ 未知キーは `errors.push(\`unknown key: ${key}\`)`（:163、throw しない）／寛容＝`amadeus-rule-schema.ts` の未知キー許容（:39）＋ 不正時 `throw new Error`（:69/:72）。doctor 接続には stage-schema 型が最も容易。
4. **JSON ロード**: `JSON.parse(readFileSync) as unknown` + 構造ガード（`readIntentRegistry` `amadeus-lib.ts:1496-1509`、:1503-1507 は try/catch で `[]` 寛容フォールバック）、書きは `writeFileAtomic`（2-space+末尾改行、:1481 等）、path は `AMADEUS_*` env-seam（`scopeGridPath()` `amadeus-graph.ts:307`）。欠損の扱いは用途で「[] 寛容 / 再生成 / fail」に二分。
5. **共通挙動設定の分散**: どの settings/config ファイルにも重複記述されておらず、挙動は3系統に分散 — CLI フラグ `--depth`／`--test-strategy`（`amadeus-orchestrate.ts:396-400`, :448-449）、env `AMADEUS_DEFAULT_SCOPE`、state `Construction Autonomy Mode`（`amadeus-orchestrate.ts:722`, `amadeus-bolt.ts:807`）。`.claude/settings.json.example`・`.codex/config.toml.example` に depth/test-strategy/autonomy キーは無い（`grep -c`=0）。
6. **dist 同期**: 正本は `packages/framework/core/tools/`（`CORE_ROOT` `package.ts:56-57`）。`core/tools/` に新設 `amadeus-<x>.ts` を置けば manifest 発見（:64-71）で全 dist に自動搭載、`promote:self`（`promote-self.ts:300`）で self-install 同期、`dist:check`/`promote:self:check` でガード。手動 dist 編集は Forbidden。
7. **env var 責務境界**: 約40の `AMADEUS_*` の大半は path-seam/テスト用。挙動既定に使う実例は `AMADEUS_DEFAULT_SCOPE`（settings.json env 由来、`amadeus-utility.ts:871`「project-default scope from settings.json env」）のみで、これが canonical settings チャネルの唯一の既存 precedent。depth/test-strategy/autonomy に env var は無い。

### 修正済み/stale 検出結果

- codekb の本 intent 観測面（設定配置・doctor・parse・JSON・env・dist 同期）に **stale 記述は検出されなかった**。`architecture.md:13,:175,:179-180`・`business-overview.md:37`・`api-documentation.md` は既に `packages/framework/core/`／`packages/framework/harness/<name>/` の3層構造を正しく反映している。
- 参考（codekb 外・ルール層の注意）: `memory/project.md` の "Way of Working"／Mandated は依然 `core/`／`harness/<name>/` を編集正本と表記するが、実配置は `packages/framework/core/`／`packages/framework/harness/<name>/`。この不整合は **base より前**に生じた既存事項で、本 intent の range 外・codekb 外の memory ルール保守事項。事実記録に留める（修正判断は intent スコープ外）。

## CodeKB 更新表

| 成果物 | 更新内容 |
| --- | --- |
| `code-structure.md` | 「canonical settings 観測面（intent 260709-canonical-settings、2026-07-16、最新）」節を先頭新設。フォーカス面1〜7（設定配置・doctor 統合・parse 2 posture 対比・JSON ロード4点・3系統分散棚卸し・dist 同期経路・env var precedent）を file:line 付きで転記。既存の swarm driver 節見出しを「最新」→「履歴」へ降格（c3-relabel） |
| `reverse-engineering-timestamp.md` | 本 intent の最新 freshness metadata 節を先頭新設し、旧「最新: 260713-swarm-driver-migration」を「履歴: 260713-swarm-driver-migration」へ降格（cid:reverse-engineering:c3-relabel） |
| `re-scans/260709-canonical-settings.md` | 本ファイル（per-intent re-scan 記録） |

他成果物（`architecture.md` / `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md`）は Developer が本 intent 観測面で stale なしと判定し、base→observed で本 intent 観測面に構造変化・挙動欠陥を伴わないため温存（churn 回避、cid:reverse-engineering:c1）。

## 未解決ギャップ（後続ステージへ持ち越す設計判断）

- canonical settings ファイルの **配置場所**（`amadeus/spaces/<space>/settings.json` か workspace ルート `amadeus/settings.json` か、あるいはコンパイル済みデータか手編集正本か）は Application Design で確定する必要がある。dist 同期の扱い（`COMPILED_DATA` 相当 vs core/memory verbatim copy 経路）が配置判断に連動する。
- ローダの **parse posture**（未知キーを errors 集約する stage-schema 型か、throw する rule-schema 型か）は「ユーザー編集ファイルの前方互換をどう扱うか」の設計判断。doctor へ流すなら stage-schema の判別ユニオンが最も接続容易。
- 設定と既存3系統（CLI フラグ・`AMADEUS_DEFAULT_SCOPE` env・`Construction Autonomy Mode` state）の **precedence（優先順位）と責務境界** の確定。既存の `AMADEUS_DEFAULT_SCOPE` resolve 順「引数→env→既定」（`amadeus-orchestrate.ts:560,:574`）が参照 precedent。
- doctor 統合 row の **検証範囲**（未知キー・型不正・invalid 値をどう fail 表示するか）と `AMADEUS_DEFAULT_SCOPE` row（:875-892）拡張形の確定。

## 参照

- Developer code scan: `amadeus/spaces/default/intents/260709-canonical-settings/inception/reverse-engineering/scan-notes.md`
