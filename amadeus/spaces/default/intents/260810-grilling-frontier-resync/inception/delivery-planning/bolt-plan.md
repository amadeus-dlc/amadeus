# Bolt Plan — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: delivery-planning (2.8)

上流入力(consumes 全数): `unit-of-work.md`(U1/U2/U3 の完了条件・複雑度 — 各 Bolt の Definition of Done の正本)、`unit-of-work-dependency.md`(依存2エッジ+運用注記 — 直列/並行の根拠)、`unit-of-work-story-map.md`(スライス1 = walking skeleton の対象)、`requirements.md`(FR の AC)、`components.md`(規模割付)。Bolt 編成はユーザー裁定 A(2026-08-10T06:24:31Z、質問票 Q1)。

## Bolt 編成(1 Unit = 1 Bolt = 1 PR、スカッシュマージ)

| Bolt | Unit | walking-skeleton | ゲート | 並行性 |
|---|---|---|---|---|
| Bolt 1 `protocol-core` | U1(spec / L) | **あり** — self-feature の Mandated。単独実行・単独ゲートで、残り Bolt の実行前にユーザーが明示承認 | 単独(承認後にラダー: autonomy = none のため全 Bolt ゲート) | 単独 |
| Bolt 2 `budget-sensor` | U2(library / M) | — | Bolt ごと | Bolt 3 と並行可(ファイル非交差: ts+tests vs md+docs) |
| Bolt 3 `projection-sweep` | U3(packaging / S) | — | Bolt ごと | Bolt 2 と並行可。ただし隔離2回ビルド等の重い検証コマンドは最後に直列実行(運用注記) |

## Bolt 1(walking skeleton)の最小 end-to-end スライス

- 内容: grilling-protocol.md の全面書き直し(骨格マーカー+overlay)+ stage-protocol の Step 3d/§8/semi 除外/:277 説明文 + SKILL.md(Free 既定)+ **t415 の暫定整合**(旧 pin の差し替え最小限 — 完全な新 pin 群と対角実測は Bolt 2 の所掌)+ t199 green(rebuild 込み)。
- 骨格スライスの意味: 「新しい grilling 規律一式が protocol/選択画面/スキルで一貫して読める」を end-to-end で通す。機械検査(センサー3態・遮断器の落ちる実証)と docs sweep は後続 Bolt。
- 検証: FR-PROTO-1 の diff 空実測 / t415(暫定)・t199 green / typecheck・lint。

## Bolt 2 / Bolt 3 の Definition of Done

- Bolt 2: unit-of-work.md の U2 完了条件全数(センサー3態の落ちる実証、VALID_DEPTH_VALUES assert、t415 対角実測、遮断器の落ちる実証)。
- Bolt 3: U3 完了条件全数(語彙 grep 0 hit(-i・対訳キー込み)、build・source-only:check・隔離2回・t199 の exit 0)。

## 実装環境(ソロ運用)

- 各 Bolt は git worktree 分離で実装(solo-bolt-worktree-required)。本セッションはハーネスの worktree 隔離ガード下のため、並行 Bolt は Agent worktree isolation で builder を起動し、conductor が merge-base 起点の一括 apply で取込む(c1-pcp-isolated-session-swarm-incompat の実効経路)。
- 各 Bolt の PR 発行後は converge loop(競合→レビュー→CI)を回す。マージはユーザー承認後に conductor が実行(no-AI-merge)。
- tNNN 予約: t530 以降(RE 確定)。PR 発行前・マージ直前に固定 base SHA で再確認。
