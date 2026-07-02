# D004: PR #287 merge finalization

## 背景

B001、B002、B003 の実装と検証を含む [PR #287](https://github.com/amadeus-dlc/amadeus/pull/287) は、CI pass、Cursor Bugbot 指摘 1 件（policy 判定の文字列一致を YAML 構造解析へ修正）の対応、人間 merge（2026-07-01T19:14:45Z、merge commit `2b42d3a5`）を経て基準 branch に取り込まれた。

一方、Intent の finalization（pr.md、PR 列、state.json の完了確定）は未実施のまま残っていた。
この未 finalize 状態は、Issue #309 で実装した検出スクリプト `list-unfinalized-intents.ts` の初回実運用で発見された。

## 判断

1. PR #287 の merge を Construction 完了証拠として採用する。`construction.status` を `completed`、`construction.gate` を `passed` にし、完了確定は同梱スクリプト（`StateScaffold.ts finalization`）で行う。
2. 各 Bolt の `taskGeneration.status` は `ready_for_approval` のまま実装が merge されているが、これは Task Generation Gate の人間承認契約（Issue #306、2026-07-02 確定）より前の cycle だったためである。人間による PR #287 の merge を遡及的な承認として扱い、`status` を `passed` にして本判断を `approval` evidence として記録する。

## 理由

- 3 Bolt のすべての Task が実装され、test-results.md に検証結果が記録されている。traceability と acceptance も verified 相当まで更新済みであり、不足は PR 記録と状態確定だけである。
- PR #287 の merge は人間が実行しており、変更内容全体への人間承認を含む確認として扱える。承認契約の導入前に開始された Intent へ、契約を遡って不合格扱いにしない。

## 影響

- Intent `20260702-internal-skill-policy-alignment` の cycle は Construction まで完了する。
- 検出スクリプトの未 finalize 一覧から本 Intent が消える。
- Issue #284 の残作業（`skill-forge` 監査、`SKILL.md` 英語化）は D003 のとおり後続候補として分離済みであり、本判断はその分離を変更しない。
