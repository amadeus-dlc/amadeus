# Integration / E2E Test手順 — nfr-kind-pruning

## 参照成果物と対象

`code-generation-plan` と `code-summary` のFR-4〜FR-6、FR-9、NFR-1〜NFR-4を対象に、producer outputからconsumer inputへのkind applicability投影、Unit coverage、配布済みCodex harnessの2-stage経路を検証する。

## Integration実行

```bash
bun test --timeout 120000 tests/integration/t248-stage-contract-routing.test.ts
```

5kindの出力・入力集合、library/service coverage、mixed kindless、不正runtime graphのfallbackが失敗0件であること。

## Packaged E2E実行

```bash
bun test --timeout 120000 tests/e2e/t416-nfr-kind-pruning.test.ts
```

一時プロジェクトへ `dist/codex/.codex` を配置し、library UnitがNFR Requirements 2成果物、NFR Design 2成果物で進み、consumer入力が3件に絞られ、artifact guardを通過すること。テスト終了時に一時データが破棄されること。

## Full CI実行

```bash
bun run test:ci -- --verbose
```

全runnerを実行し、failed filesとfailed assertionsがともに0であること。利用できないClaude substrateに依存するlive SDKテストの自己SKIPは、runnerが理由を明示し、変更対象の決定的fixture経路がPASSしている場合に限り環境制約として扱う。
