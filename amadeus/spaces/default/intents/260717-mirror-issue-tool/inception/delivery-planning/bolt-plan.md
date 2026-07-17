# Bolt Plan — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## Bolt 列

| Bolt | Unit | 内容 | ゲート | 規模(unit-of-work.md より) |
|---|---|---|---|---|
| 1 | amadeus-mirror-cli | `scripts/amadeus-mirror.ts`(C1〜C6)+ unit/integration テスト。create→sync→close の end-to-end スライス | **walking skeleton — 常にゲート** | 実装 288〜432行 / テスト 280〜420行 |

## 実行規律

- worktree ベース = main、マージターゲット = main(org.md Construction 規律)
- Bolt 1 完了時に Bolt ブランチ切り出し+PR 発行を明示タスク化(bolt-pr-taskization)、スカッシュマージ
- ラダープロンプト: Bolt 1 承認後に残 Bolt なしのため実質不発(構成上の注記)
- 逸脱は実装前停止(deviation-stop-before-implement)を builder ディスパッチ文言に明記
