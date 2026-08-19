# Performance Test Instructions — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md`(Step 8 の検証集合)と `code-summary.md`(FR 別の着地面実測)、および `inception/requirements-analysis/requirements.md` の Non-functional requirements 節。

## 判定: 適用可能な性能 NFR は存在しない(N/A)

Test Strategy は `Comprehensive` だが、**本 intent には合否を決める性能目標が宣言されていない**ため、性能テストの実体を作らない。

## 根拠

`requirements.md` の Non-functional requirements 節が挙げるのは次の3点だけで、いずれも性能ではない:

1. 追跡ファイルの生成物 drift なし(`bun run build` 後 porcelain 0)
2. 既存 CI ブロッキング集合(typecheck / lint / 再現性 / source-only / graph invariants / test:ci)全 green
3. coverage patch gate green

FR-1〜FR-7 にも、レイテンシ・スループット・メモリ・実行時間の閾値は一つも現れない。本 unit の変更は directive の判別ユニオンに 1 kind を足し、emit サイトの分類を変えるものであり、ホットパスの計算量も I/O 量も変えない。

数値目標が宣言されていない検査を体裁のために作れば、それは合否を判定できないベンチマーク = 検証劇場になる(team.md Forbidden、`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## この判定を覆す条件

次のいずれかが成立したら、本ファイルを N/A 判定から実体のある指示書へ書き換える:

- `requirements.md` または後続の NFR 成果物に、directive 発行経路・`report` 往復・Stop hook の `next` 再 spawn について**数値目標つきの**性能要件が追加される
- `committed` / `done` の分岐が、1ステージあたり定数回でない呼び出し(ループ内・バッチ内の反復)へ移される
- engine の `next` / `report` 応答時間が CI のタイムアウト契約に組み込まれる
