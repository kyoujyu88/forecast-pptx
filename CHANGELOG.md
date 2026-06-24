# CHANGELOG

このプロジェクトの変更履歴。[Semantic Versioning](https://semver.org/lang/ja/) に従う。

---

## [2.0.0] - 2026-06-24

### Changed (破壊的変更)
- **Python バックエンド廃止 → 純フロントエンド化（GitHub Pages 対応）**
  - `main.py`, `weather.py`, `pptx_generator.py`, `requirements.txt` を削除
  - `static/` ディレクトリ廃止、`index.html` / `style.css` / `app.js` をルートに移動
- **PPTX 生成**: python-pptx（サーバーサイド）→ [PptxGenJS 3.12.0](https://gitbrent.github.io/PptxGenJS/)（ブラウザ内生成）
- **天気予報取得**: FastAPI 経由 → ブラウザから Open-Meteo API を直接 fetch（CORS 対応）
- `app.js` を全面書き直し（API 呼び出し・PptxGenJS によるスライド構築）
- `index.html` を PptxGenJS CDN 読み込みに更新
- `README.md` を GitHub Pages デプロイ手順に更新
- `.gitignore` を簡略化（Python 関連エントリ削除）

### 動作環境
- サーバー不要。モダンブラウザのみ
- PptxGenJS 3.12.0（CDN）

---

## [1.1.0] - 2026-06-24

### Added
- `.gitignore` を追加（`__pycache__/`, `*.pyc`, `*.pyo`, `.env`, `*.pptx` を除外）
- `README.md` を追加（セットアップ手順・ファイル構成・API仕様・改良ポイント）
- `CHANGELOG.md` を追加（本ファイル）

---

## [1.0.0] - 2026-06-24

### Added
- **`main.py`**: FastAPI アプリ本体
  - `GET /` → `static/index.html` を配信
  - `GET /api/geocode?name=` → Open-Meteo ジオコーディング API を呼んで候補リスト返却
  - `POST /api/generate` → 予報取得 → PPTX 生成 → StreamingResponse でダウンロード
- **`weather.py`**: Open-Meteo API クライアント
  - `geocode(name)`: 都市名から緯度経度候補を取得
  - `fetch_forecast(lat, lon, days)`: 日別予報（天気コード・最高最低気温・降水確率）を取得
- **`pptx_generator.py`**: python-pptx スライド生成
  - WMO 天気コード → 絵文字 + 日本語名マッピング（コード 0〜99 の主要コード対応）
  - 16:9 スライド（33.867 cm × 19.05 cm）
  - 上 1/3: 予定欄（空枠）
  - 下 2/3: 天気表（地点 × 日付。天気・降水確率・最高最低気温の3行表示）
  - 右下: `出典: Open-Meteo (CC BY 4.0)` クレジット
- **`requirements.txt`**: `fastapi`, `uvicorn[standard]`, `python-pptx`, `httpx`
- **`static/index.html`**: フロントエンド UI（地点検索・日数選択・生成ボタン）
- **`static/style.css`**: レスポンシブスタイル
- **`static/app.js`**: バニラ JS による状態管理
  - 地点検索 → ドロップダウン → 確定チップ表示
  - localStorage による地点・日数の保存と復元
  - PPTX 生成リクエスト → Blob ダウンロード

### 動作環境
- Python 3.11.15
- FastAPI 0.138.0 / uvicorn 0.49.0 / python-pptx 1.0.2 / httpx 0.28.1
