# Services — 成果物数値の provenance ガード

上流参照: `requirements.md` の Bun-only・依存追加なし・advisory 契約、`architecture.md` の既存sensor fire実行経路、`component-inventory.md` のmanifest駆動dispatcherとaudit境界。

## サービス定義

新しい長時間稼働サービスは追加しない。実行単位は既存dispatcherから同期起動される、単一の短命Bun CLIプロセスだけである。

| 実行境界 | 責務 | 起動 | 終了 |
| --- | --- | --- | --- |
| Numeric Provenance Sensor CLI | 1成果物をpresent/missing状態へ変換し、pure evaluatorで評価して1 verdictを標準出力へ返す | 既存 `amadeus-sensor.ts fire` がmanifest commandを解決して同期spawn | verdict出力後に終了。判定結果とfile-not-foundはexit codeで表現しない |

## オーケストレーションと通信

既存dispatcherが呼出順序を所有する単純な同期orchestrationである。choreography、event bus、REST、gRPC、非同期job queueは導入しない。

```text
stage output write
  -> existing sensor dispatcher
  -> numeric provenance CLI (stdin/networkなし、flags + filesystem read-or-missing)
  -> verdict JSON on stdout
  -> existing dispatcher audit recording
```

通信contractは `--stage` と `--output-path` の入力flag、および既存sensor verdict JSONだけで完結する。produces keyはsweep時にruntime graphからGenerated Mappingへ投影済みで、runtimeはstageとrecord相対output pathから解決する。dispatcherにsensor固有引数アームを追加しない。

## データ所有とライフサイクル

- 成果物Markdownは既存intent recordが所有し、sensorはread-only consumerである。
- corpus sweep成果物はConstruction recordが根拠の正本として所有する。
- Generated Mappingはbuild対象の新規tool moduleがruntime投影として所有する。
- verdictの永続化は既存dispatcher/auditが所有し、新規CLIはDBやcacheを持たない。
- プロセスは1回の評価で終了し、水平scale、replica、health check、rolling deploymentは非該当である。

## 非該当のプラットフォーム面

AWS資源、クラウドservice、外部API、認証境界、ネットワークport、UI、UX component、永続datastoreは本intentの対象外である。したがってAWS mappingやUI component仕様を追加しない。配布は既存 `bun run build` によるcoreから各harnessへの決定的投影を使う。
