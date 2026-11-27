import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import datetime

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
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3"):
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    for b in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{b}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), color)
        tblBorders.append(border)
    tblPr.append(tblBorders)

def add_header_footer(doc):
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(0.8)
        
        # Header
        hdr = s.header
        hp = hdr.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("EQUIFLOW SYSTEM · BÁO CÁO NGHIỆP VỤ RÀNG BUỘC TẠO GIÁO ÁN HUẤN LUYỆN")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(120, 120, 120)
        hrun.font.name = "Calibri"
        
        # Footer
        ftr = s.footer
        fp = ftr.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun1 = fp.add_run("Tài liệu đặc tả nghiệp vụ nội bộ · Tiêu chuẩn vận hành trường đua")
        frun1.font.size = Pt(8.5)
        frun1.font.color.rgb = RGBColor(140, 140, 140)
        frun1.font.italic = True
        frun1.font.name = "Calibri"

def build_document():
    doc = docx.Document()
    add_header_footer(doc)
    
    NAVY = RGBColor(26, 54, 93)      # #1A365D
    SLATE = RGBColor(71, 85, 105)    # #475569
    DARK = RGBColor(15, 23, 42)      # #0F172A
    CRIMSON = RGBColor(153, 27, 27)  # #991B1B
    EMERALD = RGBColor(6, 95, 70)    # #065F46
    
    # Title Section
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    run_sub = title_p.add_run("HỆ THỐNG QUẢN LÝ & HUẤN LUYỆN NGỰA ĐUA CHUYÊN NGHIỆP EQUIFLOW\n")
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = SLATE
    run_sub.font.name = "Calibri"
    
    run_title = title_p.add_run("BÁO CÁO NGHIỆP VỤ & ĐẶC TẢ HỆ THỐNG RÀNG BUỘC TẠO GIÁO ÁN HUẤN LUYỆN")
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY
    run_title.font.name = "Calibri"
    
    # Meta box
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Mã tài liệu / Phiên bản:", "DOC-EQUIFLOW-TRN-02 · Version 2.0 (Official Standard)"),
        ("Ngày hiệu lực:", datetime.datetime.now().strftime("%d/%m/%Y")),
        ("Phân hệ quản lý:", "Huấn luyện chuyên sâu (Training & Workouts System)"),
        ("Đối tượng áp dụng:", "Quản lý CLB (Club Manager), HLV trưởng (Head Trainer), Kỹ sư phần mềm (Dev), Kiểm thử (QA)")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.5)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, top=60, bottom=60, left=100, right=100)
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = DARK
        r0.font.name = "Calibri"
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = DARK
        r1.font.name = "Calibri"
    
    set_table_borders(meta_table, "CBD5E1")
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = NAVY
        run.font.name = "Calibri"
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = SLATE
        run.font.name = "Calibri"
        return p

    def add_p(text, bold_prefix="", italic=False, alert=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.bold = True
            rb.font.size = Pt(10)
            rb.font.color.rgb = CRIMSON if alert else DARK
            rb.font.name = "Calibri"
        run = p.add_run(text)
        run.font.size = Pt(10)
        run.font.italic = italic
        run.font.color.rgb = DARK
        run.font.name = "Calibri"
        return p

    def add_bullet(text, bold_prefix="", alert=False):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.bold = True
            rb.font.size = Pt(10)
            rb.font.color.rgb = CRIMSON if alert else DARK
            rb.font.name = "Calibri"
        run = p.add_run(text)
        run.font.size = Pt(10)
        run.font.color.rgb = DARK
        run.font.name = "Calibri"
        return p

    # CHƯƠNG 1
    add_h1("CHƯƠNG 1: TỔNG QUAN PHÂN HỆ HUẤN LUYỆN & VAI TRÒ ĐIỀU PHỐI")
    add_p("Phân hệ Quản lý Huấn luyện (Training & Workouts System) trong EquiFlow là phân hệ then chốt quyết định chất lượng thể lực, thành tích thi đấu và sự an toàn tính mạng của chiến mã. Nhằm đảm bảo tính thực tế và kỷ luật trường đua, hệ thống thiết lập mô hình kiểm soát chặt chẽ từ thẩm quyền phân công đến từng thông số vận động chi tiết.")
    
    add_h2("1.1. Nguyên tắc Phân công Chuyên môn (Ai giao việc cho HLV?)")
    add_p("Trong môi trường đua ngựa thực tế, Huấn luyện viên trưởng (Head Trainer) không tự ý chọn chiến mã theo ý muốn chủ quan. Thẩm quyền giao việc thuộc về Quản lý CLB (Club Manager):")
    add_bullet(" Duy nhất Quản lý CLB có thẩm quyền gán hoặc chuyển đổi chiến mã cho Huấn luyện viên thông qua quy trình Gán ô chuồng (StallAllocation) hoặc thao tác Giao việc tại Hồ sơ ngựa.", "Thẩm quyền tối cao: ")
    add_bullet(" Trường Horse.assignedTrainerId trong cơ sở dữ liệu đóng vai trò khóa định danh bảo vệ. Khi HLV mở màn hình Lập giáo án (PlanWizardPage), hệ thống lọc nghiêm ngặt và CHỈ HIỂN THỊ những chiến mã mà Quản lý đã giao cho HLV đó (assignedTrainerId === currentTrainer.id). HLV tuyệt đối không thể lập giáo án cho ngựa của HLV khác hoặc ngựa chưa được phân công.", "Khóa bảo vệ HLV (Trainer Gatekeeper): ")
    add_bullet(" Một Huấn luyện viên chỉ được phụ trách tối đa 8 chiến mã đang hoạt động tại cùng một thời điểm (MAX_HORSES_PER_TRAINER = 8). Hệ thống chặn cứng Quản lý nếu cố tình giao ngựa thứ 9.", "Định mức tối đa (Capacity Quota): ")
    add_bullet(" Mọi chiến mã do một HLV phụ trách bắt buộc phải nằm trong cùng một Khu chuồng (Barn Zone) theo quy định assertTrainerZone. HLV không thể vừa huấn luyện ngựa ở Barn A vừa huấn luyện ngựa ở Barn B để tránh việc di chuyển phân tán và giảm tập trung chăm sóc.", "Đồng nhất địa bàn (Zone Consistency): ")
    add_bullet(" Khi HLV chủ động hủy hoặc để một bản nháp giáo án hết hạn, HLV đó bị hệ thống khóa trong 48 giờ đối với con ngựa đó trước khi được phép lập bản nháp mới, nhằm ngăn chặn việc giữ chỗ ảo làm gián đoạn lịch tập của ngựa.", "Thời gian chờ Cooldown (48 giờ): ")

    # CHƯƠNG 2
    add_h1("CHƯƠNG 2: RÀNG BUỘC CẤU TRÚC GIÁO ÁN (PLAN-LEVEL CONSTRAINTS)")
    add_p("Một Giáo án Huấn luyện (Training Plan) là khung chiến lược dài hạn được phê duyệt và theo dõi định kỳ. Cấu trúc giáo án phải đáp ứng các quy chuẩn sau:")
    
    add_h2("2.1. Quy tắc Đặt tên & Mục tiêu Giáo án")
    add_bullet(" Tên giáo án không được chứa toàn chữ số, bắt buộc phải chứa các ký tự chữ cái (ngôn ngữ tự nhiên) với độ dài từ 3 đến 100 ký tự (Mã lỗi: INVALID_PLAN_NAME).", "Tên giáo án (Plan Name): ")
    add_bullet(" Mục tiêu huấn luyện phải bắt đầu bằng chữ cái, không được bắt đầu bằng chữ số hoặc ký tự đặc biệt, độ dài tối đa 500 ký tự (Mã lỗi: INVALID_OBJECTIVE).", "Mục tiêu (Objective): ")
    add_bullet(" Thời lượng một giáo án kéo dài từ tối thiểu 1 tuần đến tối đa 52 tuần (1 năm dương lịch) (MAX_PLAN_WEEKS = 52).", "Thời hạn áp dụng: ")

    add_h2("2.2. Quy tắc Phân chia Giai đoạn (Phases System)")
    add_p("Mỗi giáo án bắt buộc phải chia thành các giai đoạn tập luyện mang tính chu kỳ (Periodization) theo tiêu chuẩn y học thể thao đua ngựa:")
    add_bullet(" Giáo án phải có ít nhất 1 giai đoạn và không được vượt quá 12 giai đoạn (MAX_PHASES = 12).", "Số lượng giai đoạn: ")
    add_bullet(" Ngày bắt đầu và ngày kết thúc của từng giai đoạn phải nằm hoàn toàn bên trong khoảng thời gian của giáo án. Các giai đoạn không được chồng lấn thời gian lên nhau (PHASE_OVERLAP).", "Trục thời gian: ")
    add_bullet(" Mỗi giai đoạn phải chọn 1 trong 5 loại: BASE (Nền tảng thể lực), BUILD (Tăng cường cơ bắp & sức bền), SPEED (Tốc độ bứt phá), PRE_RACE (Căng chỉnh trước ngày thi đấu), RECOVERY (Phục hồi sau giải đấu).", "Phân loại giai đoạn: ")
    add_bullet(" Giai đoạn quy định mặt sân tập luyện chủ đạo: TURF (Sân cỏ), DIRT (Sân cát), hoặc SYNTHETIC (Sân tổng hợp).", "Mặt sân chỉ định: ")
    add_bullet(" Số buổi mỗi tuần: 1 đến 14 buổi/tuần (sessionsPerWeek). Cự ly tối đa mỗi tuần: 500m đến 60.000m (maxWeeklyDistance). Tốc độ mục tiêu: 10 đến 70 km/h (targetSpeedKmh).", "Chỉ tiêu định mức: ")

    # CHƯƠNG 3
    add_h1("CHƯƠNG 3: ĐẶC TẢ CHI TIẾT BUỔI TẬP & THỜI LƯỢNG PHÚT (WORKOUT CONSTRAINTS)")
    add_p("Buổi tập (Workout Session) là đơn vị thực thi trực tiếp tại sân. Mọi buổi tập phải tuân thủ nghiêm ngặt các giới hạn về thời gian, thời lượng, cự ly và cường độ theo quy chuẩn y học.")

    add_h2("3.1. Khung giờ Hoạt động & Thời lượng Từng Loại Bài Tập")
    add_p("Khung giờ tập luyện của CLB mở cửa từ 04:00 sáng đến 20:00 tối (Giờ Việt Nam UTC+7). Tuyệt đối không cho phép tạo lịch tập ngoài khung giờ này nhằm đảm bảo đồng hồ sinh học tự nhiên của chiến mã.")
    add_p("Hệ thống chuẩn hóa chính xác thời lượng (phút) cho 7 loại bài tập theo quy định kỹ thuật BR-TRN-23:")

    # Table of 7 workout types
    t_types = doc.add_table(rows=8, cols=5)
    t_types.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Mã bài tập", "Tên loại bài tập", "Thời lượng chuẩn", "Cường độ quy định", "Mặt sân áp dụng & Mục đích nghiệp vụ"]
    for j, h in enumerate(headers):
        cell = t_types.rows[0].cells[j]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=80, bottom=80, left=80, right=80)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.name = "Calibri"

    w_data = [
        ("WALK", "Đi bộ thư giãn", "45 phút", "Nhẹ (LIGHT)", "Cỏ / Cát / Tổng hợp. Dùng khởi động, xả cơ, kích thích tuần hoàn máu sau các đợt vận động nặng."),
        ("SWIM", "Bơi phục hồi", "45 phút", "Nhẹ (LIGHT)", "Ép về NONE (Bể bơi). Rèn luyện hệ tim mạch và dung tích phổi mà không tạo tải trọng lên khớp và móng."),
        ("TROT", "Chạy nước kiệu", "60 phút", "Trung bình (MEDIUM)", "Cỏ / Cát / Tổng hợp. Cải thiện nhịp điệu vận động, thăng bằng cơ thể và làm nóng các nhóm cơ lớn."),
        ("CANTER", "Chạy nước đại nhẹ", "60 phút", "Trung bình (MEDIUM)", "Cỏ / Cát / Tổng hợp. Tăng cường thể lực đường trường, rèn luyện nhịp thở và kiểm soát tốc độ ổn định."),
        ("BREEZE", "Chạy tốc độ cao", "60 phút", "Luôn ép NẶNG (HEAVY)", "Cỏ / Cát / Tổng hợp. Bắt buộc nhập Tốc độ mục tiêu. Kích hoạt sợi cơ co giật nhanh, rèn bứt phá nước rút."),
        ("TREADMILL", "Máy đi bộ cơ học", "60 phút", "Nhẹ / Trung bình", "Ép về NONE (Máy trong nhà). Kiểm soát chính xác tốc độ và độ dốc trong môi trường nhiệt độ chuẩn."),
        ("TRIAL", "Chạy thử sát hạch", "90 phút", "Luôn ép NẶNG (HEAVY)", "Cỏ / Cát / Tổng hợp. Bắt buộc nhập Tốc độ mục tiêu. Mô phỏng thi đấu thực tế, chiếm trọn 15 phút slot sân.")
    ]

    for i, row in enumerate(w_data):
        r_cells = t_types.rows[i+1].cells
        for j, val in enumerate(row):
            c = r_cells[j]
            bg = "F8FAFC" if i % 2 == 0 else "FFFFFF"
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(9)
            run.font.name = "Calibri"
            if j == 0:
                run.font.bold = True
                run.font.color.rgb = NAVY
            elif j == 2:
                run.font.bold = True
                run.font.color.rgb = CRIMSON

    set_table_borders(t_types, "CBD5E1")
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("3.2. Giới hạn Vận động & Tránh Trùng Lịch")
    add_bullet(" Mỗi chiến mã chỉ được tập tối đa 3 buổi tập trong một ngày dương lịch (MAX_WORKOUTS_PER_DAY = 3). Vi phạm ném lỗi MAX_WORKOUTS_PER_DAY.", "Số buổi tập tối đa trong ngày: ")
    add_bullet(" Số hiệp được phép thiết lập từ 1 đến 10 hiệp (repetitions). Tổng cự ly một buổi (Cự ly mỗi hiệp × Số hiệp) không được vượt quá 10.000m (MAX_SESSION_DISTANCE_METERS = 10000). Vi phạm ném lỗi SESSION_DISTANCE_TOO_LONG.", "Cự ly & Số hiệp: ")
    add_bullet(" Tốc độ trung bình tối đa của buổi tập không được vượt quá 75 km/h (ngưỡng kỷ lục sinh học ngựa đua). Vi phạm ném lỗi tốc độ không hợp lệ.", "Tốc độ trung bình: ")
    add_bullet(" Hai buổi tập của cùng một con ngựa không được bắt đầu cách nhau dưới 30 phút nhằm đảm bảo ngựa được nghỉ ngơi phục hồi tối thiểu (HORSE_WORKOUT_TIME_CONFLICT).", "Chặn trùng lịch ngựa: ")
    add_bullet(" Hai buổi Chạy thử (TRIAL) trên cùng một mặt sân phải cách nhau ít nhất 15 phút (TRIAL_SLOT_MINUTES = 15) để kiểm tra đường băng, dọn dẹp mặt sân và đảm bảo khoảng cách an toàn (TRIAL_SLOT_TAKEN).", "Độc quyền slot Chạy thử: ")

    # CHƯƠNG 4
    add_h1("CHƯƠNG 4: CƠ CHẾ ĐỆM THỜI GIAN & CHUYỂN ĐỔI MẶT SÂN")
    add_p("Trong vận hành trường đua thực tế, quá trình chuẩn bị ngựa, lắp tháo yên cương và thay đổi móng ngựa giữa các mặt sân đòi hỏi thời gian thao tác vật lý bắt buộc. EquiFlow thiết lập hệ thống đệm thời gian 2 tầng chặt chẽ:")

    add_h2("4.1. Thời gian Đệm Chuyển tiếp Cá nhân HLV / Nài (15 phút)")
    add_p("Theo quy tắc nghiệp vụ BR-TRN-24, sau khi kết thúc một buổi tập trên sân, HLV và nài bắt buộc phải dành ra 15 phút đệm (GROOM_BUFFER_MINUTES = 15) để:")
    add_bullet(" Dắt ngựa vào khu vực làm mát (Cool-down zone), thả lỏng nhịp tim.")
    add_bullet(" Tháo bỏ yên cương, đai bảo vệ chân, kiểm tra sơ bộ tình trạng móng.")
    add_bullet(" Bàn giao ngựa lại cho Groom phụ trách ô chuồng tắm rửa, bù nước.")
    add_p("Quy tắc kiểm tra lịch HLV: Thời điểm bắt đầu của buổi tập kế tiếp phải cách thời điểm kết thúc của buổi tập trước tối thiểu: [Thời lượng bài tập trước] + 15 phút đệm. Nếu vi phạm, hệ thống ném lỗi xung đột thời gian HLV (TRAINER_TIME_CONFLICT).", bold_prefix="Hành vi hệ thống: ", alert=True)

    add_h2("4.2. Thời gian Đệm Chuyển đổi Mặt Sân trong ngày (45 phút)")
    add_p("Khi một HLV lên lịch tập luyện cho ngựa trên hai mặt sân khác nhau trong cùng một ngày (ví dụ: Sáng tập sân Cỏ TURF, chiều tập sân Cát DIRT):")
    add_bullet(" Chuyển từ sân Cỏ sang sân Cát đòi hỏi phải thay móng sắt thông thường sang móng bám cát chuyên dụng (Caliks/Studs), thay đổi bọc khớp và kiểm tra độ lún của sân. Quy trình thay móng và chuẩn bị tối thiểu mất từ 30 đến 45 phút.", "Lý do kỹ thuật thực tế: ")
    add_bullet(" Nếu khoảng cách giữa 2 buổi tập trên 2 mặt sân khác nhau của HLV nhỏ hơn [Thời lượng buổi trước] + 45 phút đệm (TRACK_TRANSITION_BUFFER_MINUTES = 45), hệ thống lập tức CHẶN CỨNG và ném lỗi TRAINER_TRACK_CONFLICT.", "Tầng 1 (Chặn cứng - Hard Gate): ", alert=True)
    add_bullet(" Nếu khoảng cách từ 45 phút trở lên, hệ thống cho phép nhưng kích hoạt Cảnh báo chuyên môn bắt buộc xác nhận (WARNINGS_NEED_CONFIRMATION). HLV phải đọc rõ cảnh báo chuẩn bị trang thiết bị móng phù hợp và nhấn xác nhận mới có thể hoàn tất việc tạo buổi tập.", "Tầng 2 (Cảnh báo xác nhận - Confirmation Warning): ")

    # Table of Buffer Rules
    t_buf = doc.add_table(rows=4, cols=4)
    t_buf.alignment = WD_TABLE_ALIGNMENT.CENTER
    b_headers = ["Loại thời gian đệm", "Độ dài thời gian", "Đối tượng áp dụng", "Hành vi xử lý vi phạm"]
    for j, h in enumerate(b_headers):
        cell = t_buf.rows[0].cells[j]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.name = "Calibri"

    buf_data = [
        ("Đệm hạ nhiệt & bàn giao (Groom Buffer)", "15 phút", "HLV / Nài cưỡi ngựa", "Chặn cứng (TRAINER_TIME_CONFLICT). Bắt buộc chờ đủ thời lượng bài tập + 15 phút."),
        ("Đệm chuyển đổi mặt sân (Track Transition)", "45 phút", "Các bài tập khác mặt sân (Cỏ/Cát/Tổng hợp)", "Chặn cứng nếu < 45 phút (TRAINER_TRACK_CONFLICT). Bắt buộc xác nhận nếu ≥ 45 phút."),
        ("Khoảng cách tối thiểu 2 bài nặng", "48 giờ", "Chiến mã (Heavy workouts)", "Cảnh báo chuyên môn (WARNINGS_NEED_CONFIRMATION) yêu cầu xác nhận nguy cơ chấn thương.")
    ]

    for i, row in enumerate(buf_data):
        r_cells = t_buf.rows[i+1].cells
        for j, val in enumerate(row):
            c = r_cells[j]
            bg = "F8FAFC" if i % 2 == 0 else "FFFFFF"
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(9)
            run.font.name = "Calibri"
            if j == 0:
                run.font.bold = True
                run.font.color.rgb = NAVY
            elif j == 1:
                run.font.bold = True
                run.font.color.rgb = CRIMSON

    set_table_borders(t_buf, "CBD5E1")
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # CHƯƠNG 5
    add_h1("CHƯƠNG 5: RÀNG BUỘC SỨC KHỎE, Y TẾ & QUẢN TRỊ QUÁ TẢI")
    add_p("An toàn sức khỏe của chiến mã là ưu tiên số một. Mọi giáo án và buổi tập đều phải nằm dưới sự giám sát y khoa của Bác sĩ thú y (Veterinarian):")
    
    add_h2("5.1. Khóa Huấn luyện Y tế (Medical Lock)")
    add_bullet(" Khi Bác sĩ thú y phát hiện chấn thương, viêm khớp hoặc sốt cao và ban hành Lệnh Khóa y tế (isMedicalLocked = true), toàn bộ các buổi tập đã lên lịch của chiến mã lập tức bị chuyển sang trạng thái BỊ CHẶN (BLOCKED).", "Chặn tự động: ")
    add_bullet(" Khi ngựa đang bị Khóa y tế, HLV bị cấm tuyệt đối tạo mới giáo án hoặc tạo mới buổi tập (HORSE_MEDICAL_LOCKED). Khóa chỉ được gỡ bỏ khi Bác sĩ thú y thăm khám lâm sàng đạt chuẩn và ký lệnh mở khóa trên hệ thống.", "Chặn tạo mới: ")

    add_h2("5.2. Chế độ Tập luyện cho Ngựa ở Trạng thái Y tế (Medical Override)")
    add_p("Nếu ngựa đang ở trạng thái Cần theo dõi (UNDER_OBSERVATION), Chấn thương nhẹ (INJURED) hoặc Đang cách ly (ISOLATED) nhưng không bị Khóa y tế cứng:")
    add_bullet(" HLV được phép xếp các bài tập nhẹ (WALK, TROT, SWIM).", "Bài tập nhẹ: ")
    add_bullet(" Nếu HLV muốn xếp bài tập NẶNG (HEAVY, BREEZE, TRIAL), hệ thống yêu cầu HLV phải tích chọn cam kết 'Đã tham vấn Bác sĩ thú y' (vetConsulted = true). Nếu không tích chọn, hệ thống từ chối lưu buổi tập (VET_CONFIRMATION_REQUIRED).", "Bài tập nặng: ", alert=True)

    add_h2("5.3. Giãn cách Bài tập Nặng & Kiểm soát Tăng vọt Điểm tải")
    add_bullet(" Hai buổi tập nặng của cùng một chiến mã phải cách nhau tối thiểu 48 giờ (HEAVY_GAP_HOURS = 48) để sợi cơ kịp tổng hợp protein và phục hồi glycogen. Nếu vi phạm, hệ thống đưa ra cảnh báo chuyên môn.", "Giãn cách 48 giờ: ")
    add_bullet(" Điểm tải buổi tập được tính theo công thức: Cự ly (km) × Số hiệp × Hệ số cường độ (Light: 1, Medium: 2, Heavy: 3). Nếu tổng điểm tải của tuần hiện tại vượt quá 130% (LOAD_SPIKE_RATIO = 1.3) mức trung bình của 4 tuần trước đó, hệ thống sẽ phát cảnh báo nguy cơ quá tải gân cơ cấp tính.", "Chỉ số Điểm tải (Load Score): ")

    # CHƯƠNG 6
    add_h1("CHƯƠNG 6: MA TRẬN KIỂM TRA XÁC THỰC (VALIDATION ERROR MATRIX)")
    add_p("Dưới đây là bảng tổng hợp toàn bộ các mã lỗi nghiệp vụ chuẩn được kiểm soát tại Backend và phản hồi hiển thị trên Frontend:")

    # Error matrix table
    t_err = doc.add_table(rows=11, cols=4)
    t_err.alignment = WD_TABLE_ALIGNMENT.CENTER
    e_headers = ["Mã lỗi hệ thống", "HTTP Status", "Điều kiện phát sinh", "Thông điệp phản hồi & Hành vi xử lý"]
    for j, h in enumerate(e_headers):
        cell = t_err.rows[0].cells[j]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.name = "Calibri"

    err_data = [
        ("CAPACITY_EXCEEDED", "409 Conflict", "HLV đã quản lý đủ 8 chiến mã", "HLV đã đạt định mức tối đa 8 chiến mã. Không thể gán thêm."),
        ("TRAINER_ZONE_MISMATCH", "409 Conflict", "Ngựa khác khu chuồng với HLV", "Một HLV chỉ được phụ trách ngựa trong cùng một khu chuồng."),
        ("HORSE_MEDICAL_LOCKED", "409 Conflict", "Ngựa đang bị Khóa y tế", "Ngựa đang bị Khóa huấn luyện y tế bởi Bác sĩ thú y. Không thể lập giáo án/buổi tập."),
        ("TRAINER_IN_COOLDOWN", "409 Conflict", "HLV hủy bản nháp trong 48h", "Bạn đang trong thời gian chờ (48 giờ) đối với chiến mã này do vừa hủy bản nháp."),
        ("TRAINER_TRACK_CONFLICT", "409 Conflict", "Chuyển mặt sân cách nhau < 45 phút", "Chuyển đổi giữa 2 mặt sân cần đệm tối thiểu 45 phút để thay móng và trang bị bảo hộ."),
        ("TRAINER_TIME_CONFLICT", "409 Conflict", "HLV bị trùng lịch tập ngựa khác", "HLV đã có buổi tập khác lúc [Giờ]. Bắt buộc cách nhau đủ thời lượng + 15 phút đệm."),
        ("HORSE_WORKOUT_TIME_CONFLICT", "409 Conflict", "Ngựa có 2 buổi tập cách nhau < 30 phút", "Ngựa đã có buổi tập khác lúc [Giờ]. Vui lòng chọn giờ bắt đầu cách tối thiểu 30 phút."),
        ("TRIAL_SLOT_TAKEN", "409 Conflict", "Trùng slot chạy thử trong 15 phút", "Mặt sân đã có lượt chạy thử khác lúc [Giờ]. Cần cách nhau tối thiểu 15 phút độc quyền."),
        ("MAX_WORKOUTS_PER_DAY", "409 Conflict", "Xếp quá 3 buổi tập/ngày cho 1 ngựa", "Mỗi ngựa tối đa 3 buổi tập mỗi ngày nhằm bảo vệ sức khỏe tim mạch."),
        ("VET_CONFIRMATION_REQUIRED", "409 Conflict", "Ngựa bệnh tập nặng chưa tham vấn Vet", "Ngựa đang ở diện theo dõi y tế. Bài tập nặng yêu cầu xác nhận đã tham vấn Bác sĩ thú y.")
    ]

    for i, row in enumerate(err_data):
        r_cells = t_err.rows[i+1].cells
        for j, val in enumerate(row):
            c = r_cells[j]
            bg = "F8FAFC" if i % 2 == 0 else "FFFFFF"
            set_cell_background(c, bg)
            set_cell_margins(c, top=50, bottom=50, left=70, right=70)
            p = c.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(8.5)
            run.font.name = "Calibri"
            if j == 0:
                run.font.bold = True
                run.font.color.rgb = CRIMSON
            elif j == 1:
                run.font.bold = True
                run.font.color.rgb = DARK

    set_table_borders(t_err, "CBD5E1")
    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # Sign-off box
    sign_table = doc.add_table(rows=2, cols=3)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    s_titles = ["ĐẠI DIỆN QUẢN LÝ CLB", "TRƯỞNG BAN HUẤN LUYỆN", "BAN KIỂM SOÁT Y KHOA"]
    for j, st in enumerate(s_titles):
        c0 = sign_table.rows[0].cells[j]
        c1 = sign_table.rows[1].cells[j]
        c0.width = Inches(2.2)
        c1.width = Inches(2.2)
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r0 = p0.add_run(st)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = NAVY
        
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p1.add_run("\n\n(Ký và ghi rõ họ tên)\n")
        r1.font.italic = True
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = SLATE

    output_path = r"d:\02_Code\My_Project\docs\Bao_Cao_Nghiep_Vu_Rang_Buoc_Tao_Giao_An_HLV.docx"
    doc.save(output_path)
    print(f"Successfully generated Word document at: {output_path}")

if __name__ == "__main__":
    build_document()
