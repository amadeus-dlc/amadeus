# スケーラビリティ設計 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## N/A 継承(多数プラグインへのスケール)

scalability-requirements「プラグイン数少数前提」のとおり、水平スケール・並行合成・ロック機構は **N/A を継承** する。business-logic-model フロー 1 の `discoverPlugins → inspectPlugin × n` は少数前提の同期逐次走査のままとし、並列化・キャッシュ(performance-requirements の非常駐前提と同根)を導入しない。

## 冪等性の設計(反復への耐性 = byte-identical 収束)

scalability-requirements「冪等性という拡張軸」の合否 2 点を、比較基盤の設計で担保する:

- **比較の単位**: 「host bytes・composition record が byte-identical」の判定は、対象ツリーの決定的ハッシュ比較(ファイル列を辞書順に固定した内容 hash)で行う。この比較関数はテストヘルパー側に置き、本番コードへテスト専用分岐を持ち込まない(construction.md Testing Standards)
- **冪等の成立機構**: compose の出力が入力(プラグイン集合+正本)のみの決定的関数であること、および fragment 挿入が「置換」であって「追記」でないこと(既存 engine の合成機構 — BR-U2-1 により再実装しない)による。テストは compose×2 後 bytes = compose×1 後 bytes、fragment 重複 0 を assert
- **baseline 復元**: 最後の drop 後の host ツリー = 0-plugin build の hash 一致(BR-U2-8 / FR-6)。reliability-requirements の recovery 収束と同じ「最新状態への収束」性質の対称面(compose 側と drop 側 — symmetric-pair-review)

## 単一正本からの投影(保守面のスケール)

scalability-requirements「単一正本からの投影」のとおり、claude 面は中立正本 `plugins/<name>/` から `projectPluginForHarness` で派生し、`bun scripts/package.ts` の既存経路に編入する(BR-U2-9)。面数増加に対し件数固定の台帳を新設しない(count-free)。0-plugin 時は投影セクション全体が no-op で byte-identical を維持する(business-logic-model フロー 5 — security-requirements の出力先安全検査は同フローの plan 段に同居)。
