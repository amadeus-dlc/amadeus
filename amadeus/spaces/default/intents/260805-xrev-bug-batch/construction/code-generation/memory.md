<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-06T06:20:00Z — agent persona はハーネス中立（`packages/framework/core/agents/*.md`）で各ハーネスへ投影される。
  したがって pi セッションから core 投影の persona で §12a reviewer を dispatch することは「別ハーネス投影で同じ
  persona を走らせる」ことであり、persona の捏造ではない。判断の分水嶺は persona の出所（core 正本か否か）であって、
  dispatch するハーネスではない。
- 2026-08-06T06:20:00Z — #2355（突合軸を batch 番号→Unit 名へ変更）と #1953（stale 実績の誤受理）は排他ではない。
  前者は偽拒否、後者は誤受理を塞ぐ。Unit 名軸でも replan で同名 unit が再登場すれば世代衝突は残るため、
  上流の設計変更後も本 unit の要件は生き残ると判断し、新軸の上へ再実装した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-06T06:20:00Z — 本 unit（fix-1953）は builder 未着手のまま park されていたため、他 5 unit の builder
  ディスパッチと異なり conductor が worktree 隔離で直接実装した。ゲートで開示済み。
- 2026-08-06T06:20:00Z — intent の workspace は claude-code インストールだが、実行セッションは pi。§12a reviewer は
  pi の subagent 機構で core persona を read-only（read/grep/find/ls）に絞って dispatch した。
  `complete-review` の検証は persona 名一致のみのため、独立性はツール制限と別プロセス起動で担保した。
- 2026-08-06T06:20:00Z — engine が #2358（全 unit 被覆後にゲートを再発行できない）で詰むため、directive の再取得に
  「成果物を一時退避して `next` を1回発行し、直後に復元する」決定的手順を用いた。directive の内容は成果物の有無に
  依存しない（unit/produces/gate は計画から導出）ことを確認したうえで実施。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-06T06:20:00Z — FR-5e の SR-1（carrier approve が swarm ガードを迂回する経路）は requirements が
  「スコープ外・別起票」と規定したが未起票。intent 完了前に起票するか次 intent へ送るかの裁定が要る（reviewer FOLLOW-UP）。
- 2026-08-06T06:20:00Z — FR-5d の「非0 exit」は in-process approve（error directive）までを測定。
  directive→CLI exit の写像は build-and-test で名指し経路上の確認が要る（reviewer FOLLOW-UP）。
