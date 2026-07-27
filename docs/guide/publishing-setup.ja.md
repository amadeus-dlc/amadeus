# `@amadeus-dlc/setup` の公開

> 言語: [English](publishing-setup.md) | **日本語**

> 対象読者: Amadeus-DLC をリリースするメンテナ。主経路は CI のリリース
> ワークフロー(`.github/workflows/release.yml`)による npm provenance 付きの
> 公開で、手動コマンドはフォールバックとして文書化を残しています。(元の
> CON-004「CI による自動 publish を行わない」制約は 2026-07-09 のユーザー決定に
> より置き換えられ、SEC-P03 の再検討ポイントを消費しました。)

このリポジトリのバージョンは **1 つ** です: `packages/setup/package.json` の
version が `vX.Y.Z` リリースタグを駆動し、`AMADEUS_VERSION` と README バッジは
それと等しく保たれます(t68 が整合をガードし、release-it の `after:bump` フックが
`scripts/release-version-sync.ts` を実行して `dist/` とセルフインストールツリーも
再生成するため、リリースコミットはすべてを同期した状態で出荷します)。1 つのタグが
同時に `@amadeus-dlc/setup` の npm リリースであり、インストーラがフレームワーク
配布物を解決する GitHub タグでもあります。リリースノートはリリース時に GitHub
Release へ生成されます — CHANGELOG ファイルはありません。

## 1. 前提条件

バージョン番号に触れる前に、次の 3 つをすべて確認します。

- **npm org スコープ**: `amadeus-dlc` npm org が `@amadeus-dlc` スコープを
  所有している必要があります。次で確認します:

  ```bash
  npm org ls amadeus-dlc
  ```

  これが失敗する、または別の所有者を示す場合は、先に org/スコープの状況を
  解決してください(R1 — これは人間が publish 前に行う作業であり、リリース PR で
  修正できるものではありません)。

- **タグはリリースワークフローが作成します** — 最初の 1 つも含みます: `v*` タグが
  存在しない場合、dispatch は bump をスキップし、コミット済みのバージョンを
  そのままリリースします。手動でのタグ付けはしません。

  ```bash
  git tag --list 'v*' | sort -V | tail -5
  ```

- **`NPM_TOKEN` リポジトリシークレット**(CI 経路): `@amadeus-dlc/setup` の
  publish のみにスコープした **granular automation token** を、GitHub Actions の
  `NPM_TOKEN` シークレットとして保存します。有効期限は短くし、定期的に
  ローテーションしてください。automation token は publish ごとの OTP を免除される
  ため、SEC-P02 の姿勢は「publish のたびの対話的 2FA」から「トークンの管理」へ
  移ります: 狭いスコープ、短い寿命、疑わしければ失効。

- **npm アカウントの 2FA 有効化**(手動フォールバック経路、および経路によらない
  アカウント衛生): npm アカウントの二要素認証が `auth-and-writes` に設定されて
  いる必要があります(SEC-P02):

  ```bash
  npm profile get
  ```

  `two-factor auth: auth-and-writes` を確認します。`auth-only` または無効の場合は、
  先に npm アカウント設定で有効化してください — これは一度きりのアカウント設定
  であり、publish ごとの手順ではありません。

## 2. バージョンを上げる

`packages/setup/package.json` の `version` は `0.1.0` から始まる独立した semver
です(FR-017、BR-P06)。**リリースワークフローが代わりに bump します** — dispatch
時に bump レベルを選び(第 5 章)、release-it がそれを bump し、`after:bump` フックが
`AMADEUS_VERSION`、README バッジ、再生成された `dist/` + セルフインストールツリーを
同期し、その一式がまとめてコミットされ、`vX.Y.Z` としてタグ付けされ、`main` へ
push されます。リリースコミットは PR なしで `main` へ着地します — PR ルールに対する
明示的でチームに記録された例外であり、リリースのバージョン同期に限定されます。

手動フォールバック:

```bash
cd packages/setup
npm version <patch|minor|major> --no-git-tag-version
```

どちらの経路でも `AMADEUS_VERSION` と README バッジはパッケージバージョンと
等しく保たれます(バージョン軸は 1 つ — t68 が強制します)。

## 3. ビルドと検証

```bash
# リポジトリルートから
cd packages/setup && bun run build && cd -

bun run typecheck
bun run lint

bash tests/run-tests.sh --ci
```

CI プロファイルには pack コントラクトテスト
(`tests/integration/setup-pack-contract.test.ts`)と files ドリフトテスト
(`tests/integration/setup-files-drift.test.ts`)が含まれます — 先へ進む前に
どちらもグリーンである必要があります。

次に実ネットワークの E2E を実行します。これは実際の GitHub codeload アーカイブの
形(単一のトップレベルラッパーディレクトリ)をライブリポジトリに対して検証する
もので、GitHub のアーカイブ形式のドリフトが現場のインストールを壊すことに対する
唯一のガードです:

