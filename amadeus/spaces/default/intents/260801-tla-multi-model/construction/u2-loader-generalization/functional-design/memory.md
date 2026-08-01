# Memory — functional-design / u2-loader-generalization

## Interpretations

- 2026-08-01T21:00:00Z — component-methods C3「`loadVerifiedTlaSourceInternal` は廃止または薄い互換 wrapper」の選択肢を**廃止**と解釈; 互換 wrapper は暗黙の単一選択 semantics を温存し ADR-4 に反するため。呼出側は repo 内2箇所(tla-model-loader.ts / run-model-check-source.ts)に閉じ同 PR 追随可能
- 2026-08-01T21:30:00Z — **(Review iteration 1 / Finding-1 で上記解釈を撤回)** 呼出側列挙が3箇所(tla-arm.ts を見落とし)で、後者2ファイルは u3 所有・DAG 上 u3 は u2 に依存しないため着順保証なし。選択肢 (a) の**期間限定 shim**(旧 singular export を新パイプライン上の薄い射影として残置、除去条件 = u3 の複数形 API 追随完了)へ変更。BR-S4/BR-S5 改訂、無引数ピンは2段階改訂(`["loadVerifiedTlaSource","loadVerifiedTlaSources"]` → shim 除去後 `["loadVerifiedTlaSources"]`)
- 2026-08-01T21:00:00Z — LoaderDriftReport は新規 export 型を新設せず、u1 の ModuleDeclarationDrift を SourceDriftError.detail へ写像する構造として定義; 新エラー kind 追加は BR-I4 の不変方針に反するため

## Deviations

- 2026-08-01T21:00:00Z — 統合テスト :345-356「map does not register the execution model」ケースを削除し「空 models map は MODEL_MAP_INVALID」へ置換する設計とした; 実行モデル概念の撤廃で旧ケースの前提自体が消えるため。規則は BR-S6 に固定(Review iteration 1 / Finding-2 で BR 反映済み)
- 2026-08-01T21:30:00Z — component-methods C3 の「廃止または薄い互換 wrapper」から shim を選択した結果、u2 の成果物に旧 singular 型・関数が残存する(shim 期間中)。除去は u3 の作業項目として引き継ぐ(business-logic-model §6)

## Tradeoffs

- 2026-08-01T21:00:00Z — u2 単体時点では実 map(MirrorLifecycle aux 未宣言)で loader が赤になるのを許容(BR-D6); 代替案「u2 で宣言追記まで行う」は u4 スコープ侵食のため却下。緑経路は aux 宣言済み fixture で構成し、実 map が緑に戻るのは u4 後
- 2026-08-01T21:00:00Z — 資産読込を「全モデル1回ずつ・結果流用」(単一読込原則)とした; 代替案「照合と返却で2回読む」は TOCTOU 的齟齬の余地があり却下
- 2026-08-01T21:30:00Z — Finding-1 の選択肢 (b)(u3 所有ファイルの追随編集を u2 へ再仕分け + unit-of-work.md 改訂)は上流 artefact 改訂を伴い裁量が大きいため不採用。(a) shim はバッチ内 Unit 横断の破壊を避ける既存ハウス慣行と整合し、除去条件を明示すれば旧 semantics の無期限温存にもならない

## Open questions

- 2026-08-01T21:00:00Z — parser が `models: []` を許容するか(u1 実装の実測で確認。BR-S6 の条件分岐を確定: 許容なら loader 側ガード追加、拒否なら parse 段階失敗で足りガード二重化なし)
- 2026-08-01T21:30:00Z — ~~統合テスト :392 の tla-arm.ts 文字列検査の追随先~~ → Finding-1 裁定で解決: u2 では据置き(tla-arm.ts は shim 経由で旧名を呼び続ける)、u3 の shim 除去時に :392 期待文字列を `loadVerifiedTlaSources()` へ改訂(u3 作業項目)
