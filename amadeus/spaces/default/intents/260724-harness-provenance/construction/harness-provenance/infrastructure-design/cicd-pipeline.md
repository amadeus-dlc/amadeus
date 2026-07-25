# CI/CD Pipeline — harness-provenance

上流入力(consumes 全数): performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, components.md, services.md, business-logic-model.md

## Pipeline mapping

components.md、services.md、logical-components.md、business-logic-model.mdの変更を既存pipelineで検証する。performance-design.md、security-design.md、scalability-design.md、reliability-design.mdのgateを次のstageへ写像する。

## Stages

1. **Static**: typecheck、lint
2. **Structural performance**: state builder内の`detectHarnessType()`呼出が1回、CWD probe対象が固定5件、追加network/subprocess/file read/write API呼出が0であることをsource-contract testで検査
3. **Unit**: parser/mapping、non-env resolutionのprocessあたり1回cache、public facadeのcall-time env bypass
4. **Integration**: state V7、memory、fresh-process全6配布AC-3d、Harness付きV7を既存reader/validatorが読めるrollback compatibility
5. **Repository CI**: existing `tests/run-tests.sh --ci`
6. **Package**: `scripts/package.ts`
7. **Distribution verification**: dist check
8. **Self-install promotion**: promote-self
9. **Self-install verification**: promote-self check

前段が赤なら後段を成功扱いにしない。raw override markerのstate/memory/audit/stdout/stderr不在もintegrationで検査する。

wall-clock所要時間は診断用に表示できるが、baseline/環境/閾値がないため増減を合否に使わない。既存test runnerのtimeout内に完了することは合否条件とし、本変更のためにtimeout・retryを延長または緩和しない。

## Artifact and rollback

source of truthは`packages/framework/core/`。生成物を手編集しない。rollbackは正本変更をrevertして再生成し、dist/self-install driftが0になることを確認する。既存Harness付きV7 stateは保持し、rollback後の既存reader/validator互換testを必須とする。互換testが赤ならrollbackを進めず、非破壊なreader互換修正を先行する。blue-green/canary/feature flagはlocal package配布には非該当。

## Secrets

CIへ新規secretを追加しない。test envは合成markerだけを使い、実credentialやuser環境値をartifact/logへ保存しない。
