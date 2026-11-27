import os
import markdown
import subprocess

md_path = r"d:\02_Code\My_Project\docs\phao-cuu-sinh-hoi-code-tao-giao-an.md"
html_path = r"d:\02_Code\My_Project\docs\phao-cuu-sinh-hoi-code-tao-giao-an.html"
pdf_path = r"d:\02_Code\My_Project\docs\phao-cuu-sinh-hoi-code-tao-giao-an.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

body_html = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'nl2br'])

html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phao Cứu Sinh Hỏi Code Tạo Giáo Án</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}
  
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #0f172a;
    line-height: 1.55;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }}

  /* Header Box */
  .header-card {{
    background: linear-gradient(135deg, #1e3a8a, #2563eb);
    color: white;
    padding: 24px 28px;
    border-radius: 8px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }}
  .header-title {{
    font-size: 18pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 8px 0;
  }}
  .header-sub {{
    font-size: 11pt;
    color: #dbeafe;
    margin: 0;
  }}

  /* Headings */
  h1 {{
    display: none;
  }}
  h2 {{
    color: #1e3a8a;
    font-size: 13.5pt;
    font-weight: 700;
    margin-top: 22px;
    margin-bottom: 12px;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 5px;
    page-break-after: avoid;
  }}
  h3 {{
    color: #0f172a;
    font-size: 11.5pt;
    font-weight: 700;
    margin-top: 18px;
    margin-bottom: 8px;
    background: #f1f5f9;
    padding: 6px 10px;
    border-left: 4px solid #2563eb;
    border-radius: 0 4px 4px 0;
    page-break-after: avoid;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}
  th, td {{
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background-color: #1e293b;
    color: #ffffff;
    font-weight: 600;
    font-size: 9pt;
  }}
  tr:nth-child(even) {{
    background-color: #f8fafc;
  }}

  /* Code */
  code {{
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background-color: #f1f5f9;
    color: #b91c1c;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    font-weight: 600;
  }}
  pre {{
    background-color: #0f172a;
    color: #f8fafc;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 8.5pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }}
  pre code {{
    background: none;
    color: inherit;
    padding: 0;
    border: none;
    font-weight: 400;
  }}

  /* Alert / Blockquote */
  blockquote {{
    margin: 14px 0;
    padding: 10px 16px;
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
    border-radius: 0 6px 6px 0;
    color: #1e40af;
    font-size: 9.5pt;
  }}

  ol, ul {{
    padding-left: 20px;
    margin: 6px 0;
  }}
  li {{
    margin-bottom: 4px;
  }}
</style>
</head>
<body>

<div class="header-card">
  <div class="header-title">PHAO CỨU SINH THỰC CHIẾN 9H SÁNG MAI</div>
  <div class="header-sub">BẢN ĐỒ TỌA ĐỘ VÀ KỊCH BẢN HỎI CODE LUỒNG TẠO GIÁO ÁN HUẤN LUYỆN (DÀNH CHO NGƯỜI KHÔNG CHUYÊN CODE)</div>
</div>

<div class="content">
{body_html}
</div>

</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_template)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(pdf_path):
    print("SUCCESS: PDF created at", pdf_path, "Size:", os.path.getsize(pdf_path), "bytes")
else:
    print("FAILED:", res.stderr)
