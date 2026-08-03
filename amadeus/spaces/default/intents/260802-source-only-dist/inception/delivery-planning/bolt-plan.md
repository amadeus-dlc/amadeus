# Bolt Plan — 260802-source-only-dist

上流入力(consumes 全数): unit-of-work(9 Unit と規模)、unit-of-work-dependency(DAG — Bolt 順序の根拠)、unit-of-work-story-map(価値スライス — Bolt の出荷判定)、components(規模原資)、requirements(移行順序 0→6 の制約)。

## Bolt 編成(1 Bolt = 1 Unit 原則、Bolt 1 のみ skeleton 統合)

| Bolt | Unit | ゲート | 出荷物(PR) | 備考 |
|---|---|---|---|---|
| Bolt 1 | u1-asset-build + u2-installer-asset | **人間ゲート(walking skeleton — org.md 確定)** | PR 2本(u1 / u2 で分割 — 複数 Unit の単一 PR 束ね禁止) | 出荷判定 = draft release へ asset 付与 → installer が asset 経路+checksum 検証で1ハーネス実インストール(G10 / Slice 1) |
| Bolt 2 | u3-scope-promotion | ラダー選択に従う | PR 1本 | 移行順序0。恒久喪失の防波堤 |
| Bolt 3 | u4-hook-dispatcher | 同上 | PR 1本 | bootstrap(a) |
| Bolt 4 | u6-allowlist-canonical | 同上 | PR 1本 | **u5 と promote-self.ts 交差のため u5 より先に直列**(下記交差判定) |
| Bolt 5 | u5-agents-import | 同上 | PR 1本 | bootstrap(b)。Bolt 4 着地後に再接地して着手 |
| Bolt 6 | u7-ci-stage1 | 同上 | PR 1本 | 旧 check 並存のまま build 前段+再現性検査を追加 |
| Bolt 7 | u8-source-only-switch | **人間ゲート(delivery-planning Q1 裁定 — 不可逆級切替)** | PR 1本(原子切替) | 前提: Bolt 1〜6 全着地+クリーン環境検証(移行順序4)の完了報告を添えてゲート |
| Bolt 8 | u9-docs-norms | ラダー選択に従う | 文書 PR 1本+ノルム PR 5点(norm-changes-via-pr、ユーザー承認マージ) | 最終 |

## 並行度と交差判定(c6)

- 並行候補: Bolt 2 / 3 / 4 / 6(ファイル面が非交差: scope 正本 / claude hooks+settings.json / allowlist データ+テスト+promote-self preserved / ci.yml+run-tests)— 同時アクティブ builder は最大4(parallel-bolts)
- **交差の直列化**: Bolt 4(u6 — preserved の import 化)と Bolt 5(u5 — composeRootAgents 廃止)はともに `scripts/promote-self.ts` を編集 → Bolt 4 先行・Bolt 5 は着地後に実 diff で再接地(base-advance-regrounding)。静的目録でなく先行 PR の実 diff で交差を再評価する
- Bolt 1(u1: scripts+release.yml / u2: packages/setup)は Bolt 2〜6 と非交差 — ただし walking skeleton 規範により **Bolt 1 単独・ゲート先行**(残り Bolt の実行前にユーザー承認+ラダープロンプト)
- Bolt 7 は全合流点(DAG の u8 depends_on 全数)。Bolt 8 は Bolt 7 後

## Bolt 実行様式

- Construction は per-unit ループ+swarm(engine の autonomy grant に従う。ラダープロンプトの選択は Bolt 1 出荷後)
- 各 Bolt: worktree 分離(solo-bolt-worktree-required)、TDD 既定、PR 発行 → j5ik2o-gh-pr-converge-loop → マージはユーザー承認(no-AI-merge)
- Bolt 7 のゲート提示には移行順序4(クリーン環境での全ハーネスインストール検証)の実測結果を必ず添付する
