# Logical Components — u8-e2e-acceptance

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| 実測シナリオ S1〜S3 | business-logic-model.md(FR-E1〜E3 と 1:1) | 実測のみ(security の証跡完全性) |
| 実測記録 | domain-entities.md E1(record 配下レポート群) | verbatim+測定 ref(BR-U8-2) |
| audit イベント列 | E2(実 shard・append-only) | 真正性(既存 hook 基盤依拠) |
| 反例トレース | E3(u7 AsImplemented の TLC 実出力) | 検証劇場回避 |

## 依存方向

S1〜S3(実測)→ 記録(E1)。E2/E3 は実測の入力証跡。逆方向依存なし。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | **両層の貫通実測が本 unit の実体** — 日常 CI 面(S1/S2 の advisory 経路)+TLC 面(S3) |
| NFR-2(TDD) | 検証 Unit につき適用外条項(glue 修正は各修正先の TDD 規律 — business-rules.md BR-U8-1) |
| NFR-3(配布同期) | glue 修正が core に触れる場合のみ dist 同期 |
| NFR-4(台帳整合) | glue 修正が台帳に触れる場合のみ remap |
| NFR-5(ゲート実効) | **N/A** — 新設ガードなし。u3 のガード実効・u7 の落ちる実証の「結果」を S3 で消費する側 |
