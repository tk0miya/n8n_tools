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
sudo chgrp -R 1000 var workflow
```

## 開発

```bash
npm install
npm run ci      # lint + typecheck + test
npm test        # テストのみ
npm run lint    # lint のみ
```
