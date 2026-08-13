# bug(sensors): sensor 実行の真理値表が script-error / bad-output を PASSED へ潰す(fail-open)— 消費側 blocking gate の fail-closed と方向が衝突する

## 背景・対象範囲

sensor 実行結果から verdict を導く真理値表(`packages/framework/core/tools/amadeus-sensor.ts:19-31`、observed `89532174c` で verbatim 確認、以後の main でも無変更)は、異常経路を PASSED へ倒す:

```
//   e) status non-0/non-127 (non-timeout)  → PASSED script-error: exit-<n>
//   f) bad JSON / missing pass  → PASSED script-error: bad-output
```

一方、その verdict の消費側 `verifyBlockingSensors`(現在は Lifecycle Guard Runtime の blocking-sensors adapter、旧 `amadeus-state.ts:1835`)は「未実行・stale = 不明 = 不通過」の fail-closed であり、**同一経路上で fail 方向が衝突**している。sensor スクリプトがクラッシュ(非0 exit)しても壊れた JSON を吐いても、blocking gate には PASSED として届き、ゲートは素通りする。

## 根拠・実測証拠

- 真理値表の実文: `amadeus-sensor.ts:19-31`(分岐 e/f)。Issue #2771 の RE(re-scans/260813-lifecycle-guard-runtime.md §4 G9)およびクロスレビュー reviewer-1(run `xrev-2771-20260813131430`)観測事実 C で file:line + verbatim を実測記録済み
- 消費側 fail-closed の実文(旧 `:1855-1857`): `A blocking sensor that never ran is not a pass.` — 「実行されなかった sensor は pass ではない」と宣言しながら、「実行してクラッシュした sensor は pass」になる非対称
- #2771 実装(PR #2986)ではこの真理値表を要件のスコープ外(「個別ガードが判定するポリシー内容の変更」)として**意図的に無変更で保存**し、回帰テスト `tests/integration/t2771-lifecycle-guard-regression.integration.test.ts` が現挙動をピンしている(要件 FR-7 の既知逸脱として記録)

## 期待結果・完了条件

- [ ] blocking severity の sensor について、script-error(exit-<n>)/ bad-output が PASSED ではなく「不明(不通過)」相当の verdict になる(fail-closed へ整列)。advisory severity の扱いは設計裁定(現状維持も可、根拠明記)
- [ ] 既存の正当な PASSED 経路(正常 exit 0 + well-formed JSON)の判定が変わらないことを回帰テストで確認
- [ ] 真理値表コメントと実装・テストが同一変更で同期される

## 影響・価値

blocking sensor は Stage 完了の前提条件であり、sensor スクリプトの欠陥・環境異常が**無音のゲート素通り**(fail-open)に化ける。#2747 で blocking ゲートを全完了経路へ配線した投資が、sensor 実行層の異常 1 つで無効化されるクラス。

## 関連

- #2771 / PR #2986(Lifecycle Guard Runtime — 本欠陥を既知逸脱として保存・ピン)
- #2689 / #2747(blocking severity 語彙と全完了経路への配線)
- 分類: bug / P2 / S3(既知の設計逸脱、現時点の実害観測なし)
