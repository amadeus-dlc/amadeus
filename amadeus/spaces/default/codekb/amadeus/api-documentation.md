# API ドキュメント

## 公開 API サーフェス

この scan 範囲に HTTP API、GraphQL API、service endpoint は存在しない。Issue #610 に関係する API は repository-local CLI と 生成済み配布物の契約 である。

ユーザー視点の public contract は docs/README に記載される copy/install command で、root `dist/<harness>/...` を前提にしている。したがって `dist/` 移動 は user-facing API change として扱う必要がある。

## CLI 契約

### パッケージ生成

```bash
bun scripts/package.ts [<harness>] [--check]
```

責務:

- root `core/` と root `harness/<name>/` から 配布 tree を生成する。
- 出力 を root `dist/<name>/` に書く。
- `--check` では temp tree と commit 済み `dist/<name>/` を比較し、drift guard として失敗させる。

レイアウト影響:

- script path を移す場合、package scripts、tests、CI の呼び出しを更新する必要がある。
- source roots を移す場合、`CORE_ROOT` / `HARNESS_ROOT` を hardcoded path から logical workspace path へ置き換える必要がある。
- 出力 を移す場合、install docs と fixture copy roots を同時に変更する必要がある。

### Codex trust

```bash
bun scripts/package.ts codex trust --project <abs-dir>
```

責務:

- Codex harness の trust/setup helper を実行する。
- `harness/codex/emit.ts` と 生成済み `.codex` / `.agents` shape に依存する。

レイアウト影響:

- Codex harness が package-local になる場合、emitter path と trust path の両方を再解決する必要がある。

### 自己昇格

```bash
bun scripts/promote-self.ts [--check|--apply] [--no-build]
```

責務:

- Claude/Codex 配布物 を build する。
- root `dist/claude/.claude` を root `.claude` へ、root `dist/codex/.codex` を root `.codex` へ、root `dist/codex/.agents` を root `.agents` へ compare/apply する。
- local settings、hooks、composed scopes、scope-grid merge などを preserve する。

レイアウト影響:

- `dist/` を package-local に移す場合でも self-install target は repository root の `.claude/.codex/.agents` に残る可能性が高い。
- preserve rules は data-loss prevention の一部なので、path 移行 で削除・単純化してはいけない。

## Manifest 契約

`scripts/manifest-types.ts` が harness manifest の internal API である。

- `name` は `harness/<name>` と `dist/<name>` に対応する。
- `harnessDir` は 配布物 内の harness root、例 `.claude`, `.codex`, `.kiro`。
- `coreDirs` は root `core/<src>` から 配布物 内 path へ project する。
- `harnessFiles` は root `harness/<name>/<src>` から 配布物 内 path へ project する。
- optional emitter は assembled dist tree に追加生成を行う。

Full normalization では、この contract を package-local relative path に変えるのか、logical source identifier として維持するのかを ADR で決める必要がある。

## 生成済み配布物の契約

`dist/` は 生成済み 出力 である一方、repository に commit される install source である。

- `dist/claude/.claude`
- `dist/codex/.codex`
- `dist/codex/.agents`
- `dist/kiro/.kiro`
- `dist/kiro-ide/.kiro`

これらは README、docs、tests、self-promotion、coverage registry から参照される。よって `dist` path は internal implementation detail ではなく、repository-level 配布物 API として扱う。
