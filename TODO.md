# ghscan Ruby → TypeScript 移植計画

ghscan は GitHub リポジトリを分析する CLI ツール。実行環境が Node.js のみのため TypeScript に移植する。
TS で書いて esbuild でバンドルし、単一 JS ファイル (`dist/ghscan.mjs`) をリポジトリにコミットして配布する。

## 技術選定

| 項目 | 選定 | 理由 |
|------|------|------|
| バンドラー | **esbuild** | 高速、設定不要、単一ファイル出力が容易 |
| テスト | **vitest** | TS ネイティブ対応、高速、Jest 互換 API |
| リンター | **Biome** | 単一バイナリ、lint+format 兼用、設定最小 |
| GitHub API | **@octokit/rest** | Ruby octokit の公式 JS 対応 |
| YAML パース | **js-yaml** | Node.js で最も普及 |

## 配布戦略

- esbuild で全依存関係をバンドルした `dist/ghscan.mjs` をリポジトリにコミット
- 実行環境では `node dist/ghscan.mjs` だけで動作 (npm install 不要)
- `dist/` は `.gitignore` に入れない
- CI でビルド後に `git diff --exit-code dist/` で整合性を検証

## ディレクトリ構成

```
src/
  cli.ts                         # エントリポイント (bin/ghscan 相当)
  ghscan/
    main.ts                      # メインロジック (lib/ghscan/main.rb 相当)
  github/
    repository.ts                # Repository 型定義 (lib/github/repository.rb 相当)
    repositoryFetcher.ts         # リポジトリ取得 (lib/github/repository_fetcher.rb 相当)
    workflowParser.ts            # ワークフロー解析 (lib/github/workflow_parser.rb 相当)
test/
  ghscan/
    main.test.ts
  github/
    repositoryFetcher.test.ts
    workflowParser.test.ts
```

## 実装ステップ

各ステップで関連する CI・hooks・設定も一緒に更新し、常に「その時点で動く状態」を保つ。

### Step 1: 足場づくり — TS プロジェクト初期化 + 開発環境切り替え

**ゴール**: `npm run build` が通り、空の `npm test` / `npm run lint` が成功する状態

- [ ] `package.json` 作成
  - `type: "module"` (ESM)
  - `bin: { "ghscan": "./dist/ghscan.mjs" }`
  - dependencies: `@octokit/rest`, `js-yaml`
  - devDependencies: `typescript`, `esbuild`, `vitest`, `@biomejs/biome`, `@types/js-yaml`
  - scripts: `build`, `test`, `lint`, `lint:fix`, `ci` (`lint && test && build`)
- [ ] `tsconfig.json` 作成 — `target: ES2022`, `module: Node16`, `strict: true`
- [ ] `biome.json` 作成 — `npx @biomejs/biome init` で生成後、indent 2 spaces, line width 120 等に編集
- [ ] `.gitignore` 更新 — `node_modules/` 追加 (`dist/` はコミット対象のため ignore しない)
- [ ] 最小限の `src/cli.ts` 作成 — ビルドが通ることを確認
- [ ] CI を TS 用に書き換え
  - `.github/workflows/ci.yml`: Ruby setup → `actions/setup-node@v4` (Node 22, `cache: "npm"`)
  - `bundle exec rake ci` → `npm ci && npm run ci`
  - ビルド済みファイル整合性チェック: `npm run build && git diff --exit-code dist/`
  - `.github/dependabot.yml`: `bundler` に加えて `npm` エコシステムを追加
- [ ] Claude Code hooks を TS 用に書き換え
  - `pre-commit-check.sh` → `npm run lint && npm test && npm run build` を実行するよう書き換え
  - `claude-code-web-session-start.sh` → rbenv セットアップを `npm ci` に書き換え
  - `.claude/settings.json` の permissions に `npmjs.com`, `registry.npmjs.org` を追加
- [ ] `.vscode/` 更新
  - `extensions.json`: `biomejs.biome` を追加
  - `settings.json`: TypeScript 用の Biome formatter 設定を追加

**検証**: `npm install && npm run ci` が成功する

> Note: Ruby 固有の hooks (`protect-sig-files.sh`, `rbs-inline.sh`) はこの段階ではまだ残す。
> TS ファイルの編集では発火しない (`.rb` / `sig/` 限定のため)。削除は Step 5 で実施。

---

### Step 2: ソースコード移植 + テスト (workflowParser)

**ゴール**: workflowParser の TS 実装が存在し、テストが通る