```bash
AMADEUS_SETUP_E2E_NETWORK=1 bash tests/run-tests.sh --release
```

`AMADEUS_SETUP_E2E_NETWORK` が未設定の場合、このテストはスキップされます
(`test.skipIf`)— デフォルト CI では実行され **ません**。したがってこの手順は
オプションではなく、リリース時に必須の検証です。

## 4. ローカルでの最終チェック

何かを publish する前に tarball の内容を検分します:

```bash
cd packages/setup
npm pack --dry-run
```

期待される出力はちょうど 5 エントリです: `dist/cli.js`、`LICENSE-MIT`、
`LICENSE-APACHE`、`package.json`、`README.md`。それ以外(紛れ込んだ `src/*.ts`、
テストファイル)があれば `files` フィールドがドリフトしています — publish する前に
停止して修正してください(手順 3 の pack コントラクトテストが既に捕捉している
はずですが、これは実際の publish 前の最後の目視チェックです)。

次に実際の tarball をローカルへインストールしてスモークテストします:

```bash
npm pack
mkdir -p /tmp/amadeus-setup-smoke && cd /tmp/amadeus-setup-smoke
npm install /path/to/packages/setup/amadeus-dlc-setup-<version>.tgz
npx amadeus-setup --help
```

(`packages/setup` からの `bun link` は、tarball インストール手順の代替として
許容されます。)

## 5. Publish

### 主経路: ワンボタンの CI リリース(npm provenance 付き)

Actions タブから `main` に対して **Release @amadeus-dlc/setup** を実行し、bump
レベル(patch / minor / major)を選びます。1 回の実行がすべてを行います:

1. release-it が `packages/setup/package.json` を bump し、`after:bump` フック
   (`scripts/release-version-sync.ts`)が `AMADEUS_VERSION`、README バッジ、
   再生成された `dist/` + セルフインストールツリーを同期し、その一式がまとめて
   コミットされ、`vX.Y.Z` としてタグ付けされ、`main` へ push される(設定:
   `packages/setup/.release-it.json`)
2. softprops/action-gh-release が自動生成ノート付きで GitHub Release を作成する
3. `dist/cli.js` が新規にビルドされ、`npm publish --provenance --access public` で
   publish される(prerelease バージョンは自動的に `--tag next` で publish され、
   `latest` には決して触れない)
4. リトライ付きの `npx @amadeus-dlc/setup@<version>` スモークチェックが実行を
   締めくくる

リリースはテストを再実行しません: `main` 上のすべてのコミットは PR 時点で 5 つの
CI 品質ゲートを既に通過しており、bump コミット自体は release-it による 1 行の
バージョン変更だからです。

**最初のリリース** に特別な扱いは不要です: リポジトリに `v*` タグがない状態では、
dispatch は bump をスキップしてコミット済みのバージョンをそのまま
リリースします(`release-it --no-increment`、タグのみ)。`vX.Y.Z` タグを手動で
push することはフォールバックの入口として残っています — これは bump を
スキップし(タグはコミット済みのパッケージバージョンと一致し、`main` を指す必要が
あります)、ノート → ビルド → publish → スモークを実行します。

リリースせずにリハーサルするには、`dry-run: true` で dispatch します —
release-it が `--dry-run` で実行され(コミット/タグ/push なし)、実際の publish は
`npm publish --dry-run` に置き換わります。`NPM_TOKEN` は不要です。

### フォールバック: 手動 publish(provenance なし)

CI が使えない場合、元の手動経路も動作します(注意: 手動 publish には
**provenance がありません**):

安定版リリース:

```bash
cd packages/setup
npm publish --access public
```

Prerelease(`X.Y.Z-rc.N` バージョン。`latest` dist-tag には触れません):

```bash
cd packages/setup
npm version <version>-rc.<N> --no-git-tag-version
npm publish --access public --tag next
```

## 6. Publish 後の検証

手動で検証します(ワークフローが実行内の npx スモークを意図的に持たないのは、
publish 直後のレジストリ伝播遅延が誤報の発生源になったためです):

```bash
npx @amadeus-dlc/setup@<version> --help
```

次に `https://www.npmjs.com/package/@amadeus-dlc/setup` のパッケージページを確認し、
`license` と `repository` のメタデータが `packages/setup/package.json` と一致する
ことを確かめます。

## 7. ロールバック

npm の publish は一般には取り消せません — `npm unpublish` は npm 自身のポリシーに
より制限され推奨されないため、ここではロールバック経路にしません。publish 済みの
バージョンに欠陥がある場合は:

1. 壊れたバージョンを deprecate します:

   ```bash
   npm deprecate @amadeus-dlc/setup@<broken-version> "description of the issue; use <fixed-version> instead"
   ```

2. 上記の手順 2〜6 に従って、修正を含むパッチリリースを publish します。

同じバージョン番号を unpublish して再 publish しようとしないでください。
