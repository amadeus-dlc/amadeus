# Code Generation Plan — u5-advisories-channel

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD L1〜L5・BR-U5-1〜7 準拠)

1. **BR-U5-1 消費側棚卸しを実装前に完遂** — `next` stdout の全 parser を repo grep で列挙し、strict parser の有無で停止判定。
2. **E1** `Advisory = { plugin, code: "changed"|"never-run", message, stage }` を生成側(amadeus-plugin-activation.ts)所有で新設、directive 合成側は import 消費(canonical 1 定義)。
3. **L3** `ACTIVATION_ADVISORY_STAGES = {requirements-analysis, functional-design, build-and-test}` へ集合化し、**2 経路配線**(emitForSlug 主経路+emitSingleRunStage --single 経路)。
4. **L4** run 単位ラッチ(machine-local runtime 配下、fail-open — BR-U5-3)。
5. **L5** stdout: `advisories` フィールド(非空時のみ)/ stderr: 既存 1 行併用維持 / stage-protocol.md へ conductor 提示規範追記。
6. **BR-U5-4 TDD**: t378(directive フィールド)+t381(発火点+ラッチ)の Red→Green vertical slice。**BR-U5-5 落ちる実証**: 実行時消費行への注入 4 種。
7. **BR-U5-7**: :1295-1299 の stale コメント(単一呼出し site 前提)を 2 経路+ラッチの実態へ明示改訂。
8. **BR-U5-6**: 検証コマンド一式+dist 7 ハーネス+self-install 再生成を同一 PR に同梱。
