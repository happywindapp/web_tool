// GENERATED: venue FIX 4.4 dialect (the venue's QuickFIX XML) — only entries that differ from FixDataStd, same line format.
const FixDataVenue = {
  fields: `2|CoAccount|STRING
39|OrdStatus|CHAR|0=New;1=Partially filled;2=Filled;3=Done for day;4=Canceled;5=Pendingdone;6=Pending cancel;7=Stopped;8=Rejected;9=Suspended;10=Partyreject;A=Pending new;B=Calculated;C=Expired;D=Accepted for bidding;E=Pending replace;M=Mtl
40|OrdType|CHAR|1=Market;2=Limit;3=Stop;4=Stop limit;5=Market on close;6=With or without;A=On close;K=Market with left over as limit;M=Next fund valuation point;P=Pegged;S=Dttttout;R=Bcgdout;U=Repo;T=Multileg
109|TotalListingQtty|QTY
117|StandInstDbID|STRING
168|EffectiveTime|STRING
171|QuoteID|STRING
265|DateNo|INT
326|SecurityTradingStatus|INT|0=Normal;1=Opening delay;2=Trading halt;6=Trading range indication;9=Market on close imbalance buy;10=Market on close imbalance sell;11=Restricted;25=Specialbond
334|Parvalue|INT|1=Cancel;2=Error;3=Correction
339|TradSesMode|INT|1=Testing;2=Simulated
449|CoPartyID|STRING
537|QuoteType|INT|1=Tradeable;2=Restricted tradeable;3=Counter;4=Close;5=Done;6=Partnercancel
549|CrossType|INT|1=Cross aon;2=Cross ioc;3=Cross one side;4=Cross same price;5=Venue accept;6=Venue reject
563|MultiLegRptTypeReq|INT|0=Report by mulitleg security only;1=Report by multileg security and by instrument legs belonging to the multileg security;2=Report by instrument legs belonging to the multileg security only;3=Report by multileg confirm
1111|Is_Visible|STRING
2260|HedgeRate|FLOAT
2261|ReposInterest|FLOAT
3321|HighPxOut|PRICE
3322|HighPxRep|PRICE
3331|LowPxOut|PRICE
3332|LowPxRep|PRICE
4488|OrderPartyID|STRING
4499|InquiryMember|STRING
5522|NumSide|INT
5632|RepoMatchType|INT|1=Repoleg1;2=Repoleg2
6251|TypeRule|STRING
6363|SettlMethod|FLOAT|1=Immediately;2=End of day
6464|SettlValue|AMT
6465|SettlValue2|AMT
9735|Allowed_Trading_Subject|INT
9736|Allowed_Trading_Subject_Sell|INT
9740|Upper_Price_Threshold_Normal|INT
9741|Lower_Price_Threshold_Normal|INT
9742|Upper_Price_Threshold_OutRight|INT
9743|Lower_Price_Threshold_OutRight|INT
9744|Upper_Price_Threshold_Repo|INT
9745|Lower_Price_Threshold_Repo|INT
10911|ClientID|STRING
21111|AdvId|STRING
26511|MDUpdateType|INT|0=Full;1=Incremental
44911|TotalVolumeTradedDate|UTCDATEONLY`,
  messages: `7|Advertisement|app|21111,5,4,53
8|ExecutionReport|app|37,17,150,39,54,151,14
R|QuoteRequest|app|11,644,40,1,54,38,640,64,55,6363,513
S|Quote|app|11,40,1,54,38,640,6464,64,55,6363,513
Z|QuoteCancel|app|11,171,298,40,55
e|SecurityStatusRequest|app|324,263,55
f|SecurityStatus|app|9740,9741,9742,9743,9744,9745
g|TradingSessionStatusRequest|app|335,339
i|MassQuote|app|171,296
s|NewOrderCross|app|548,549,54,11,40,1,38,168,55,2,448,449,640,6464,6363,64
t|CrossOrderCancelReplaceRequest|app|40,549,11,551,1,2,448,449,38,168,54,55,640,6464,64,6363
u|CrossOrderCancelRequest|app|549,11,55,54,551,40
AI|QuoteStatusReport|app|4488,11,171,131,537,40,1,54,38,640,55
AJ|QuoteResponse|app|11,693,694,40,1,54,38,640,6464,64,55
EE|ExecOrderRepos|app|448,449,37,41,526,227,226,5632,552,64,193,917
N01|NQuote|app|11,55,537,40,644,54,38,168,6363,64,193,917,226,513
N03|NQuoteRequest|app|11,537,40,644,1,54,168,226,227,6363,552,64,193,917
N02|NQuoteStatusReport|app|11,537,40,171,644,54,168,55,38,226,513,6363,64,193,4488,917
N04|NQuoteStatusReportFirm|app|1,11,537,40,171,644,54,168,226,227,552,64,193,917,4488,4499
N05|NQuoteResponse|app|11,537,40,644,1,2,227,552
MA|NMultilegOrder|app|11,563,40,54,168,6363,226,227,1,2,448,449,552,64,193,917
ME|NMultilegOrderReplaceRequest|app|11,563,40,54,168,6363,226,227,1,2,448,449,552,64,193,917
MC|NMultilegOrderCancelRequest|app|11,563,40,198,54
MR|NMultilegOrderReplaceRequest / ReportNMultilegOrder|app|4488,11,563,40,54,168,6363,226,227,1,2,448,449,552,64,193,917`,
  groups: `555|600,601,602,603,604,607,608,609,764,610,611,248,249,250,251,252,253,257,599,596,597,598,254,612,942,613,614,615,616,617,618,619,620,621,622,623,624,556,740,739,955,956,682,683,687,690,564,565,539,654,566,587,588,637,676,677,678,679,680,670
146|55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,711,555,386,815,812,668,869,870,913,914,915,918,788,916,917,919,898,15,232,218,220,221,222,662,663,699,761,235,236,701,696,697,698,561,562,336,625,827,58,354,355,140,303,537,229,54,854,38,152,516,468,469,63,64,193,192,1,660,581,735,692,40,126,60,423,44,640,453
78|79,661,736,467,539,80,573,366,81,208,209,161,360,361,12,13,479,497,153,154,119,737,120,155,156,742,741,136,576,635,780,172,169,170,117,85,776,948,756
73|11,526,67,583,160,453,229,75,1,660,581,589,590,70,591,78,63,64,544,635,21,18,110,111,100,386,81,55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,711,140,54,401,114,60,232,854,38,152,516,468,469,40,423,44,99,218,220,221,222,662,663,699,761,235,236,701,696,697,698,15,376,377,23,171,59,168,432,126,427,12,13,479,497,528,529,582,121,120,775,58,354,355,193,192,640,77,203,210,211,835,836,837,838,840,388,389,841,842,843,844,846,847,848,849,494,37,198,66,756,799,800,14,39,636,151,84,6,103
778|162,163,214,453,54,460,167,461,168,126,779,172,169,170,117,85,492,476,488,489,503,490,491,504,505
295|299,55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,555,132,133,134,135,62,188,190,189,191,631,632,633,634,60,336,625,64,40,193,192,642,643,15,368
552|54,37,198,11,526,66,453,1,660,581,81,575,576,635,578,579,821,15,376,377,528,529,582,40,18,483,336,625,943,12,13,479,497,381,157,230,158,159,738,920,921,922,238,237,118,119,120,155,156,77,58,354,355,752,518,232,136,825,826,591,70,78,797,852,853,5522,55,32,44,2261,2260,6465,6464,2`,
  header: "8,9,35,34,49,52,56,115,128,90,91,50,142,57,143,116,144,129,145,43,97,212,213,347,369,627",
  headerReq: "8,9,35,34,49,52,56,369",
  trailer: "93,89,10",
};
