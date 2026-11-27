import re
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def set_callout_borders(table, color="2563EB", sz="24"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:insideH w:val="none"/>'
        f'<w:insideV w:val="none"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_text_runs(paragraph, text, base_font="Calibri", base_size=10.5, base_color="1E293B"):
    # Tokenize text by bold, italic, and code
    # Regex for tokens: `code`, **bold**, *italic*
    pattern = r'(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)'
    tokens = re.split(pattern, text)
    for token in tokens:
        if not token:
            continue
        run = paragraph.add_run()
        run.font.name = base_font
        run.font.size = Pt(base_size)
        
        if token.startswith('`') and token.endswith('`'):
            run.text = token[1:-1]
            run.font.name = "Consolas"
            run.font.size = Pt(base_size - 1)
            run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            # Add highlight or subtle styling if needed
        elif token.startswith('**') and token.endswith('**'):
            run.text = token[2:-2]
            run.bold = True
            r, g, b = int(base_color[0:2], 16), int(base_color[2:4], 16), int(base_color[4:6], 16)
            run.font.color.rgb = RGBColor(r, g, b)
        elif token.startswith('*') and token.endswith('*'):
            run.text = token[1:-1]
            run.italic = True
            r, g, b = int(base_color[0:2], 16), int(base_color[2:4], 16), int(base_color[4:6], 16)
            run.font.color.rgb = RGBColor(r, g, b)
        else:
            run.text = token
            r, g, b = int(base_color[0:2], 16), int(base_color[2:4], 16), int(base_color[4:6], 16)
            run.font.color.rgb = RGBColor(r, g, b)

def build_docx(md_path, docx_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    doc = docx.Document()
    
    # Page Setup
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("EquiFlow System • TMEC Equine Club • Kịch bản Demo Huấn luyện viên")
        f_run.font.name = "Calibri"
        f_run.font.size = Pt(9)
        f_run.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    i = 0
    total = len(lines)
    
    while i < total:
        line = lines[i].rstrip('\r\n')
        
        # Skip empty lines
        if not line.strip():
            i += 1
            continue
            
        # Title (# )
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(12)
            run = p.add_run(line[2:].strip())
            run.font.name = "Calibri"
            run.font.size = Pt(18)
            run.bold = True
            run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
            i += 1
            continue
            
        # Heading 1 (## )
        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[3:].strip())
            run.font.name = "Calibri"
            run.font.size = Pt(14)
            run.bold = True
            run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
            i += 1
            continue

        # Heading 2 (### )
        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[4:].strip())
            run.font.name = "Calibri"
            run.font.size = Pt(12)
            run.bold = True
            run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            i += 1
            continue

        # Heading 3 (#### )
        if line.startswith('#### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(9)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[5:].strip())
            run.font.name = "Calibri"
            run.font.size = Pt(11)
            run.bold = True
            run.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
            i += 1
            continue

        # Horizontal separator (---)
        if line.strip() == '---':
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            p_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/></w:pBdr>')
            p._p.get_or_add_pPr().append(p_border)
            i += 1
            continue

        # Blockquote (> ...)
        if line.startswith('>'):
            quote_lines = []
            while i < total and lines[i].strip().startswith('>'):
                cleaned = re.sub(r'^>\s?', '', lines[i].strip())
                if cleaned:
                    quote_lines.append(cleaned)
                i += 1
            
            # Create a 1x1 table callout box
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.autofit = False
            cell = table.cell(0, 0)
            cell.width = Inches(6.5)
            set_cell_background(cell, "F1F5F9")
            set_callout_borders(table, color="2563EB", sz="24")
            set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            full_quote = " ".join(quote_lines)
            format_text_runs(p, full_quote, base_font="Calibri", base_size=10, base_color="334155")
            
            # Spacer after table
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(4)
            continue

        # Code block (```)
        if line.strip().startswith('```'):
            code_lines = []
            i += 1
            while i < total and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i].rstrip('\r\n'))
                i += 1
            i += 1 # skip ending ```
            
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.autofit = False
            cell = table.cell(0, 0)
            cell.width = Inches(6.5)
            set_cell_background(cell, "F8FAFC")
            set_table_borders(table, color="E2E8F0", sz="4", val="single")
            set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            for cl in code_lines:
                run = p.add_run(cl + "\n")
                run.font.name = "Consolas"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
            
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(4)
            continue

        # Markdown Table (| ... |)
        if line.strip().startswith('|') and line.strip().endswith('|'):
            table_lines = []
            while i < total and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            
            # Parse table lines
            header_line = table_lines[0]
            header_cols = [c.strip() for c in header_line.split('|')[1:-1]]
            
            # Check if line 1 is separator
            data_start = 1
            alignments = []
            if len(table_lines) > 1 and re.match(r'^\|[\s:-|]+\|$', table_lines[1]):
                sep_cols = [c.strip() for c in table_lines[1].split('|')[1:-1]]
                for sc in sep_cols:
                    if sc.startswith(':') and sc.endswith(':'):
                        alignments.append(WD_ALIGN_PARAGRAPH.CENTER)
                    elif sc.endswith(':'):
                        alignments.append(WD_ALIGN_PARAGRAPH.RIGHT)
                    else:
                        alignments.append(WD_ALIGN_PARAGRAPH.LEFT)
                data_start = 2
            else:
                alignments = [WD_ALIGN_PARAGRAPH.LEFT] * len(header_cols)
                
            num_rows = len(table_lines) - data_start + 1
            num_cols = len(header_cols)
            
            table = doc.add_table(rows=num_rows, cols=num_cols)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.autofit = True
            set_table_borders(table, color="CBD5E1", sz="4", val="single")
            
            # Header Row
            hdr_cells = table.rows[0].cells
            for col_idx, col_name in enumerate(header_cols):
                hdr_cells[col_idx].text = ""
                set_cell_background(hdr_cells[col_idx], "1E3A8A")
                set_cell_margins(hdr_cells[col_idx], top=120, bottom=120, left=140, right=140)
                p = hdr_cells[col_idx].paragraphs[0]
                p.alignment = alignments[col_idx] if col_idx < len(alignments) else WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                clean_name = re.sub(r'\*\*', '', col_name)
                run = p.add_run(clean_name)
                run.bold = True
                run.font.name = "Calibri"
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                
            # Data Rows
            for row_idx, line_str in enumerate(table_lines[data_start:]):
                cols = [c.strip() for c in line_str.split('|')[1:-1]]
                row_cells = table.rows[row_idx + 1].cells
                bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
                for c_idx in range(min(num_cols, len(cols))):
                    cell = row_cells[c_idx]
                    set_cell_background(cell, bg_color)
                    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                    p = cell.paragraphs[0]
                    p.alignment = alignments[c_idx] if c_idx < len(alignments) else WD_ALIGN_PARAGRAPH.LEFT
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    format_text_runs(p, cols[c_idx], base_font="Calibri", base_size=9.5, base_color="1E293B")
                    
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(4)
            continue

        # Bullet list (* or -)
        bullet_match = re.match(r'^(\s*)([\*\-])\s+(.*)$', line)
        if bullet_match:
            indent_str, marker, content = bullet_match.groups()
            indent_level = len(indent_str) // 2
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25 * (indent_level + 1))
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            
            # Bullet symbol
            run_bullet = p.add_run("•  ")
            run_bullet.font.name = "Calibri"
            run_bullet.bold = True
            run_bullet.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
            
            format_text_runs(p, content, base_font="Calibri", base_size=10.5, base_color="1E293B")
            i += 1
            continue

        # Numbered list (1. 2. etc)
        num_match = re.match(r'^(\s*)(\d+)\.\s+(.*)$', line)
        if num_match:
            indent_str, num_str, content = num_match.groups()
            indent_level = len(indent_str) // 2
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25 * (indent_level + 1))
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            
            run_num = p.add_run(f"{num_str}.  ")
            run_num.font.name = "Calibri"
            run_num.bold = True
            run_num.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
            
            format_text_runs(p, content, base_font="Calibri", base_size=10.5, base_color="1E293B")
            i += 1
            continue

        # Regular Paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        format_text_runs(p, line.strip(), base_font="Calibri", base_size=10.5, base_color="1E293B")
        i += 1

    try:
        doc.save(docx_path)
        print(f"Generated successfully: {docx_path}")
    except PermissionError:
        print("Tệp đang mở trong Word, tự động đóng Word và ghi đè tệp gốc...")
        os.system("taskkill /f /im WINWORD.exe >nul 2>&1")
        import time
        time.sleep(0.5)
        doc.save(docx_path)
        print(f"Đã cập nhật trực tiếp vào tệp gốc: {docx_path}")

if __name__ == '__main__':
    md_file = r'd:\02_Code\My_Project\docs\kich-ban-demo-huan-luyen-vien.md'
    docx_file = r'd:\02_Code\My_Project\docs\kich-ban-demo-huan-luyen-vien.docx'
    build_docx(md_file, docx_file)
