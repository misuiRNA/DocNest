# DocNest - PDF文档管理系统

DocNest是一个基于Flask的PDF文档管理系统，允许用户上传PDF文档，生成二维码和提取码，并通过这些方式在线查看文档。

## 功能特点

1. **上传PDF文档**：用户可以上传PDF文档到系统
2. **生成二维码和提取码**：系统自动为每个上传的文档生成唯一的二维码和4位数字提取码
3. **二维码查看**：通过扫描二维码可以直接在线浏览PDF文档
4. **提取码查看**：通过输入4位数字提取码可以在线浏览PDF文档

## 安装说明

### 前提条件

- Python 3.6+
- pip (Python包管理器)

### 安装步骤

1. 克隆或下载本项目到本地

2. 安装所需依赖包

```bash
pip install flask qrcode pillow
```

## 运行应用

1. 进入项目目录

```bash
cd path/to/DocNest/code/server
```

2. 运行Flask应用

```bash
python app.py
```

3. 打开浏览器访问 http://127.0.0.1:5000

## 使用说明

### 上传文档

1. 在首页点击"选择文件"按钮，选择要上传的PDF文档
2. 点击"上传文档"按钮
3. 上传成功后，系统会显示文档的二维码和4位数字提取码

### 查看文档

有两种方式可以查看已上传的文档：

1. **通过二维码**：使用手机扫描二维码，直接在浏览器中查看文档
2. **通过提取码**：在查询页面输入4位数字提取码，点击"查看文档"按钮

## 项目结构

```
code/server/
│
├── app.py                  # 主应用程序文件
├── documents.db            # SQLite数据库文件（自动创建）
├── static/                 # 静态文件目录
│   ├── uploads/            # 上传的PDF文档存储目录
│   └── qrcodes/            # 生成的二维码图片存储目录
└── templates/              # HTML模板目录
    ├── upload.html         # 上传页面
    ├── success.html        # 上传成功页面
    ├── view.html           # 文档查看页面
    └── query.html          # 提取码查询页面
```

## 注意事项

- 本应用默认以调试模式运行，不建议在生产环境中直接使用
- 上传的文档和生成的二维码存储在本地，请确保服务器有足够的存储空间
- 为了安全起见，在生产环境中应修改应用的密钥(secret_key)
