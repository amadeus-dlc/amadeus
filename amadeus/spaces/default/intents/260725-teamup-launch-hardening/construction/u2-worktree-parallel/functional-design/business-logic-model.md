# Business Logic Model — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U2 の作業項目5件と完了の定義を、下記の処理フローと分岐へ展開した。
- `unit-of-work-story-map.md` — US-5〜US-7 の Given/When/Then を、各フローの受け入れ条件として引いた。
- `requirements.md` — FR-6〜FR-8 / NFR-1 を各ルールの根拠とした。
- `components.md` — U2 が触るコンポーネント表（`create_run` / `rollback_prepared_run` / `CREATED_MEMBERS` の廃止）を、モデル境界とした。
- `component-methods.md` — 並列化の契約（同時実行数上限・失敗報告・RUN_RECORD メタデータの書込所在）を、ルールの詳細へ落とした。
- `services.md` — git の契約（並列 `worktree add` は失敗しないが並列度を上げすぎると劣化する）を、並列度上限の根拠とした。

測定 ref: HEAD `d0287bb87`。

## 対象の性質

本ユニットに業務ドメインは存在しない。対象は **run 準備の実行戦略**であり、「ビジネスロジック」に相当するのは (a) worktree をどの並列度で作るか、(b) 失敗したときに何を巻き戻すか、の2つの判断である。

## 現行フロー: `create_run`（`:1267-1311`）

| # | 手順 | 現在地 |
|---|---|---|
| 1 | ベースコミットの解決とダーティ検査 | `:1268-1279` |
| 2 | `RUN_ID` / `RUN_ROOT` / `RUN_RECORD` の決定と衝突検査 | `:1280-1284` |
| 3 | ディレクトリ作成、run メタデータの書き出し | `:1285-1302` |
| 4 | **メンバーごとに直列で** worktree 作成 + 台帳追記 + メタデータ書込 | `:1303-1310` |

手順4の内側（メンバー1件あたり）:

```
git worktree add -q -b "$branch" "$wt" "$base_commit"   :1305
CREATED_MEMBERS="$CREATED_MEMBERS $m"                    :1306   ← 台帳（親のシェル変数）
mkdir -p "$RUN_RECORD/members/$m"                        :1307
printf '%s\n' "$wt"     >"$RUN_RECORD/members/$m/path"   :1308
printf '%s\n' "$branch" >"$RUN_RECORD/members/$m/branch" :1309
```

**現行の暗黙依存**: `:1305` の成功 ⇒ `:1306` の台帳登録 が同一シェルの連続2行で保証されている。`rollback_prepared_run`（`:1241-1251`）は `:1244` でこの台帳を読む。

## U2 後のフロー

手順1〜3は**変化なし**。手順4のみを並列化する。

| # | 手順 | 変化 |
|---|---|---|
| 4a | メンバーごとの worktree 作成を**同時実行数4を上限に**並列で発行 | 各メンバーの処理はサブシェルで走る |
| 4b | 各サブシェル内で worktree 作成 + `RUN_RECORD` メタデータ書込 | 台帳追記（`:1306`）は**行わない** |
| 4c | 全サブシェルの完了を待つ | — |
| 4d | 1つでも失敗していれば非ゼロで返る | 失敗メンバー名は 4b で stderr へ出す |

### なぜ台帳をやめるか

サブシェル内で `CREATED_MEMBERS` に追記しても**親プロセスへ届かない**（bash のサブシェルは変数を親へ返さない）。一方 `RUN_RECORD/members/<member>/` への**ファイル書き込みはサブシェル境界を越えて残る**ため、メタデータ書込は 4b でそのまま行える。

台帳の代替として、ロールバック時に `RUN_ROOT` 配下を走査して対象を再導出する（ADR-3）。

## 判断1: 並列度（FR-6、ADR-4）

```
WORKTREE_PARALLELISM = 4（固定）
```

feasibility の実測（同一リポジトリ、tracked 11,051ファイル、`.git` 166M、7個作成）:

| 並列度 | 所要時間 |
|---|---|
| 1（直列） | 7.39秒 |
| 2 | 4.88秒 |
| 3 | 4.03秒 |
| **4** | **3.32秒**（再現性 3.32 / 3.72 / 3.61） |
| 7（無制限） | **7.55秒**（直列より遅い） |

**無制限 fan-out は退行である。** 上限を置くこと自体が要件の核心。

## 判断2: ロールバック対象の決定（FR-7、ADR-3）

```
現行: rollback_prepared_run が $CREATED_MEMBERS（親のシェル変数）を読む     :1244
U2後: RUN_ROOT 配下に実在する member ディレクトリを走査して対象を再導出
```

走査の範囲は `RUN_ROOT` 直下の member 名ディレクトリに限定し、`members_for "$TEAM_SIZE"` の集合と突き合わせる（無関係な worktree を消さないため）。

**孤児ディレクトリ**（`git worktree add` が途中失敗して git 登録されていない残骸）は `git worktree remove` が効かないが、現行 `rollback_prepared_run` はループ後に無条件で `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"`（`:1250`）を実行しており、既にカバーされている。追加の実装は不要。

## 状態遷移: run の準備

```
[未作成] ──create_run 開始──> [preparing]（RUN_PREPARING=1、:1286）
                                   │
                     ┌─────────────┴─────────────┐
                     │ 全 worktree 成功           │ 1つでも失敗
                     ↓                            ↓
                [worktree 揃った]            [部分作成]
                     │                            │
                     │                            │ create_run が非ゼロ
                     ↓                            ↓
                [launching]                  handle_exit → rollback_prepared_run
                                                  │
                                                  │ RUN_ROOT 走査で対象を再導出
                                                  ↓
                                             [完全に巻き戻し済み]
```

**[部分作成] からの回復が U2 の主要な正しさリスク**である（RAID R-4）。feasibility の実験では失敗が発生しなかったため未観測であり、**失敗注入で実証する**（FR-7 の受け入れ基準）。

## 失敗の報告（FR-8）

並列実行では複数サブシェルの stderr が交錯する。どのメンバーの作成が失敗したかを一意に特定できる形で出力する。

```
ERROR: worktree add failed for <member>: <path>
```

## 実行時間への影響（NFR-1）

| 構成 | 現行 | U2 後 |
|---|---|---|
| 3人（leader + engineer×2） | 約3.2秒 | 約1.5秒前後 |
| 7人（leader + engineer×6） | **7.39秒** | **3.3秒前後** |

前 intent の実測では3人構成のアタッチ到達時間が 5.87秒 で、うち worktree 作成が約3.2秒（55%）を占めていた。U2 によりこの支配項が半減する。
