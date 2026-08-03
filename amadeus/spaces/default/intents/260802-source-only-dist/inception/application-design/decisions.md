# Decisions — ADR 集(application-design)

上流入力(consumes 全数): requirements(FR/NFR/OQ — 各 ADR の要求元)、architecture(現行機序 — Context 節の出典)、component-inventory(Reuse 判断の突合)。stories / team-practices は不存在(SKIP)。grilling 裁定 G1〜G13 は既決前提であり、本 ADR 集は G 裁定の**設計具体化**(OQ-1〜OQ-3 の解決)と ADR-003 改訂を担う。

測定 ref: file:line は observed `63e69d922`。

## ADR-A1: 取得経路の版境界二経路化(ADR-003 の改訂、G7 具体化)

- **Context**: 現行 ADR-003(resolved-version-factory.ts:4)は「archive is always fetched from codeload」。source-only 化後のタグは codeload アーカイブに dist/ を含まない
- **Decision**: `ASSET_INTRO_VERSION` 定数(installer 内1箇所)による純粋関数分岐 — `>= 導入版` は Release Asset 必須(欠落・checksum 不一致 = fail closed)、`< 導入版` は codeload 直行。ADR-003 本文をこの二経路契約へ書き換える
- **Consequences**: 判定がネットワーク非依存で決定的。旧版インストールは byte 不変で互換維持。導入版は本移行を含む最初のリリースの semver を実装時に定数化
- **Reversibility**: 可逆(easy to change)— 定数1箇所と分岐1関数。境界値の変更・二経路の廃止(将来 codeload 経路の退役)は定数と分岐の削除で完了
- **Alternatives Rejected**: (a) Release API での asset 有無 probe — 404 が「旧版/障害/消し忘れ」を区別できず silent fallback 化(G7 裁定で棄却)。(b) リポ内 manifest 台帳での宣言 — リリースごとに追跡ファイル更新が必要になり NFR-2(build の追跡ファイル不触)と衝突

## ADR-A2: asset レイアウトと manifest スキーマ(G6/G9 具体化、OQ-1 解決)

- **Context**: `resolveWrapperDir`(payload-factory.ts:12)は単一トップレベルディレクトリ規約に依存。asset 粒度は単一 tar(G9)
- **Decision**: `amadeus-dist-v<version>.tar.gz` は単一トップディレクトリ `amadeus-dist-v<version>/` 直下に**ハーネス群を直接**置く(`<wrapper>/claude/…` — dist/ 階層は挟まない)。locate は「wrapper/dist → 無ければ wrapper 直下」の2段 fallback(G6)。併産物: `SHA256SUMS`(tar と manifest の SHA-256、`sha256sum -c` 互換書式)と `amadeus-dist-v<version>.manifest.json`(`{ schema: 1, version, tarball, sha256, sizeBytes, harnesses: [...], fileCount }`)。tar は名前順・mtime 固定・owner 数値0 で決定的に生成(NFR-1)
- **Consequences**: installer は両経路を同一コードで処理。manifest は将来の per-harness 分割(Out of Scope、退路)にも `harnesses[]` で拡張可能
- **Reversibility**: レイアウトは公開後ロックイン(published asset は不変)— ただし manifest の schema フィールドで後方互換拡張が可能。per-harness 分割への移行は新 asset 追加(非破壊)で可逆
- **Alternatives Rejected**: (a) codeload 構造の完全ミラー(wrapper/dist/…)— asset に不要な階層名規約が恒久化。(b) フラット tar(wrapper なし)— resolveWrapperDir に経路別分岐が必要になり二経路共存のテストマトリクスが増える(G6 裁定で棄却)

## ADR-A3: release.yml のジョブ構成(OQ-3 解決)

