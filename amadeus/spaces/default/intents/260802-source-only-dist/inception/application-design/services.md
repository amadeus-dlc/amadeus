# Services — 外部サービス境界

上流入力(consumes 全数): requirements(FR-1/FR-2 と NFR-3/NFR-4 — 各境界の fail-closed / 承認境界要件)、architecture(現行 installer 経路の機序)、component-inventory(既存 ports 層の所在 — packages/setup/src/ports)。stories / team-practices は不存在(SKIP)。

測定 ref: file:line は observed `63e69d922`。実測プローブは 2026-08-02 実施。

## 外部サービス一覧

| サービス | 用途 | 経路 | 状態 |
|---|---|---|---|
| GitHub Releases(作成・asset 添付) | リリース公開(C1) | release.yml の softprops/action-gh-release(:154、App トークン :146、permission-contents: write :150) | 既存 + `files:` 追加 |
| GitHub Releases(asset 取得) | installer の新版取得(C2) | `github.com/.../releases/download/...` → **302 → `release-assets.githubusercontent.com`(実測: bun-v1.2.0 asset への HEAD、2026-08-02。署名付き一時 URL)** | 新規経路 |
| codeload.github.com | 旧版(< 導入版)の tarball 取得 | resolved-version-factory.ts:5 CODELOAD_BASE | 既存維持 |
| api.github.com | tag / バージョン解決(既存) | http.ts:6 API_BASE | 既存維持 |
| npm registry | `@amadeus-dlc/setup` の publish | release.yml publish ジョブ(:169-190) | 既存維持 |

## セキュリティ境界

- ホスト allowlist(http.ts:5): 現行 {api.github.com, codeload.github.com} に **{github.com, release-assets.githubusercontent.com}** を追加(decisions.md ADR-4)。redirect のホスト検査(:79)と MAX_REDIRECTS=5(:7)は不変。ワイルドカード(*.githubusercontent.com)は採らない
- 改竄耐性は HTTPS + host allowlist が担い、checksum(SHA256SUMS)は転送破損の検出(FR-2.5 の役割分担)。asset URL の署名クエリは GitHub 側の一時認可であり、installer 側は検証対象にしない
- リリース実行は workflow_dispatch 一本(人間承認境界 — NFR-4)。asset 添付は同 workflow 内で完結し、新たな credential を導入しない(App トークンの permission-contents: write を流用)

## 障害モードと fail-closed 契約

| 障害 | 挙動(NFR-3) |
|---|---|
| 新版 asset 404 | fail closed(typed error)。codeload へ黙って落ちない |
| checksum 不一致 | fail closed。展開しない |
| redirect 先が allowlist 外 | fail closed(既存 :79 の挙動を維持) |
| 旧版 codeload 障害 | 既存挙動どおり typed error(変更なし) |
| リダイレクトホストの将来変動 | ADR-4 の再実測条項 — 実装時と障害時に `curl -sI` で Location ホストを再実測し allowlist を更新(external-status-triage 準拠) |
