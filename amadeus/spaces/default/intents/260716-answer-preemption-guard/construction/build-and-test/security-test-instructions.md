# Security Test Instructions — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

## 方針(比例選定)

S-1〜S-3(nfr-design/security-design.md)は import 面の構造保証 — 専用スキャナは追加せず grep 検査+lint/typecheck の機械検査で担保(build-and-test:c3)。

## 検査コマンド(0 hit = PASS)

```bash
# S-1: fs 書込み API を import しない(finding 書出しは dispatcher 委譲)
grep -nE "writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync" packages/framework/core/tools/amadeus-sensor-answer-evidence.ts
# S-2/S-3: ネットワーク・子プロセス・環境変数の新規読取なし
grep -nE "fetch\(|node:http|node:net|spawn|execSync|process\.env" packages/framework/core/tools/amadeus-sensor-answer-evidence.ts
# import 面の全数確認(node:fs / node:path / ./amadeus-lib.ts のみが期待)
grep -n "^import" packages/framework/core/tools/amadeus-sensor-answer-evidence.ts
```

## 認証情報

シークレット・環境変数・外部サービス接触なし(検査対象はローカル md ファイルのみ、read-only)。
