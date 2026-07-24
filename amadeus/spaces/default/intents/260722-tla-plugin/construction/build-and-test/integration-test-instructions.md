# Integration Test 手順

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

## 境界テスト

次の実filesystem・process・workflow境界を対象とする。

- compose → doctor → compile → `--single` → drop のplugin lifecycle
- composition record、validated metadata index、drop/recovery journal
- compile後stage body改竄の実行直前拒否
- `run-model-check.ts` のfilesystem/process/artifact publish境界
- `.github/workflows/ci.yml` のdispatch限定formal jobと既存push/PR無回帰
- model-completeness sensorのmanifest → graph → dispatcher → audit
- dist / self-installの全配布面同期

## 実行方法

```bash
bash tests/run-tests.sh --ci
bun run dist:check
bun run promote:self:check
```

局所再現時は、対象pathの実在数とランナーの実行ファイル数を照合する。存在しないtest pathをBunが無音除外した結果をPASS根拠にしない。

## 受入条件

- 515 test files、7,202 assertions、失敗0。
- plugin lifecycleで未compose、index改竄、duplicate slug、body drift、symlinkをfail-closedに拒否。
- drop後の0-plugin baselineがbyte-identical。
- workflowの既存job graphは許容変更以外で不変。
- `plugins/*/plugins/*/stages` と `dist/plugins/*/plugins/*/stages` が0件。

## 環境依存テスト

AWS credentials、Claude substrate、Docker/JDKなど外部前提がない場合は理由付きskipとする。skipを成功した実受入へ昇格させない。TLCの最終GitHub Actions受入はrun `30078685585` の保存証拠と独立verifier結果を参照する。
