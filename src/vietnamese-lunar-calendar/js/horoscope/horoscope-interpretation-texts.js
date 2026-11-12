// Văn bản luận giải viết sẵn (tham khảo, giải trí) cho mệnh, sao, yếu tố năm, thần số học, hướng bát trạch; dịch qua T().
const HoroText = (() => {
  const ELEMENT = [
    "Người mệnh Kim cứng rắn, quyết đoán, trọng nguyên tắc và chữ tín; hợp việc cần kỷ luật như tài chính, kỹ thuật. Nên bớt cứng nhắc, học cách mềm mỏng.",
    "Người mệnh Thủy linh hoạt, giao tiếp tốt, nhạy bén và giàu trực giác; hợp ngoại giao, kinh doanh, truyền thông. Dễ dao động, nên giữ mục tiêu rõ ràng.",
    "Người mệnh Mộc nhân hậu, sáng tạo, thích phát triển và giúp người; hợp giáo dục, nghệ thuật, y tế. Nên bền bỉ, tránh ôm đồm quá nhiều việc.",
    "Người mệnh Hỏa nhiệt huyết, dám nghĩ dám làm, có sức lôi cuốn; hợp lãnh đạo, khởi nghiệp, biểu diễn. Cần kiềm chế nóng vội và nghỉ ngơi đúng lúc.",
    "Người mệnh Thổ điềm tĩnh, đáng tin, chăm chỉ và thực tế; hợp quản lý, bất động sản, nông nghiệp. Nên cởi mở với thay đổi, tránh bảo thủ.",
  ];
  const STAR = {
    "La Hầu": "Sao xấu: dễ gặp thị phi, kiện tụng, tai tiếng; nên giữ lời ăn tiếng nói, tránh tranh chấp.",
    "Thổ Tú": "Sao trung bình: dễ gặp tiểu nhân, đi xa kém thuận; việc nhà cần sắp xếp chu đáo.",
    "Thủy Diệu": "Sao trung bình, thiên về phúc lộc; cẩn thận khi đi sông nước và lời nói.",
    "Thái Bạch": "Sao xấu về tiền bạc: dễ hao tài, đau ốm vặt; nên chi tiêu thận trọng.",
    "Thái Dương": "Sao tốt: công danh thăng tiến, tài lộc dồi dào, được người giúp đỡ.",
    "Vân Hớn": "Sao trung bình: dễ nóng nảy, khẩu thiệt; giữ hòa khí sẽ qua.",
    "Kế Đô": "Sao xấu: dễ buồn phiền, hao tổn, chuyện gia đạo không yên; nên nhẫn nại.",
    "Thái Âm": "Sao tốt: tài lộc, danh lợi, tình cảm và hôn nhân thuận lợi.",
    "Mộc Đức": "Sao tốt: an khang, có hỷ sự, công việc hanh thông.",
  };
  const FACTOR = {
    "Năm sinh mệnh": "Hành của năm trợ cho mệnh: dễ được quý nhân giúp, việc thuận.",
    "Năm cùng hành với mệnh": "Năm cùng hành: vận ổn định, hợp củng cố việc đang làm.",
    "Mệnh sinh năm (hao tổn)": "Mệnh phải nuôi năm: dễ hao sức, hao tiền; nên chi tiêu chừng mực.",
    "Năm khắc mệnh": "Hành năm khắc mệnh: áp lực lớn, cẩn trọng sức khỏe và các quyết định lớn.",
    "Mệnh khắc năm": "Mệnh khắc năm: làm được việc nhưng tốn nhiều công sức.",
    "Năm tuổi (trực Thái Tuế)": "Năm tuổi: dễ biến động; nên giữ ổn định, tránh mạo hiểm.",
    "Xung Thái Tuế": "Xung Thái Tuế: nhiều thay đổi bất ngờ (công việc, nơi ở); cẩn thận khi đi lại.",
    "Hại Thái Tuế": "Hại Thái Tuế: dễ vướng tiểu nhân, hiểu lầm.",
    "Hợp Thái Tuế": "Hợp Thái Tuế: được trợ lực, thuận lợi hợp tác.",
    "Tam Tai": "Phạm Tam Tai (3 năm liên tiếp): tránh việc lớn mạo hiểm, đầu tư liều lĩnh.",
    "Kim Lâu": "Dân gian kiêng cưới hỏi, làm nhà trong năm phạm Kim Lâu.",
    "Hoang Ốc xấu": "Dân gian kiêng làm nhà năm này.", "Hoang Ốc tốt": "Làm nhà được.",
  };
  const NUMBER = { 1: "Độc lập, khởi đầu", 2: "Hợp tác, nhạy cảm", 3: "Sáng tạo, giao tiếp", 4: "Kỷ luật, nền tảng", 5: "Tự do, thay đổi", 6: "Trách nhiệm, gia đình",
    7: "Trí tuệ, nội tâm", 8: "Thành tựu, tài chính", 9: "Nhân ái, hoàn thành", 11: "Trực giác, cảm hứng", 22: "Kiến tạo lớn", 33: "Yêu thương, phụng sự" };
  const LIFE_PATH = {
    1: "Người tiên phong: độc lập, quyết đoán, thích dẫn đầu. Bài học: lắng nghe và hợp tác.",
    2: "Người hòa giải: tinh tế, nhạy cảm, giỏi kết nối. Bài học: tự tin vào bản thân.",
    3: "Người truyền cảm hứng: sáng tạo, vui vẻ, giỏi diễn đạt. Bài học: tập trung và kỷ luật.",
    4: "Người xây nền móng: thực tế, chăm chỉ, đáng tin. Bài học: linh hoạt trước thay đổi.",
    5: "Người tự do: thích trải nghiệm, thích nghi nhanh. Bài học: cam kết và kiên trì.",
    6: "Người chăm sóc: trách nhiệm, yêu gia đình, giàu tình thương. Bài học: đừng ôm việc của người khác.",
    7: "Người tìm chân lý: sâu sắc, thích phân tích, tư duy độc lập. Bài học: mở lòng và tin người.",
    8: "Người điều hành: tham vọng, giỏi quản lý tiền bạc và quyền lực. Bài học: cân bằng vật chất và tinh thần.",
    9: "Người nhân ái: bao dung, lý tưởng, phụng sự cộng đồng. Bài học: buông bỏ quá khứ.",
    11: "Số bậc thầy 11: trực giác mạnh, truyền cảm hứng; cần giữ cân bằng cảm xúc.",
    22: "Số bậc thầy 22: biến ước mơ lớn thành hiện thực; áp lực cao, cần kiên nhẫn.",
    33: "Số bậc thầy 33: người thầy yêu thương, phụng sự vô điều kiện; dễ hy sinh quá mức.",
  };
  const PERSONAL_YEAR = {
    1: "Năm khởi đầu: gieo hạt dự án mới, chủ động thay đổi.", 2: "Năm kiên nhẫn: vun đắp quan hệ, hợp tác, chờ thời.",
    3: "Năm thể hiện: sáng tạo, giao lưu, mở rộng mạng lưới.", 4: "Năm xây dựng: làm việc chăm chỉ, củng cố nền tảng và tài chính.",
    5: "Năm thay đổi: di chuyển, cơ hội mới, cần linh hoạt.", 6: "Năm trách nhiệm: gia đình, nhà cửa, chăm sóc người thân.",
    7: "Năm chiêm nghiệm: học hỏi, nghỉ ngơi, nhìn lại bản thân.", 8: "Năm gặt hái: sự nghiệp, tiền bạc, quyền hạn tăng.",
    9: "Năm khép lại chu kỳ: dọn dẹp, buông bỏ, chuẩn bị chu kỳ mới.",
  };
  const DIRECTION = { "Sinh Khí": "Tài lộc, thăng tiến", "Thiên Y": "Sức khỏe, quý nhân", "Diên Niên": "Hòa thuận, các mối quan hệ", "Phục Vị": "Bình yên, học tập",
    "Họa Hại": "Thị phi, thất bại nhỏ", "Lục Sát": "Kiện tụng, tình cảm trắc trở", "Ngũ Quỷ": "Hao tài, hỏa hoạn", "Tuyệt Mệnh": "Tổn hại nặng, bệnh tật" };
  const VERDICT = { "Tốt": "Năm thuận lợi, nên chủ động nắm cơ hội.", "Khá": "Năm khá, có việc thuận có việc cần cố gắng.",
    "Trung bình": "Năm bình ổn, nên làm chắc từng bước.", "Cần thận trọng": "Năm nhiều thử thách, nên giữ gìn sức khỏe và tài chính, tránh mạo hiểm." };

  return { ELEMENT, STAR, FACTOR, NUMBER, LIFE_PATH, PERSONAL_YEAR, DIRECTION, VERDICT };
})();
