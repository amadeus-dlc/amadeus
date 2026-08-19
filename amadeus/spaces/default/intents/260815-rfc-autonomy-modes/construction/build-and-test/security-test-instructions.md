# セキュリティテスト手順 — intent 260815-rfc-autonomy-modes

## 上流入力

- `code-generation-plan`(13 unit 分): `<record>/construction/<unit>/code-generation/code-generation-plan.md`
- `code-summary`(13 unit 分): `<record>/construction/<unit>/code-generation/code-summary.md`


## 判定: 適用可能なセキュリティ NFR は存在するが、いずれも既存の fail-closed 契約テストで検証する

本 intent の要件成果物(`<record>/inception/requirements-analysis/requirements.md` `## Non-Functional Requirements` :73-79)が宣言するセキュリティ性の NFR は次の 3 つで、いずれも**数値目標ではなく契約**である。

1. **fail-closed 保存** — 新分岐は無音バイパス・環境変数逃げ道を作らない(stage 文書の既存契約保存)
2. **後方互換レイヤー禁止** — 旧 `solo-election.trigger.mode` はシムでなく loud fail で置換
3. **監査・attestation の append-only / 非偽装**(team.md P2)

脅威モデル面では設計裁定 Q8(自己 park 脅威 — ワークフロー自身が park を悪用して人間ゲートを回避しないこと)が該当する。

## 検証方法

新規のセキュリティスイートは作らない。上記契約は、対応する contract test / directive test で検証する。

| NFR | 検証面 | テスト |
|---|---|---|
| fail-closed 保存(presence 封鎖) | `approve-batch` / `gate-presence` の一様 fail-closed(D7/D8、FR-12) | `tests/integration/t-approve-batch-presence-guard.integration.test.ts`、`tests/unit/t188-human-presence-gate.test.ts` |
| fail-closed 保存(semi の権限) | 宣言 semi 下で gate-revision recovery が外れないこと(R-22) | semi-authority-projection unit の追加・変更テスト(PR #3146) |
| 後方互換レイヤー禁止 | 旧 config キーの loud fail | `tests/unit/t431-structured-config.test.ts`、`tests/unit/t431-intent-autonomy.test.ts` |
| 監査 append-only / 非偽装 | waiting の監査語彙と台帳 round-trip | `tests/unit/t1241-waiting-audit-vocabulary.test.ts`、`tests/unit/t1241-waiting-ledger.pbt.test.ts` |
| 委任マージ provenance | 委任の出所を機械記録し偽装できないこと(FR-9/Q6) | `tests/integration/t-merge-provenance-record.integration.test.ts` |
| 自己 park 脅威(Q8) | waiting terminal がゲートの緩和に使えないこと | `tests/integration/t1241-waiting-engine.integration.test.ts`、`tests/integration/t1241-park-guard-removal.integration.test.ts` |
| Stop hook 再定義(Q11) | hook が強制面を失わないこと | `tests/integration/t121-stop-hook-enforce.test.ts` |

## 実行

```bash
bash tests/run-tests.sh --ci
```

## 生成しなかった検査と根拠

- **依存脆弱性スキャン / SAST の新規ジョブ**: 本 intent は runtime dependency を追加せず(利用者側 Bun-only 前提を維持)、要件にスキャン閾値の宣言もない。既存 CI 構成の外に新規ジョブを足す根拠がないため生成しない(`cid:ci-pipeline:c2` — 既存 workflow に実装済みなら二重生成しない)。
- **秘密情報スキャン**: 本 intent は認証情報・トークンを扱う面を追加していない(`gh` の credential は gh の store へ委譲し token を保持・出力しない既存契約のまま)。要件に該当 NFR がないため新規検査は作らない。
