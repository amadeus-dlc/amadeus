# Bolt Plan — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): unit-of-work.md(6 Unit と規模 — Bolt 対応の母体)、unit-of-work-dependency.md(YAML edge block と直列化裁定 — Bolt 順序の導出元)、unit-of-work-story-map.md(価値の流れ — Bolt 順の価値整合確認)、requirements.md(C-3 walking skeleton・FR の Must/Could)、components.md(各 Bolt の規模・所在ファイル(U1〜U8 見積)— Bolt 完了条件の投影コスト(dist 7面・t258)は components.md U1 の投影コスト欄から転記)

## Bolt 編成(Bolt = Unit、1 Bolt = 1 PR — team.md Way of Working 既定)

| Bolt | Unit | 内容 | 依存 | ゲート |
|---|---|---|---|---|
| **Bolt 1** | election-readpath | walking skeleton: `parseElectionFile` 新設(ADR-4)+読み口2箇所改修+election PBT(round-trip/fail-closed/#1459 反例ピン)+election arbitrary。コア改修→dist 7面→PBT 常駐の全配線貫通 | なし | **単独・ゲート付き**(self-feature の walking skeleton 必須ゲート — 出荷後にラダープロンプトで残り Bolt の自律度をユーザーが選択) |
| Bolt 2 | state-pbt | state 2層 PBT + state arbitrary(プロダクション改修なし) | なし(Bolt 1 承認後に着手) | 通常 |
| Bolt 3 | scope-ledger | bug-scope-ledger.md(9件+射程判定) | なし | 通常 |
| Bolt 4 | mirror-property(Could) | t274 property 版+snapshot arbitrary。**着手はトークン・時間の余力判断で construction 時に確定**(scope Q2=B)。未実施でも intent 完了 | なし | 通常(optional) |
| Bolt 5 | cast-guard | AST allowlist ratchet+落ちる実証+ci.yml lint ステップ | Bolt 1(allowlist 初期採取) | 通常 |
| Bolt 6 | pbt-deep-ci | ci.yml workflow_dispatch ジョブ+fixture 再 baseline | Bolt 1・Bolt 2・**Bolt 5**(ci.yml/fixture 共有資源の直列化 — unit-of-work-dependency.md) | 通常 |

- 並行編成: Bolt 1 承認後、Bolt 2/3/4 は並行可(ファイル非交差、同時アクティブ builder ≤4)。Bolt 5 → Bolt 6 は直列。
- Bolt ごとに PR/スカッシュマージ(main ターゲット)。工程記録はチェックポイントコミットで別送し実装 PR を肥大化させない。
- 各 Bolt は `bolt/<unit-name>` 系ブランチの worktree 分離で実装する(ソロでも本線ツリーのブランチ切替をしない — cid:code-generation:solo-bolt-worktree-required)。

## 各 Bolt の完了条件(共通+個別)

- 共通: typecheck / lint / `--ci` スイート / coverage(project/patch/relative)/ complexity green。TDD(C-1)。
- Bolt 1 個別: dist 7面再生成+`dist:check`/`promote:self:check`+`t258-boundary-guard`+ローカル lcov 追加行未カバー0。#1459 反例の shrink 最小反例がテスト固定済みであること。
- Bolt 5 個別: 落ちる実証(in-process 注入+実コーパス1回、赤→revert 不可分)+ formal-verif-ci-baseline 再 baseline。
- Bolt 6 個別: workflow_dispatch 実行での失敗 seed 可視化の確認(ジョブ手動起動1回)+ 再 baseline。
