# n8n_tools

n8n で使用するカスタムツール群です。

## セットアップ

### 必要な環境変数

`.env.example` をコピーして `.env` を作成し、各値を設定してください。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
|---|---|
| `GITHUB_TOKEN` | GitHub API トークン |
| `GHOME_IP` | Google Home デバイスの IP アドレス |
| `X_BEARER_TOKEN` | X (Twitter) API Bearer トークン |
| `XFETCH_STATE_FILE` | xfetch のステートファイルパス |
| `TRAFFICNEWS_STATE_FILE` | trafficnews のステートファイルパス |
| `MICHINOEKI_STATE_FILE` | michinoeki のステートファイルパス |

ステートファイルは通知済みの項目を記録するものです。コンテナの再作成で消えない永続パス (`/files/n8n_tools/var/` 配下など) を指定してください。ステートを見失うと、michinoeki は取得済みの項目をすべて「新着」として通知し直します。xfetch と trafficnews は現状を記録するだけで通知しません (trafficnews については次節を参照)。

### trafficnews のステート初期化

`src/trafficnews/cli.ts` はステートが空の場合、通知を出さずにその時点の記事一覧を記録します (シード)。初回実行のほか、ステートを失ったときもここに入るため、1 ページ分の記事が一度に通知されることはありません。裏を返すと、失った回に未通知だった記事は通知されないまま既読扱いになります (次回以降の通知は通常どおり再開します)。

抽出ロジックを変更した直後など、明示的に record-only 実行したいときは `--seed` を使います。更新すべきなのは n8n が読むステートなので、ワークフローの Execute Command ノードと同じく n8n コンテナ内の `/files/n8n_tools` で実行してください。

```bash
# compose.yaml を置いているディレクトリ (Synology では /volume1/docker/n8n) で実行する
docker compose exec n8n sh -c "cd /files/n8n_tools && npx tsx src/trafficnews/cli.ts --seed"
```

記事一覧を取得できなかった場合は空の結果を返さずに異常終了します。ページ構成が変わると n8n の実行がエラーになるので、抽出ロジックを直したうえで上記の再シードを行ってください。

### Synology NAS + Docker + n8n での動作

Synology NAS 上の Docker コンテナ (n8n) からファイルを書き出すには、ホスト側のディレクトリに適切なパーミッションを設定する必要があります。

n8n コンテナは UID/GID `1000` で動作するため、以下のコマンドで `var/` と `workflows/` のパーミッションの調整を行ってください。

```bash
# Synology ACL を削除して通常の POSIX パーミッションを有効にする
synoacltool -del var
synoacltool -del workflows

# グループに読み書き実行を許可する
chmod -R 770 var workflows

# グループを n8n コンテナの GID (1000) に変更する
sudo chgrp -R 1000 var workflows
```

## Playwright サイドカー構成

n8n コンテナには Playwright も Docker も含まれないため、ブラウザ自動化にはサイドカー方式を採用しています。

### アーキテクチャ

```
n8n (HTTP Request ノード)
  └─ HTTP POST → orchestrator:8080/cgi-bin/run.sh
                   └─ docker run playwright-runner   DooD でオンデマンド起動
                          └─ /files/n8n_tools/node_modules/.bin/tsx
                                 /files/n8n_tools/src/playwright-runner/cli.ts
                                 ブラウザを操作して JSON を stdout へ出力
```

### コンポーネント

| ファイル | 実行環境 | 役割 |
|---|---|---|
| `orchestrator/cgi-bin/run.sh` | orchestrator コンテナ (busybox httpd CGI) | HTTP リクエストを受け取り、`docker run` で playwright コンテナを起動する |
| `src/playwright-runner/cli.ts` | playwright コンテナ (オンデマンド) | 実行したいスクリプトを TypeScript で記述する。結果を JSON で stdout に出力する |

### 設計上の判断

- **busybox httpd + CGI**: HTTP パースを busybox が担い、CGI スクリプトは docker run を実行するだけでよい。1 リクエスト = 1 コンテナ起動というシンプルなモデル。
- **DooD (Docker outside of Docker)**: orchestrator コンテナに `/var/run/docker.sock` をマウントし、ホストの Docker デーモン経由で playwright コンテナを起動する。DinD よりも安定していて実用的。
- **オンデマンド起動**: Playwright の利用頻度が低いためコンテナを常時起動しない。コールドスタートは 5〜15 秒程度。タイムアウトは 10 分 (600 秒)。
- **カスタム Dockerfile なし**: orchestrator は `alpine:3`、playwright-runner は `mcr.microsoft.com/playwright` をそのまま使用。`docker compose pull` だけでアップストリームのアップデートを取り込める。
- **Playwright イメージの自動バージョン追従**: `run.sh` が `node_modules/playwright/package.json` からインストール済みバージョンを読み取り、`mcr.microsoft.com/playwright:v{VERSION}-noble` を自動構築する。`npm install` で playwright を更新するだけでイメージも追従し、npm パッケージとコンテナのバージョン不整合を防ぐ。
- **n8n 側は標準 HTTP Request ノードで十分**: orchestrator への HTTP 呼び出しに専用 CLI は不要。
- **TypeScript で runner を記述**: n8n_tools ディレクトリごとマウントし、`node_modules/.bin/tsx` で実行。Dockerfile 不要で型安全なスクリプトが書ける。tsx のネイティブバイナリ (esbuild) はホストと同じ CPU アーキテクチャで動作するため、**ホストは Linux x86_64 であること**（Synology NAS など）。macOS/ARM からの `docker run` 経由では動作しない。

### セットアップ

`docker compose up` をこのリポジトリのディレクトリで実行するだけで動作します。`N8N_TOOLS_PATH` は `${PWD}` から自動的に設定されるため、`.env` への追加設定は不要です。

### スクリプトのカスタマイズ

`src/playwright-runner/cli.ts` を自分のスクリプトに置き換えてください。サンプルは google.com にアクセスして `{ code: 200 }` を返すだけです。

### n8n からの呼び出し

n8n の HTTP Request ノードで `POST http://orchestrator:8080/cgi-bin/run.sh` を送信します。レスポンスが cli.ts の stdout JSON になります。

## 開発

```bash
npm install
npm run ci      # lint + typecheck + test
npm test        # テストのみ
npm run lint    # lint のみ
```
