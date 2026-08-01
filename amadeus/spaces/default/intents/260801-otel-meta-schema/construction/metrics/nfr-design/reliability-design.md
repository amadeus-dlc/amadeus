# Reliability Design — U5 metrics

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性要件は requirements.md NFR-1(fail-open)+ FR-MET-3/4 から代替導出。business-logic-model.md(実在)の meter 未登録 no-op 設計(registeredMeterProjectDir 新設)を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 失敗面の分類

- **meter 未登録**(bootstrap 前・metrics arm 未配線環境): 計測点は `registeredMeterProjectDir()` の null 確認で no-op — throw する `getAmadeusMeter`(meter-provider.ts:121-124)を計測点から直接呼ばない(FD 契約)。telemetry 欠落は本体無影響(NFR-1)
- **token usage 供給不在**(supplier 未設定): token 計器のみ記録なし、他4計器は継続(fail-open の per-instrument 独立性)
- **export 失敗**(store 書込エラー): 既存 exporter の失敗処理(ログのみ・本体継続)を無改変で継承
- retry / circuit breaker / failover は非適用 — ローカル file 追記のみで外部依存なし(nfr-design:c1)

## 計測点の非侵襲性

- 計測点挿入は既存経路の制御フローを変えない(add/record は戻り値を分岐に使わない)— 計測の失敗が既存経路の例外にならないよう、計測点は try で遮断し縮退(記録なし)へ倒す

## 検証(落ちる実証)

- meter 未登録・supplier 不在・書込失敗(注入)の3経路で「本体経路が継続し計測のみ縮退」を assert。経路到達は lcov DA で実測確認(error-path-reach-lcov)
