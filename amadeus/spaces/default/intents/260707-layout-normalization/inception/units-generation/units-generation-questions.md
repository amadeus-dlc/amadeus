# Units Generation Questions

## 質問生成の判断

追加質問は生成しない。`application-design` で staged mixed layout が承認され、`requirements` と `decisions` が unit boundary を十分に定義しているためである。

## Decomposition Plan

- Unit boundary strategy: repository architecture decision の成果物単位で分割する。
- Estimated unit count: 4 units。
- Dependency structure: U1 Layout Decision Record を source of truth とし、U2/U3/U4 が U1 に依存する。
- Deployment model: runtime deploy なし。documentation-only / validation-only / planning-only。

## 未回答質問

現時点で unit DAG を止める未回答質問はない。Delivery Planning がこの DAG を使って経済的な Bolt sequence を決める。