- [ ] `src/github/repository.ts` — `interface Repository` として定義
- [ ] `src/github/workflowParser.ts` — YAML パース、matrix 参照解決、actionlint 検出
  - `Base64.decode64` → `Buffer.from(content, "base64").toString("utf-8")`
  - `Octokit::NotFound` → `error.status === 404` で判定
  - YAML の数値自動変換に注意: `3.10` が `3.1` にならないよう `String(value)` で変換
- [ ] `test/github/workflowParser.test.ts` — `spec/github/workflow_parser_spec.rb` から移植

**検証**: `npm test` でテスト通過、`npm run lint` で lint 通過

---

### Step 3: ソースコード移植 + テスト (repositoryFetcher)

**ゴール**: repositoryFetcher の TS 実装が存在し、テストが通る

- [ ] `src/github/repositoryFetcher.ts` — リポジトリ取得・フィルタリング
  - `client.repos(login, type: "owner")` → `octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, { type: "owner" })`
  - 全メソッドが `async` になる
- [ ] `test/github/repositoryFetcher.test.ts` — `spec/github/repository_fetcher_spec.rb` から移植

**検証**: `npm test` で全テスト通過

---

### Step 4: ソースコード移植 + テスト (main + cli)

**ゴール**: ghscan 全体が TS で動作する

- [ ] `src/ghscan/main.ts` — メインロジック
  - `filterRepositories`, `outdatedLanguageVersion`, `minorVersion`, `formatOutput` はテスト容易性のため export する関数として切り出す
  - JSON 出力のキーは `snake_case` を維持 (後方互換性)
- [ ] `src/cli.ts` — エントリポイント: `new Main().run()`
- [ ] `test/ghscan/main.test.ts` — `spec/ghscan/main_spec.rb` から移植

**検証**:
- `npm run ci` (lint + test + build) が全て通る
- `dist/ghscan.mjs` が単一ファイルとして生成される
- `node dist/ghscan.mjs` が node_modules なしで動作する

---

### Step 5: Ruby アーティファクト削除 + クリーンアップ

**ゴール**: Ruby の痕跡をなくし、TS のみのプロジェクトにする

- [ ] Ruby ファイル一括削除
  - `bin/ghscan`, `lib/`, `spec/`, `sig/`
  - `Gemfile`, `Gemfile.lock`, `Rakefile`, `Steepfile`
  - `.rspec`, `.rubocop.yml`
  - `rbs_collection.yaml`, `rbs_collection.lock.yaml`
  - `.gitignore` から Ruby 固有エントリ (`/.gem_rbs_collection/`, `/vendor/bundle/`) 削除
- [ ] Ruby 固有の hooks + 設定を削除
  - `protect-sig-files.sh` → ファイル削除 + `.claude/settings.json` から PreToolUse エントリ削除
  - `rbs-inline.sh` → ファイル削除 + `.claude/settings.json` から PostToolUse エントリ削除
  - `.claude/settings.json` の permissions から `rubygems.org` エントリ削除
- [ ] `.vscode/` から Ruby 固有設定を削除
  - `extensions.json` から `shopify.ruby-lsp`, `tk0miya.rbs-helper` を削除
  - `settings.json` から `[ruby]` セクションと `rbs-helper` 設定を削除
- [ ] CI の Ruby 関連ワークフロー削除
  - `.github/workflows/rbs_collection.yml` 削除
  - `.github/workflows/auto-merge.yml` から `rbs_collection` ジョブ削除
  - `.github/dependabot.yml` から `bundler` エコシステム削除

## 注意点

- **Octokit API の差異**: Ruby gem と @octokit/rest はメソッド名・レスポンス形状が異なる。各 API 呼び出しを個別にマッピングする必要あり
- **全面 async 化**: Ruby は同期コード。TS では `@octokit/rest` が Promise を返すため、`WorkflowParser` → `RepositoryFetcher` → `Main.run()` まで全て async/await が必要
- **YAML 数値変換**: `js-yaml` はデフォルトで `3.10` を float `3.1` に変換する。`String(value)` で明示的に文字列化するか、`yaml.JSON_SCHEMA` を使う
- **JSON 出力互換性**: 出力キーは `snake_case` を維持して後方互換を保つ

## 最終検証

1. `npm run lint` — Biome lint/format チェック通過
2. `npm test` — 全テスト通過
3. `npm run build` — `dist/ghscan.mjs` 単一ファイル生成 (依存関係バンドル済み)
4. `node dist/ghscan.mjs` が npm install なしの環境でも動作すること
5. `GITHUB_TOKEN=... node dist/ghscan.mjs` — 実際の GitHub API で動作確認
6. GitHub CI が PR で green になること (ビルド整合性チェック含む)
