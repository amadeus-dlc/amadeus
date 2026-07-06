# Business Overview — 260705-space-inventory

上流入力: Maintainer 直接指示（2026-07-05 チャット）

## 対象の業務文脈

spaces/default の memory / knowledge / codekb は、全 Intent が参照する共有前提（方法、ドメイン知識、コードベース知識）である。実態とのズレは全エージェントの判断を誤らせる。

## スキャン範囲の判断

refactor scope の focused scan として、対象を spaces/default の intents 以外の全ファイルと、その参照側（.agents/rules/amadeus.md の @include）に限定した。
