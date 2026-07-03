# Memory: code-generation（B004）

## Interpretations

- ci-pipeline の実行条件を真と判断した（parity:check の CI 連鎖組み込みという実変更があるため）。
- 「dogfooding の範囲」は build-and-test 以降とした。エンジンは autonomous モードで presence 免除と park 拒否のガードを示し、workflow 完了まで駆動した。

## Deviations

- examples 再生成は halt-and-ask（CD006）。事前包括承認はコスト消費（個人アカウント）と追加設計を覆わないと判断した。
- エンジンと手動 audit.md の二重記録が build-and-test 以降で発生した。橋渡しイベント（STAGE_COMPLETED、WORKFLOW_COMPLETED の audit.md への追記）で旧 validator との整合を保った。

## Tradeoffs

- workflow 完了（engine 記録）と R010 未充足（examples）が併存する。完了はライフサイクル状態であり、残作業は CD006 と最終 PR 説明で追跡する。

## Open questions

- 生成ハーネス（generate-amadeus-examples.ts）の新アーキテクチャ適応の設計（人間判断後の後続作業）。
- 手動 audit.md の役割はこの Intent で終わり、次の Intent からはエンジン shard が唯一の記録者になる想定。旧 validator の audit.md 要求は次の Intent で v2 契約検査に切り替わることで整合する。
