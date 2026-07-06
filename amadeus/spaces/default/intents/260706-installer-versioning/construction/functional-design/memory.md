<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T13:30:00Z — 判定表を 6 行（bootstrap 3 + 通常 3）へ展開し、WriteAction 語彙を eval の期待値語彙と一致させる方針にした。B001 の「経路は scanObsolete に一本化するが判定は従来同様の無条件削除」という段階化により、B002 の差し込みが判定の有効化だけで済む。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T14:00:00Z — §12a 反復 1 の指摘 9 件（Critical 2 / High 2 / Medium 4 / Low 1）を全件反映した。Critical 2 件はいずれも既存 eval を直撃する回帰リスク: (1) enumerateDist の symlink dir 走査（statSync 基準 + 再帰降下を明記。lstat 素朴実装は .claude/skills/amadeus* の中身を丸ごと取りこぼす）、(2) scanObsolete のディレクトリ粒度の後始末（全エントリ削除時は親 dir も rmSync。BR-13 の !existsSync assertion 対応）。High: scanObsolete の最終シグネチャ + ObsoleteResult 型の定義、導入先走査への amadeus* filter 明記（FR-2.11 保全）。Medium: 判定表と scanObsolete の境界注記、SourceCommitResolver の REL-3 教訓（throw と非 0 の両方を unknown へ）、BR コメントの名前空間衝突回避（BR(#543)-n 形式 = 新 BR-10）、自己導入除外の具体候補 3 点。Low: mergeSettings の既存 pre/post 検証を trackedWrite の外側に残す明記。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-06T14:20:00Z（申し送り、解決済み扱い）— 反復 2 の非ブロッキング注記: 既存 installer eval の assertion 実数は 274（reviewer の fresh 実行で全 GREEN。「271」は inception 由来の古い数値）。B001 の gate 条件は定性的（既存 assertion 全 GREEN）だが、code-generation の記録では 274 を使う。行番号引用ズレ 2 件（REL-3 try/catch = 537〜544 行、mergeSettings 本体 = 339〜437 行）も実装時に関数名で追跡する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
