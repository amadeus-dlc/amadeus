# Components — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 変更コンポーネント(3+テスト2 — 全て既存、新設なし)

| コンポーネント | 層(architecture.md の分離) | 変更 | 規模見積り |
|---|---|---|---|
| packages/framework/core/tools/amadeus-norm-metrics.ts | core 正本(dist×6+self-install 4ハーネス(5ディレクトリ — promote-self managedDirs 実測)投影) | parseGoaLine bin 段のスパース拡張(ADR-1/2)+ECODE_RE 整合(ADR-3)+スキーマコメント更新 | 60-90行 |
| scripts/amadeus-election-record.ts | scripts 配布外 | GOA_LINE_CODE_RE 拡張+:28-31 コメント更新(ADR-3) | 5-10行 |
| scripts/amadeus-election.ts | scripts 配布外 | handleOpen エラーメッセージ更新のみ | 1-2行 |
| tests/unit/t-norm-metrics.test.ts | tests | スパース受理の正テスト群+fail-closed 境界テスト+count 不変対照+ピン反転(:666-671)+**corpus 全数 sweep テスト(extractGoaRecords→parseGoaLine の2段・21 occurrence 両側)** | 100-150行 |
| tests/unit/t238-election-record.test.ts | tests | 複節受理の正テスト追加+**BR-R1 否定アサーション(:96-98)の反転**(:102 圧縮形ピンは温存) | 15-25行 |

合計見積り: **185-280行**(extractGoaRecords 追加分込み)(単一 Unit 妥当 — units-generation で確定)。

## Reuse Inventory(新規機構ゼロの根拠)

- GOA_TOKEN_RE(既存)をセグメント内 bin 検証に再利用 / ParseFailure 型(既存)を fail-closed 拒否に再利用 / 既存 CI ゲート・coverage 機構をそのまま利用(新規ジョブなし)/ E-GMECG 追補の落ちる実証手順(既存定型)。

## 非変更(明示)

checkGoaLine・renderGoaLine・distill 系(collectMetrics/distillCandidates)・store/timeline 系 — ADR-1 の後方互換 shape により追随ゼロ(実装後に grep で無追随を実証)。e2 #1267 面(W-1)非接触。
