# Bolt Plan — 260816-open-bug-batch-7

Bolt 粒度は 1 Unit = 1 Bolt = 1 PR(`requirements.md` 制約、`unit-of-work.md` の 3 unit と 1:1)。3 Bolt は依存なし(`unit-of-work-dependency.md` の 0 エッジ DAG)で**並行実行を既定**とする(Q1 = E-AD-E4E2A566)。walking-skeleton は非適用 — self-fix はインクリメンタル修正スコープであり、org.md「Walking Skeleton」節の既定(bugfix 系はセレモニーをスキップし最初の Bolt も他と同様に実行)に従う(practices-discovery は SKIP のため org 既定へフォールバック)。

## Bolt 1: nsd-provenance(直列 fallback 時の先頭)

- **Units:** `nsd-provenance`
- **Unit 詳細**: kind: library、複雑度 M
- **DoD**: FR-NSD-1(D1 上書き後 AC: events 欠落 trustedSha の読み出しが型付き診断 + 非 0 終了で fail-closed になる negative test、落ちる実証つき)と FR-NSD-2(production 経路の `baseline.json` 参照 0 件)を満たし、PR が必須 CI green + 収束判定で着地
- **確信仮説**: 「bootstrap fallback は退役しても no-silent-drop ゲートの実運用は無傷」— 出荷により events-only 化後のフルスイート green と gate 動作で検証される
- **期待デモ**: events 欠落 negative test の Red→Green 実測ログ + 削除後の gate 実行(exit 0)

## Bolt 2: pi-distribution

- **Units:** `pi-distribution`
- **Unit 詳細**: kind: packaging、複雑度 M
- **DoD**: FR-PI-1(件数フリー一致述語 — D2 読み替え後)、FR-PI-2(2 方向検証: 追跡汚染 0 件 + vendor 非脱落)、FR-PI-3(固定件数ピン 3 本の Red→Green + docs 同期)を満たし、build + 全ハーネス再現性検査 green、PR 着地
- **確信仮説**: 「pi の dogfood self-install 配布は既存 6 ハーネスの配布と同一機構で成立し、§12a reviewer read-only allowlist が .pi 面で有効になる」
- **期待デモ**: promote-self 後の `.pi/agents/` 実在 + reviewer charter の `tools: read, grep, find, ls` 逐語

## Bolt 3: sensor-docs-sync

- **Units:** `sensor-docs-sync`
- **Unit 詳細**: kind: spec、複雑度 S
- **DoD**: FR-SEN-1(07 en/ja の 13 件同期)+ FR-SEN-2(t3028 拡張、落ちる実証: 1 行注入 → Red → revert 残渣ゼロ)を満たし PR 着地
- **確信仮説**: 「07 の matches 表は件数フリー guard の射程に入り、以後のセンサー追加で drift しない」
- **期待デモ**: 注入 Red の実測ログ + 同期後 Green

## 実行形態

- Construction Autonomy Mode は Intent full からの投影で autonomous — engine のバッチ fan-out(1 バッチ = 3 unit、cap は max-parallel-units 解決値)を既定とし、各 unit は worktree 分離 + push-first で PR 化する
- 各 Bolt の実装バッチ組み込み前提: 対象 Issue のクロスレビュー独立 2 名成立(`unit-of-work.md` 横断制約)
