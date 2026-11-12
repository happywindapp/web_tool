// "Thử mẫu…" presets: ready-made watchlists (raw text, parsed like user input) + one with bad tokens to show the error report.
const DEMOS = {
  banks: { label: "Ngân hàng", text: "VCB BID CTG TCB MBB ACB VPB HDB STB VIB TPB SHB LPB MSB SSB EIB OCB" },
  brokers: { label: "Chứng khoán", text: "SSI VND VCI HCM SHS MBS VIX FTS BSI CTS ORS AGR" },
  realestate: { label: "Bất động sản", text: "VHM VIC VRE NVL KDH NLG DXG PDR DIG CEO KBC IDC" },
  materials: { label: "Thép · hoá chất", text: "HPG HSG NKG SMC VGS DGC DPM DCM GVR CSV" },
  energy: { label: "Dầu khí · điện", text: "GAS PLX PVS PVD BSR POW REE PC1 GEG NT2" },
  consumer: { label: "Bán lẻ · tiêu dùng · công nghệ", text: "MWG FRT DGW PNJ MSN SAB VNM FPT CMG CTR" },
  broken: { label: "Có mã sai (thử báo lỗi)", text: "VNM, fpt; HPG XYZ 12 VN-30 VCB NOTREAL1" },
};
