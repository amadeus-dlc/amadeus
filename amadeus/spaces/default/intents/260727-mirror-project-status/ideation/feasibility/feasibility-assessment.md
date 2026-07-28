# Feasibility Assessment — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): intent-statement

本評価は intent-statement の成功指標(収束性主軸: 手動編集ゼロで drift 0)とスコープ境界(Issue #1560 全体、非対象4項)を前提に、外部前提を実ツールで直接検証した(すべて 2026-07-27 実測、read-only プローブのみ — remote mutation は未実施)。

## 技術的実現可能性(実測ベース)

**判定: GO**(確信度: high。ただし「更新 mutation の成立」のみ実測未了 — 下記参照)

| # | 前提 | 実測方法 | 結果 |
|---|------|---------|------|
| 1 | GitHub 認証と `project` scope | `gh auth status` | ✅ scopes: 'admin:public_key', 'gist', **'project'**, 'read:org', 'repo' |
| 2 | GraphQL API 到達性 | `gh api graphql -f query='query{viewer{login}}'` | ✅ `{"viewer":{"login":"j5ik2o"}}` |
| 3 | Issue → ProjectV2 所属の照会 | Issue #1560 の `projectItems(first:10)` 照会 | ✅ 照会成功(現時点の所属は空 = no-op 経路の実データ) |
| 4 | Project の実在 | org `projectsV2(first:10)` 照会 | ✅ org「amadeus-dlc」に Project「Amadeus」#5(`PVT_kwDOEcw2nM4BeiIO`)実在 |
| 5 | Status フィールド・選択肢の解決 | Project #5 の `field(name:"Status")` 照会 | ✅ `ProjectV2SingleSelectField`(id: `PVTSSF_lADOEcw2nM4BeiIOzhY7lWE`)、選択肢4: Backlog(f75ad846) / In progress(47fc9ee4) / In review(df73e18b) / Done(98236657) |
| 6 | 既存 gateway 様式の拡張可能性 | `packages/framework/core/tools/amadeus-mirror-gateway.ts` 直読(HEAD) | ✅ argv 配列ビルダー(`createArgv`/`editArgv` 等、:97-185)+ envelope パーサー構成。`gh api graphql` も同一様式で追加可能 |

**実測未了(⚠ — 実装時実測が確定条件)**: `updateProjectV2ItemFieldValue` mutation の成立は read-only 方針のため未実測。必要 scope(`project`)は保有済みで公式 docs 上は充足するが、書込の「落ちる実証」を含む確定は construction の walking skeleton で行う(external-seam-vocab-measurement 準拠 — 存在実測のみの段階で確約 ✅ を書かない)。

## 発見事項(要件へ送る論点)

> 2026-07-27 改訂: Issue #1560 がマッピングを「作業進行状態」から「lifecycle フェーズ(Ideation/Inception/Construction/Operation/Done)」へ書き換えたため、本節を再解釈した(Change Request 記録参照)。

- **期待 Status 選択肢が実 Project に不存在**: 改訂後の既定マッピングが要求する選択肢 `Ideation` / `Inception` / `Construction` / `Operation` は、実 Project #5 の現選択肢(Backlog / In progress / In review / Done — 実測 #5)に**存在しない**(`Done` のみ実在)。したがって (a) 運用者が Project 側の Status 選択肢をフェーズ名に再構成するか、(b) Project 別上書き設定で既存選択肢名へ写像するまで、同期は設計どおり safety-blocked になる。選択肢名の照合規則(exact / case-insensitive)と診断メッセージの要件は requirements-analysis でテスト可能に固定する。(旧記載の「In Progress vs In progress の大文字小文字不一致」はこの一般則の一実例へ吸収)
- create 直後は Project 所属が空でありうる(実測 #3 が実例)— Issue の「create 直後 no-op、次の eligible sync で検出」仕様と整合。
- フェーズ写像の同期トリガーは phase boundary を含む(改訂で明示)— 既存 mirror lifecycle の boundary 種別(intent-capture-approved / phase / park / completion)と整合し、新たな実行経路の追加は不要(既存 eligible boundary 内で完結)。
- **(仕様変更 B)item 追加も Amadeus が実行**: 実測で Project #5 の「Item added to project」(Backlog 設定 workflow)はユーザーが無効化済み、「Auto-add to project」も無効化予定と表明。以後の追加経路は Amadeus の `addProjectV2ItemById` のみとなり、同 mutation も未実測集合(R-3)に含めて walking skeleton で確定する。追加対象 Project の設定面が新規要件(requirements で固定)。

## リスク分析(要旨)

詳細は raid-log.md。上位リスク: (1) Issue 本文更新と Project Status 更新が別 mutation で部分成功が構造的に起こる(Issue が pending/reconcile 設計を既定) (2) GraphQL rate limit / 一時障害(既存 gateway のエラー分類 :492-493 に GraphQL 面を追加する必要) (3) 選択肢名照合の構成エラー(safety-blocked 設計で吸収)。いずれも Issue #1560 の失敗・再試行セマンティクスで設計済みの範囲であり、実現可能性を損なわない。
