// ?demo=<key> presets: ready-made watchlists (raw text, parsed like user input) + one with bad tokens to show the error report.
const DEMOS = {
  majors: { label: "Top coin lớn", text: "BTC ETH BNB SOL XRP DOGE ADA TRX LINK AVAX TON DOT", tab: "watch" },
  layer1: { label: "Layer 1", text: "ETH SOL ADA AVAX DOT NEAR APT SUI ATOM ALGO ICP SEI", tab: "watch" },
  layer2: { label: "Layer 2", text: "ARB OP POL STRK IMX MNT ZK METIS", tab: "watch" },
  defi: { label: "DeFi", text: "UNI AAVE MKR LDO CRV COMP SNX PENDLE ENA JUP DYDX GMX 1INCH", tab: "watch" },
  meme: { label: "Meme coin", text: "DOGE SHIB PEPE WIF BONK FLOKI TRUMP", tab: "watch" },
  ai: { label: "AI & dữ liệu", text: "FET RENDER TAO GRT WLD AR VIRTUAL", tab: "watch" },
  futures: { label: "Phái sinh: funding & OI", text: "BTC ETH SOL", tab: "futures", sym: "BTC", dtab: "deriv" },
  broken: { label: "Có mã sai (thử báo lỗi)", text: "btc, ETH/USDT; SOLUSDT $doge NOT-A-COIN 12345 ?? ZZZQQQ", tab: "watch" },
};
