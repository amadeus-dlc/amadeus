# Team Practices — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `amadeus/spaces/default/codekb/amadeus/code-structure.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`、`amadeus/spaces/default/codekb/amadeus/dependencies.md`、`amadeus/spaces/default/codekb/amadeus/code-quality-assessment.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/business-overview.md`

- `code-structure.md` — 「変更の同期」節が対象とする正本／生成物の構造境界の出典。
- `technology-stack.md` — 「マージ前検証」節の検証コマンド群と4層テスト構成の出典。
- `dependencies.md` — 「外部依存の扱い」節の境界（agmsg を repo 外・read-only とする）の出典。
- `code-quality-assessment.md` — 現行の負債と、それが既存ルールで説明可能であることの照合対象。
- `architecture.md` — 「新設・変更したガードの実証」節が適用される launch シーケンス上の位置の出典。
- `business-overview.md` — 実務ルールが最終的に守る利用者価値の出典。

測定 ref: HEAD `4a0f91ad0`。

## 本ステージの結論

新設ルールはない（`discovered-rules.md`）。以下は affirm 済みルールのうち本 intent で特に効くものの抜粋であり、**再確約ではなく適用対象の明示**である。

## 適用される実務

### 変更の同期

正本 `packages/framework/core/tools/team-up.sh` を編集し、`bun scripts/package.ts` で `dist/` 6面、`bun run promote:self` で self-install 4面を再生成する。計11コピーを同一変更で同期する（`project.md` Mandated）。

### マージ前検証

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`（`project.md` Testing Posture）。exit code はパイプ非経由で捕捉する（`cid:code-generation:no-exit-capture-through-pipe`）。

### 新設・変更したガードの実証

失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする（`org.md` Mandated）。対象ファイル限定の `git checkout` で切り替え、stash は使わない（`cid:code-generation:falling-proof-no-stash`）。注入面はテストが実際に読む面であること（`cid:code-generation:injection-surface-verify`）。

### テスト配置

実 FS・プロセスを使うテストは integration 層に置く（`cid:code-generation:fs-tests-integration-first`）。テスト番号は既存最大を実測してから採番する（`cid:code-generation:swarm-test-number-reservation`）。

### 運用形態

ソロモード（`AMADEUS_OPERATING_MODE` 未設定）。エージェント選挙・定足数・クロスレビュー2名・delegate 配送は非適用。設計判断・スコープ判断・マージ承認はユーザー本人が行い、独立検証は §12a reviewer subagent と RE の Developer→Architect 直列2段が担う（`team.md` § Operating Modes）。

### 外部依存の扱い

agmsg（`~/.agents/skills/agmsg/`）は repo 外・read-only。本 intent では変更せず、実測して合わせる。外部 seam の語彙・値集合は確約前に実測する（`cid:application-design:external-seam-vocab-measurement`、および前 intent が persist した `cid:reverse-engineering:seam-writer-mode-precondition`）。
