# Performance Test Instructions(intent 260814-fmc-macos-provider)

## 判定: 適用可能な performance NFR が存在しない(N/A)

requirements.md の NFR-1(再現性の維持)・NFR-2(fail-closed)はいずれも性能目標(合否を決める数値閾値)を宣言していない。目標なきベンチマークは検証劇場であり生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## この判定を覆す条件

将来、provider フォールバックの試行順序に時間予算(例: snapshot 締切の合計上限)が NFR として宣言された場合、同じ制御経路を通る短縮可能なタイミングシームとカウンタ検証で構成する(cid:build-and-test:bt-timeout-verification-shape)。
