// SWIFT MT (ISO 15022) names for hover / detail: MT5xx + MT598 message types, block 4 field tags, qualifiers, 16R sequences, common codes (SWIFT field names, English as published).
const SwiftDict = (() => {
  const MT = {
    "500": "Instruction to Register", "501": "Confirmation of Registration or Modification", "502": "Order to Buy or Sell", "503": "Collateral Claim", "504": "Collateral Proposal",
    "505": "Collateral Substitution", "506": "Collateral and Exposure Statement", "507": "Collateral Status and Processing Advice", "508": "Intra-Position Advice", "509": "Trade Status Message",
    "510": "Registration Status and Processing Advice", "513": "Client Advice of Execution", "514": "Trade Allocation Instruction", "515": "Client Confirmation of Purchase or Sale",
    "516": "Securities Loan Confirmation", "517": "Trade Confirmation Affirmation", "518": "Market-Side Securities Trade Confirmation", "519": "Modification of Client Details",
    "524": "Intra-Position Instruction", "526": "General Securities Lending/Borrowing Message", "527": "Triparty Collateral Instruction", "530": "Transaction Processing Command",
    "535": "Statement of Holdings", "536": "Statement of Transactions", "537": "Statement of Pending Transactions", "538": "Statement of Intra-Position Advices",
    "540": "Receive Free", "541": "Receive Against Payment", "542": "Deliver Free", "543": "Deliver Against Payment",
    "544": "Receive Free Confirmation", "545": "Receive Against Payment Confirmation", "546": "Deliver Free Confirmation", "547": "Deliver Against Payment Confirmation",
    "548": "Settlement Status and Processing Advice", "549": "Request for Statement/Status Advice", "558": "Triparty Collateral Status and Processing Advice",
    "564": "Corporate Action Notification", "565": "Corporate Action Instruction", "566": "Corporate Action Confirmation", "567": "Corporate Action Status and Processing Advice",
    "568": "Corporate Action Narrative", "569": "Triparty Collateral and Exposure Statement", "575": "Report of Combined Activity", "576": "Statement of Open Orders",
    "578": "Settlement Allegement", "586": "Statement of Settlement Allegements", "592": "Request for Cancellation", "595": "Queries", "596": "Answers",
    "598": "Proprietary Message", "599": "Free Format Message",
  };
  const TAGS = {
    "11A": "Currency", "12": "Sub-Message Type", "12A": "Indicator (type of instrument)", "12B": "Indicator (type of instrument, code)", "13A": "Number Identification", "13B": "Number Identification",
    "16R": "Start of Block", "16S": "End of Block", "17B": "Flag", "19A": "Amount", "20": "Transaction Reference Number", "20C": "Reference", "20D": "Reference (narrative)", "21": "Related Reference",
    "22F": "Indicator", "22H": "Indicator", "23G": "Function of the Message", "24B": "Reason Code", "25D": "Status Code", "28E": "Page Number/Continuation Indicator",
    "35B": "Identification of the Financial Instrument", "36B": "Quantity of Financial Instrument", "36C": "Quantity of Financial Instrument (code)", "69A": "Period", "69B": "Period (date + time)",
    "70C": "Narrative", "70D": "Narrative", "70E": "Narrative", "77E": "Proprietary Message", "79": "Narrative", "90A": "Price (percentage)", "90B": "Price (amount)",
    "92A": "Rate", "93B": "Balance", "94B": "Place (code)", "94F": "Place (BIC)", "94H": "Place (BIC)", "95C": "Party (country)", "95L": "Party (LEI)", "95P": "Party (BIC)",
    "95Q": "Party (name and address)", "95R": "Party (proprietary code)", "97A": "Account", "97B": "Account (with type)", "97E": "Account (IBAN)", "98A": "Date/Time (date)",
    "98B": "Date/Time (code)", "98C": "Date/Time (date + time)", "98E": "Date/Time (date + time, decimals, UTC offset)", "99A": "Number Count", "99B": "Number Count",
  };
  const QUALS = {
    SEME: "Sender's Message Reference", PREV: "Previous Message Reference", RELA: "Related Message Reference", MAST: "Master Reference", COMM: "Common Reference", POOL: "Pool Reference",
    TRRF: "Deal Reference", MITI: "Market Infrastructure Transaction ID", PCTI: "Processor Transaction ID", PREP: "Preparation Date/Time", TRAD: "Trade Date/Time", SETT: "Settlement (date / quantity / amount)",
    ESET: "Effective Settlement Date/Time", ESTT: "Effectively Settled Quantity / Amount", DEAL: "Deal Price", SAFE: "Safekeeping Account", CASH: "Cash Account", SETR: "Type of Settlement Transaction",
    STCO: "Settlement Transaction Condition", RTGS: "Securities Real-Time Gross Settlement", DEAG: "Delivering Agent", REAG: "Receiving Agent", DECU: "Deliverer's Custodian", RECU: "Receiver's Custodian",
    SELL: "Seller", BUYR: "Buyer", PSET: "Place of Settlement", PAYE: "Payee", DEBT: "Debtor", ACCW: "Account With Institution", INVE: "Investor", STAT: "Status", IPRC: "Instruction Processing Status",
    MTCH: "Matching Status", CPRC: "Cancellation Processing Status", PEND: "Pending Reason", PENF: "Failing Reason", REJT: "Rejection Reason", NMAT: "Unmatched Reason",
    CAND: "Cancellation Reason", PACK: "Accepted Reason", LINK: "Linked Message", PLIS: "Place of Listing", ACRU: "Accrued Interest Amount",
    CODE: "Code", ADDT: "Additional Text", RSTR: "Restriction", BENE: "Beneficial Ownership", CASY: "Cash Settlement System", FXCX: "FX Standing Instruction", TRCA: "Trade Transaction Condition",
  };
  const SEQS = {
    GENL: "General Information", LINK: "Linkages", TRADDET: "Trade Details", FIAC: "Financial Instrument/Account", REPO: "Two Leg Transaction Details", SETDET: "Settlement Details",
    SETPRTY: "Settlement Parties", CSHPRTY: "Cash Parties", AMT: "Amount", OTHRPRTY: "Other Parties", STAT: "Status", REAS: "Reason", SETTRAN: "Settlement Transaction Details",
    FIN: "Financial Instrument", SUBSAFE: "Sub-Safekeeping Account", USECU: "Underlying Securities", CAINST: "Corporate Action Instruction", CAOPTN: "Corporate Action Options",
  };
  const CODES = {
    "23G": { NEWM: "New Message", CANC: "Cancellation Request", PREA: "Preadvice", REPL: "Replacement", RVSL: "Reversal", INST: "Instruction", ADDB: "Additional Business Process" },
    "22F": { TRAD: "Trade", OWNI: "Internal Account Transfer", OWNE: "External Account Transfer", REPU: "Repo", RVPO: "Reverse Repo", SECL: "Securities Lending", SECB: "Securities Borrowing", NETT: "Netting" },
    "25D": { PACK: "Acknowledged/Accepted", REJT: "Rejected", CAND: "Cancelled", CANP: "Cancellation Pending", CPRC: "Cancellation Requested", MACH: "Matched", NMAT: "Unmatched", PEND: "Pending", PENF: "Failing", REPR: "Repaired" },
  };

  const seqName = v => SEQS[v.trim()] || "";
  const codeOf = (tag, value) => { const m = /^([A-Z0-9]{4})\b/.exec(value); return m && CODES[tag]?.[m[1]] ? m[1] + " = " + CODES[tag][m[1]] : ""; };

  // Hover text of a field line: tag name, qualifier, sequence name (16R / 16S) or a known code.
  function describe(tag, qual, value) {
    const rows = [[T("Tag"), ":" + tag + ": " + (TAGS[tag] || TAGS[tag.slice(0, 2)] || T("Không có trong từ điển MT5xx"))]];
    if (qual) rows.push([T("Qualifier"), qual + (QUALS[qual] ? " — " + QUALS[qual] : "")]);
    if (tag === "16R" || tag === "16S") rows.push([T("Khối"), value.trim() + (seqName(value) ? " — " + seqName(value) : "")]);
    const code = codeOf(tag, value);
    if (code) rows.push([T("Mã"), code]);
    else if (value && tag !== "16R" && tag !== "16S") rows.push([T("Giá trị"), value.length > 120 ? value.slice(0, 120) + "…" : value]);
    return { title: "SWIFT :" + tag + ":" + (qual ? ":" + qual : ""), rows };
  }
  const describeMt = mt => ({ title: "MT" + mt, rows: [[T("Loại message"), MT[mt] || T("Không có trong từ điển MT5xx")]] });

  return { describe, describeMt, MT, TAGS, QUALS, SEQS, CODES, seqName, codeOf };
})();
