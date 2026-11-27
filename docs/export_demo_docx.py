import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()
    
    # Page setup: A4, 1 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title_p.add_run("KỊCH BẢN DEMO THỰC CHIẾN 100% PHÂN HỆ HUẤN LUYỆN VIÊN (TRAINER)")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(16, 44, 87)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub_p.add_run("Hệ thống Quản lý và Huấn luyện Ngựa đua EquiFlow | Bản Chuẩn Hóa Toàn Diện")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(80, 80, 80)

    doc.add_paragraph() # Spacing

    # Read markdown content
    md_path = os.path.join(os.path.dirname(__file__), "kich-ban-demo-huan-luyen-vien.md")
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            return
        
        cols_count = max(len(r) for r in table_rows)
        tbl = doc.add_table(rows=len(table_rows), cols=cols_count)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = True

        for r_idx, row_data in enumerate(table_rows):
            is_header = (r_idx == 0)
            for c_idx, cell_text in enumerate(row_data):
                if c_idx < cols_count:
                    cell = tbl.cell(r_idx, c_idx)
                    cell.text = cell_text.strip()
                    set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
                    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                    
                    p = cell.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for run in p.runs:
                        run.font.name = "Arial"
                        run.font.size = Pt(9.5)
                        if is_header:
                            run.font.bold = True
                            run.font.color.rgb = RGBColor(255, 255, 255)
                        else:
                            run.font.color.rgb = RGBColor(30, 30, 30)

                    if is_header:
                        set_cell_background(cell, "102C57") # Dark Navy
                    elif r_idx % 2 == 1:
                        set_cell_background(cell, "F8F9FA")
                    else:
                        set_cell_background(cell, "FFFFFF")

        doc.add_paragraph()
        table_rows = []
        in_table = False

    for line in lines:
        line_clean = line.strip()
        
        # Check table
        if line_clean.startswith("|") and line_clean.endswith("|"):
            parts = [c.strip() for c in line_clean.split("|")[1:-1]]
            # Skip separator line like | :--- | :--- |
            if all(set(c).issubset({'-', ':', ' '}) for c in parts):
                continue
            in_table = True
            table_rows.append(parts)
            continue
        elif in_table:
            flush_table()

        if line_clean.startswith("# "):
            continue # already added title
        elif line_clean.startswith("## "):
            h = doc.add_paragraph()
            r = h.add_run(line_clean[3:].strip())
            r.font.name = "Arial"
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = RGBColor(16, 44, 87)
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(4)
        elif line_clean.startswith("### "):
            h = doc.add_paragraph()
            r = h.add_run(line_clean[4:].strip())
            r.font.name = "Arial"
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = RGBColor(26, 77, 140)
            h.paragraph_format.space_before = Pt(10)
            h.paragraph_format.space_after = Pt(3)
        elif line_clean.startswith("#### "):
            h = doc.add_paragraph()
            r = h.add_run(line_clean[5:].strip())
            r.font.name = "Arial"
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = RGBColor(50, 50, 50)
            h.paragraph_format.space_before = Pt(6)
            h.paragraph_format.space_after = Pt(2)
        elif line_clean.startswith("> "):
            # Callout box / speech
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            p.paragraph_format.right_indent = Inches(0.3)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(6)
            r = p.add_run(line_clean[2:].strip().replace("*", ""))
            r.font.name = "Arial"
            r.font.size = Pt(10)
            r.font.italic = True
            r.font.color.rgb = RGBColor(30, 80, 50) # Dark forest green tone
        elif line_clean.startswith("- ") or line_clean.startswith("* "):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(line_clean[2:].strip().replace("**", ""))
            r.font.name = "Arial"
            r.font.size = Pt(10)
        elif line_clean == "---":
            continue
        elif line_clean:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(line_clean.replace("**", "").replace("`", ""))
            r.font.name = "Arial"
            r.font.size = Pt(10)

    if in_table:
        flush_table()

    output_path = os.path.join(os.path.dirname(__file__), "Kich_Ban_Demo_100_Phan_He_Huan_Luyen_Vien_Cap_Nhat.docx")
    try:
        doc.save(output_path)
        print(f"Xuat file thanh cong: {output_path}")
    except Exception as e:
        alt_path = os.path.join(os.path.dirname(__file__), "Kich_Ban_Demo_100_Phan_He_Huan_Luyen_Vien_V2.docx")
        doc.save(alt_path)
        print(f"File cu dang mo, da xuat sang: {alt_path}")

if __name__ == "__main__":
    create_document()
