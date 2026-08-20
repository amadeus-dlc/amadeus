# External Dependency Map — 260820-fmc-drift-batch

上流入力: `bolt-plan.md`、`unit-of-work.md`、`requirements.md`(FR-X 配送条件)、`components.md`(変更しないコンポーネント境界)、`unit-of-work-dependency.md`(辺2本)、`unit-of-work-story-map.md`(Issue クローズ条件)。

## 外部依存(intent 外)

| 依存先 | 用途 | 可用性リスク | 扱い |
|---|---|---|---|
| GitHub(origin、PR/CI/merge queue) | push-first 検証・squash マージ・Issue クローズ | rate-limit / 障害時は配送遅延のみ(ローカル作業は継続) | gh は optional dependency(loud fail、fail-open 記録) |
| GitHub Actions(blocking CI 集合) | 必須 check の正本 | flake は既知の帰属手順(cross-job 突合 → rerun --failed) | remote CI 正(push-first) |
| Docker(TLC 実行) | U2/U4 の検証で TLC を回す場合 | 本セッションで docker-ok 実測済み | run-model-check.ts 経路、--out は repo 外 |
| bun / mise | ランタイム | 実測済み(build exit 0) | — |

## intent 内の非依存確認

- 他 intent の open PR との交差: なし(着手時の棚卸しは各 Bolt の PR 作成時に再実施 — pre-filing-dup-and-branch-check)
- #3246(モデル新規作成の別 intent): 本 intent と write scope 非交差(未着手のため)
- engine(`amadeus-orchestrate.ts` / `amadeus-state.ts`)への変更: なし — model-map ハッシュピン resync は非発火(unit-of-work.md の実測)

## 待ち行列になる可能性のある外部イベント

なし(承認待ちは walking-skeleton ゲートのみで、full grant の自動裁定対象。マージは常任承認条件で自律)。
