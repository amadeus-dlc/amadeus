# 開発手順

この文書は、Amadeus 本体を Amadeus DLC で開発するときの標準手順を扱う。

個別 Intent の詳細な成果物、判断、追跡は、対象 Intent の phase ディレクトリ配下に記録する。

## 前提

- 作業は GitHub Issue を起点にする。
- target workspace は、Amadeus 本体リポジトリから切った別 `git worktree` を推奨する。
- build workspace、host environment、target workspace、target artifacts を分けて扱う。
- 対象 Intent の `state.json`（schemaVersion 2）の phase、currentStage、phaseGates を確認してから作業を進める。
- 変更種別ごとの完了条件は [steering/policies.md](steering/policies.md) に従う。

## 手順

1. GitHub Issue を確認する。
2. Issue の目的、対象、対象外、受け入れ条件を読み、作業範囲を決める。
3. target workspace を別 `git worktree` として用意する。
4. target workspace で `.amadeus/README.md`、`.amadeus/steering.md`、`.amadeus/intents.md` を読む。
5. `amadeus` skill の Intake で、既存 Intent への継続または合流か、新しい Intent の Birth 提案かを判定する。新しい Intent は人間の承認後に作る。
6. `amadeus` skill のルーティングに従い、`state.json` が解決した次ステージの内部 skill で成果物を作成または更新する。
7. 実装や文書変更を行う前に、対象の変更種別と完了条件を確認する。
8. `.amadeus/` 成果物を作成または更新した場合は、`amadeus-validator` で対象 workspace と対象 Intent を検証する。
9. 標準検証として `npm run test:all` を実行し、結果を対象 Intent または PR 説明に記録する。
10. phase 境界または Bolt 境界の PR を作成し、対応 Issue と対象 Intent をリンクする。
11. CI、review comment、review thread を確認し、妥当な指摘を反映する。
12. 指摘へ対応した場合は、GitHub 上で返信して review thread を解決済みにする。
13. merge は人間が実行する。merge 後、`amadeus` skill が phaseGates または Bolt gate へ approval evidence を記録する。

## phase ごとの進め方

phase とステージの契約は [docs/amadeus/lifecycle/](../docs/amadeus/lifecycle/overview.md) に従う。

| phase | 目的 | 完了時に確認すること |
|---|---|---|
| Ideation | Intent の目的、スコープ境界、スコープバックログ、実現可能性を整理する。 | scope が実行対象にするステージが completed または skipped で、phase PR の merge を `phaseGates.ideation` に記録している。 |
| Inception | 要求、必要なストーリーとモック、アプリケーション設計、Unit の依存 DAG、Bolt 計画を整理する。 | Units と Delivery Planning まで追跡でき、phase PR の merge を `phaseGates.inception` に記録している。 |
| Construction | Bolt 単位で設計を具体化し、実装、ビルド、テスト、必要な CI 整備を進める。 | 各 Bolt の gate（PR merge）と Stage 3.7 の完了または skip を記録し、`status` が completed である。 |

scope（bugfix、refactor など）が SKIP にするステージは実行しない。
scope とステージの対応は [docs/amadeus/lifecycle/scopes.md](../docs/amadeus/lifecycle/scopes.md) に従う。

## PR 準備条件

- 対応 Issue と対象 Intent がリンクされている。
- 対象 workspace と対象 Intent が validator で pass している。
- `npm run test:all` の結果が記録されている。
- 変更種別ごとの必須条件が満たされている。
- skill 変更では、挙動差分の要約、skill-forge 確認の記録、粒度制約の確認が必須条件に含まれる。詳細は [steering/policies.md](steering/policies.md) の変更種別表と判断基準に従う。
- 後続 Intent に渡す項目が、スコープバックログ、traceability、decisions のいずれかに記録されている。

## レビュー対応

- CI エラーがある場合は、コメント対応より先に CI エラーを解消する。
- review comment は、Issue と Intent の範囲に合うかを確認してから対応する。
- 妥当な指摘は、成果物またはコードへ反映してから返信する。
- 妥当でない指摘は、非対応の理由を返信する。
- 目的と異なるが有効な指摘は、後続 Issue 化してスコープ外にする。
- 対応済みの review thread は、返信後に解決済みにする。
