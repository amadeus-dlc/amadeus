# RAID Log — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了・依拠)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため不在(expected)

## Risks(リスク)

| ID | リスク | 影響 | 緩和策 | 状態 |
|---|---|---|---|---|
| R1 | fs-tlc-toolchain の実行 provider が sandbox-exec(macOS)前提のため、Linux/Docker 経路の追加時に fail-closed 契約が緩む恐れ | 偽 NOT_DETECTED(検証劇場) | provider 抽象を completion marker + state 統計の検証より下層に置き、契約検証コードを provider 非依存に保つ。落ちる実証を Linux 経路でも実施 | Open |
| R2 | 既成 Docker イメージの供給元変動・放置(更新停止・削除) | CI 恒久赤 | digest 固定 pull + 設計段でのイメージ実測選定(G2)。供給停止時は digest が守るため急な破損はない | Open |
| R3 | プラグイン合成と graph compile の連携が formal-model-check ステージで未実証(test-pro はダミーステージ) | ステージが engine から解決されない | walking-skeleton 相当の最初の Bolt で compose→compile→--stage --single 実行の E2E を最初に通す | Open |
| R4 | .tla 外部化時のバイト差(改行・エンコーディング)でモデル同一性が壊れ、実験結果(7/7)との連続性を失う | 検証能力の暗黙劣化 | 外部化直後に埋め込み版とのバイト一致検証+D4 等の既知欠陥注入で 7/7 再現を1回実測 | Open |

## Assumptions(前提)

| ID | 前提 | 確認方法 |
|---|---|---|
| A1 | TLC 入りの既成 Docker イメージ(JDK 26 系列・digest 固定可能)が実在する | 設計段でレジストリ実測照会(feasibility:c1 — ユーザーに問わず実ツールで検証) |
| A2 | FormalElection の完全探索は Linux コンテナ内でも CI タイムアウト内に完走する | 最初の CI 実行で実測(実験では macOS 30分内に完走済み) |
| A3 | プラグインの stages コピーで配置されたステージファイルは graph compile が拾い、--stage --single で実行可能 | R3 の walking-skeleton E2E で実証 |

## Issues(課題)

| ID | 課題 | 状態 |
|---|---|---|
| I1 | (現時点でオープン課題なし — 前intent 260720-formal-verif-experiment の RAID から本intentへ引き継ぐ未解消項目は、作業ツリー再実測の結果ゼロ: 実験は完了済み・関連 Issue はクローズ済み) | — |

## Dependencies(依存)

| ID | 依存 | 方向 |
|---|---|---|
| D1 | 既決の二層検証態勢(workflow_dispatch 専用ジョブ・一律義務化なし)— 本intentの CI 設計の上位制約 | 上位裁定 → 本intent |
| D2 | plugin 合成エンジン(scripts/plugin-composition.ts)と packager の plugin 投影(scripts/plugin-projection.ts)— 本intentの供給経路 | 既存資産 → 本intent |
| D3 | fs-tlc-toolchain.ts の実行契約 — run-model-check.ts の一般化元 | 既存資産 → 本intent |
| D4 | 外部: 既成 TLC Docker イメージ(A1 で実測確定) | 外部 → 本intent |
