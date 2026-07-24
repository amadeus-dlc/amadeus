# Reliability Requirements — U5 completeness-sensor

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Verdict 契約

- PASSED は map が正常にparseされ、全entryの現行SHA-256が登録値と一致した場合だけ生成する。
- mapの各世代はmodel identityとcfg identityへ結合する。`updateModelMap` はmodel/cfg identityが直前世代から変化しないまま実装hashだけを更新する要求を `MODEL_UNCHANGED` で拒否する。
- map不在、不正、対象不在、読取不能、timeoutは理由付き FAILED とする。
- 同一入力は同一順序の findings と同一 verdict を返す。

## 観測と回復

- dispatcher の `SENSOR_PASSED` / `SENSOR_FAILED` audit 行を正本とし、reason、findings count、対象mapを記録する。
- sensor 自身は自動修復しない。開発者がモデルを更新後、明示的な `updateModelMap` でmodel/cfg identityと実装hashを同時更新して再fireする。更新recordはtemp fileからrenameでatomic publishする。
