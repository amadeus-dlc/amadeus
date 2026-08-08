# Team Allocation — 260807-stage-perf-report

上流入力(consumes 全数): unit-of-work(U1 の複雑度 M を担当量の根拠として消費)、unit-of-work-dependency(単一 Unit・依存なしを単独担当の根拠として消費)、bolt-plan 前提の requirements(FR/NFR の検証責務帰属に消費)、components(実装コンポーネント C1〜C9 の担当範囲確認に消費)、unit-of-work-story-map(スライス分担の不在確認に消費)。team-formation(1.5)は本スコープで SKIP のため名前付き mob は存在しない — 捏造せず既定割当を適用

## 割当(全 1 Bolt)

| Bolt | 担当 | レビュー | 備考 |
|------|------|----------|------|
| Bolt 1: stage-stats-cli | amadeus-developer-agent(AI、ソロモード conductor がディスパッチ) | §12a reviewer(code-generation ステージ宣言のレビュアー)+ 人間ゲート | walking-skeleton ゲート付き |

## 運用形態(ソロモード)

- ソロモード(AMADEUS_OPERATING_MODE 未設定)のため、conductor が builder ディスパッチ・レビュー回収・ゲート提示を工程ごとに順次担う
- 自己実装の自己レビュー禁止(team.md role-model)は §12a reviewer subagent の分離で担保する
- PR マージは人間承認後に実行(no-AI-merge)
