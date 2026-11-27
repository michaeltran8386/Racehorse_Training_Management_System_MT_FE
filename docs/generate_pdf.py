import os
import markdown
import subprocess

md_path = r"d:\02_Code\My_Project\docs\tai-lieu-nghiep-vu-huan-luyen-vien.md"
html_path = r"d:\02_Code\My_Project\docs\tai-lieu-nghiep-vu-huan-luyen-vien.html"
pdf_path = r"d:\02_Code\My_Project\docs\tai-lieu-nghiep-vu-huan-luyen-vien.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

# Chuyển đổi Markdown sang HTML
body_html = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'nl2br'])

html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Tài Liệu Nghiệp Vụ Huấn Luyện Viên - EquiFlow</title>
<style>
  @page {{
    size: A4;
    margin: 22mm 18mm 22mm 18mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}
  
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }}

  /* Bìa báo cáo */
  .cover-page {{
    text-align: center;
    padding-top: 60px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
  }}
  .cover-header {{
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 1px;
    color: #334155;
    text-transform: uppercase;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 12px;
    margin-bottom: 60px;
  }}
  .cover-title-box {{
    margin: 40px 0;
  }}
  .cover-subtitle {{
    font-size: 14pt;
    font-weight: 600;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 15px;
  }}
  .cover-title {{
    font-size: 24pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
    margin-bottom: 20px;
  }}
  .cover-desc {{
    font-size: 11pt;
    color: #64748b;
    max-width: 80%;
    margin: 0 auto;
    font-style: italic;
  }}
  .cover-meta {{
    font-size: 11pt;
    text-align: left;
    margin-top: 80px;
    padding: 20px 30px;
    background: #f8fafc;
    border-left: 4px solid #2563eb;
    border-radius: 4px;
    display: inline-block;
  }}
  .cover-meta p {{
    margin: 6px 0;
  }}

  /* Headings */
  h1 {{
    color: #0f172a;
    font-size: 18pt;
    font-weight: 800;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 30px;
    page-break-after: avoid;
  }}
  h2 {{
    color: #1e3a8a;
    font-size: 14pt;
    font-weight: 700;
    margin-top: 28px;
    margin-bottom: 12px;
    border-left: 4px solid #2563eb;
    padding-left: 10px;
    page-break-after: avoid;
  }}
  h3 {{
    color: #1e293b;
    font-size: 12pt;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }}
  h4 {{
    color: #334155;
    font-size: 11pt;
    font-weight: 700;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
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
    letter-spacing: 0.5px;
  }}
  tr:nth-child(even) {{
    background-color: #f8fafc;
  }}

  /* Code & Pre */
  code {{
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background-color: #f1f5f9;
    color: #b91c1c;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}
  pre {{
    background-color: #0f172a;
    color: #f8fafc;
    padding: 14px 16px;
    border-radius: 6px;
    font-size: 8.5pt;
    overflow-x: auto;
    line-height: 1.45;
    page-break-inside: avoid;
  }}
  pre code {{
    background: none;
    color: inherit;
    padding: 0;
    border: none;
  }}

  /* Blockquote & Notes */
  blockquote {{
    margin: 14px 0;
    padding: 10px 16px;
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
    border-radius: 0 6px 6px 0;
    color: #1e40af;
    font-size: 10pt;
  }}
  blockquote p {{
    margin: 4px 0;
  }}

  ul, ol {{
    padding-left: 24px;
    margin: 8px 0;
  }}
  li {{
    margin-bottom: 5px;
  }}

  /* In ấn phân trang */
  .section-break {{
    page-break-before: always;
  }}
</style>
</head>
<body>

<div class="cover-page">
  <div class="cover-header">
    ĐỒ ÁN TỐT NGHIỆP CÔNG NGHỆ THÔNG TIN · HỆ THỐNG EQUIFLOW
  </div>

  <div class="cover-title-box">
    <div class="cover-subtitle">BÁO CÁO NGHIỆM THU CHUYÊN ĐỀ</div>
    <div class="cover-title">TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ & RÀNG BUỘC KỸ THUẬT PHÂN HỆ HUẤN LUYỆN VIÊN</div>
    <div class="cover-desc">
      Đặc tả chi tiết 100% trích xuất từ mã nguồn thực tế (Code-Driven): Quy trình tiếp nhận chiến mã, SLA 48h/3 ngày, vòng đời giáo án 5 phase, chống xung đột lịch tập 3 ngôi và cơ chế liên động y tế.
    </div>
  </div>

  <div>
    <div class="cover-meta">
      <p><strong>Hệ thống:</strong> EquiFlow - Quản lý Chuồng trại & Huấn luyện Ngựa đua</p>
      <p><strong>Chuyên đề phân hệ:</strong> Phân hệ Huấn luyện viên Trưởng (Head Trainer Workspace)</p>
      <p><strong>Tác giả thực hiện:</strong> Thành viên Đảm nhận Phân hệ Huấn luyện</p>
      <p><strong>Phiên bản tài liệu:</strong> v1.0.0 (Official Production Code Reference)</p>
      <p><strong>Thời gian nghiệm thu:</strong> Tháng 11 / 2026</p>
    </div>
  </div>
</div>

<div class="content">
{body_html}
</div>

</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_template)

print("HTML generated successfully:", html_path)

# Dùng Microsoft Edge headless để xuất sang PDF
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

print("Running command:", " ".join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(pdf_path):
    print("SUCCESS: PDF created at", pdf_path, "Size:", os.path.getsize(pdf_path), "bytes")
else:
    print("FAILED:", res.stderr)
