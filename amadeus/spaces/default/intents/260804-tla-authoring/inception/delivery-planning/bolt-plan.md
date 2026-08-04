# Delivery Planning: Bolt 計画

`delivery-planning-questions.md` の人間回答（Q1: walking-skeleton-first + risk-first hybrid、Q2: 1 unit = 1 Bolt + 並行バッチ、Q3: TLC 実行環境を gated item として記録）に基づく Bolt 順序。unit と依存 topology の正本は `inception/units-generation/unit-of-work.md` / `unit-of-work-dependency.md` / `unit-of-work-story-map.md`、要求は `inception/requirements-analysis/requirements.md`、設計は `inception/application-design/components.md`。team-practices は `memory/team.md`（parallel-bolts 既定）と `memory/project.md`（walking-skeleton 規範、ソロ Bolt でも worktree 分離）に従う。`stories.md` / mockups / team-formation 成果物は SKIP により存在しない（設計どおりの欠落）。

## Bolt 順序（6 Bolt / 4 バッチ）

| バッチ | Bolt | Unit | 並行 | ゲート |
|---|---|---|---|---|
| 1 | Bolt 1 | U1 `tla-evidence-foundation` | 単独 | **walking skeleton — 常時ゲート**（人間承認必須） |
| 2 | Bolt 2 | U2 `applicability-hold` | Bolt 3・4 と並行 | autonomy mode に従う |
| 2 | Bolt 3 | U3 `authoring-referees` | Bolt 2・4 と並行 | 同上（バッチ単位） |
| 2 | Bolt 4 | U6 `import-closure-guard` | Bolt 2・3 と並行 | 同上（バッチ単位） |
| 3 | Bolt 5 | U4 `registration-committer` | 単独 | autonomy mode に従う |
| 4 | Bolt 6 | U5 `authoring-stage-e2e` | 単独 | autonomy mode に従う |

（questions ファイルの Q2 選択肢 A の「計 5 Bolt」は誤記で、正しくは 6 Bolt / 4 バッチ — バッチ構成そのものは選択どおり。）

## 各 Bolt の定義

### Bolt 1: U1 tla-evidence-foundation（walking skeleton）

- **証明する層**: identity 正規化（C2）→ evidence store の build → verify → read（C4）の縦貫。content-addressing、predecessor 連鎖（root marker）、一時領域確定 → 最終配置の原子性、terminal route receipt / full bundle の 2 kind。
- **Definition of Done**: `tla-authoring.ts identity` / `bundle` が golden fixture で green。unit + integration テスト（正常・欠落・digest 不一致・改竄 fixture を含む）。lint / typecheck / 既存スイート無回帰。
- **確信仮説**: 「stable ID 単位 digest と content-addressed store が、この repo の Bun toolchain 上で決定論的かつ原子的に機能する」— 以降の全 unit の基盤前提を最初に実証する。
- **期待デモ**: fixture requirements 断片から identity digest 群を計算し、terminal route receipt を build → verify → read で往復。

### Bolt 2: U2 applicability-hold（バッチ 2）

- **Definition of Done**: 判定 4 分岐 + receipt 生成 + C9 hold 判定表が fixture で green。**着手前に §11a checkpoint の fail-closed 機械強制を実読確認**（application-design レビュー FOLLOW-UP-1。否定なら halt して ADR-6 再裁定を人間へ）。advisory code の plugin.json 宣言。
- **確信仮説**: 「既存 advisory checkpoint 機構に plugin 側評価器を載せるだけで、engine 無変更のまま hold を強制できる」（ADR-6 の最大リスク前提の検証）。
- **改訂追記（2026-08-04T18:29:01Z 人間裁定）**: DoD の実読確認は functional-design U2 冒頭で前倒し実施済み — 前提「plugin.json 宣言だけで結線でき engine 変更不要」は否定され、halt → ADR-6 再裁定は既に発火・解決済み（宣言駆動化へ改訂）。確信仮説は「checkpoint 機構（発火点・解除規則）無変更のまま、advisory 供給面の宣言読取一般化（小さな engine 変更）で hold を強制できる」へ読み替える。Bolt 2 着手時の実読確認ステップは完了済みとして扱う。
- **期待デモ**: applicability receipt 不在の fixture で hold verdict、current な terminal receipt で no-hold verdict。

### Bolt 3: U3 authoring-referees（バッチ 2）

- **Definition of Done**: trace coverage の 3 欠陥全数列挙と proof 5 条件の評価が fixture で green。既存 TLC toolchain の child process 契約を無変更で再利用（ローカル TLC で実測）。
- **確信仮説**: 「falling / vacuity proof の評価を既存 toolchain の再利用だけで構成できる」（TLC 再実装ゼロの検証）。
- **期待デモ**: 未対応 stable ID を仕込んだ fixture で coverage failure の全数列挙。

### Bolt 4: U6 import-closure-guard（バッチ 2）

- **Definition of Done**: 再帰 import 走査 guard が projection に組み込まれ、`tla-model-receipt.ts` / `tla-module-deps.ts` の manifest 修復が完了。既存欠落を検出する red fixture → 修復後 green。`bun run build` の source-only / reproducibility 検査を通過。
- **確信仮説**: 「掲載漏れクラス全体を build 時に fail-closed 検出できる」（M7/M8 の BLOCKER 候補の恒久解消）。
- **期待デモ**: manifest から module を 1 つ抜くと build が欠落全数列挙で失敗する。

### Bolt 5: U4 registration-committer（バッチ 3）

- **Definition of Done**: 前提全数検査 + atomic replace + 競合検知（concurrent-modification 拒否）が fixture で green。model-map の bundle 参照フィールドが既存 exactObject 制約・completeness sensor と両立（実読確定を含む — ADR-3 明示タスク）。既存 2 モデルの回帰 green（FR-013）。
- **確信仮説**: 「登録の可視化点を atomic replace ただ一つに絞っても、既存 schema/sensor と互換を保てる」。
- **期待デモ**: stale evidence fixture での登録拒否と、全前提 current での登録成立。

### Bolt 6: U5 authoring-stage-e2e（バッチ 4）

- **Definition of Done**: authoring stage 文書が stage protocol 準拠で配布面に投影される。未知題材（swarm unit-pool ライフサイクル）の E2E が composed runtime で、判定 → authoring → trace → proof → review → 承認 → 登録 → 既存 `formal-model-check` 実行 → 相関 verdict まで実測 green、missing import ゼロ（AC-007）。
- **確信仮説**: 「要求から verdict までの価値鎖が、実在の未知題材で一続きに機能する」（Issue #2161 の M7 の実証）。
- **期待デモ**: swarm unit-pool の要求断片から新規 `.tla` 登録と verdict 取得までの一気通貫実行。

## 実行規約

- 全 Bolt は git worktree 分離で実装する（`memory/project.md` solo-bolt-worktree-required）。
- walking skeleton（Bolt 1）の承認後に ladder prompt（autonomous / gated）を 1 回だけ提示する（stage-protocol の Construction ゲート規約）。
- 失敗はモードに関わらず halt-and-ask（stage-protocol §1）。

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`（AC → unit 対応）
- `inception/application-design/components.md`（C1〜C9）、`inception/requirements-analysis/requirements.md`（FR/AC）
- `inception/delivery-planning/delivery-planning-questions.md`（Q1〜Q3 の人間回答）
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`