- **Context**: `github-release` ジョブ(:133-158)は checkout も bun も持たず、softprops 入力に `files:` がない。asset 生成にはフルテスト+再現性検査の前提(FR-1.4)が要る
- **Decision**: `build-dist` ジョブを新設 — checkout(prepare の sha)→ bun 1.3.13 → フルテスト → 再現性検査(隔離2回 build 比較)→ `buildDistAssets` → actions artifact へ upload。`github-release` は `needs: [prepare, build-dist]` で artifact をダウンロードし `files:` に tar + SHA256SUMS + manifest を列挙。workflow_dispatch 一本・dry-run スキップ(:139-141)の骨格は不変
- **Consequences**: 検証と公開の責務が分離され、公開ジョブは無検証のまま薄い。既存 publish ジョブ(:169-190)の checkout/bun パターンを流用
- **Reversibility**: 可逆 — ジョブ構成は workflow 内部の再編で変更でき、公開契約(asset 名・内容)に影響しない
- **Alternatives Rejected**: (a) github-release ジョブへ build を直付け — 公開権限を持つジョブに長大なビルド・テストが同居し、失敗時の再実行単位も粗くなる。(b) ci.yml の成果物を流用 — release は workflow_dispatch 一本の規範(project.md Mandated)に反し、tag 時点の sha 固定も曖昧になる

## ADR-A4: ALLOWED_HOSTS の追加集合(OQ-2 解決)

- **Context**: http.ts:5 は {api.github.com, codeload.github.com}。asset 取得は `github.com/.../releases/download/...` 起点で 302 リダイレクトする
- **Decision**: **{github.com, release-assets.githubusercontent.com}** を追加(計4ホスト)。根拠 = 実測: 公開 release asset への HEAD が `302 → https://release-assets.githubusercontent.com/...`(署名付き一時 URL)を返した(2026-08-02、services.md 記載)。実装時に自リポジトリの実 asset で再実測して確定し、リダイレクトホスト変動時は allowlist 更新を external-status-triage 手順で行う(再実測条項)
- **Consequences**: allowlist は具体ホストのままで最小拡張。redirect 検査(:79)の fail-closed 不変
- **Reversibility**: 可逆 — allowlist はホスト集合の増減のみ。ただし縮小方向は旧版 installer が参照し続けるため、公開済みバージョンが依存するホストの削除は事実上ロックイン
- **Alternatives Rejected**: (a) `api.github.com` の asset エンドポイント(Accept: octet-stream)経由 — 既存2ホストで足りる可能性はあるが、Accept ヘッダ分岐と API rate limit を installer の主経路に持ち込む。(b) `*.githubusercontent.com` ワイルドカード — allowlist の意味(明示ホストへの限定)を弱める

## ADR-A5: hook dispatcher の形(G1 具体化)

- **Context**: settings.json(追跡・preserved)が11フック参照を持ち、実体は未追跡化される(FR-3.2)
- **Decision**: 追跡する `.claude/hooks/amadeus-dispatch.ts` 1ファイル(正本 = packages/framework/harness/claude/hooks/)。`<event>` 引数 → 実体パスの静的表で解決し、不在時は stderr 案内+exit 0 の no-op。settings.json の11参照を dispatcher 経由へ書換(mint-presence の2箇所はイベント引数で区別)
- **Consequences**: allowlist の深さ2エントリは dispatcher 1点のみ(.gitignore の階層再包含は1パターンで済む)。案内文言を一元管理
- **Reversibility**: 可逆 — dispatcher は薄い転送層で、廃止時は settings.json の参照を実体パスへ戻すだけ。ロジックを持たせない設計が可逆性の担保
- **Alternatives Rejected**: (a) 11本の no-op スタブ追跡 — allowlist 管理が11点に増える。(b) 生エラー受容 — bun の module not found を制御できず初見体験が悪い(G1 裁定で棄却)

## ADR-A6: AGENTS.md の import 分離(G2 具体化)

- **Context**: AGENTS.md は手書き部+生成 suffix の合成で、composeRootAgents(promote-self.ts:83-99)が追跡ファイルを書き換える
- **Decision**: 追跡 AGENTS.md は手書き部+import 行のみ。suffix は未追跡 `.agents/` 配下の生成ファイルへ移し import 参照。composeRootAgents 廃止。PROJECT_INSTRUCTIONS 定数(:65-74)の正本を packages/framework/harness 配下へ移設
- **Consequences**: build が追跡ファイルに触れない(NFR-2 成立の必要条件)。build 前は import 先不在=ルール欠落(G1 と同じ「build 前は未完成」窓)
- **Reversibility**: ほぼ可逆 — import 行と suffix ファイルの再結合は機械的。ただし composeRootAgents 廃止後に合成ロジックを復活させるのは再実装(中コスト)
- **Alternatives Rejected**: (a) 生成時 suffix 追記 — build が追跡ファイルを dirty にし冪等 AC と衝突。(b) AGENTS.md 全体生成物化 — 手書き部の編集正本がリポ外へ移り編集慣習が壊れる(G2 裁定で棄却)

