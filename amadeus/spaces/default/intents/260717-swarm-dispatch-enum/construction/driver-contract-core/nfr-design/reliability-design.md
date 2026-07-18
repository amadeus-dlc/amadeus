# Reliability Design — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- RD-1(RNR-1): 決定性は純関数+網羅 switch(TypeScript の exhaustiveness check — never 到達で担保)。16 セル matrix テストは期待値手書き表と実装出力の突き合わせ
- RD-2(RNR-2): rejected は Result 様式の値返し(throw しない)。CLI 層だけが exit code へ写像。未知 harness は HARNESS_VALUES 検証で CLI 入口 fail-fast
- RD-3(RNR-3 / RNR-4): emit 面の変更は emitSwarmDegraded の型追随のみ(:285 系)。enum(amadeus-audit.ts:147-152)は不変 — t28 が enum 同期を、t134 fixture が Requested driver の三値を検証
- RD-4(禁止フレーズ集合の確定 — U2/U3 NR からの委任): C-15 開示の禁止フレーズ集合を次の 6 句で確定する: 「実適用を確認」「必ず ultra で実行」「保証」「sandbox で保護」「安全に隔離される」「restricted でも動作」。検証は変更 diff への grep(受け入れ = 6 句 0 件)。集合の所有は本 unit の ND(canonical)とし、U2/U3 の検証はこの集合を参照する

## 保証機構(層別)

- 関数層: exhaustive switch+純関数
- 監査層: enum 不変+fixture 三値検証(t28/t134)
