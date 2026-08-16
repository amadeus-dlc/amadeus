# Performance Test Instructions — intent 260815-priority-bug-batch-2

## 判定: 適用可能な性能 NFR が存在しない

本書は性能テストの実体を規定しない。これは「適用可能な NFR が存在しないという判定」であり、体裁のためのベンチマークは検証劇場として作らない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## 根拠

- `inception/requirements-analysis/requirements.md` NFR-1(逐語): 「性能目標を新設しない。時間検査はハング検知(余裕 timeout・`scaleTestTime` 経由)のみ」
- 本 intent の FR-3(#3075)はむしろ、NFR trace を持たない壁時計アサーション 24 箇所を削除・緩和・契約コメント化する是正であり(`code-generation-plan.md` / `code-summary.md`)、性能主張の新設はその趣旨に反する
- `tests/perf/` は本 intent のスコープ外(requirements 明記)

## この判定を覆す条件

該当経路(選挙 tally、recompose ガード、監査ロック)のレイテンシ・スループット目標が要件として数値宣言されたとき。その時点で `cid:build-and-test:bt-timeout-verification-shape`(実時間負荷試験でなく短縮可能なタイミングシームとカウンタ検証)に従って設計する。