## ADR-A7: allowlist 正本の形(G8 具体化)

- **Context**: 現状 preserved(promote-self.ts:101-114)と .gitattributes の二重定義。.gitignore が三重目になる
- **Decision**: `packages/framework/core/tools/data/self-install-allowlist.ts` を単一正本とし、preserved は import。.gitignore / .gitattributes は手書き維持のまま、正本から導出した期待値と突合する整合テスト(落ちる実証必須)で同期強制
- **Consequences**: build は追跡ファイル不触のまま乖離は CI 検出。per-user 第3カテゴリの regex 群は既存定義を正本へ移して re-export
- **Reversibility**: 可逆 — 正本データは形式(TS/JSON)や置き場所を変えても整合テストが追随を強制する。三重定義への逆行だけが禁止方向
- **Alternatives Rejected**: (a) build が .gitignore を生成 — 追跡ファイル書込の例外を作り G2/G8 の原則と衝突。(b) 文書相互参照のみ — 乖離が機械検出されない(現状問題の再生産)

## ADR-A8: ドリフトガード3種の置換(G3/G5 具体化)

- **Context**: dist:check / promote:self:check は「コミット済みコピーとの byte 同期」、第3ガードは「コミット済み compiled graph との一致」。比較対象が消滅する
- **Decision**: (1) dist:check 相当 → 隔離2回 build の byte 比較(再現性検査、NFR-1)。(2) promote:self:check → ローカル self-install 鮮度検査(C8)。(3) 第3ガード → 「正本から compile 成功+グラフ不変量」検証(不変量の具体集合は functional-design へ)。(4) dist 手編集検出は代替を置かず受容 — 伝播経路(git 追跡・release asset)が構造的に閉じることを本 ADR に明記(G3 の受容論証の設計所在)
- **Consequences**: 検証の意味が「mirror 同期」から「生成器の性質(決定性・成功・不変量)」へ移る。自己参照比較(検証劇場)は発生しない(比較両辺が独立 build)。**移行期間の空白防止(reviewer iteration 1 Major の是正)**: 再現性検査は移行順序3で追加ジョブとして先行導入し、旧 dist:check / promote:self:check(committed 比較 = 手編集検出)は追跡除外(順序5)まで並存させる。撤去・境界ガード有効化・第3ガード再定義は追跡除外と同一 PR の原子切替 — 順序3〜5 の間も手編集検出の空白は生じない(component-methods.md C7 の二段階と対応)
- **Reversibility**: 段階1(並存)は完全可逆。段階2(旧 check 撤去)は追跡除外とセットでのみ不可逆化 — 戻すには dist 再コミットが必要(意図的なロックイン。source-only 契約そのもの)
- **Alternatives Rejected**: (a) golden fixture の追跡継続 — 三層追跡の縮小再生産。(b) doctor への鮮度検査追加 — 保護対象(追跡面への伝播)が既に消滅しており、維持コストだけが残る(G3 裁定で棄却)

## ADR-A9: checksum の役割分担(FR-2.5)

- **Context**: 同一 Release への checksum 並置は攻撃者が asset と同時に差し替え可能
- **Decision**: checksum は転送破損の検出。改竄耐性は HTTPS + host allowlist(ADR-A4)が担う、と契約を明記。署名(Sigstore 等)は導入しない
- **Consequences**: installer の検証実装は SHA-256 照合のみで薄く保てる。将来署名を足す場合も manifest スキーマ(ADR-A2)に後方互換で追加可能
- **Reversibility**: 可逆 — 署名の後付けは manifest スキーマ拡張で非破壊に追加可能
- **Alternatives Rejected**: (a) アーティファクト署名の導入 — 鍵管理・検証依存が増え、本 intent の非目標(ランタイム外の新基盤)に踏み込む。(b) checksum 省略 — 破損検出を失い fail-closed 契約(NFR-3)が弱る
