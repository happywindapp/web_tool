// GENERATED from the venue FIX spec "Message & Protocol for Gate v1.15" — message: key|title|purpose · note: key|tag|Y/N|text (¶ = line break) · error: code|text. {venue} = venue name taken from the FIX data.
const FixDocVenue = {
  messages: `A|Logon|Khi công ty chứng khoán muốn kết nối đến {venue}, phải gửi message Logon tới {venue}.
2|ResendRequest|Dùng để yêu cầu bên kia (công ty chứng khoán yêu cầu {venue} ho ặc {venue} yêu cầu công ty chứng khoán) gửi lại 1 đoạn dữ liệu.
4|SequenceReset|Dùng để yêu cầu CTCK reset lại sequence.
0|Heartbeat|Là message mà {venue} gửi lại cho CTCK khi nhận được message TestRequest
1|TestRequest|Công ty chứng khoán tự động gửi message TestRequest theo chu kỳ để kiểm tra connection, khi nhận được message heartbead thì {venue} sẽ trả lời lại công ty chứng khoán bằng Heartbeat message
3|Reject|Gửi các message mà {venue} từ chối
5|Logout|Khi công ty chứng khoán muốn ngắtkết nối đến {venue}, phải gửi message Logout tới {venue}.
h|TradingSessionStatus|Là message mà {venue} gửi cho công ty Chứng khoán khi có sự thay đổi về trạng thái thị trường.
g|TradingSessionStatusRequest|Là message mà Công ty chứng kho án gửi cho {venue} khi có yêu cầu lấy lại thông tin trạngthái thị trường.
f|SecurityStatus|Là message mà {venue} gửi về cho công ty Chứng khoán khi có yêu cầu nhận thông tin CK và gửi thông tin về tất cả các mã trái phiếu giao dịch lúc đầu ngày.
e|SecurityStatusRequest|Là message mà Công ty chứng khoán gửi cho {venue} khi có yêu cầu lấy lại thông tin về chứng khoán giao dịch.
D|NewOrder|Là nội dung lệnh mà thành viên gửi cho {venue}
F|OrderCancelRequest|Là nội dung lệnh hủy thành viên gửi cho {venue}
G|OrderReplaceRequest|Là nội dung lệnh sửa mà thành viên gửi cho {venue}
S|Quote|Là nội dung lệnh thỏa thuận điện tử mà thành viên gửi cho {venue}
R|QuoteRequest|Là nội dung sửa lệnh thỏa thuận điện tử mà thành viên gửi cho {venue}
AJ|QuoteResponse|Là nội dung chấp nhận lệnh thỏa thuận điện tử mà thành viên gửi cho {venue} Thông tin sẽ tương tự như lệnh đặt, để khi thực hiện xác thực có thể cảnh báo thành viên khi thông tin lệnh bị thay đổi (chỉnh sửa) trong quá trình nhập lệnh.
Z|QuoteCancel|Là nội dung hủy lệnh thỏa thuận điện tử mà thành viên gửi cho {venue}
AI|QuoteStatusReport|Là nội dung thông tin trả về tương ứng của thỏa thuận điện tử {venue} gửi về cho thành viên
s|NewOrderCross|Là nội dung lệnh thỏa thuận mà thành viên gửi cho {venue}
t|CrossOrderCancelReplaceRequest|Là nội dung msg sửa lệnh thỏa thuận mà thành viên gửi cho {venue}
u|CrossOrderCancelRequest|Là nội dung lệnh hủy thỏa thuận mà thành viên gửi cho {venue}
8/0|ExecutionReport — xác nhận lệnh đặt|Khi {venue} nhận được 1 lệnh từ công ty chứng khoán thì gửi message này để thông báo với cty chứng
8/4|ExecutionReport — xác nhận lệnh hủy|Khi {venue} nhận được 1 lệnh từ công ty chứng khoán thì gửi message này để thông báo với cty chứng
8/5|ExecutionReport — xác nhận lệnh sửa|Khi {venue} nhận được 1 lệnh từ công ty chứng khoán thì gửi message này để thông báo với công ty
8/3|ExecutionReport — thông báo khớp lệnh|Thông báo từ {venue} cho các thành viên khi có lệnh được khớp
8/8|ExecutionReport — thông báo từ chối lệnh|Thông báo từ {venue} cho các thành viên khi có lệnh bị từ chối
EE|ExecOrderRepos message lệnh khớp|Là nội dung lệnh khớp từ hệ thống core trả ra, dùng cho khớp lệnh của Repos (Nội dung có nhiều mã trái phiếu)
N01|NQuote message lệnh Inquiry|Sửa dụng khi thực hiện đặt/sửa/hủy lệnh Inquiry
N03|NQuoteRequest messge lệnh Firm|Sửa dụng khi thực hiện: - Đặt lệnh Firm (tạo lệnh từ lệnh Inquiry) - Sửa lệnh Firm - Hủy lệnh Firm
N02|NQuoteStatusReport message thông báo lệnh Inquiry|Sửa dụng khi thực hiện: - Thông báo có lệnh Inquiry - Thông báo sửa lệnh Inquiry - Thông báo hủy lệnh Inquiry
N04|NQuoteStatusReportFirm message thông báo có lệnh Firm|Sửa dụng khi thực hiện: - Thông báo có lệnh Firm - Thông báo sửa lệnh Firm - Thông báo hủy lệnh Firm
N05|NQuoteReponse message xác nhận lệnh Firm|Sửa dụng khi thực hiện: - Thực hiện lệnh Firm
MA|NMultilegOrder message đặt lệnh BCGD|Sửa dụng khi thực hiện: - Đặt lệnh báo cáo giao dịch Repos - Xác nhận lệnh BCGD
ME|NMultilegOrderReplaceRequest message thỏa thuận Repos|Sử dụng khi thực hiện: - Sửa lệnh BCGD chưa thực hiện - Sửa lệnh BCGD đã thực hiện - Sửa lệnh Inquiry/Firm đã thực hiện - Sửa lệnh thỏa thuận Repos chân 2 chưa đến hạn thanh toán lần 2. - Xác nhận sửa lệnh BCGD / Repos chân 2/ Inquiry-Firm đã thực hiện
MC|NMultilegOrderCancelRequest message hủy lệnh thỏa thuận Repos|Sửa dụng khi thực hiện: - Hủy lệnh BCGD chưa thực hiện - Hủy lệnh BCGD đã thực hiện - Hủy lệnh Inquiy-Firm đã thực hiện - Xác nhận hủy lệnh BCGD/ Inquiry-Firm đã thực hiện
MR|ReportNMultilegOrder message confirm thông tin lệnh BCGD|Sửa dụng khi thực hiện: - Thông báo có lệnh BCGD Repos - Thông báo sửa lệnh BCGD chưa thực hiện - Thông báo hủy lệnh BCGD chưa thực hiện - Thông báo sửa lệnh BCGD/ In-Firm đã thực hiện - Thông báo hủy lệnh BCGD/ In-Firm đã thực hiện - Thông báo lệnh BCGD/In-Firm sửa/hủy qua kiểm soát hoặc không được kiểm soát
BE|UserRequest|Thay đổi mật khẩu cho trader
BF|UserReponse|Trả lời yêu cầu của thành viên
MN|MarketMakerNotify|Thông báo thực hiện nghĩa vụ tạo lập thị trường tới thành viên`,
  notes: `A|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
A|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
A|35|Y|A Loại message
A|49|Y|Người gửi
A|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
A|34|Y|Số sequence của message
A|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
A|369|N|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
A|98|Y|0 Giải thuật mã hóa:¶0=none
A|108|Y|30 Chu kỳ Heartbeat (seconds). {venue} khuyến nghị là 30s
A|553|Y|Username để đăng nhập
A|554|Y|Password
A|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
2|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
2|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
2|35|Y|2 Loại message
2|49|Y|Người gửi
2|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
2|34|Y|Số sequence của message
2|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
2|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
2|7|Y|Sequence message đầu
2|16|Y|Sequence message cuối
2|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
4|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
4|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
4|35|Y|4 Loại message
4|49|Y|{venue} Người gửi
4|56|Y|ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
4|34|Y|Số sequence của message
4|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
4|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
4|36|Y|Số sequence mà {venue} mong đợi (Đối với message data)
4|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
0|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
0|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
0|35|Y|0 Loại message
0|49|Y|{venue} Người gưỉ
0|56|Y|ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
0|34|Y|Số sequence của message
0|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
0|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
0|112|N|Là ID của message¶TestRequest. Khi trả lời cho message¶TestRequest
0|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
1|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
1|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
1|35|Y|1 Loại message
1|49|Y|Người gửi
1|56|Y|{venue} ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
1|34|Y|Số sequence của message
1|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
1|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
1|112|Y|Là ID của message¶TestRequest. Khi trả lời cho message TestRequest
1|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
3|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
3|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
3|35|Y|3 Loại message
3|49|Y|{venue} Người gửi
3|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
3|34|Y|Số sequence của message
3|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
3|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
3|58|N|Giải thích lý do từ chối với message Reject¶Lý do Logout đối với message Logout
3|45|Y|Số sequence number của message bị reject
3|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
3|373|Y|Mã lỗi của lý do reject
3|372|Y|Loại message bị reject
3|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
5|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
5|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
5|35|Y|5 Loại message
5|49|Y|Người gửi
5|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
5|34|Y|Số sequence của message
5|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
5|58|N|Mục đích của message¶Tiếng việt không dấu
5|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
5|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
h|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
h|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
h|35|Y|h Loại message
h|49|Y|{venue} Người gửi
h|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
h|34|Y|Số sequence của message
h|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
h|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
h|58|N|Lưu mục đích của message¶Tiếng việt không dấu
h|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
h|335|N|Mã bảng/ Mã trái phiếu cần lấy thông tin (trả về từ msgrequest)
h|336|Y|Mã phiên (chính là ký hiệu phiên trong tài liệu kết cấu phiên và các loại lệnh)¶= NONE: Chưa vào phiên nào¶Lưu ý mã phiên lấy theo mã phiên mà sở công bố theo quy chế giao dịch của sở
h|339|Y|Lấy thông tin phiên theo bảng hoăc theo CK :¶= 1 lấy thông tin phiên theo bảng¶= 2 lấy thông tin phiên theo CK
h|340|Y|Trạng thái giao dịch¶= 1 Bình thường¶= 2 Tạm dừng¶= 13 Kết thúc nhận lệnh của ngày giao dịch hiện tại¶= 90 Thị trường đang ở trạng thái chờ nhận lệnh.¶=97 Thị trường đã đóng cửa¶Với trạng thái = 2, 13,¶90,97 hệ thống sẽ ko nhận lệnh.¶Với các trạng thái khác sẽ phụ thuộc vào Mã Trạng thái giao dịch Tag=336 để thực hiện nhận và xử lý các loại lệnh tương ứng.
h|341|N|Thời gian bắt đầu phiên¶Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
h|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
g|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
g|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
g|35|Y|g Loại message
g|49|Y|{venue} Người gửi
g|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
g|34|Y|Số sequence của message
g|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
g|58|N|Lưu mục đích của message¶Tiếng việt không dấu
g|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ¶{venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
g|339|Y|Lấy thông tin phiên theo bảng hoăc theo CK :¶= 1 lấy thông tin phiên theo bảng¶= 2 lấy thông tin phiên theo CK
g|335|Y|Mã bảng/Mã trái phiếu cần lấy thông tin trạng thái giao dịch.¶= 0 là lấy tất cả (tùy theo giá trị của tag 339 thì sẽ là tất cả CK hoặc tất cả bảng)
g|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
f|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
f|9|Y|Độ dài message (không tính độ dài của Tag 8, 9, 10)
f|35|Y|f Loại message
f|49|Y|{venue} Người gửi
f|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là {venue}
f|34|Y|Số sequence của message
f|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
f|52|Y|Thời gian gửi theo giờ UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-¶HH:mm:ss
f|58|N|Mục đích của message¶Tiếng việt không dấu
f|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
f|625|N|Mã bảng giao dịch của CK
f|324|N|Trả lại mã của yêu cầu do¶CTCK gửi lên
f|55|Y|Mã trái phiếu
f|167|Y|Hiện chưa trả giá trị ra
f|541|Y|Ngày đáo hạn Định dạng yyyyMMdd
f|225|Y|Ngày phát hành Định dạng yyyyMMdd
f|106|Y|Mã TCPH
f|332|N|Giá trần
f|333|N|Giá sàn
f|3321|N|Giá trần OutRight
f|3331|N|Giá sàn OutRight
f|3322|N|Giá trần Repos
f|3332|N|Giá sàn Repos
f|31|N|Giá tham chiếu
f|326|N|Trạng thái trái phiếu¶0: Bình thường¶1: CK không được GD trong ngày (do ngày nghỉ)¶2: Ngưng giao dịch¶6: Hủy niêm yết¶9: Chờ giao dịch¶10: Tạm ngừng giao dịch¶11: Hạn chế giao dịch¶25: Trái phiếu đặc biệt
f|330|N|Room nhà đầu tư nước ngoài
f|265|N|Phiên giao dịch thứ. (Kể từ ngày niêm yết)
f|109|N|Khối lượng niêm yết
f|6251|N|Trái phiếu theo phiên riêng hay phiên chung¶= 1 là phiên chung¶= 2 là phiên riêng
f|9735|N|Đối tượng được phép mua¶Giá trị là ghép của các giá trị bên dưới và cách nhau bởi dấu , (ví dụ 1,2 ,3)¶1 = Cá nhân chuyên nghiệp¶2 = Tổ chức chuyên nghiệp¶3 = Cá nhân chiến lược¶4 = Tổ chức chiến lược¶5 = Cá nhân không chuyên¶6 = Tổ chức không chuyên¶9736 Allowed_Trading_Subject_S ell¶N Đối tượng được phép bán¶Giá trị là ghép của các giá trị bên dưới và cách nhau bởi dấu , (ví dụ 1,2)¶= 1 Tổ chức¶= 2 Cá nhân
f|334|Y|Mệnh giá¶9740 Upper_Price_Threshold_Nor mal¶Y Giới hạn trên tỷ lệ % trên mệnh giá giao dịch khớp lệnh¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá¶9741 Lower_Price_Threshold_Nor mal¶Y Giới hạn dưới tỷ lệ % trên mệnh giá giao dịch khớp lệnh¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá¶9742 Upper_Price_Threshold_¶OutRight¶Y Giới hạn trên tỷ lệ % trên mệnh giá giao dịch OutRight¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá¶9743 Lower_Price_Threshold_Out¶Right¶Y Giới hạn dưới tỷ lệ % trên mệnh giá giao dịch OutRight¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá¶9744 Upper_Price_Threshold_Re po¶Y Giới hạn trên tỷ lệ % trên mệnh giá giao dịch Repo¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá¶9745 Lower_Price_Threshold_Re po¶Y Giới hạn dưới tỷ lệ % trên mệnh giá giao dịch Repo¶Nếu giá trị bằng 0 {venue} sẽ không check ngưỡng giá
f|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là ”000”
e|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
e|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
e|35|Y|e Loại message
e|49|Y|Người gửi
e|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
e|34|Y|Số sequence của message
e|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
e|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ¶{venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
e|324|Y|ID của yêu cầu danh sách chứng khoán do CTCK tự đặt và gửi lên {venue}.¶Khi {venue} trả lại thông tin sẽ gửi lại giá trị trường này
e|263|Y|Hình thức yêu cầu:¶= 0 Snapshot¶= 1 SnapshotUpdate¶= 2 Unsubscribe¶Mặc định gửi lên {venue} là 0
e|55|N|- Mã của một trái phiếu cần lấy thông tin¶- Bỏ trống nếu muốn lấy toàn bộ mã trái phiếu.
e|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
D|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
D|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
D|35|Y|D Loại message
D|49|Y|Người gửi
D|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
D|34|Y|Số sequence của message
D|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
D|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
D|58|N|Mục đích của message¶Tiếng việt không dấu
D|11|Y|Số hiệu lệnh của CTCK.
D|1|Y|Tài khoản
D|55|Y|Mã trái phiếu
D|54|Y|Mua/Bán¶1 Mua¶2 Bán
D|38|Y|Khối lượng
D|40|Y|Loại lệnh¶2= LO¶3 = MTL¶4 = MAS¶5 = ATC¶6 = ATO¶A = MAK¶K = MOK¶M = Market Maker
D|640|Y|Giá thực hiện
D|44|N|Giá thực hiện đối với về mua của lệnh MM 2 chiều
D|192|N|khối lượng đặt đối với vế mua của lệnh MM 2 chiều
D|440|Y|Loại lệnh đặc biêt MM¶= 1 là yết giá 1 chiều với¶OrdType = M¶= 2 là yết giá 2 chiều với¶OrdType = M¶= 3 là 2 chiều thay thế với¶OrdType = M.
D|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
F|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
F|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
F|35|Y|F Loại message
F|49|Y|Người gửi
F|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
F|34|Y|Số sequence của message
F|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
F|58|N|Mục đích của message¶Tiếng việt không dấu
F|55|Y|Mã trái phiếu
F|11|Y|Số hiệu lệnh của CTCK.
F|41|Y|Số hiệu lệnh cần hủy. Đây là số hiệu lệnh mà {venue} trả về cho CTCK¶369 LastMsgSeqNumProcesse d¶Y Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
F|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
G|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
G|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
G|35|Y|G Loại message
G|49|Y|Người gửi
G|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
G|34|Y|Số sequence của message
G|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
G|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
G|58|N|Mục đích của message¶Tiếng việt không dấu
G|11|Y|Số hiệu lệnh của CTCK.
G|41|Y|Số hiệu lệnh cần sửa. Đây là số hiệu lệnh mà {venue} trả về cho CTCK
G|38|Y|Khối lượng mong muốn sửa thành. Khi đó khối lượng để tăng/giảm sửa sẽ bằng OrderQty –¶OrgOrderQty. Nếu¶OrderQty = OrgOrderQty là không sửa khối lượng.
G|2238|Y|Khối lượng hiện tại trước khi sửa
G|1|Y|Tài khoản
G|55|Y|Mã trái phiếu
G|640|Y|Giá thực hiện cần sửa
G|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
S|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
S|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
S|35|Y|S Loại message
S|49|Y|Người gửi
S|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
S|34|Y|Số sequence của message
S|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
S|58|N|Mục đích của message¶Tiếng việt không dấu
S|11|Y|Số hiệu lệnh của CTCK.¶1111 Is_Visible Ẩn danh hay không¶1: ẩn danh¶0 Không ẩn danh
S|40|Y|S Mã loại lệnh¶S: ĐTTTT Out
S|1|Y|TK bên quote
S|54|Y|Mua/Bán¶1 Mua¶2 Bán
S|38|Y|Khối lượng
S|640|Y|Giá thực hiện
S|6464|Y|Giá trị thanh toán¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
S|64|Y|Ngày thanh toán Định dạng yyyyMMdd
S|55|Y|Mã trái phiếu
S|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
S|513|Y|Nhập thông tin đại diện¶GD được nhận thông tin, =¶0 là gửi public, gửi đích danh hoặc theo nhóm sẽ là mã đại diện GD cách nhau bởi dấu ,
S|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
S|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
R|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
R|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
R|35|Y|R Loại message
R|49|Y|Người gửi
R|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
R|34|Y|Số sequence của message
R|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
R|58|N|Mục đích của message¶Tiếng việt không dấu
R|11|Y|Số hiệu lệnh của CTCK.
R|644|Y|SHL {venue} của lệnh Quote muốn sửa
R|40|Y|S Mã loại lệnh¶S: ĐTTTT Out
R|1|Y|TK bên quote
R|54|Y|Mua/Bán¶1 Mua¶2 Bán
R|38|Y|Khối lượng
R|640|Y|Giá thực hiện¶6464 SettlValue Giá trị thanh toán¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶64 SettlDate Ngày thanh toán Định dạng yyyyMMdd
R|55|Y|Mã trái phiếu
R|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
R|513|Y|Nhập thông tin đại diện¶GD được nhận thông tin, =¶0 là gửi public, gửi đích danh hoặc theo nhóm sẽ là mã đại diện GD cách nhau bởi dấu ,
R|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
R|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
AJ|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
AJ|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
AJ|35|Y|AJ Loại message
AJ|49|Y|Người gửi
AJ|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
AJ|34|Y|Số sequence của message
AJ|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
AJ|58|N|Mục đích của message¶Tiếng việt không dấu
AJ|11|Y|Số hiệu lệnh của CTCK.
AJ|693|Y|SHL {venue} của lệnh Qoute muốn chấp nhận
AJ|694|Y|= 1 chấp nhật Quote
AJ|40|Y|S Mã loại lệnh¶S: ĐTTTT Out
AJ|1|Y|Tài khoản bên đối ứng
AJ|2|Y|Tài khoản bên đặt Quote
AJ|54|Y|Mua/Bán  Nếu chấp nhận Quote mua thì gửi¶Bán và ngược lại¶1 Mua¶2 Bán
AJ|38|Y|Khối lượng
AJ|640|Y|Giá thực hiện
AJ|6464|Y|Giá trị thanh toán¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
AJ|64|Y|Ngày thanh toán Định dạng yyyyMMdd
AJ|55|Y|Mã trái phiếu¶6363 SettlMethod Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
AJ|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
AJ|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
Z|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
Z|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
Z|35|Y|Z Loại message
Z|49|Y|Người gửi
Z|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
Z|34|Y|Số sequence của message
Z|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
Z|58|N|Mục đích của message¶Tiếng việt không dấu
Z|11|Y|Số hiệu lệnh của CTCK.
Z|171|Y|SHL {venue} của lệnh Qoute muốn hủy
Z|298|Y|= 4 hủy lệnh quote theo¶SHL
Z|40|Y|S Mã loại lệnh¶S: ĐTTTT Out
Z|55|Y|Mã trái phiếu
Z|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
Z|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
AI|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
AI|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
AI|35|Y|AI Loại message
AI|49|Y|Người gửi
AI|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
AI|34|Y|Số sequence của message
AI|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
AI|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
AI|58|N|Mục đích của message¶Tiếng việt không dấu
AI|4488|Y|Mã thành viên đã gửi lệnh lên
AI|11|Y|Số hiệu lệnh của CTCK.¶Tương ứng vơi ClientID thành viên gửi lên¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|171|Y|SHL {venue} của lệnh mới sinh ra¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|131|Y|SHL {venue} của lệnh Qoute muốn sửa/hủy trong TH response cho lệnh sửa/hủy
AI|537|Y|Loại lệnh¶= 1 báo có lệnh điện tử mới¶= 2 Báo sửa lệnh điện tử¶= 3 báo hủy lệnh điện tử¶= 4 Thông báo lệnh điện tử đã được chấp nhận¶= 5 Thông báo hủy lệnh thỏa thuận điện tử trong trường hợp sửa đối ứng
AI|40|Y|S Mã loại lệnh¶S: ĐTTTT Out
AI|1|Y|TK bên quote¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|54|Y|Mua/Bán bên quote¶1 Mua¶2 Bán¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|38|Y|Khối lượng¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|640|Y|Giá thực hiện¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|6464|Y|Giá trị thanh toán¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|64|Y|Ngày thanh toán Định dạng yyyyMMdd¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|55|Y|Mã trái phiếu
AI|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai¶Trường hợp tag 537 = 5 thì tag này không có ý nghĩa
AI|513|Y|Nhập thông tin đại diện¶GD được nhận thông tin, =¶0 là gửi public, gửi đích danh hoặc theo nhóm sẽ là mã đại diện GD cách nhau bởi dấu ,
AI|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
AI|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
s|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
s|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
s|35|Y|s Loại message
s|49|Y|Người gửi
s|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
s|34|Y|Số sequence của message
s|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
s|58|N|Mục đích của message¶Tiếng việt không dấu
s|40|Y|R Mã loại lệnh¶R: BCGD Out
s|549|Y|Loại hành động thỏa thuận¶1 = đặt lệnh thỏa thuận thông thường¶3 = bên đối ứng chấp nhận thoả thuận
s|11|Y|Số hiệu lệnh của CTCK bên bán
s|548|N|Là SHL của {venue} của lệnh¶BCGD cần xác nhận/từ chối
s|1|N|TK bên bán¶Bắt buộc nhập nếu bên nhập lệnh là bên bán¶Bắt buộc nhập nếu 549 =¶3
s|2|N|TK bên mua¶Bắt buộc nhập nếu bên nhập lệnh là bên mua¶Bắt buộc nhập nếu 549 =¶3
s|448|Y|Mã thành viên bán
s|449|Y|Mã thành viên mua
s|38|Y|Khối lượng
s|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch. Hiện chỉ có giao dịch trong ngày nên gửi vào luôn là ngày GD hiện tại Định dạng yyyyMMdd
s|54|Y|Mua/Bán¶1 Mua¶2 Bán
s|55|Y|Mã trái phiếu
s|640|Y|Giá thực hiện
s|6464|Y|Giá trị thanh toán¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
s|64|Y|Ngày thanh toán Định dạng yyyyMMdd
s|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai (Đối ứng gửi lên không cần thông tin này)
s|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
s|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
t|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
t|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
t|35|Y|t Loại message
t|49|Y|Người gửi
t|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
t|34|Y|Số sequence của message
t|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
t|58|N|Mục đích của message¶Tiếng việt không dấu
t|40|Y|R Mã loại lệnh¶R: BCGD Out¶S: ĐTTTT Out¶Chỉ có giá trị ở lệnh từ¶CTCK gửi lên
t|549|Y|Loại hành động thỏa thuận¶1 = sửa thỏa thuận chưa thực hiện¶2 = Sửa thỏa thuận đã thực hiện¶3 = bên đối ứng chấp nhận sửa thoả thuận¶4 = bên đối ứng từ chối sửa thoả thuận¶5 = {venue} chấp nhận Kiểm soát lệnh¶6 = {venue} từ chối Kiểm soát lệnh
t|11|Y|Số hiệu lệnh của CTCK.
t|37|N|Số hiệu lệnh mới (trong¶TH {venue} trả về¶CTCK),lệnh sửa TT mới được sinh ra (SHL này sẽ được dùng để xác nhận sửa)
t|551|Y|Số hiệu lệnh của lệnh thoả thuận (của {venue}) cần sửa/chấp nhận
t|1|N|TK bên bán¶Bắt buộc nhập nếu bên nhập lệnh là bên bán
t|2|N|TK bên mua¶Bắt buộc nhập nếu bên nhập lệnh là bên mua
t|448|Y|Mã thành viên bán
t|449|Y|Mã thành viên mua
t|38|Y|Khối lượng
t|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch. Hiện chỉ có giao dịch trong ngày nên gửi vào luôn là ngày GD hiện tại Định dạng yyyyMMdd
t|54|Y|Mua/Bán¶1 Mua¶2 Bán
t|55|Y|Mã trái phiếu
t|640|Y|Giá thực hiện
t|6464|Y|Giá trị thanh toán¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
t|64|Y|Ngày thanh toán Định dạng yyyyMMdd
t|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
t|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
t|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
u|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản¶FIX sử dụng
u|9|Y|Độ dài message (không tính độ dài của¶Tag 8, 9, 10)
u|35|Y|u Loại message
u|49|Y|Người gửi
u|56|Y|{venue} ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
u|34|Y|Số sequence của message
u|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
u|58|N|Mục đích của message¶Tiếng việt không dấu
u|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ¶CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ {venue}¶Nếu là message từ¶{venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
u|549|Y|Loại hành động thỏa thuận¶1 = hủy lệnh thỏa thuận chưa thực hiện¶2 = hủy lệnh thỏa thuận đã thực hiện¶3 = bên đối ứng chấp nhận huỷ thoả¶4 = bên đối ứng từ chối huỷ thoả thuận¶5 = {venue} chấp nhận¶Kiểm soát lệnh¶6 = {venue} từ chối Kiểm soát lệnh
u|11|Y|Số hiệu lệnh của¶CTCK.
u|55|Y|Mã trái phiếu
u|54|Y|Ghi nhận bên Mua hay¶Bán là bên thực hiện¶Hủy lệnh (Bỏ khôngcần khi hủy¶CTH)¶1 Mua¶2 Bán
u|37|N|Số hiệu lệnh mới (trong TH {venue} trả về¶CTCK), lệnh hủy TT mới được sinh ra (SHL này sẽ được dùng để xác nhận hủy)
u|551|Y|Số hiệu lệnh của lệnh thoả thuận (của {venue}) cần huỷ
u|40|Y|R Mã loại lệnh¶R: BCGD Out¶S: ĐTTTT Out
u|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này.¶CTCK sẽ gửi giá trị mặc định là ”000”
8/0|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
8/0|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
8/0|35|Y|8 Loại message
8/0|49|Y|{venue} Người gửi {venue}
8/0|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
8/0|34|Y|Số sequence của message
8/0|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
8/0|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
8/0|58|N|Mục đích của message¶Tiếng việt không dấu
8/0|150|N|0 Phân loại message trả về¶0 : Trả về của lệnh đặt¶4 : Trả về của lệnh hủy¶5 : Trả về của lệnh sửa¶3 : Thông báo có lệnh khớp¶8 : Trả về lệnh bị hủy do không được khớp hoặc khớp một phần
8/0|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
8/0|39|Y|Trạng thái của lệnh¶- ‘0’ = New: lệnh mới vào đến queue¶- ‘A’ = PendingNew: lệnh đã dequeue vào hệ thống, chờ kiểm soát (nếu có)¶- ‘D’ = AcceptBidding: đồng ý hủy/sửa lệnh¶- ‘M’ = Lệnh Market (MTL) sau khi khớp một phần chuyển thành LO.¶- ‘9’ = Suspended : không đồng ý hủy/sửa lệnh¶- ‘C’ = Expried: lệnh không hiệu lực (sửa/hủy lệnh đã khớp hết)¶- ‘4’ = Canceled: lệnh bị bên mua từ chối sửa.¶- ‘3’ = Done: lệnh hủy sửa thành công¶- ‘5’ = Done: lệnh hủy thành công (lệnh chưa thực hiện)¶- ‘2’ = Filled: lệnh khớp¶- ‘8’ = Rejected: lệnh có reject quantity >0 , thường là do hết room của nước ngoài và do lệnh không được khớp hoặc được khớp một phần¶- 10 đối ứng từ chối hủy
8/0|37|Y|Số hiệu lệnh do {venue} trả về
8/0|11|Y|Số hiệu lệnh của CTCK gửi lên.
8/0|55|Y|Mã trái phiếu
8/0|54|Y|1 = Buy¶2 = Sell
8/0|38|Y|Khối lượng đặt lệnh
8/0|40|Y|Loại lệnh trả về.¶S= ĐTTTT Out¶R= BCGD Out¶U= điện tử tùy chọn Repo¶T= BCGD repo¶2= LO¶3 = MTL¶4 = MAS¶5 = ATC¶6 = ATO¶A = MAK¶K = MOK¶M = Market Maker
8/0|44|Y|Giá thực hiện
8/0|1|Y|Số tài khoản
8/0|6464|Y|Giá trị thanh toán¶Message confirm lệnh đặt thông thường với loại lệnh¶ATO, ATC, MO không trả giá trị tag này
8/0|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
8/4|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
8/4|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
8/4|35|Y|8 Loại message
8/4|49|Y|{venue} Người gửi {venue}
8/4|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
8/4|34|Y|Số sequence của message
8/4|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
8/4|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
8/4|58|N|Mục đích của message¶Tiếng việt không dấu
8/4|150|N|4 Phân loại message trả về¶0 : Trả về của lệnh đặt¶4 : Trả về của lệnh hủy¶5 : Trả về của lệnh sửa¶3 : Thông báo có lệnh khớp¶8 : Trả về lệnh bị hủy do không được khớp hoặc khớp một phần
8/4|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
8/4|39|Y|Trạng thái của lệnh¶- ‘0’ = New: lệnh mới vào đến queue¶- ‘A’ = PendingNew: lệnh đã dequeue vào hệ thống, chờ kiểm soát (nếu có)¶- ‘D’ = AcceptBidding: đồng ý hủy/sửa lệnh¶- ‘M’ = Lệnh Market (MTL) sau khi khớp một phần chuyển thành LO.¶- ‘9’ = Suspended : {venue} từ chối hủy/sửa lệnh¶- ‘C’ = Expried: lệnh không hiệu lực (sửa/hủy lệnh đã khớp hết)¶- ‘4’ = Canceled: lệnh bị bên mua từ chối sửa.¶- ‘3’ = Done: lệnh hủy sửa thành công¶- ‘5’ = Done: lệnh hủy thành công (lệnh chưa thực hiện)¶- ‘2’ = Filled: lệnh khớp¶- ‘8’ = Rejected: lệnh có reject quantity >0 , thường là do hết room của nước ngoài và do lệnh không được khớp hoặc được khớp một phần¶- 10 đối ứng từ chối hủy¶- 11 hủy chưa thực hiện do bên đặt đổi bên đối ứng
8/4|37|Y|Số hiệu lệnh do {venue} trả về¶Trường hợp tag 39 = 11 thì tag này không có giá trị
8/4|151|Y|Khối lượng hủy/Khối lượng sửa thực tế đối với lệnh Confirm Sửa¶Chỉ áp dụng cho giao dịch khớp lệnh¶Trường hợp tag 39 = 11 thì tag này không có giá trị
8/4|11|Y|Số hiệu lệnh của CTCK.¶Trường hợp tag 39 = 11 thì tag này không có giá trị
8/4|41|Y|Giá trị trong trường¶OrigClOrdID do CTCK gửi lên
8/4|55|Y|Mã trái phiếu
8/4|54|Y|1 Mua¶2 Bán¶Trường hợp tag 39 = 11 thì tag này không có ý nghĩa
8/4|40|N|Loại lệnh¶S= ĐTTTT Out¶R= BCGD Out¶U= điện tử tùy chọn Repo¶T= BCGD repo¶2= LO¶3 = MTL¶4 = MAS¶5 = ATC¶6 = ATO¶A = MAK¶K = MOK¶M = Market Maker¶Trường hợp tag 40 không có ý nghĩa
8/4|44|Y|Giá¶Trường hợp tag 39 = 11 thì tag này không có giá trị
8/4|1|Y|Số tài khoản¶Trường hợp tag 39 = 11 thì tag này không có giá trị
8/4|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
8/5|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
8/5|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
8/5|35|Y|8 Loại message
8/5|49|Y|{venue} Người gửi {venue}
8/5|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
8/5|34|Y|Số sequence của message
8/5|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶‘N’ hoặc không có =¶Message gửi bình thường
8/5|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss
8/5|58|N|Mục đích của message¶Tiếng việt không dấu
8/5|150|N|5 Phân loại message trả về¶0 : Trả về của lệnh đặt¶4 : Trả về của lệnh hủy¶5 : Trả về của lệnh sửa¶3 : Thông báo có lệnh khớp¶8 : Trả về lệnh bị hủy do không được khớp hoặc khớp một phần
8/5|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
8/5|39|Y|Trạng thái của lệnh¶- ‘0’ = New: lệnh mới vào đến queue¶- ‘A’ = PendingNew: lệnh đã dequeue vào hệ thống, chờ kiểm soát (nếu có)¶- ‘D’ = AcceptBidding: đồng ý hủy/sửa lệnh¶- ‘M’ = Lệnh Market (MTL) sau khi khớp một phần chuyển thành LO.¶- ‘9’ = Suspended : không đồng ý hủy/sửa lệnh¶- ‘C’ = Expried: lệnh không hiệu lực (sửa/hủy lệnh đã khớp hết)¶- ‘4’ = Canceled: lệnh bị bên mua từ chối sửa.¶- ‘3’ = Done: lệnh hủy sửa thành công¶- ‘5’ = Done: lệnh hủy thành công (lệnh chưa thực hiện)¶- ‘2’ = Filled: lệnh khớp¶- ‘8’ = Rejected: lệnh có reject quantity >0 , thường là do hết room của nước ngoài và do lệnh không được khớp hoặc được khớp một phần¶- 10 đối ứng từ chối hủy
8/5|37|Y|Số hiệu lệnh do {venue} trả về
8/5|11|Y|Số hiệu lệnh của CTCK.
8/5|41|Y|Giá trị trong trường¶OrigClOrdIDdoCTCK gửi lên
8/5|55|Y|Mã trái phiếu
8/5|54|Y|1 Mua¶2 Bán
8/5|40|N|Loại lệnh¶S= ĐTTTT Out¶R= BCGD Out¶U= điện tử tùy chọn Repo¶T= BCGD repo¶2= LO¶3 = MTL¶4 = MAS¶5 = ATC¶6 = ATO¶A = MAK¶K = MOK¶M = Market Maker
8/5|1|Y|Số tài khoản
8/5|32|Y|Khối lượng sau khi sửa
8/5|31|Y|Giá sửa / Giá khớp/ Giá tham chiếu
8/5|151|N|Khối lượng sửa thực tế.¶Chỉ áp dụng cho giao dịch khớp lệnh
8/5|6464|Y|Giá trị thanh toán¶Chỉ áp dụng cho giao dịch thỏa thuận
8/5|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
8/3|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
8/3|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
8/3|35|Y|8 Loại message
8/3|49|Y|{venue} Người gửi {venue}
8/3|56|Y|ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
8/3|34|Y|Số sequence của message
8/3|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶‘N’ hoặc không có =¶Message gửi bình thường
8/3|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
8/3|58|N|Mục đích của message¶Tiếng việt không dấu
8/3|150|N|3 Phân loại message trả về¶0 : Trả về của lệnh đặt¶4 : Trả về của lệnh hủy¶5 : Trả về của lệnh sửa¶3 : Thông báo có lệnh khớp¶8 : Trả về lệnh bị hủy do không được khớp hoặc khớp một phần
8/3|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ¶CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
8/3|39|Y|Trạng thái của lệnh¶- ‘0’ = New: lệnh mới vào đến queue¶- ‘A’ = PendingNew: lệnh đã dequeue vào hệ thống, chờ kiểm soát (nếu có)¶- ‘D’ = AcceptBidding: đồng ý hủy/sửa lệnh¶- ‘M’ = Lệnh Market (MTL) sau khi khớp một phần chuyển thành LO.¶- ‘9’ = Suspended : không đồng ý hủy/sửa lệnh¶- ‘C’ = Expried: lệnh không hiệu lực (sửa/hủy lệnh đã khớp hết)¶- ‘4’ = Canceled: lệnh bị bên mua từ chối sửa.¶- ‘3’ = Done: lệnh hủy sửa thành công¶- ‘5’ = Done: lệnh hủy thành công (lệnh chưa thực hiện)¶- ‘2’ = Filled: lệnh khớp¶- ‘8’ = Rejected: lệnh có reject quantity >0 , thường là do hết room của nước ngoài và do lệnh không được khớp hoặc được khớp một phần¶- 10 đối ứng từ chối hủy
8/3|11|N|Số hiệu lệnh của CTCK. (chỉ có giá trị đối với lệnh khớp thỏa thuận cùng công ty)
8/3|41|Y|Số hiệu lệnh gốc bên bán
8/3|526|Y|Số hiệu lệnh gốc bên mua
8/3|37|Y|Số hiệu lệnh khớp
8/3|32|Y|Khối lượng sửa / Khối lượng khớp
8/3|31|Y|Giá khớp
8/3|17|Y|Số hiệu lệnh khớp
8/3|54|Y|1 Mua 2 Bán
8/3|55|Y|Mã trái phiếu
8/3|6464|Y|Giá trị thanh toán
8/3|448|Y|Mã thành viên đối ứng
8/3|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
8/8|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
8/8|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
8/8|35|Y|8 Loại message
8/8|49|Y|{venue} Người gửi {venue}
8/8|56|Y|ID người nhận.¶Nếu là message do¶CTCK gửi lên thì giá trị phải là {venue}
8/8|34|Y|Số sequence của message
8/8|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶‘N’ hoặc không có =¶Message gửi bình thường
8/8|52|Y|Thời gian gửi theo giờ¶UTC ( hay còn gọi là¶GMT) theo định dạng yyyyMMdd-HH:mm:ss
8/8|58|N|Mục đích của message¶Tiếng việt không dấu
8/8|150|N|8 Phân loại message trả về¶0 : Trả về của lệnh đặt¶4 : Trả về của lệnh hủy¶5 : Trả về của lệnh sửa¶3 : Thông báo có lệnh khớp¶8 : Trả về lệnh bị hủy do không được khớp hoặc khớp một phần
8/8|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ¶CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ {venue}¶- Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
8/8|39|Y|8 Trạng thái của lệnh¶- ‘0’ = New: lệnh mới vào đến queue¶- ‘A’ = PendingNew: lệnh đã dequeue vào hệ thống, chờ kiểm soát (nếu có)¶- ‘D’ = AcceptBidding: đồng ý hủy/sửa lệnh¶- ‘M’ = Lệnh Market (MTL) sau khi khớp một phần chuyển thành LO.¶- ‘9’ = Suspended : không đồng ý hủy/sửa lệnh¶- ‘C’ = Expried: lệnh không hiệu lực (sửa/hủy lệnh đã khớp hết)¶- ‘4’ = Canceled: lệnh bị bên mua từ chối sửa.¶- ‘3’ = Done: lệnh hủy sửa thành công¶- ‘5’ = Done: lệnh hủy thành công (lệnh chưa thực hiện)¶- ‘2’ = Filled: lệnh khớp¶- ‘8’ = Rejected: lệnh có reject quantity >0 , thường là do hết room của nước ngoài và do lệnh không được khớp hoặc được khớp một phần¶- 10 đối ứng từ chối hủy
8/8|11|Y|Số hiệu lệnh của CTCK
8/8|37|Y|Số hiệu lệnh bị từ chối
8/8|103|Y|= 1: Reject do hết room¶= 2: Reject do các thuộc tính FAS, FAK, KOS của lệnh¶= 3: Reject do hết phiên,lệnh không chuyển sang phiên tiếp theo sẽ bị hủy¶=4: Hủy trước khi hết phiên đóng cửa¶= 5: Reject khác ví dụ như không thể xác định được giá của lệnh gửi lên
8/8|652|Y|Khối lượng bị reject
8/8|54|Y|= 1: Lệnh mua¶= 2: Lệnh bán
8/8|40|N|Loại lệnh¶S= ĐTTTT Out¶R= BCGD Out¶U= điện tử tùy chọn Repo¶T= BCGD repo¶2= LO¶3 = MTL¶4 = MAS¶5 = ATC¶6 = ATO¶A = MAK¶K = MOK¶M = Market Maker
8/8|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
EE|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
EE|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
EE|35|Y|EE Loại message
EE|34|Y|Số sequence của message
EE|49|Y|Người gửi
EE|52|Y|Thời gian gửi
EE|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
EE|34|Y|Số sequence của message
EE|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
EE|58|N|Mục đích của message¶Tiếng việt không dấu
EE|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
EE|448|Y|Mã thành viên bán
EE|449|Y|Mã thành viên mua
EE|5632|Y|Thông báo là lệnh Repo¶Leg1 hay lệnh Repos¶Leg2¶= 1 là Thông tin lệnh¶Repo Leg1¶= 2 là Thông tin Repos leg2
EE|37|Y|Số hiệu lệnh khớp.
EE|41|Y|Số hiệu lệnh gốc bên mua¶526 SellOrderID Y Số hiệu lệnh gốc bên bán
EE|227|Y|Lãi suất Repos
EE|226|Y|Kỳ hạn repos
EE|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã¶TP)¶Phần này lặp lại đối với mỗi trái phiếu
EE|5522|Y|Số thứ tự mã trái phiếu lặp lại
EE|55|Y|Mã trái phiếu
EE|32|Y|Khối lượng khớp
EE|31|Y|Giá thanh toán (giá giao dịch)
EE|44|Y|Giá gộp lãi
EE|2261|Y|Lãi Repos
EE|2260|Y|Tỷ lệ phòng vệ rủi ro
EE|6465|Y|Giá trị thanh toán lần 2
EE|6464|Y|Giá trị thanh toán¶Kết thúc phần lặp
EE|11|Y|Số hiệu lệnh của CTCK (chỉ có giá trị đối với lệnh khớp thỏa thuận cùng công ty)
EE|64|Y|Ngày thanh toán Định dạng yyyyMMdd
EE|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd
EE|917|Y|Ngày kết thúc giao dịch
EE|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
EE|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
N01|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
N01|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
N01|35|Y|N01 Loại message
N01|49|Y|Người gửi
N01|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
N01|34|Y|Số sequence của message
N01|52|Y|Thời gian gửi
N01|58|N|Mục đích của message¶Tiếng việt không dấu¶369 LastMsgSeqNumProcesse d¶Y Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
N01|11|Y|Số hiệu lệnh của CTCK.
N01|55|N|Mã trái phiếu¶Trong trường hợp thành viên nhập mã trái phiếu
N01|537|Y|= 1 đặt lệnh inquiry¶= 2 Sửa lệnh Inquiry¶= 3 Hủy lệnh Inquiry¶= 4 Đóng lệnh Inquiry
N01|40|Y|Mã loại lệnh¶U điện tử tùy chọn Repo
N01|644|Y|SHL {venue} của lệnh Inquiry muốn sửa/hủy
N01|54|Y|Mua/Bán¶1 Mua¶2 Bán¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|38|Y|GTGD theo mệnh giá¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|917|Y|Ngày kết thúc giao dịch.¶Ngày giao dịch lần 2.¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|226|Y|Kỳ hạn repos¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|513|Y|Nhập thông tin đại diện¶GD được nhận thông tin, =¶0 là gửi public, gửi đích danh hoặc theo nhóm sẽ là mã đại diện GD cách nhau bởi dấu ,¶Trường hợp tag 537 = 3 hoặc 4 thì không cần gửi tag này
N01|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
N03|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
N03|9|Y|Độ dài message (không tính độ dài của Tag 8, 9, 10)
N03|35|Y|N03 Loại message
N03|49|Y|Người gửi
N03|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là {venue}
N03|52|Y|Thời gian gửi
N03|34|Y|Số sequence của message
N03|58|N|Mục đích của message¶Tiếng việt không dấu¶369 LastMsgSeqNumProcesse d¶Y Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi¶{venue}: là sequence của message cuối cùng mà CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi¶CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
N03|11|Y|Số hiệu lệnh của CTCK.
N03|537|Y|= 1 đặt lệnh Firm¶= 2 Sửa lệnh Firm¶= 3 Hủy lệnh Firm
N03|40|Y|Mã loại lệnh¶U điện tử tùy chọn Repo
N03|644|Y|SHL {venue} của lệnh Inquiry muốn firm hoặc SHL {venue} của lệnh Firm muốn sửa/hủy
N03|1|Y|TK bên firm¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|54|Y|Mua/Bán¶1 Mua¶2 Bán¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|168|Y|Ngày bắt đầu giao dịch. Lệnh trong ngày sẽ = ngày GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|226|Y|Kỳ hạn repos¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|227|Y|Lãi suất Repos¶Trường hợp tag 537 = 3 thì không cần gửi tag này¶6363 SettlMethod Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã TP)¶Trường hợp tag 537 = 3 thì không cần gửi tag này¶Phần này lặp lại đối với mỗi trái phiếu¶5522 NumSide Số thứ tự mã trái phiếu lặp lại¶Trường hợp tag 537 = 3 thì không cần gửi tag này¶55 Symbol Mã trái phiếu¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|38|Y|Khối lượng giao dịch¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|44|Y|Giá gộp lãi¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|2261|Y|Lãi Repos¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|2260|Y|Tỷ lệ phòng vệ rủi ro¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|6464|Y|Giá trị thanh toán lần 1¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|6465|Y|Giá trị thanh toán lần 2¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶Trường hợp tag 537 = 3 thì không cần gửi tag này¶Kết thúc phần lặp
N03|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|917|Y|Ngày kết thúc giao dịch. Ngày giao dịch lần 2.¶Trường hợp tag 537 = 3 thì không cần gửi tag này
N03|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự¶<SOH> báo hiệu kết thúc message. Như vậy checksum có dạng 10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là ”000”
N02|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
N02|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
N02|35|Y|N02
N02|49|Y|Người gửi
N02|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
N02|52|Y|Thời gian gửi
N02|34|Y|Số sequence của message
N02|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
N02|58|N|Mục đích của message¶Tiếng việt không dấu¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
N02|11|Y|Số hiệu lệnh của CTCK.¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|537|Y|= 1 Thông báo có lệnh¶Inquiry¶= 2 Thông báo sửa lệnh¶Inquiry¶= 3 Thông báo hủy lệnh¶Inquiry¶= 4 Đóng lệnh Inquiry¶= 5 Lệnh Inquiry đã được thực hiện (gửi ra khi lệnh Firm base bên¶Inquiry được Accept)¶= 6 Thông báo hủy lệnh¶Inquiry trong trường hợp sửa đối ứng
N02|40|Y|Mã loại lệnh¶U điện tử tùy chọn Repo
N02|117|Y|SHL {venue} của lệnh Inquiry (lệnh đặt hoặc lệnh mới sau sửa)¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|644|Y|SHL {venue} của lệnh Inquiry bị sửa/hủy
N02|54|Y|Mua/Bán¶1 Mua¶2 Bán¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|55|N|Mã trái phiếu¶Trong trường hợp thành viên nhập mã trái phiếu
N02|38|Y|GTGD theo mệnh giá¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|226|Y|Kỳ hạn repos¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa¶513 RegistID Nhập thông tin đại diện¶GD được nhận thông tin, =¶0 là gửi public, gửi đích danh hoặc theo nhóm sẽ là mã đại diện GD cách nhau bởi dấu ,¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|6363|Y|Phương thức thanh toán¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|64|Y|Ngày thanh toán lần 1¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|193|Y|Ngày thanh toán lần 2¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|4488|Y|Mã thành viên đã gửi lệnh lên¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|917|Y|Ngày kết thúc giao dịch¶Trường hợp tag 537 = 6 thì tag này không có ý nghĩa
N02|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
N04|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
N04|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
N04|35|Y|N04
N04|49|Y|Người gửi
N04|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
N04|34|Y|Số sequence của message
N04|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶‘Y’ = Message gửi lại theo yêu cầu¶‘N’ hoặc không có =¶Message gửi bình thường
N04|52|Y|Thời gian gửi
N04|58|N|Mục đích của message¶Tiếng việt không dấu
N04|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
N04|1|Y|TK bên firm
N04|11|Y|Số hiệu lệnh của CTCK.
N04|537|Y|= 1 Thông báo có lệnh¶Firm¶= 2 Thông báo sửa lệnh¶Firm¶= 3 Thông báo hủy lệnh¶Firm¶= 4 Thông báo lệnh Firm bị hủy
N04|40|Y|Mã loại lệnh¶U điện tử tùy chọn Repo
N04|117|Y|SHL {venue} của lệnh Firm (lệnh đặt hoặc lệnh mới sau sửa)
N04|644|Y|SHL {venue} của lệnh Firm bị sửa/hủy hoặc SHL của lệnh IN nếu firm đặt mới
N04|54|Y|Mua/Bán¶1 Mua¶2 Bán
N04|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd
N04|226|Y|Kỳ hạn repos
N04|227|Y|Lãi suất Repos
N04|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã¶TP)¶Phần này lặp lại đối với mỗi trái phiếu
N04|5522|Y|Số thứ tự mã trái phiếu lặp lại
N04|55|Y|Mã trái phiếu
N04|38|Y|Khối lượng giao dịch
N04|640|Y|Giá thực hiện
N04|44|Y|Giá gộp lãi
N04|2261|Y|Lãi Repos
N04|2260|Y|Tỷ lệ phòng vệ rủi ro
N04|6464|Y|Giá trị thanh toán lần 1
N04|6465|Y|Giá trị thanh toán lần 2¶Kết thúc phần lặp
N04|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd
N04|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd
N04|917|Y|Ngày kết thúc giao dịch
N04|4488|Y|Mã thành viên đặt lệnh
N04|4499|Y|Mã thành viên đặt lệnh¶Inquiry
N04|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
N05|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
N05|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
N05|35|Y|N05
N05|49|Y|Người gửi
N05|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
N05|34|Y|Số sequence của message
N05|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶‘N’ hoặc không có =¶Message gửi bình thường
N05|52|Y|Thời gian gửi
N05|58|N|Mục đích của message¶Tiếng việt không dấu
N05|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
N05|11|Y|Số hiệu lệnh của CTCK.¶537 QuoteType Y = 1 thực hiện lệnh Firm
N05|40|Y|Mã loại lệnh¶U điện tử tùy chọn Repo
N05|644|Y|SHL {venue} của lệnh firm muốn thực hiện
N05|1|Y|TK bên đối ứng (bên¶Inquiry)
N05|2|Y|Tài khoản bên tạo firm
N05|227|Y|Lãi Repos
N05|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã TP)¶Phần này lặp lại đối với mỗi trái phiếu
N05|5522|Y|Số thứ tự mã trái phiếu lặp lại
N05|55|Y|Mã trái phiếu
N05|38|Y|KL giao dịch
N05|44|Y|Giá gộp lãi
N05|2260|Y|Tỷ lệ phòng vệ rủi ro¶Kết thúc phần lặp
N05|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
MA|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
MA|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
MA|35|Y|MA
MA|49|Y|Người gửi
MA|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
MA|34|Y|Số sequence của message
MA|52|Y|Thời gian gửi
MA|58|N|Mục đích của message¶Tiếng việt không dấu
MA|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
MA|11|Y|Số hiệu lệnh của CTCK.
MA|563|Y|= 1 đặt lệnh BCGD repos¶= 3 bên đối ứng xác nhận lệnh BCGD
MA|40|Y|Mã loại lệnh¶T: BCGD Repo
MA|198|N|SHL {venue} của lệnh BCGD muốn xác nhận lệnh
MA|54|Y|Mua/Bán¶1 Mua¶2 Bán
MA|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd
MA|6363|Y|Phương thức thanh toán.¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
MA|226|Y|Kỳ hạn repos
MA|227|Y|Lãi suất Repos
MA|1|N|TK bên bán¶Bắt buộc nhập nếu bên nhập lệnh là bên bán¶Bắt buộc nhập nếu tag¶563 = 3
MA|2|N|TK bên mua¶Bắt buộc nhập nếu bên nhập lệnh là bên mua¶Bắt buộc nhập nếu tag¶563 = 3
MA|448|Y|Mã thành viên bán
MA|449|Y|Mã thành viên mua
MA|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã¶TP)¶Phần này lặp lại đối với mỗi trái phiếu
MA|5522|Y|Số thứ tự mã trái phiếu lặp lại
MA|55|Y|Mã trái phiếu
MA|38|Y|Khối lượng giao dịch
MA|44|Y|Giá gộp lãi
MA|2261|Y|Lãi Repos¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
MA|2260|Y|Tỷ lệ phòng vệ rủi ro
MA|6464|Y|Giá trị thanh toán lần 1¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
MA|6465|Y|Giá trị thanh toán lần 2¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶Kết thúc phần lặp
MA|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd
MA|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd
MA|917|Y|Ngày kết thúc giao dịch
MA|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
ME|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
ME|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
ME|35|Y|ME
ME|49|Y|Người gửi
ME|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
ME|34|Y|Số sequence của message
ME|52|Y|Thời gian gửi
ME|58|N|Mục đích của message¶Tiếng việt không dấu
ME|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
ME|11|Y|Số hiệu lệnh của CTCK.
ME|563|Y|= 1 Sửa lệnh BCGD chưa thực hiện¶= 2 Sửa lệnh BCGD đã thực hiện¶= 3 Bên đối ứng chập nhận sửa BCGD đã thực hiện¶= 4 Bên đối ứng từ chối sửa BCGD đã thực hiện¶= 7 Sửa lệnh Repos chân¶2¶= 8 Bên đối ứng chập nhận sửa lệnh Repos chân 2¶= 9 Bên đối ứng từ chối sửa lệnh Repos chân 2¶= 10 {venue} chấp nhận sửa¶Repos chân 2¶= 11 {venue} từ chối sửa¶Repos chân 2
ME|40|Y|Mã loại lệnh¶T: BCGD Repo¶U điện tử tùy chọn Repo
ME|198|Y|SHL {venue} của lệnh BCGD muốn sửa/xác nhận sửa
ME|54|Y|Mua/Bán¶1 Mua¶2 Bán
ME|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd
ME|6363|Y|Phương thức thanh toán.¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai
ME|226|Y|Kỳ hạn repos
ME|227|Y|Lãi suất Repos
ME|1|N|TK bên bán¶Bắt buộc nhập nếu bên nhập lệnh là bên bán
ME|2|N|TK bên mua¶Bắt buộc nhập nếu bên nhập lệnh là bên mua
ME|448|Y|Mã thành viên bán
ME|449|Y|Mã thành viên mua
ME|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã¶TP)¶Phần này lặp lại đối với mỗi trái phiếu
ME|5522|Y|Số thứ tự mã trái phiếu lặp lại
ME|55|Y|Mã trái phiếu
ME|38|Y|Khối lượng giao dịch
ME|44|Y|Giá gộp lãi
ME|2261|Y|Lãi Repos¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
ME|2260|Y|Tỷ lệ phòng vệ rủi ro
ME|6464|Y|Giá trị thanh toán lần 1¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở
ME|6465|Y|Giá trị thanh toán lần 2¶= 0 đối với lệnh từ thành viên gửi lệnh lên sở¶Kết thúc phần lặp
ME|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd
ME|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd
ME|917|Y|Ngày kết thúc giao dịch
ME|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
MC|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
MC|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
MC|35|Y|MC
MC|49|Y|Người gửi
MC|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
MC|34|Y|Số sequence của message
MC|52|Y|Thời gian gửi
MC|58|N|Mục đích của message¶Tiếng việt không dấu
MC|369|Y|Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
MC|11|Y|Số hiệu lệnh của CTCK.
MC|563|Y|= 1 Hủy lệnh BCGD chưa thực hiện¶= 2 Hủy lệnh BCGD đã thực hiện¶= 3 Bên đối ứng chập nhận hủy BCGD¶= 4 Bên đối ứng từ chối hủy BCGD
MC|40|Y|Mã loại lệnh¶T: BCGD Repo¶U điện tử tùy chọn Repo
MC|198|Y|SHL {venue} của lệnh BCGD muốn hủy/xác nhận hủy
MC|54|Y|Mua/Bán¶1 Mua¶2 Bán
MC|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
MR|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
MR|9|Y|Độ dài message (không tính độ dài của Tag 8, 9,¶10)
MR|35|Y|MR
MR|49|Y|Người gửi
MR|56|Y|ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là¶{venue}
MR|34|Y|Số sequence của message
MR|43|N|Cờ báo hiệu là message gửi lại theo yêu cầu¶- ‘Y’ = Message gửi lại theo yêu cầu¶- ‘N’ hoặc không có =¶Message gửi bình thường
MR|52|Y|Thời gian gửi
MR|58|N|Mục đích của message¶Tiếng việt không dấu¶369 LastMsgSeqNumProcesse d¶Y Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi {venue}: là sequence của message cuối cùng mà¶CTCK nhận được từ {venue}¶Nếu là message từ {venue} gửi CTCK: là sequence của message cuối cùng mà¶{venue} nhận được từ công ty chứng khoán
MR|4488|Y|Mã thành viên đã gửi lệnh lên¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|11|Y|Số hiệu lệnh của CTCK.¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|563|Y|1 = Thông báo có lệnh¶BCGD¶2 = Thông báo sửa thỏa thuận chưa thực hiện¶3 = Thông báo hủy BCGD chưa thực hiện¶4 = Thông báo sửa BCGD đã thực hiện¶5 = Thông báo hủy BCGD đã thực hiện¶6 = Thông báo bên mua từ chối BCGD¶7 = bên mua chấp chấp nhận sửa thoả thuận đã thực hiện, sửa BCGD thành công (khi {venue} kiểm soát)¶8 = bên mua từ chối sửa¶TT đã thực hiện¶9 = thông báo lệnh sửa¶BCGD đã thực hiện qua kiểm soát¶10 = thông báo lệnh sửa¶BCGD không được kiểm soát ({venue} từ chối KS)¶11 = bên mua chấp chấp nhận hủy thoả thuận đã thực hiện, hủy BCGD thành công (khi {venue} kiểm soát)¶12 = bên mua từ chối hủy¶BCGD đã thực hiện¶13 = thông báo lệnh hủy¶BCGD đã thực hiện qua kiểm soát¶14 = thông báo lệnh hủy¶BCGD không được kiểm soát ({venue} từ chối KS) Đoạn này danh cho Sửa¶Repos chân 2:¶15 = Thông báo sửa Repos chân 2¶16 = Thông báo bên mua từ chối sửa Repos chân 2¶17 = Thông báo sửa thành công Repos chân 2¶18 = Thông báo hủy lệnh¶BCGD trong trường hợp sửa đối ứng
MR|40|Y|Mã loại lệnh¶T: BCGD Repo
MR|5632|Y|Thông báo là lệnh Repo¶Leg1 hay lệnh Repos Leg2¶= 1 là lệnh Repos Leg1¶= 2 là lệnh Repos Leg2
MR|37|Y|Số hiệu lệnh mới (lệnh đặt mới, lệnh sửa mới sinh)¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|198|N|SHL {venue} của lệnh BCGD bị sửa/hủy
MR|54|Y|Mua/Bán¶1 Mua¶2 Bán¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|168|Y|Ngày bắt đầu giao dịch.¶Lệnh trong ngày sẽ = ngày¶GD, lệnh tương lai > ngày giao dịch Định dạng yyyyMMdd¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa¶6363 SettlMethod Phương thức thanh toán. (Đối ứng gửi lên không cần thông tin này)¶1 Thanh toán ngay¶2 Thanh toán cuối ngày¶3 Thanh toán tương lai¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|226|Y|Kỳ hạn repos¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|227|Y|Lãi suất Repos¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|1|Y|TK bên bán¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|2|Y|TK bên mua nếu có¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|448|Y|Mã thành viên bán¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|449|Y|Mã thành viên mua¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|552|Y|Số mã TP (số lần lặp lại phần thông tin từng mã TP)¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa¶Phần này lặp lại đối với mỗi trái phiếu
MR|5522|Y|Số thứ tự mã trái phiếu lặp lại¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|55|Y|Mã trái phiếu¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|38|Y|Khối lượng giao dịch¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|640|Y|Giá thực hiện¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|44|Y|Giá gộp lãi¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|2261|Y|Lãi Repos¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|2260|Y|Tỷ lệ phòng vệ rủi ro¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|6464|Y|Giá trị thanh toán lần 1¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|6465|Y|Giá trị thanh toán lần 2¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa¶Kết thúc phần lặp
MR|64|Y|Ngày thanh toán lần 1 Định dạng yyyyMMdd¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|193|Y|Ngày thanh toán lần 2 Định dạng yyyyMMdd¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|917|Y|Ngày kết thúc giao dịch¶Trường hợp tag 563 = 18 thì tag này không có ý nghĩa
MR|10|Y|Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự <SOH> báo hiệu kết thúc message. Như vậy checksum có dạng¶10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là¶”000”
BE|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
BE|9|Y|Độ dài message (không tính độ dài của Tag 8, 9, 10)
BE|35|Y|BE Loại message
BE|49|Y|Người gửi
BE|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là {venue}
BE|34|Y|Số sequence của message
BE|52|Y|Thời gian gửi theo giờ UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss¶369 LastMsgSeqNumProcess ed¶N Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi¶{venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi¶CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
BE|923|Y|Định danh cho yêu cầu của thành viên
BE|924|Y|3 Yêu cầu đổi pass cho user trực tuyến
BE|553|Y|Tên username trực tuyến của thành viên
BE|554|N|Mật khẩu cũ
BE|925|N|Mật khẩu mới¶10¶CheckSum Y¶Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự¶<SOH> báo hiệu kết thúc message. Như vậy checksum có dạng 10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là ”000”
BF|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
BF|9|Y|Độ dài message (không tính độ dài của Tag 8, 9, 10)
BF|35|Y|BF Loại message
BF|49|Y|Người gửi
BF|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là {venue}
BF|34|Y|Số sequence của message
BF|52|Y|Thời gian gửi theo giờ UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss¶369 LastMsgSeqNumProcess ed¶N Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi¶{venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi¶CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
BF|553|Y|Tên username trực tuyến của thành viên
BF|923|Y|Giá trị tag 923 của message BE¶926¶UserStatus Y¶3: User not Recognised¶4: Password Incorrect¶5: Password changed¶6: Other
BF|927|N|Mô tả trạng thái¶10¶CheckSum Y¶Checksum để kiểm tra tính đúng đắn của message (Phải là trường cuối cùng của message).¶Checksum có 3 ký tự, có ký tự¶<SOH> báo hiệu kết thúc message. Như vậy checksum có dạng 10=NNN^¶Hiện tại {venue} sẽ không kiểm tra giá trị này. CTCK sẽ gửi giá trị mặc định là ”000”
MN|8|Y|FIX.4.4 “FIX.4.4” (Phải là trường đầu tiên của message). Đây là trường báo phiên bản FIX sử dụng
MN|9|Y|Độ dài message (không tính độ dài của Tag 8, 9, 10)
MN|35|Y|MN Loại message
MN|49|Y|Người gửi
MN|56|Y|{venue} ID người nhận.¶Nếu là message do CTCK gửi lên thì giá trị phải là {venue}
MN|34|Y|Số sequence của message
MN|52|Y|Thời gian gửi theo giờ UTC ( hay còn gọi là GMT) theo định dạng yyyyMMdd-HH:mm:ss¶369 LastMsgSeqNumProcess ed¶N Sequence của message cuối cùng nhận.¶- Nếu là message từ CTCK gửi¶{venue}: là sequence của message cuối cùng mà CTCK nhận được từ¶{venue}¶Nếu là message từ {venue} gửi¶CTCK: là sequence của message cuối cùng mà {venue} nhận được từ công ty chứng khoán
MN|55|Y|Mã trái phiếu
MN|4499|Y|Thành viên thông báo nghĩa vụ tạo lập thị trường¶PHỤ LỤC 01`,
  errors: `0|Thành công
-1|Lỗi không xác định
-31000|Mã Trái phiếu không tồn tại!
-31001|Trái phiếu đang bị tạm ngừng giao dịch, không được phép đặt lệnh!
-31002|Tham số bước giá của trái phiếu không tồn tại!
-31003|Giá giao dịch phải chia hết cho bước giá!
-31004|Giá giao dịch phải lớn hơn hoặc bằng giá sàn!
-31005|Giá giao dịch phải nhỏ hơn hoặc bằng giá trần!
-31006|Tham số về giá không tồn tại!
-31007|Tham số về khối lượng không tồn tại!
-31008|Khối lượng đặt không được vượt quá khối lượng đăng ký giao dịch của trái phiếu!
-31009|Khối lượng đặt phải lớn hơn khối lượng giao dịch tối thiểu
-31010|Tham số lô giao dịch không tồn tại!
-31011|Khối lượng phải chia hết cho lô giao dịch!
-31012|Khối lượng phải lớn hơn 0!
-31013|Giá giao dịch phải lớn hơn 0!
-31014|Bảng giao dịch của trái phiếu không tồn tại!
-31015|Bảng giao dịch đang ngừng hoạt động!
-31016|Thị trường giao dịch không tồn tại!
-31017|Thị trường giao dịch đang ngừng hoạt động!
-31018|TCPH của Mã trái phiếu này đang ngừng hoạt động, không được phép nhập lệnh!
-31019|Tham số bộ quy định giao dịch không tồn tại!
-31020|Không tồn tại dải khối lượng giao dịch tối thiểu tương ứng với mệnh giá của TP!
-31021|Giá trị thanh toán gửi vào phải lớn hơn 0
-31022|Giá trị GD theo MG của Repos không được nhỏ hơn GTGD tối thiểu
-31023|Giá của lệnh thị trường (ATO/ATC/MP) phải = 0
-32000|Tham số về Trạng thái giao dịch không tồn tại
-32001|Thị trường chưa nhận lệnh!
-32002|Phiên giao dịch hiện tại đang tạm ngừng nhận lệnh!
-32003|Lịch giao dịch của trái phiếu không tồn tại!
-32004|Tham số phiên giao dịch không tồn tại!
-32005|Loại lệnh giao dịch không tồn tại!
-32006|Phiên hiện tại không cho phép giao dịch loại lệnh này!
-32007|Bộ lịch giao dịch không tồn tại!
-32008|Ngày hiện tại là ngày nghỉ, không được phép giao dịch!
-32009|Ngày hiện tại không phải ngày giao dịch, không được phép nhập lệnh! -32010 Lịch giao dịch của thị trường không tồn tại!
-32011|Không tồn tại NormalType
-32012|Phiên giao dịch chưa được thiết lập tham số cho giao dịch Outright!
-32013|Không tồn tại ReposType
-32014|Số lượng thành viên nhận lệnh không được nhỏ hơn số lượng tối thiểu!
-32015|Chu kỳ thanh toán không được nhỏ hơn chu kỳ thanh toán tối thiểu! -32016 Chu kỳ thanh toán không được lớn hơn chu kỳ thanh toán tối đa -32017 Tag SetMethod sai giá trị (phải bằng 1,2,3) -32019 Ngày thanh toán lần 1 phải là ngày giao dịch
-32021|Ngày thanh toán lần 2 phải là ngày giao dịch
-32023|Ngày kết thúc giao dịch phải là ngày giao dịch
-32024|Phiên giao dịch đã kết thúc nhận lệnh!
-32025|Kỳ hạn Repos không được nhỏ hơn kỳ hạn Repos tối thiểu trong tham số giao dịch Repos
-32026|Kỳ hạn Repos không được lớn hơn kỳ hạn Repos tối đa trong tham số giao dịch Repos
-32027|Tỷ lệ phòng về rủi ro không được nhỏ hơn tỷ lệ phòng vệ rủi ro tối thiểu
-32028|Tỷ lệ phòng về rủi ro không được lớn hơn tỷ lệ phòng vệ rủi ro tối đa
-32029|Trái phiếu có lãi suất thả nổi không được giao dịch Repos
-32030|Không tồn tại match type cho giao dịch khớp lệnh thông thường
-32031|Điều kiện hủy của lệnh thị trường không hợp lệ
-32032|Chu kỳ thanh toán không đúng quy định!
-32033|Phương thức thanh toán GD phải là thanh toán tương lai
-32034|Hệ thống không cho phép thanh toán tương lai
-32999|Các bảng giao dịch không cho phép nhập lệnh Inquiry!
-33000|Số tài khoản phải chứa 10 ký tự!
-33001|Ký tự thứ 4 trong tài khoản phải thuộc các giá trị {A,E,B,F,P,C}
-33002|Thành viên không tồn tại!
-33003|Thành viên đang bị Tạm ngừng giao dịch hoặc Ngừng giao dịch, không được phép nhập lệnh! -33004 Thành viên nhập lệnh phải là giao dịch giao dịch. Trường hợp nhập lệnh hộ, thành viên được nhập lệnh hộ không được là giao dịch giao dịch thông thường!
-33005|Tài khoản nhập lệnh của thành viên không hợp lệ! -33006 Thành viên chưa đến ngày được phép giao dịch hoặc đã hết hạn giao dịch hoặc bị tạm dừng giao dịch!
-33007|Thành viên không được phép giao dịch tại Bảng này!
-33008|Thành viên không được phép giao dịch bán môi giới!
-33009|Thành viên không được phép giao dịch bán tự doanh!
-33010|Thành viên không được phép giao dịch mua môi giới!
-33011|Thành viên không được phép giao dịch mua tự doanh!
-33012|Mã thành viên đặt lệnh trong tag 448 không đúng side mua/bán!
-33013|Trạng thái tài khoản nhập lệnh không hợp lệ
-33014|Tài khoản lưu ký không tồn tại trong danh sách tài khoản của VSD
-33015|NĐT không thuộc đối tượng giao dịch mã trái phiếu này!
-33016|Thành viên nhập lệnh là Thành viên giao dịch đặc biệt nên chỉ được giao dịch tự doanh! -33017 Thành viên nhập lệnh là Thành viên giao dịch đặc biệt nên không được phép nhập lệnh của Thành viên khác
-33018|Không được đặt lệnh hộ cho tài khoản tự doanh của Thành viên giao dịch đặc biệt
-33019|Trạng thái tài khoản lưu ký không hợp lệ trong bảng nhận về từ VSD
-33020|Thành viên trong nước phải đặt tk tự doanh là A hoặc P
-33021|Thành viên nước ngoài phải đặt tài khoản tự doanh E
-33022|Không được phép nhập lệnh hộ thành viên lưu ký là CTCK
-33023|Tài khoản lưu ký bên mua và bên bán không được trùng nhau
-33024|NĐT không thuộc đối tượng giao dịch mã trái phiếu này!
-33025|NĐT không thuộc đối tượng giao dịch mã trái phiếu này!
-33026|NĐT không thuộc đối tượng giao dịch mã trái phiếu này!
-33027|Không tồn tại hợp đồng tạo lập thị trường của Thành viên với trái phiếu
-33028|Không được nhập MM 1 chiều theo hợp đồng
-33029|Không được nhập MM 2 chiều theo hợp đồng
-33030|Không được nhập MM 2 chiều thay thế theo hợp đồng
-33031|Tài khoản tạo lập thị trường Không đúng vs thông tin lệnh
-33032|Khối lượng nhỏ hơn khối lượng tối thiểu trong hợp đồng tạo lập thị trường
-33033|Sai ngưỡng yết giá
-33034|Sai loại lệnh MM sai Special_type trong msg D
-33035|Lãi suất repos không được nhỏ hơn giá trị tối thiểu
-33036|Lãi suất repos không được lớn hơn giá trị tối đa
-33037|Số chữ số thập phân của tỷ lệ PVRR vượt quá quy định
-33038|Số chữ số thập phân của lãi suất repos vượt quá quy định
-33039|Thành viên không được phép nhập lệnh MM
-34000|Trạng thái lệnh không hợp lệ hoặc Số hiệu lệnh không tồn tại!
-34001|Trạng thái lệnh không hợp lệ để sửa/hủy/đóng!
-34002|Giá trị tag 54 phải bằng 1 hoặc 2!
-34003|Thành viên không tồn tại trong danh sách thành viên được nhận lệnh!
-34004|Tag 549 trong lệnh thỏa thuận Out không đúng
-34005|Ngày giao dịch đầu tiên phải là ngày giao dịch lớn hơn ngày giao dịch hiện tại!
-34006|Ngày thanh toán phải lớn hơn ngày bắt đầu giao dịch!
-34007|Thành viên thực hiện sửa hủy không đúng side mua/bán với thông tin lệnh gốc!
-34008|Không được phép sửa lệnh tương lai!
-34009|Hệ thống không cho phép sửa lệnh thanh toán cuối ngày/tương lai!
-34010|Hệ thống không cho phép sửa Khối lượng!
-34011|Hệ thống không cho phép sửa Số tài khoản!
-34012|Hệ thống không cho phép sửa Giá giao dịch!
-34013|Hệ thống không cho phép sửa Ngày bắt đầu giao dịch!
-34014|Giá trị tag 563 không hợp lệ!
-34015|Lệnh Inquiry đã được thực hiện, không được phép thao tác!
-34016|Mã trái phiếu không hợp lệ với thông tin trong lệnh Inquiry!
-34017|Giá trị giao dịch theo mệnh giá phải bằng Giá trị giao dịch trong lệnh Inquiry!
-34019|Lệnh thanh toán ngay không được phép sửa/hủy!
-34020|Giá trị tag 298 hoặc 694 không hợp lệ
-34021|Lệnh Inquiry đã đóng, không được phép thao tác!
-34022|Thành viên đặt Firm không nằm trong nhóm thành viên được nhập lệnh!
-34023|Không được sửa phương thức thanh toán với đã thực hiện
-34024|Thành viên thực hiện xác nhận không đúng với lệnh đặt trong lệnh báo cáo giao dịch
-34025|Side của lệnh xác nhận không đúng
-34026|Hệ thống không cho phép hủy lệnh!
-34027|Hệ thống không cho phép hủy lệnh thanh toán cuối ngày/tương lai!
-34028|Sửa vượt quá số lần sửa cho phép!
-34029|Ngày bắt đầu giao dịch hoặc ngày thanh toán phải bằng ngày giao dịch của hệ thống!
-34030|Không tồn tại thông tin Room
-34031|Khối lượng đặt vượt quá Room!
-34032|Ngày kết thúc giao dịch Repos phải nhỏ hơn hoặc bằng ngày thanh toán lần 2
-34033|Tài khoản lưu ký của NĐT thực hiện lệnh không đúng cờ Môi giới/tự doanh của lệnh Inquiry!
-34034|Giá trị tag 549 hoặc 563 không hợp lệ!
-34035|Không cho sửa kỳ hạn Repos khi sửa repos đã thực hiện
-34036|Không cho sửa Lãi suât Repos khi sửa repos đã thực hiện
-34037|Không cho sửa tỷ lệ phòng vệ rủi ro khi sửa repos đã thực hiện -34038 Khoang ngày từ ngày thanh toán lần 2 tới ngày chốt hủy mã TP nhỏ hơn tham số maxday_setday_to_canday
-34039|Phương thức thanh toán firm khác in
-34040|Kỳ hạn Repos firm khác in
-34041|Ngày thanh toán lần 1 firm khác in
-34042|Không cho sửa mã TP đối với tất cả lệnh chưa thực hiện, đã thực hiện
-34043|Ngày thanh toán lần 2 phải = ngày thanh toán lần 1 + kỳ hạn repos
-34044|Giá trị theo mệnh giá trong Inquiry không chia hết cho mệnh giá TP trong lệnh
-34045|Không được phép sửa lệnh Repo lần 2 do lệnh đã quá thời hạn được phép sửa!
-34046|Ngày bắt đầu giao dich firm khác in
-34047|Không cho sưa ngày thanh toán lần 1 khi sửa lệnh đã thực hiện
-34048|Không cho sưa Side đối với giao dịch khớp lệnh
-34049|Loai lệnh không được phép sửa
-34050|Loai lệnh không được phép Hủy
-34051|Không cho phép sửa lệnh giao dịch khớp thông thường
-34052|Không cho phép hủy lệnh giao dịch thông thường
-34053|lỗi khi nhập inquiry không theo mã TP mà không nhập thông tin chung
-34054|Lỗi khi loại lệnh không đúng với msgtype
-34055|Ngày thanh toan lần 2 phải lớn hơn hoặc bằng ngày giao dịch hiện tại
-34056|Thông tin lệnh không đúng hoặc lệnh đã bị sửa, không được phép thực hiện!
-34057|Lệnh repos leg2 bị hủy thanh toán không được sửa
-34998|Message Type gửi trong tag 35 không hợp lệ!
-34999|Lệnh đang bị treo, không được phép thao tác!
-31100|Trái phiếu không hợp lệ
-31110|Mã bảng không hợp lệ
-31101|Số hiệu lệnh sửa, hủy không hợp lệ
-31048|Side không đúng. Side phải là mua hoặc bán
-31090|Độ dài của mật khẩu không hợp lệ Độ dài mật khẩu từ 8-20 ký tự
-30027|Mật khẩu phải chứa 3 trong 4 loại (chữ hoa, chữ thường, số hoặc ký tự)
-31099|Lỗi khi hệ thống xử lý bị trễ gây ra lỗi
-30080|Loại yêu cầu không đúng
-30200|Sai thành viên
-30023|Sai phương thức thanh toán
-30201|Giao dịch trái phiếu riêng lẻ vượt ngưỡng trên giá trái phiếu
-30202|Giao dịch trái phiếu riêng lẻ vượt ngưỡng dưới giá trái phiếu
-30016|Sai hình thức yêu cầu của message BE
-30022|Reject lệnh do lệnh bị trùng client_id
-30029|Thành viên không được phép kiểm soát lệnh
-70001|Chưa đăng nhập, không thể gửi các message khác
-70002|Trader đã logon. Không thể logon!
-70003|Trader đã logout.Không thể logon!
-70004|Logon sai username và password
-70008|Loại message không được hỗ trợ
-70009|Không phải là message FIX
-70011|Sai tên người gửi
-70012|Người gửi không có trong hệ thống
-70013|Vượt qua buffersize
-70103|Đã kết nối. Không thể kết nối lại. bỏ
-70020|User đã bị tạm dừng.
-70017|Logon sai địa chỉ IP
-70024|Trader đến hạn đổi mật khẩu!
-70025|Trader bị khóa
-70026|Không lấy được thông tin tài khoản đăng nhập`,
};
