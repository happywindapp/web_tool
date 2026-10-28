// GENERATED from QuickFIX spec/FIX44.xml — this product includes software developed by quickfixengine.org (http://www.quickfixengine.org/), QuickFIX License 1.0. field: tag|Name|TYPE|enum=Desc;… · message: type|Name|cat|required tags · group: countTag|member tags.
const FixDataStd = {
  fields: `1|Account|STRING
2|AdvId|STRING
3|AdvRefID|STRING
4|AdvSide|CHAR|B=Buy;S=Sell;T=Trade;X=Cross
5|AdvTransType|STRING|C=Advcancel;N=Advnew;R=Advreplace
6|AvgPx|PRICE
7|BeginSeqNo|SEQNUM
8|BeginString|STRING
9|BodyLength|LENGTH
10|CheckSum|STRING
11|ClOrdID|STRING
12|Commission|AMT
13|CommType|CHAR|1=Per unit;2=Percent;3=Absolute;4=Percentage waived 4;5=Percentage waived 5;6=Points per bond or contract
14|CumQty|QTY
15|Currency|CURRENCY
16|EndSeqNo|SEQNUM
17|ExecID|STRING
18|ExecInst|MULTIPLEVALUESTRING|0=Stay on offer side;1=Not held;2=Work;3=Go along;4=Over the day;5=Held;6=Participant dont initiate;7=Strict scale;8=Try to scale;9=Stay on bid side;A=No cross;a=Trailing stop peg;B=Ok to cross;b=Strict limit;c=Ignore price validity checks;C=Call first;d=Peg to limit price;D=Percent of volume;E=Do not increase;e=Work to target strategy;F=Do not reduce;G=All or none;H=Reinstate on system failure;I=Institutions only;J=Reinstate on trading halt;K=Cancel on trading halt;L=Last peg;M=Mid price peg;N=Non negotiable;O=Opening peg;P=Market peg;Q=Cancel on system failure;R=Primary peg;S=Suspend;U=Customer display instruction;V=Netting;W=Peg to vwap;X=Trade along;Y=Try to stop;Z=Cancel if not best
19|ExecRefID|STRING
20|ExecTransType|CHAR|0=New;1=Cancel;2=Correct;3=Status
21|HandlInst|CHAR|1=Automated execution order private no broker intervention;2=Automated execution order public broker intervention ok;3=Manual order best execution
22|SecurityIDSource|STRING|1=Cusip;2=Sedol;3=Quik;4=Isin number;5=Ric code;6=Iso currency code;7=Iso country code;8=Exchange symbol;9=Consolidated tape association;A=Bloomberg symbol;B=Wertpapier;C=Dutch;D=Valoren;E=Sicovam;F=Belgian;G=Common;H=Clearing house;I=Isda fpml product specification;J=Option price reporting authority
23|IOIID|STRING
24|IOIOthSvc|CHAR
25|IOIQltyInd|CHAR|H=High;L=Low;M=Medium
26|IOIRefID|STRING
27|IOIQty|STRING
28|IOITransType|CHAR|C=Cancel;N=New;R=Replace
29|LastCapacity|CHAR|1=Agent;2=Cross as agent;3=Cross as principal;4=Principal
30|LastMkt|EXCHANGE
31|LastPx|PRICE
32|LastQty|QTY
33|NoLinesOfText|NUMINGROUP
34|MsgSeqNum|SEQNUM
35|MsgType|STRING|0=Heartbeat;1=Test request;2=Resend request;3=Reject;4=Sequence reset;5=Logout;6=Ioi;7=Advertisement;8=Execution report;9=Order cancel reject;a=Quote status request;A=Logon;AA=Derivative security list;AB=New order multileg;AC=Multileg order cancel replace;AD=Trade capture report request;AE=Trade capture report;AF=Order mass status request;AG=Quote request reject;AH=Rfq request;AI=Quote status report;AJ=Quote response;AK=Confirmation;AL=Position maintenance request;AM=Position maintenance report;AN=Request for positions;AO=Request for positions ack;AP=Position report;AQ=Trade capture report request ack;AR=Trade capture report ack;AS=Allocation report;AT=Allocation report ack;AU=Confirmation ack;AV=Settlement instruction request;AW=Assignment report;AX=Collateral request;AY=Collateral assignment;AZ=Collateral response;B=News;b=Mass quote acknowledgement;BA=Collateral report;BB=Collateral inquiry;BC=Network counterparty system status request;BD=Network counterparty system status response;BE=User request;BF=User response;BG=Collateral inquiry ack;BH=Confirmation request;C=Email;c=Security definition request;d=Security definition;D=New order single;e=Security status request;E=New order list;F=Order cancel request;f=Security status;G=Order cancel replace request;g=Trading session status request;H=Order status request;h=Trading session status;i=Mass quote;j=Business message reject;J=Allocation instruction;k=Bid request;K=List cancel request;l=Bid response;L=List execute;m=List strike price;M=List status request;n=Xml non fix;N=List status;o=Registration instructions;p=Registration instructions response;P=Allocation instruction ack;q=Order mass cancel request;Q=Dont know trade;R=Quote request;r=Order mass cancel report;S=Quote;s=New order cross;T=Settlement instructions;t=Cross order cancel replace request;u=Cross order cancel request;V=Market data request;v=Security type request;w=Security types;W=Market data snapshot full refresh;x=Security list request;X=Market data incremental refresh;Y=Market data request reject;y=Security list;Z=Quote cancel;z=Derivative security list request
36|NewSeqNo|SEQNUM
37|OrderID|STRING
38|OrderQty|QTY
39|OrdStatus|CHAR|0=New;1=Partially filled;2=Filled;3=Done for day;4=Canceled;6=Pending cancel;7=Stopped;8=Rejected;9=Suspended;A=Pending new;B=Calculated;C=Expired;D=Accepted for bidding;E=Pending replace
40|OrdType|CHAR|1=Market;2=Limit;3=Stop;4=Stop limit;5=Market on close;6=With or without;7=Limit or better;8=Limit with or without;9=On basis;A=On close;B=Limit on close;C=Forex market;D=Previously quoted;E=Previously indicated;F=Forex limit;G=Forex swap;H=Forex previously quoted;I=Funari;J=Market if touched;K=Market with left over as limit;L=Previous fund valuation point;M=Next fund valuation point;P=Pegged
41|OrigClOrdID|STRING
42|OrigTime|UTCTIMESTAMP
43|PossDupFlag|BOOLEAN|N=No;Y=Yes
44|Price|PRICE
45|RefSeqNum|SEQNUM
46|RelatdSym|STRING
47|Rule80A|CHAR|A=Agency single order;B=Short exempt transaction b;C=Proprietary non algorithmic program trade;D=Program order index arb for member firm org;E=Short exempt transaction for principal;F=Short exempt transaction f;H=Short exempt transaction h;I=Individual investor single order;J=Proprietary algorithmic program trading;K=Agency algorithmic program trading;L=Short exempt transaction for member competing market maker affliated with the firm clearing the trade;M=Program order index arb for other member;N=Agent for other member non algorithmic program trade;O=Proprietary transactions for competing market maker that is affiliated with the clearing member;P=Principal;R=Transactions for the account of a non member compting market maker;S=Specialist trades;T=Transactions for the account of an unaffiliated members competing market maker;U=Agency index arbitrage;W=All other orders as agent for other member;X=Short exempt transaction for member competing market maker not affiliated with the firm clearing the trade;Y=Agency non algorithmic program trade;Z=Short exempt transaction for non member competing market maker
48|SecurityID|STRING
49|SenderCompID|STRING
50|SenderSubID|STRING
51|SendingDate|LOCALMKTDATE
52|SendingTime|UTCTIMESTAMP
53|Quantity|QTY
54|Side|CHAR|1=Buy;2=Sell;3=Buy minus;4=Sell plus;5=Sell short;6=Sell short exempt;7=Undisclosed;8=Cross;9=Cross short;A=Cross short exempt;B=As defined;C=Opposite;D=Subscribe;E=Redeem;F=Lendfinancing;G=Borrowfinancing
55|Symbol|STRING
56|TargetCompID|STRING
57|TargetSubID|STRING
58|Text|STRING
59|TimeInForce|CHAR|0=Day;1=Good till cancel;2=At the opening;3=Immediate or cancel;4=Fill or kill;5=Good till crossing;6=Good till date;7=At the close
60|TransactTime|UTCTIMESTAMP
61|Urgency|CHAR|0=Normal;1=Flash;2=Background
62|ValidUntilTime|UTCTIMESTAMP
63|SettlType|CHAR|0=Regular;1=Cash;2=Next day;3=T plus 2;4=T plus 3;5=T plus 4;6=Future;7=When and if issued;8=Sellers option;9=T plus 5
64|SettlDate|LOCALMKTDATE
65|SymbolSfx|STRING|CD=Eucp with lump sum interest rather than discount price;WI=When issued for a security to be reissued under an old cusip or isin
66|ListID|STRING
67|ListSeqNo|INT
68|TotNoOrders|INT
69|ListExecInst|STRING
70|AllocID|STRING
71|AllocTransType|CHAR|0=New;1=Replace;2=Cancel;3=Preliminary;4=Calculated;5=Calculated without preliminary
72|RefAllocID|STRING
73|NoOrders|NUMINGROUP
74|AvgPxPrecision|INT
75|TradeDate|LOCALMKTDATE
76|ExecBroker|STRING
77|PositionEffect|CHAR|C=Close;F=Fifo;O=Open;R=Rolled
78|NoAllocs|NUMINGROUP
79|AllocAccount|STRING
80|AllocQty|QTY
81|ProcessCode|CHAR|0=Regular;1=Soft dollar;2=Step in;3=Step out;4=Soft dollar step in;5=Soft dollar step out;6=Plan sponsor
82|NoRpts|INT
83|RptSeq|INT
84|CxlQty|QTY
85|NoDlvyInst|NUMINGROUP
86|DlvyInst|STRING
87|AllocStatus|INT|0=Acceptedsuccessfullyprocessed;1=Block level reject;2=Account level reject;3=Receivedreceivednotyetprocessed;4=Incomplete;5=Rejected by intermediary
88|AllocRejCode|INT|0=Unknown account;1=Incorrect quantity;10=Unknown or stale execid;11=Mismatched data;12=Unknown clordid;13=Warehouse request rejected;2=Incorrect averageg price;3=Unknown executing broker mnemonic;4=Commission difference;5=Unknown orderid;6=Unknown listid;7=Other 7;8=Incorrect allocated quantity;9=Calculation difference
89|Signature|DATA
90|SecureDataLen|LENGTH
91|SecureData|DATA
92|BrokerOfCredit|STRING
93|SignatureLength|LENGTH
94|EmailType|CHAR|0=New;1=Reply;2=Admin reply
95|RawDataLength|LENGTH
96|RawData|DATA
97|PossResend|BOOLEAN|N=No;Y=Yes
98|EncryptMethod|INT|0=Noneother;1=Pkcsproprietary;2=Desecbmode;3=Pkcsdesproprietary;4=Pgpdesdefunct;5=Pgpdesmd5seeappnoteonfixwebsite;6=Pemdesmd5seeappnoteonfixwebsitenaforfixmlnotused
99|StopPx|PRICE
100|ExDestination|EXCHANGE
102|CxlRejReason|INT|0=Too late to cancel;1=Unknown order;2=Brokeropt;3=Order already in pending cancel or pending replace status;4=Unable to process order mass cancel request;5=Origordmodtimemismatch;6=Duplicate clordid;99=Other
103|OrdRejReason|INT|0=Brokeropt;1=Unknown symbol;10=Invalid investor id;11=Unsupported order characteristic;12=Surveillence option;13=Incorrect quantity;14=Incorrect allocated quantity;15=Unknown account;2=Exchange closed;3=Order exceeds limit;4=Too late to enter;5=Unknown order;6=Duplicate order;7=Duplicate of a verbally communicated order;8=Stale order;9=Trade along required;99=Other
104|IOIQualifier|CHAR|A=All or none;B=Market on close;C=At the close;D=Vwap;I=In touch with;L=Limit;M=More behind;O=At the open;P=Taking a position;Q=At the market;R=Ready to trade;S=Portfolio shown;T=Through the day;V=Versus;W=Indication;X=Crossing opportunity;Y=At the midpoint;Z=Pre open
105|WaveNo|STRING
106|Issuer|STRING
107|SecurityDesc|STRING
108|HeartBtInt|INT
109|ClientID|STRING
110|MinQty|QTY
111|MaxFloor|QTY
112|TestReqID|STRING
113|ReportToExch|BOOLEAN|N=No;Y=Yes
114|LocateReqd|BOOLEAN|N=No;Y=Yes
115|OnBehalfOfCompID|STRING
116|OnBehalfOfSubID|STRING
117|QuoteID|STRING
118|NetMoney|AMT
119|SettlCurrAmt|AMT
120|SettlCurrency|CURRENCY
121|ForexReq|BOOLEAN|N=No;Y=Yes
122|OrigSendingTime|UTCTIMESTAMP
123|GapFillFlag|BOOLEAN|N=No;Y=Yes
124|NoExecs|NUMINGROUP
125|CxlType|CHAR
126|ExpireTime|UTCTIMESTAMP
127|DKReason|CHAR|A=Unknown symbol;B=Wrong side;C=Quantity exceeds order;D=No matching order;E=Price exceeds limit;F=Calculation difference;Z=Other
128|DeliverToCompID|STRING
129|DeliverToSubID|STRING
130|IOINaturalFlag|BOOLEAN|N=No;Y=Yes
131|QuoteReqID|STRING
132|BidPx|PRICE
133|OfferPx|PRICE
134|BidSize|QTY
135|OfferSize|QTY
136|NoMiscFees|NUMINGROUP
137|MiscFeeAmt|AMT
138|MiscFeeCurr|CURRENCY
139|MiscFeeType|CHAR|1=Regulatory;10=Per transaction;11=Conversion;12=Agent;2=Tax;3=Local commission;4=Exchange fees;5=Stamp;6=Levy;7=Other;8=Markup;9=Consumption tax
140|PrevClosePx|PRICE
141|ResetSeqNumFlag|BOOLEAN|N=No;Y=Yes
142|SenderLocationID|STRING
143|TargetLocationID|STRING
144|OnBehalfOfLocationID|STRING
145|DeliverToLocationID|STRING
146|NoRelatedSym|NUMINGROUP
147|Subject|STRING
148|Headline|STRING
149|URLLink|STRING
150|ExecType|CHAR|0=New;3=Done for day;4=Canceled;5=Replaced;6=Pending cancel;7=Stopped;8=Rejected;9=Suspended;A=Pending new;B=Calculated;C=Expired;D=Restated;E=Pending replace;F=Trade;G=Trade correct;H=Trade cancel;I=Order status
151|LeavesQty|QTY
152|CashOrderQty|QTY
153|AllocAvgPx|PRICE
154|AllocNetMoney|AMT
155|SettlCurrFxRate|FLOAT
156|SettlCurrFxRateCalc|CHAR|M=Multiply;D=Divide
157|NumDaysInterest|INT
158|AccruedInterestRate|PERCENTAGE
159|AccruedInterestAmt|AMT
160|SettlInstMode|CHAR|0=Default;1=Standing instructions provided;2=Specific allocation account overriding;3=Specific allocation account standing;4=Specific order for a single account;5=Request reject
161|AllocText|STRING
162|SettlInstID|STRING
163|SettlInstTransType|CHAR|C=Cancel;N=New;R=Replace;T=Restate
164|EmailThreadID|STRING
165|SettlInstSource|CHAR|1=Brokers instructions;2=Institutions instructions;3=Investorciv
166|SettlLocation|STRING|CED=Cedel;DTC=Depository trust company;EUR=Euro clear;FED=Federal book entry;ISO_Country_Code=Local market settle location;PNY=Physical;PTC=Participant trust company
167|SecurityType|STRING|ABS=Asset backed securities;AMENDED=Amended restated;AN=Otheranticipationnotesbanganetc;BA=Bankers acceptance;BN=Bank notes;BOX=Bill of exchanges;BRADY=Brady bond;BRIDGE=Bridge loan;BUYSELL=Buy sellback;CB=Convertible bond;CD=Certificate of deposit;CL=Call loans;CMBS=Corp mortgage backed securities;CMO=Collateralized mortgage obligation;COFO=Certificate of obligation;COFP=Certificate of participation;CORP=Corporate bond;CP=Commercial paper;CPP=Corporate private placement;CS=Common stock;DEFLTED=Defaulted;DINP=Debtor in possession;DN=Deposit notes;DUAL=Dual currency;EUCD=Euro certificate of deposit;EUCORP=Euro corporate bond;EUCP=Euro commercial paper;EUSOV=Euro sovereigns;EUSUPRA=Euro supranational coupons;FAC=Federal agency coupon;FADN=Federal agency discount note;FOR=Foreign exchange contract;FORWARD=Forward;FUT=Future;GO=General obligation bonds;IET=Ioette mortgage;LOFC=Letter of credit;LQN=Liquidity note;MATURED=Matured;MBS=Mortgage backed securities;MF=Mutual fund;MIO=Mortgage interest only;MLEG=Multileg instrument;MPO=Mortgage principal only;MPP=Mortgage private placement;MPT=Miscellaneous pass through;MT=Mandatory tender;MTN=Medium term notes;NONE=No security type;ONITE=Overnight;OPT=Option;PEF=Private export funding;PFAND=Pfandbriefe;PN=Promissory note;PS=Preferred stock;PZFJ=Plazos fijos;RAN=Revenue anticipation note;REPLACD=Replaced;REPO=Repurchase;RETIRED=Retired;REV=Revenue bonds;RVLV=Revolver loan;RVLVTRM=Revolver term loan;SECLOAN=Securities loan;SECPLEDGE=Securities pledge;SPCLA=Special assessment;SPCLO=Special obligation;SPCLT=Special tax;STN=Short term loan note;STRUCT=Structured notes;SUPRA=Usd supranational coupons;SWING=Swing line facility;TAN=Tax anticipation note;TAXA=Tax allocation;TBA=To be announced;TBILL=Us treasury bill tbill;TBOND=Us treasury bond;TCAL=Principal strip of a callable bond or note;TD=Time deposit;TECP=Tax exempt commercial paper;TERM=Term loan;TINT=Interest strip from any bond or note;TIPS=Treasury inflation protected securities;TNOTE=Us treasury note tnote;TPRN=Principal strip from a non callable bond or note;TRAN=Tax revenue anticipation note;UST=Ustreasurynotedeprecatedvalueusetnote;USTB=Ustreasurybilldeprecatedvalueusetbill;VRDN=Variable rate demand note;WAR=Warrant;WITHDRN=Withdrawn;WLD=Wildcardentry;XCN=Extended comm note;XLINKD=Indexed linked;YANK=Yankee corporate bond;YCD=Yankee certificate of deposit
168|EffectiveTime|UTCTIMESTAMP
169|StandInstDbType|INT|0=Other;1=Dtc sid;2=Thomson alert;3=A global custodian;4=Accountnet
170|StandInstDbName|STRING
171|StandInstDbID|STRING
172|SettlDeliveryType|INT
173|SettlDepositoryCode|STRING
174|SettlBrkrCode|STRING
175|SettlInstCode|STRING
176|SecuritySettlAgentName|STRING
177|SecuritySettlAgentCode|STRING
178|SecuritySettlAgentAcctNum|STRING
179|SecuritySettlAgentAcctName|STRING
180|SecuritySettlAgentContactName|STRING
181|SecuritySettlAgentContactPhone|STRING
182|CashSettlAgentName|STRING
183|CashSettlAgentCode|STRING
184|CashSettlAgentAcctNum|STRING
185|CashSettlAgentAcctName|STRING
186|CashSettlAgentContactName|STRING
187|CashSettlAgentContactPhone|STRING
188|BidSpotRate|PRICE
189|BidForwardPoints|PRICEOFFSET
190|OfferSpotRate|PRICE
191|OfferForwardPoints|PRICEOFFSET
192|OrderQty2|QTY
193|SettlDate2|LOCALMKTDATE
194|LastSpotRate|PRICE
195|LastForwardPoints|PRICEOFFSET
196|AllocLinkID|STRING
197|AllocLinkType|INT|0=Fx netting;1=Fx swap
198|SecondaryOrderID|STRING
199|NoIOIQualifiers|NUMINGROUP
200|MaturityMonthYear|MONTHYEAR
201|PutOrCall|INT|0=Put;1=Call
202|StrikePrice|PRICE
203|CoveredOrUncovered|INT|0=Covered;1=Uncovered
204|CustomerOrFirm|INT|0=Customer;1=Firm
205|MaturityDay|DAYOFMONTH
206|OptAttribute|CHAR
207|SecurityExchange|EXCHANGE
208|NotifyBrokerOfCredit|BOOLEAN|N=No;Y=Yes
209|AllocHandlInst|INT|1=Match;2=Forward;3=Forward and match
210|MaxShow|QTY
211|PegOffsetValue|FLOAT
212|XmlDataLen|LENGTH
213|XmlData|DATA
214|SettlInstRefID|STRING
215|NoRoutingIDs|NUMINGROUP
216|RoutingType|INT|1=Target firm;2=Target list;3=Block firm;4=Block list
217|RoutingID|STRING
218|Spread|PRICEOFFSET
219|Benchmark|CHAR|1=Curve;2=5yr;3=Old5;4=10yr;5=Old10;6=30yr;7=Old30;8=3molibor;9=6molibor
220|BenchmarkCurveCurrency|CURRENCY
221|BenchmarkCurveName|STRING|EONIA=Eonia;EUREPO=Eurepo;Euribor=Euribor;FutureSWAP=Futureswap;LIBID=Libid;LIBOR=Libor;MuniAAA=Muniaaa;OTHER=Other;Pfandbriefe=Pfandbriefe;SONIA=Sonia;SWAP=Swap;Treasury=Treasury
222|BenchmarkCurvePoint|STRING
223|CouponRate|PERCENTAGE
224|CouponPaymentDate|LOCALMKTDATE
225|IssueDate|LOCALMKTDATE
226|RepurchaseTerm|INT
227|RepurchaseRate|PERCENTAGE
228|Factor|FLOAT
229|TradeOriginationDate|LOCALMKTDATE
230|ExDate|LOCALMKTDATE
231|ContractMultiplier|FLOAT
232|NoStipulations|NUMINGROUP
233|StipulationType|STRING|ABS=Absolute prepayment speed;AMT=Alternative minimum tax;AUTOREINV=Auto reinvestment at rate or better;BANKQUAL=Bank qualified;BGNCON=Bargain conditions;COUPON=Coupon range;CPP=Constant prepayment penalty;CPR=Constant prepayment rate;CPY=Constant prepayment yield;CURRENCY=Iso currency code;CUSTOMDATE=Custom start end date;GEOG=Geographics and range;HAIRCUT=Valuation discount;HEP=Final cpr of home equity prepayment curve;INSURED=Insured;ISSUE=Year or year month of issue;ISSUER=Issuers ticker;ISSUESIZE=Issue size range;LOOKBACK=Lookback days;LOT=Explicit lot identifier;LOTVAR=Lotvariancevalueinpercentmaximumoverorunderallocationallowed;MAT=Maturity year and month;MATURITY=Maturity range;MAXDNOM=Maximumdenomination;MAXSUBS=Maximumsubstitutionsrepo;MHP=Percent of manufactured housing prepayment curve;MINDNOM=Minimum denomination;MININCR=Minimum increment;MINQTY=Minimum quantity;MPR=Monthly prepayment rate;PAYFREQ=Payment frequency calendar;PIECES=Number of pieces;PMAX=Pools maximum;PMIN=Poolsminimum;PPC=Percent of prospectus prepayment curve;PPL=Pools per lot;PPM=Pools per million;PPT=Pools per trade;PRICE=Price range;PRICEFREQ=Pricing frequency;PROD=Production year;PROTECT=Call protection;PSA=Percent of bma prepayment curve;PURPOSE=Purpose;PXSOURCE=Benchmark price source;RATING=Rating source and range;REDEMPTION=Typeofredemptionvaluesare;RESTRICTED=Restricted;SECTOR=Market sector;SECTYPE=Security type included or excluded;SMM=Single monthly mortality;STRUCT=Structure;SUBSFREQ=Substitutionsfrequencyrepo;SUBSLEFT=Substitutionsleftrepo;TEXT=Freeform text;TRDVAR=Tradevariancevalueinpercentmaximumoverorunderallocationallowed;WAC=Weighted average coupon;WAL=Weighted average life coupon;WALA=Weighted average loan age;WAM=Weighted average maturity;WHOLE=Whole pool;YIELD=Yield range
234|StipulationValue|STRING
235|YieldType|STRING|AFTERTAX=After tax yield;ANNUAL=Annual yield;ATISSUE=Yield at issue;AVGMATURITY=Yield to avg maturity;BOOK=Book yield;CALL=Yield to next call;CHANGE=Yield change since close;CLOSE=Closing yield;COMPOUND=Compound yield;CURRENT=Current yield;GOVTEQUIV=Gvnt equivalent yield;GROSS=True gross yield;INFLATION=Yield with inflation assumption;INVERSEFLOATER=Inverse floater bond yield;LASTCLOSE=Most recent closing yield;LASTMONTH=Closing yield most recent month;LASTQUARTER=Closing yield most recent quarter;LASTYEAR=Closing yield most recent year;LONGAVGLIFE=Yield to longest average life;MARK=Mark to market yield;MATURITY=Yield to maturity;NEXTREFUND=Yieldtonextrefundsinking;OPENAVG=Open average yield;PREVCLOSE=Previous close yield;PROCEEDS=Proceeds yield;PUT=Yield to next put;SEMIANNUAL=Semi annual yield;SHORTAVGLIFE=Yield to shortest average life;SIMPLE=Simple yield;TAXEQUIV=Tax equivalent yield;TENDER=Yield to tender date;TRUE=True yield;VALUE1_32=Yield value of 1 32;WORST=Yieldtoworstconvention
236|Yield|PERCENTAGE
237|TotalTakedown|AMT
238|Concession|AMT
239|RepoCollateralSecurityType|INT
240|RedemptionDate|LOCALMKTDATE
241|UnderlyingCouponPaymentDate|LOCALMKTDATE
242|UnderlyingIssueDate|LOCALMKTDATE
243|UnderlyingRepoCollateralSecurityType|INT
244|UnderlyingRepurchaseTerm|INT
245|UnderlyingRepurchaseRate|PERCENTAGE
246|UnderlyingFactor|FLOAT
247|UnderlyingRedemptionDate|LOCALMKTDATE
248|LegCouponPaymentDate|LOCALMKTDATE
249|LegIssueDate|LOCALMKTDATE
250|LegRepoCollateralSecurityType|INT
251|LegRepurchaseTerm|INT
252|LegRepurchaseRate|PERCENTAGE
253|LegFactor|FLOAT
254|LegRedemptionDate|LOCALMKTDATE
255|CreditRating|STRING
256|UnderlyingCreditRating|STRING
257|LegCreditRating|STRING
258|TradedFlatSwitch|BOOLEAN|N=No;Y=Yes
259|BasisFeatureDate|LOCALMKTDATE
260|BasisFeaturePrice|PRICE
262|MDReqID|STRING
263|SubscriptionRequestType|CHAR|0=Snapshot;1=Snapshot plus updates;2=Disable previous snapshot plus update request
264|MarketDepth|INT
265|MDUpdateType|INT|0=Full refresh;1=Incremental refresh
266|AggregatedBook|BOOLEAN
267|NoMDEntryTypes|NUMINGROUP
268|NoMDEntries|NUMINGROUP
269|MDEntryType|CHAR|0=Bid;1=Offer;2=Trade;3=Index value;4=Opening price;5=Closing price;6=Settlement price;7=Trading session high price;8=Trading session low price;9=Trading session vwap price;A=Imbalance;B=Trade volume;C=Open interest
270|MDEntryPx|PRICE
271|MDEntrySize|QTY
272|MDEntryDate|UTCDATEONLY
273|MDEntryTime|UTCTIMEONLY
274|TickDirection|CHAR|0=Plus tick;1=Zero plus tick;2=Minus tick;3=Zero minus tick
275|MDMkt|EXCHANGE
276|QuoteCondition|MULTIPLEVALUESTRING|A=Open active;B=Closed inactive;C=Exchange best;D=Consolidated best;E=Locked;F=Crossed;G=Depth;H=Fast trading;I=Non firm
277|TradeCondition|MULTIPLEVALUESTRING|A=Cashmkt;B=Average price trade;C=Cash trade;D=Nextday d;E=Opening reopening trade detail;F=Intraday trade detail;G=Rule 127 trade;H=Rule 155 trade;I=Sold last;J=Next day trade;K=Opened;L=Seller;M=Sold;N=Stopped stock;P=Imbalance more buyers;Q=Imbalance more sellers;R=Opening price
278|MDEntryID|STRING
279|MDUpdateAction|CHAR|0=New;1=Change;2=Delete
280|MDEntryRefID|STRING
281|MDReqRejReason|CHAR|0=Unknown symbol;1=Duplicate mdreqid;2=Insufficient bandwidth;3=Insufficient permissions;4=Unsupported subscriptionrequesttype;5=Unsupported marketdepth;6=Unsupported mdupdatetype;7=Unsupported aggregatedbook;8=Unsupported mdentrytype;9=Unsupported tradingsessionid;A=Unsupported scope;B=Unsupported openclosesettleflag;C=Unsupported mdimplicitdelete
282|MDEntryOriginator|STRING
283|LocationID|STRING
284|DeskID|STRING
285|DeleteReason|CHAR|0=Canceltradebust;1=Error
286|OpenCloseSettlFlag|MULTIPLEVALUESTRING|0=Daily open;1=Session open;2=Delivery settlement entry;3=Expected entry;4=Entry from previous business day;5=Theoretical price value
287|SellerDays|INT
288|MDEntryBuyer|STRING
289|MDEntrySeller|STRING
290|MDEntryPositionNo|INT
291|FinancialStatus|MULTIPLEVALUESTRING|1=Bankrupt;2=Pending delisting
292|CorporateAction|MULTIPLEVALUESTRING|A=Ex dividend;B=Ex distribution;C=Ex rights;D=New;E=Ex interest
293|DefBidSize|QTY
294|DefOfferSize|QTY
295|NoQuoteEntries|NUMINGROUP
296|NoQuoteSets|NUMINGROUP
297|QuoteStatus|INT|0=Accepted;1=Cancel for symbol;10=Pending;11=Pass;12=Locked market warning;13=Cross market warning;14=Canceled due to lock market;15=Canceled due to cross market;2=Canceled for security type;3=Canceled for underlying;4=Canceled all;5=Rejected;6=Removed from market;7=Expired;8=Query;9=Quote not found
298|QuoteCancelType|INT|1=Cancel for one or more securities;2=Cancel for security type;3=Cancel for underlying security;4=Cancel all quotes
299|QuoteEntryID|STRING
300|QuoteRejectReason|INT|1=Unknown symbol;2=Exchange;3=Quote request exceeds limit;4=Too late to enter;5=Unknown quote;6=Duplicate quote;7=Invalid bid ask spread;8=Invalid price;9=Not authorized to quote security;99=Other
301|QuoteResponseLevel|INT|0=No acknowledgement;1=Acknowledge only negative or erroneous quotes;2=Acknowledge each quote message
302|QuoteSetID|STRING
303|QuoteRequestType|INT|1=Manual;2=Automatic
304|TotNoQuoteEntries|INT
305|UnderlyingSecurityIDSource|STRING
306|UnderlyingIssuer|STRING
307|UnderlyingSecurityDesc|STRING
308|UnderlyingSecurityExchange|EXCHANGE
309|UnderlyingSecurityID|STRING
310|UnderlyingSecurityType|STRING
311|UnderlyingSymbol|STRING
312|UnderlyingSymbolSfx|STRING
313|UnderlyingMaturityMonthYear|MONTHYEAR
314|UnderlyingMaturityDay|DAYOFMONTH
315|UnderlyingPutOrCall|INT
316|UnderlyingStrikePrice|PRICE
317|UnderlyingOptAttribute|CHAR
318|UnderlyingCurrency|CURRENCY
319|RatioQty|QTY
320|SecurityReqID|STRING
321|SecurityRequestType|INT|0=Request security identity and specifications;1=Request security identity for the specifications provided;2=Request list security types;3=Request list securities
322|SecurityResponseID|STRING
323|SecurityResponseType|INT|1=Accept security proposal as is;2=Accept security proposal with revisions as indicated in the message;3=List of security types returned per request;4=List of securities returned per request;5=Reject security proposal;6=Cannot match selection criteria
324|SecurityStatusReqID|STRING
325|UnsolicitedIndicator|BOOLEAN|N=No;Y=Yes
326|SecurityTradingStatus|INT|1=Opening delay;10=Market on close imbalance sell;11=11;12=No market imbalance;13=No market on close imbalance;14=Its pre opening;15=New price indication;16=Trade dissemination time;17=Ready to trade;18=Not available for trading;19=Not traded on this market;2=Trading halt;20=Unknown or invalid;21=Pre open;22=Opening rotation;23=Fast market;3=Resume;4=No open;5=Price indication;6=Trading range indication;7=Market imbalance buy;8=Market imbalance sell;9=Market on close imbalance buy
327|HaltReasonChar|CHAR|D=Newsdiss;E=Ordinfl;I=Ordimb;M=Addinfo;P=Newspend;X=Equipchange
328|InViewOfCommon|BOOLEAN|N=No;Y=Yes
329|DueToRelated|BOOLEAN|N=No;Y=Yes
330|BuyVolume|QTY
331|SellVolume|QTY
332|HighPx|PRICE
333|LowPx|PRICE
334|Adjustment|INT|1=Cancel;2=Error;3=Correction
335|TradSesReqID|STRING
336|TradingSessionID|STRING
337|ContraTrader|STRING
338|TradSesMethod|INT|1=Electronic;2=Open outcry;3=Two party
339|TradSesMode|INT|1=Testing;2=Simulated;3=Production
340|TradSesStatus|INT|0=Unknown;1=Halted;2=Open;3=Closed;4=Pre open;5=Pre close;6=Request rejected
341|TradSesStartTime|UTCTIMESTAMP
342|TradSesOpenTime|UTCTIMESTAMP
343|TradSesPreCloseTime|UTCTIMESTAMP
344|TradSesCloseTime|UTCTIMESTAMP
345|TradSesEndTime|UTCTIMESTAMP
346|NumberOfOrders|INT
347|MessageEncoding|STRING
348|EncodedIssuerLen|LENGTH
349|EncodedIssuer|DATA
350|EncodedSecurityDescLen|LENGTH
351|EncodedSecurityDesc|DATA
352|EncodedListExecInstLen|LENGTH
353|EncodedListExecInst|DATA
354|EncodedTextLen|LENGTH
355|EncodedText|DATA
356|EncodedSubjectLen|LENGTH
357|EncodedSubject|DATA
358|EncodedHeadlineLen|LENGTH
359|EncodedHeadline|DATA
360|EncodedAllocTextLen|LENGTH
361|EncodedAllocText|DATA
362|EncodedUnderlyingIssuerLen|LENGTH
363|EncodedUnderlyingIssuer|DATA
364|EncodedUnderlyingSecurityDescLen|LENGTH
365|EncodedUnderlyingSecurityDesc|DATA
366|AllocPrice|PRICE
367|QuoteSetValidUntilTime|UTCTIMESTAMP
368|QuoteEntryRejectReason|INT|1=Unknwnsym;2=Exchclsd;3=Ordexclim;4=Toolate;5=Unknord;6=Dupord;7=Invbidask;8=Invpx;9=Notauth;99=Other
369|LastMsgSeqNumProcessed|SEQNUM
370|OnBehalfOfSendingTime|UTCTIMESTAMP
371|RefTagID|INT
372|RefMsgType|STRING
373|SessionRejectReason|INT|0=Invalid tag number;1=Required tag missing;10=Sendingtime accuracy problem;11=Invalid msgtype;12=Xml validation error;13=Tag appears more than once;14=Tag specified out of required order;15=Repeating group fields out of order;16=Incorrect numingroup count for repeating group;17=Nondatavalueincludesfielddelimitersohcharacter;2=Tag not defined for this message type;3=Undefined tag;4=Tag specified without a value;5=Valueisincorrectoutofrangeforthistag;6=Incorrect data format for value;7=Decryption problem;8=Signature problem;9=Compid problem;99=Other
374|BidRequestTransType|CHAR|C=Cancel;N=No
375|ContraBroker|STRING
376|ComplianceID|STRING
377|SolicitedFlag|BOOLEAN|N=No;Y=Yes
378|ExecRestatementReason|INT|0=Gt corporate action;1=Gt renewal;10=Warehouse recap;2=Verbal change;3=Repricing of order;4=Broker option;5=Partial decline of orderqty;6=Cancel on trading halt;7=Cancel on system failure;8=Mrktoption;9=Canceled not best;99=Other
379|BusinessRejectRefID|STRING
380|BusinessRejectReason|INT|0=Other;1=Unknown id;2=Unknown security;3=Unsupported message type;4=Application not available;5=Conditionally required field missing;6=Not authorized;7=Deliverto firm not available at this time
381|GrossTradeAmt|AMT
382|NoContraBrokers|NUMINGROUP
383|MaxMessageSize|LENGTH
384|NoMsgTypes|NUMINGROUP
385|MsgDirection|CHAR|R=Receive;S=Send
386|NoTradingSessions|NUMINGROUP
387|TotalVolumeTraded|QTY
388|DiscretionInst|CHAR|0=Related to displayed price;1=Related to market price;2=Related to primary price;3=Related to local primary price;4=Related to midpoint price;5=Related to last trade price;6=Related to vwap
389|DiscretionOffsetValue|FLOAT
390|BidID|STRING
391|ClientBidID|STRING
392|ListName|STRING
393|TotNoRelatedSym|INT
394|BidType|INT|1=Non disclosed style;2=Disclosed sytle;3=No bidding process
395|NumTickets|INT
396|SideValue1|AMT
397|SideValue2|AMT
398|NoBidDescriptors|NUMINGROUP
399|BidDescriptorType|INT|1=Sector;2=Country;3=Index
400|BidDescriptor|STRING
401|SideValueInd|INT|1=Side value 1;2=Side value 2
402|LiquidityPctLow|PERCENTAGE
403|LiquidityPctHigh|PERCENTAGE
404|LiquidityValue|AMT
405|EFPTrackingError|PERCENTAGE
406|FairValue|AMT
407|OutsideIndexPct|PERCENTAGE
408|ValueOfFutures|AMT
409|LiquidityIndType|INT|1=5 day moving average;2=20 day moving average;3=Normal market size;4=Other
410|WtAverageLiquidity|PERCENTAGE
411|ExchangeForPhysical|BOOLEAN|N=No;Y=Yes
412|OutMainCntryUIndex|AMT
413|CrossPercent|PERCENTAGE
414|ProgRptReqs|INT|1=Buy side explicitly requests status using statue request;2=Sell side periodically sends status using list status period optionally specified in progressperiod;3=Real time execution reports
415|ProgPeriodInterval|INT
416|IncTaxInd|INT|1=Net;2=Gross
417|NumBidders|INT
418|BidTradeType|CHAR|A=Agency;G=Vwap guarantee;J=Guaranteed close;R=Risk trade
419|BasisPxType|CHAR|2=Closing price at morningn session;3=Closing price;4=Current price;5=Sq;6=Vwap through a day;7=Vwap through a morning session;8=Vwap through an afternoon session;9=Vwap through a day except yori;A=Vwap through a morning session except yori;B=Vwap through an afternoon session except yori;C=Strike;D=Open;Z=Others
420|NoBidComponents|NUMINGROUP
421|Country|COUNTRY
422|TotNoStrikes|INT
423|PriceType|INT|1=Percentage;10=Fixed cabinet trade price;11=Variable cabinet trade price;2=Per unit;3=Fixed amount;4=Discount;5=Premium;6=Spread;7=Ted price;8=Ted yield;9=Yield
424|DayOrderQty|QTY
425|DayCumQty|QTY
426|DayAvgPx|PRICE
427|GTBookingInst|INT|0=Book out all trades on day of execution;1=Accumulate exectuions until forder is filled or expires;2=Accumulate until verballly notified otherwise
428|NoStrikes|NUMINGROUP
429|ListStatusType|INT|1=Ack;2=Response;3=Timed;4=Exec started;5=All done;6=Alert
430|NetGrossInd|INT|1=Net;2=Gross
431|ListOrderStatus|INT|1=In bidding process;2=Received for execution;3=Executing;4=Cancelling;5=Alert;6=All done;7=Reject
432|ExpireDate|LOCALMKTDATE
433|ListExecInstType|CHAR|1=Immediate;2=Wait for execut instruction;3=Exchange switch civ order 3;4=Exchange switch civ order 4;5=Exchange switch civ order 5
434|CxlRejResponseTo|CHAR|1=Order cancel request;2=Order cancel replace request
435|UnderlyingCouponRate|PERCENTAGE
436|UnderlyingContractMultiplier|FLOAT
437|ContraTradeQty|QTY
438|ContraTradeTime|UTCTIMESTAMP
439|ClearingFirm|STRING
440|ClearingAccount|STRING
441|LiquidityNumSecurities|INT
442|MultiLegReportingType|CHAR|1=Single security;2=Individual leg of a multi leg security;3=Multi leg security
443|StrikeTime|UTCTIMESTAMP
444|ListStatusText|STRING
445|EncodedListStatusTextLen|LENGTH
446|EncodedListStatusText|DATA
447|PartyIDSource|CHAR|1=Korean investor id;2=Taiwanese qualified foreign investor id qfii fid;3=Taiwanese trading acct;4=Malaysian central depository;5=Chinese investor id;6=Uk national insurance or pension number;7=Us social security number;8=Us employer or tax id number;9=Australian business number;A=Australian tax file number;B=Bic;C=Generally accepted market participant identifier;D=Proprietary;E=Iso country code;F=Settlement entity location;G=Mic;H=Csd participant member code;I=Directed broker three character acronym as defined in isitc etc best practice guidelines document
448|PartyID|STRING
449|TotalVolumeTradedDate|UTCDATEONLY
450|TotalVolumeTradedTime|UTCTIMEONLY
451|NetChgPrevDay|PRICEOFFSET
452|PartyRole|INT|1=Executing firm;10=Settlement location;11=Order origination trader;12=Executing trader;13=Order origination firm;14=Giveup clearing firm;15=Correspondant clearing firm;16=Executing system;17=Contra firm;18=Contra clearing firm;19=Sponsoring firm;2=Broker of credit;20=Underlying contra firm;21=Clearing organization;22=Exchange;24=Customer account;25=Correspondent clearing organization;26=Correspondent broker;27=Buyersellerreceiverdeliverer;28=Custodian;29=Intermediary;3=Client id;30=Agent;31=Sub custodian;32=Beneficiary;33=Interested party;34=Regulatory body;35=Liquidity provider;36=Entering trader;37=Contra trader;38=Position account;39=Contra investor id;4=Clearing firm;5=Investor id;6=Introducing firm;7=Entering firm;8=Locatelendingfirm;9=Fund manager client id
453|NoPartyIDs|NUMINGROUP
454|NoSecurityAltID|NUMINGROUP
455|SecurityAltID|STRING
456|SecurityAltIDSource|STRING
457|NoUnderlyingSecurityAltID|NUMINGROUP
458|UnderlyingSecurityAltID|STRING
459|UnderlyingSecurityAltIDSource|STRING
460|Product|INT|1=Agency;10=Mortgage;11=Municipal;12=Other;13=Financing;2=Commodity;3=Corporate;4=Currency;5=Equity;6=Government;7=Index;8=Loan;9=Moneymarket
461|CFICode|STRING
462|UnderlyingProduct|INT
463|UnderlyingCFICode|STRING
464|TestMessageIndicator|BOOLEAN|N=No;Y=Yes
465|QuantityType|INT|1=Shares;2=Bonds;3=Currentface;4=Originalface;5=Currency;6=Contracts;7=Other;8=Par
466|BookingRefID|STRING
467|IndividualAllocID|STRING
468|RoundingDirection|CHAR|0=Round to nearest;1=Round down;2=Round up
469|RoundingModulus|FLOAT
470|CountryOfIssue|COUNTRY
471|StateOrProvinceOfIssue|STRING
472|LocaleOfIssue|STRING
473|NoRegistDtls|NUMINGROUP
474|MailingDtls|STRING
475|InvestorCountryOfResidence|COUNTRY
476|PaymentRef|STRING
477|DistribPaymentMethod|INT|1=Crest;10=Bpay;11=High value clearing system hvacs;12=Reinvest in fund;2=Nscc;3=Euroclear;4=Clearstream;5=Cheque;6=Telegraphic transfer;7=Fed wire;8=Directcreditbecsbacs;9=Ach credit
478|CashDistribCurr|CURRENCY
479|CommCurrency|CURRENCY
480|CancellationRights|CHAR|M=Nowaiver;N=Noexeconly;O=Noinstit;Y=Yes
481|MoneyLaunderingStatus|CHAR|1=Exbelowlim;2=Exclientmoneytype;3=Exauthcredit;N=Not checked;Y=Passed
482|MailingInst|STRING
483|TransBkdTime|UTCTIMESTAMP
484|ExecPriceType|CHAR|B=Bid price;C=Creation price;D=Creation price plus adjustment percent;E=Creation price plus adjustment amount;O=Offer price;P=Offer price minus adjustment percent;Q=Offer price minus adjustment amount;S=Single price
485|ExecPriceAdjustment|FLOAT
486|DateOfBirth|LOCALMKTDATE
487|TradeReportTransType|INT|0=New;1=Cancel;2=Replace;3=Release;4=Reverse
488|CardHolderName|STRING
489|CardNumber|STRING
490|CardExpDate|LOCALMKTDATE
491|CardIssNum|STRING
492|PaymentMethod|INT|1=Crest;10=Directcreditbecs;11=Credit card;12=Ach debit;13=Ach credit;14=Bpay;15=Highvalueclearingsystemhvacs;2=Nscc;3=Euroclear;4=Clearstream;5=Cheque;6=Telegraphic transfer;7=Fed wire;8=Debit card;9=Directdebitbecs
493|RegistAcctType|STRING
494|Designation|STRING
495|TaxAdvantageType|INT|0=None not applicable;1=Maxiisauk;10=Employeecurrentyearus;11=Employerprioryearus;12=Employercurrentyearus;13=Non fund prototype ira;14=Non fund qualified plan;15=Defined contribution plan;16=Individual retirement account 16;17=Individualretirementaccountrolloverus;18=Keoghus;19=Profit sharing plan;2=Tessauk;20=401kus;21=Self directed ira;22=403bus;23=457us;24=Rothirafundprototypeus;25=Rothiranonprototypeus;26=Rothconversionirafundprototypeus;27=Rothconversioniranonprototypeus;28=Educationirafundprototypeus;29=Educationiranonprototypeus;3=Mini cash isa;4=Mini stocks and shares isa;5=Mini insurance isa;6=Current year payment;7=Prior year payment;8=Assettransferus;9=Employeeprioryearus;999=Other
496|RegistRejReasonText|STRING
497|FundRenewWaiv|CHAR|N=No;Y=Yes
498|CashDistribAgentName|STRING
499|CashDistribAgentCode|STRING
500|CashDistribAgentAcctNumber|STRING
501|CashDistribPayRef|STRING
502|CashDistribAgentAcctName|STRING
503|CardStartDate|LOCALMKTDATE
504|PaymentDate|LOCALMKTDATE
505|PaymentRemitterID|STRING
506|RegistStatus|CHAR|A=Accepted;H=Held;N=Reminder ie registration instructions are still outstanding;R=Rejected
507|RegistRejReasonCode|INT|1=Invalid unacceptable account type;10=Invalid unaceeptable investor id source;11=Invalid unacceptable date of birth;12=Invalid unacceptable investor country of residence;13=Invalid unacceptable no distrib instns;14=Invalid unacceptable distrib percentage;15=Invalid unacceptable distrib payment method;16=Invalid unacceptable cash distrib agent acct name;17=Invalid unacceptable cash distrib agent code;18=Invalid unacceptable cash distrib agent acct num;2=Invalid unacceptable tax exempt type;3=Invalid unacceptable ownership type;4=Invalid unacceptable no reg details;5=Invalid unacceptable reg seq no;6=Invalid unacceptable reg details;7=Invalid unacceptable mailing details;8=Invalid unacceptable mailing instructions;9=Invalid unacceptable investor id;99=Other
508|RegistRefID|STRING
509|RegistDtls|STRING
510|NoDistribInsts|NUMINGROUP
511|RegistEmail|STRING
512|DistribPercentage|PERCENTAGE
513|RegistID|STRING
514|RegistTransType|CHAR|0=New;1=Replace;2=Cancel
515|ExecValuationPoint|UTCTIMESTAMP
516|OrderPercent|PERCENTAGE
517|OwnershipType|CHAR|2=Joint trustees;J=Joint investors;T=Tenants in common
518|NoContAmts|NUMINGROUP
519|ContAmtType|INT|1=Commission amount;10=Exit charge percent;11=Fund based renewal commission percent;12=Projected fund value;13=Fund based renewal commission amount 13;14=Fund based renewal commission amount 14;15=Net settlement amount;2=Commission percent;3=Initial charge amount;4=Initial charge percent;5=Discount amount;6=Discount percent;7=Dilution levy amount;8=Dilution levy percent;9=Exit charge amount
520|ContAmtValue|FLOAT
521|ContAmtCurr|CURRENCY
522|OwnerType|INT|1=Individual investor;10=Networking sub account;11=Non profit organization;12=Corporate body;13=Nominee;2=Public company;3=Private company;4=Individual trustee;5=Company trustee;6=Pension plan;7=Custodian under gifts to minors act;8=Trusts;9=Fiduciaries
523|PartySubID|STRING
524|NestedPartyID|STRING
525|NestedPartyIDSource|CHAR
526|SecondaryClOrdID|STRING
527|SecondaryExecID|STRING
528|OrderCapacity|CHAR|A=Agency;G=Proprietary;I=Individual;P=Principal;R=Riskless principal;W=Agent for other member
529|OrderRestrictions|MULTIPLEVALUESTRING|1=Program trade;2=Index arbitrage;3=Non index arbitrage;4=Competing market maker;5=Acting as market maker or specialist in the security;6=Acting as market maker or specialist in the underlying security of a derivative security;7=Foreign entity;8=External market participant;9=External inter connected market linkage;A=Riskless arbitrage
530|MassCancelRequestType|CHAR|1=Cancel orders for a security;2=Cancel orders for an underlying security;3=Cancel orders for a product;4=Cancel orders for a cficode;5=Cancel orders for a securitytype;6=Cancel orders for a trading session;7=Cancel all orders
531|MassCancelResponse|CHAR|0=Cancel request rejected;1=Cancel orders for a security;2=Cancel orders for an underlying security;3=Cancel orders for a product;4=Cancel orders for a cficode;5=Cancel orders for a securitytype;6=Cancel orders for a trading session;7=Cancel all orders
532|MassCancelRejectReason|CHAR|0=Mass cancel not supported;1=Invalid or unknown security;2=Invalid or unkown underlying security;3=Invalid or unknown product;4=Invalid or unknown cficode;5=Invalid or unknown securitytype;6=Invalid or unknown trading session;99=Other
533|TotalAffectedOrders|INT
534|NoAffectedOrders|INT
535|AffectedOrderID|STRING
536|AffectedSecondaryOrderID|STRING
537|QuoteType|INT|0=Indicative;1=Tradeable;2=Restricted tradeable;3=Counter
538|NestedPartyRole|INT
539|NoNestedPartyIDs|NUMINGROUP
540|TotalAccruedInterestAmt|AMT
541|MaturityDate|LOCALMKTDATE
542|UnderlyingMaturityDate|LOCALMKTDATE
543|InstrRegistry|STRING|BIC=Custodian;ISO=Country;ZZ=Physical
544|CashMargin|CHAR|1=Cash;2=Margin open;3=Margin close
545|NestedPartySubID|STRING
546|Scope|MULTIPLEVALUESTRING|1=Local market;2=National;3=Global
547|MDImplicitDelete|BOOLEAN|N=No;Y=Yes
548|CrossID|STRING
549|CrossType|INT|1=Cross aon;2=Cross ioc;3=Cross one side;4=Cross same price
550|CrossPrioritization|INT|0=None;1=Buy side is prioritized;2=Sell side is prioritized
551|OrigCrossID|STRING
552|NoSides|NUMINGROUP|1=One side;2=Both sides
553|Username|STRING
554|Password|STRING
555|NoLegs|NUMINGROUP
556|LegCurrency|CURRENCY
557|TotNoSecurityTypes|INT
558|NoSecurityTypes|NUMINGROUP
559|SecurityListRequestType|INT|0=Symbol;1=Securitytype and or cficode;2=Product;3=Tradingsessionid;4=All securities
560|SecurityRequestResult|INT|0=Valid request;1=Invalid or unsupported request;2=No instruments found that match selection criteria;3=Not authorized to retrieve instrument data;4=Instrument data temporarily unavailable;5=Request for instrument data not supported
561|RoundLot|QTY
562|MinTradeVol|QTY
563|MultiLegRptTypeReq|INT|0=Report by mulitleg security only;1=Report by multileg security and by instrument legs belonging to the multileg security;2=Report by instrument legs belonging to the multileg security only
564|LegPositionEffect|CHAR
565|LegCoveredOrUncovered|INT
566|LegPrice|PRICE
567|TradSesStatusRejReason|INT|1=Unknown or invalid tradingsessionid;99=Other
568|TradeRequestID|STRING
569|TradeRequestType|INT|0=All trades;1=Matched trades matching criteria provided on request;2=Unmatched trades that match criteria;3=Unreported trades that match criteria;4=Advisories that match criteria
570|PreviouslyReported|BOOLEAN|N=No;Y=Yes
571|TradeReportID|STRING
572|TradeReportRefID|STRING
573|MatchStatus|CHAR|0=Compared matched or affirmed;1=Uncompared unmatched or unaffirmed;2=Advisory or alert
574|MatchType|STRING|A1=Exact match on trade date stock symbol quantity price trade type and special trade indicator plus four badges and execution time;A2=Exact match on trade date stock symbol quantity price trade type and special trade indicator plus four badges;A3=Exact match on trade date stock symbol quantity price trade type and special trade indicator plus two badges and execution time;A4=Exact match on trade date stock symbol quantity price trade type and special trade indicator plus two badges;A5=Exact match on trade date stock symbol quantity price tradetype and special trade indicator plus execution time;ACTM1=Nasdaqactm1match;ACTM2=Nasdaqactm2match;ACTM3=Nasdaqactacceptedtrade;ACTM4=Nasdaqactdefaulttrade;ACTM5=Nasdaqactdefaultafterm2;ACTM6=Nasdaqactm6match;ACTMT=Nasdaqnonact;AQ=Compared records resulting from stamped advisories or specialist accepts pair offs;M1=Exact match on trade date stock symbol quantity price trade type and special trade indicator minus badges and times act m1 match;M2=Summarized match minus badges and times act m2 match;MT=Ocs locked in non act;S1=Summarized match using a1 exact match criteria except quantity is summaried;S2=Summarized match using a2 exact match criteria except quantity is summarized;S3=Summarized match using a3 exact match criteria except quantity is summarized;S4=Summarized match using a4 exact match criteria except quantity is summarized;S5=Summarized match using a5 exact match criteria except quantity is summarized
575|OddLot|BOOLEAN|N=No;Y=Yes
576|NoClearingInstructions|NUMINGROUP
577|ClearingInstruction|INT|0=Process normally;1=Exclude from all netting;10=Automaticgiveupmodetradegiveuptothegiveupdestinationnumberspecified;11=Qualified service representative qsr;12=Customer trade;13=Self clearing;2=Bilateral netting only;3=Ex clearing;4=Special trade;5=Multilateral netting;6=Clear against central counterparty;7=Exclude from central counterparty;8=Manualmodeprepostingandorpregiveup;9=Automaticpostingmodetradepostingtothepositionaccountnumberspecified
578|TradeInputSource|STRING
579|TradeInputDevice|STRING
580|NoDates|INT
581|AccountType|INT|1=Account is carried on customer side of the books;2=Account is carried on non customer side of books;3=House trader;4=Floor trader;6=Account is carried on non customer side of books and is cross margined;7=Account is house trader and is cross margined;8=Joint back office account
582|CustOrderCapacity|INT|1=Member trading for their own account;2=Clearing firm trading for its proprietary account;3=Member trading for another member;4=All other
583|ClOrdLinkID|STRING
584|MassStatusReqID|STRING
585|MassStatusReqType|INT|1=Status for orders for a security;2=Status for orders for an underlying security;3=Status for orders for a product;4=Status for orders for a cficode;5=Status for orders for a securitytype;6=Status for orders for a trading session;7=Status for all orders;8=Status for orders for a partyid
586|OrigOrdModTime|UTCTIMESTAMP
587|LegSettlType|CHAR
588|LegSettlDate|LOCALMKTDATE
589|DayBookingInst|CHAR|0=Can trigger booking without reference to the order initiator auto;1=Speak with order initiator before booking speak first;2=Accumulate
590|BookingUnit|CHAR|0=Each partial execution is a bookable unit;1=Aggregate partial executions on this order and book one trade per order;2=Aggregate executions for this symbol side and settlement date
591|PreallocMethod|CHAR|0=Pro rata;1=Do not prorata discuss first
592|UnderlyingCountryOfIssue|COUNTRY
593|UnderlyingStateOrProvinceOfIssue|STRING
594|UnderlyingLocaleOfIssue|STRING
595|UnderlyingInstrRegistry|STRING
596|LegCountryOfIssue|COUNTRY
597|LegStateOrProvinceOfIssue|STRING
598|LegLocaleOfIssue|STRING
599|LegInstrRegistry|STRING
600|LegSymbol|STRING
601|LegSymbolSfx|STRING
602|LegSecurityID|STRING
603|LegSecurityIDSource|STRING
604|NoLegSecurityAltID|STRING
605|LegSecurityAltID|STRING
606|LegSecurityAltIDSource|STRING
607|LegProduct|INT
608|LegCFICode|STRING
609|LegSecurityType|STRING
610|LegMaturityMonthYear|MONTHYEAR
611|LegMaturityDate|LOCALMKTDATE
612|LegStrikePrice|PRICE
613|LegOptAttribute|CHAR
614|LegContractMultiplier|FLOAT
615|LegCouponRate|PERCENTAGE
616|LegSecurityExchange|EXCHANGE
617|LegIssuer|STRING
618|EncodedLegIssuerLen|LENGTH
619|EncodedLegIssuer|DATA
620|LegSecurityDesc|STRING
621|EncodedLegSecurityDescLen|LENGTH
622|EncodedLegSecurityDesc|DATA
623|LegRatioQty|FLOAT
624|LegSide|CHAR
625|TradingSessionSubID|STRING
626|AllocType|INT|1=Buysidecalc;2=Buysideprelim;3=Sellside calculated using preliminary;4=Sellside calculated without preliminary;5=Buysidereadytobooksingle;6=Buysidereadytobookcombined;7=Warehouse instruction;8=Request to intermediary
627|NoHops|NUMINGROUP
628|HopCompID|STRING
629|HopSendingTime|UTCTIMESTAMP
630|HopRefID|SEQNUM
631|MidPx|PRICE
632|BidYield|PERCENTAGE
633|MidYield|PERCENTAGE
634|OfferYield|PERCENTAGE
635|ClearingFeeIndicator|STRING|1=1st year delegate trading for own account;2=2nd year delegate trading for own account;3=3rd year delegate trading for own account;4=4th year delegate trading for own account;5=5th year delegate trading for own account;9=6th year delegate trading for own account;B=Cboe member;C=Non member and customer;E=Equity member and clearing member;F=Full and associate member trading for own account and as floor brokers;H=106h and 106j firms;I=Gim idem and com membership interest holders;L=Lessee 106f employees;M=All other ownership types
636|WorkingIndicator|BOOLEAN|N=No;Y=Yes
637|LegLastPx|PRICE
638|PriorityIndicator|INT|0=Priority unchanged;1=Lost priority as result of order change
639|PriceImprovement|PRICEOFFSET
640|Price2|PRICE
641|LastForwardPoints2|PRICEOFFSET
642|BidForwardPoints2|PRICEOFFSET
643|OfferForwardPoints2|PRICEOFFSET
644|RFQReqID|STRING
645|MktBidPx|PRICE
646|MktOfferPx|PRICE
647|MinBidSize|QTY
648|MinOfferSize|QTY
649|QuoteStatusReqID|STRING
650|LegalConfirm|BOOLEAN|N=No;Y=Yes
651|UnderlyingLastPx|PRICE
652|UnderlyingLastQty|QTY
653|SecDefStatus|INT|0=Pending approval;1=Approvedaccepted;2=Rejected;3=Unauthorized request;4=Invalid definition request
654|LegRefID|STRING
655|ContraLegRefID|STRING
656|SettlCurrBidFxRate|FLOAT
657|SettlCurrOfferFxRate|FLOAT
658|QuoteRequestRejectReason|INT|1=Unknown symbol;10=Pass;2=Exchangeclosed;3=Quote request exceeds limit;4=Too late to enter;5=Invalid price;6=Not authorized to request quote;7=No match for inquiry;8=No market for instrument;9=No inventory;99=Other
659|SideComplianceID|STRING
660|AcctIDSource|INT|1=Bic;2=Sid code;3=Tfmgspta;4=Omgeoalertid;5=Dtcc code;99=Other
661|AllocAcctIDSource|INT
662|BenchmarkPrice|PRICE
663|BenchmarkPriceType|INT
664|ConfirmID|STRING
665|ConfirmStatus|INT|1=Received;2=Mismatched account;3=Missing settlement instructions;4=Confirmed;5=Request rejected
666|ConfirmTransType|INT|0=New;1=Replace;2=Cancel
667|ContractSettlMonth|MONTHYEAR
668|DeliveryForm|INT|1=Book entry;2=Bearer
669|LastParPx|PRICE
670|NoLegAllocs|NUMINGROUP
671|LegAllocAccount|STRING
672|LegIndividualAllocID|STRING
673|LegAllocQty|QTY
674|LegAllocAcctIDSource|STRING
675|LegSettlCurrency|CURRENCY
676|LegBenchmarkCurveCurrency|CURRENCY
677|LegBenchmarkCurveName|STRING
678|LegBenchmarkCurvePoint|STRING
679|LegBenchmarkPrice|PRICE
680|LegBenchmarkPriceType|INT
681|LegBidPx|PRICE
682|LegIOIQty|STRING
683|NoLegStipulations|NUMINGROUP
684|LegOfferPx|PRICE
685|LegOrderQty|QTY
686|LegPriceType|INT
687|LegQty|QTY
688|LegStipulationType|STRING
689|LegStipulationValue|STRING
690|LegSwapType|INT|1=Par for par;2=Modified duration;4=Risk;5=Proceeds
691|Pool|STRING
692|QuotePriceType|INT|1=Percent;10=Yield;2=Per share;3=Fixed amount;4=Discount;5=Premium;6=Basispointsrelativetobenchmark;7=Ted price;8=Ted yield;9=Yieldspreadswaps
693|QuoteRespID|STRING
694|QuoteRespType|INT|1=Hit lift;2=Counter;3=Expired;4=Cover;5=Done away;6=Pass
695|QuoteQualifier|CHAR
696|YieldRedemptionDate|LOCALMKTDATE
697|YieldRedemptionPrice|PRICE
698|YieldRedemptionPriceType|INT
699|BenchmarkSecurityID|STRING
700|ReversalIndicator|BOOLEAN
701|YieldCalcDate|LOCALMKTDATE
702|NoPositions|NUMINGROUP
703|PosType|STRING|ALC=Allocation trade qty;AS=Option assignment;ASF=As of trade qty;DLV=Delivery qty;ETR=Electronic trade qty;EX=Option exercise qty;FIN=End of day qty;IAS=Intra spread qty;IES=Inter spread qty;PA=Adjustment qty;PIT=Pit trade qty;SOD=Start of day qty;SPL=Integral split;TA=Transaction from assignment;TOT=Total transaction qty;TQ=Transaction quantity;TRF=Transfer trade qty;TX=Transaction from exercise;XM=Cross margin qty
704|LongQty|QTY
705|ShortQty|QTY
706|PosQtyStatus|INT|0=Submitted;1=Accepted;2=Rejected
707|PosAmtType|STRING|CASH=Cashamountcorporateevent;CRES=Cash residual amount;FMTM=Final mark to market amount;IMTM=Incremental mark to market amount;PREM=Premium amount;SMTM=Start of day mark to market amount;TVAR=Trade variation amount;VADJ=Value adjusted amount
708|PosAmt|AMT
709|PosTransType|INT|1=Exercise;2=Do not exercise;3=Position adjustment;4=Position change submission margin disposition;5=Pledge
710|PosReqID|STRING
711|NoUnderlyings|NUMINGROUP
712|PosMaintAction|INT|1=New;2=Replace;3=Cancel
713|OrigPosReqRefID|STRING
714|PosMaintRptRefID|STRING
715|ClearingBusinessDate|LOCALMKTDATE
716|SettlSessID|STRING
717|SettlSessSubID|STRING
718|AdjustmentType|INT|0=Process request as margin disposition;1=Delta plus;2=Delta minus;3=Final
719|ContraryInstructionIndicator|BOOLEAN
720|PriorSpreadIndicator|BOOLEAN
721|PosMaintRptID|STRING
722|PosMaintStatus|INT|0=Accepted;1=Accepted with warnings;2=Rejected;3=Completed;4=Completed with warnings
723|PosMaintResult|INT|0=Successful completion;1=Rejected;99=Other
724|PosReqType|INT|0=Positions;1=Trades;2=Exercises;3=Assignments
725|ResponseTransportType|INT|0=Inband;1=Out of band
726|ResponseDestination|STRING
727|TotalNumPosReports|INT
728|PosReqResult|INT|0=Valid request;1=Invalid or unsupported request;2=No positions found that match criteria;3=Not authorized to request positions;4=Request for position not supported;99=Other
729|PosReqStatus|INT|0=Completed;1=Completed with warnings;2=Rejected
730|SettlPrice|PRICE
731|SettlPriceType|INT|1=Final;2=Theoretical
732|UnderlyingSettlPrice|PRICE
733|UnderlyingSettlPriceType|INT
734|PriorSettlPrice|PRICE
735|NoQuoteQualifiers|NUMINGROUP
736|AllocSettlCurrency|CURRENCY
737|AllocSettlCurrAmt|AMT
738|InterestAtMaturity|AMT
739|LegDatedDate|LOCALMKTDATE
740|LegPool|STRING
741|AllocInterestAtMaturity|AMT
742|AllocAccruedInterestAmt|AMT
743|DeliveryDate|LOCALMKTDATE
744|AssignmentMethod|CHAR|P=Pro rata;R=Random
745|AssignmentUnit|QTY
746|OpenInterest|AMT
747|ExerciseMethod|CHAR|A=Automatic;M=Manual
748|TotNumTradeReports|INT
749|TradeRequestResult|INT|0=Successful;1=Invalid or unknown instrument;2=Invalid type of trade requested;3=Invalid parties;4=Invalid transport type requested;5=Invalid destination requested;8=Traderequesttype not supported;9=Unauthorizedfortradecapturereportrequest;99=Other
750|TradeRequestStatus|INT|0=Accepted;1=Completed;2=Rejected
751|TradeReportRejectReason|INT|0=Successfuldefault;1=Invalid party onformation;2=Unknown instrument;3=Unauthorized to report trades;4=Invalid trade type;99=Other
752|SideMultiLegReportingType|INT|1=Single security;2=Individual leg of a multileg security;3=Multileg security
753|NoPosAmt|NUMINGROUP
754|AutoAcceptIndicator|BOOLEAN
755|AllocReportID|STRING
756|NoNested2PartyIDs|NUMINGROUP
757|Nested2PartyID|STRING
758|Nested2PartyIDSource|CHAR
759|Nested2PartyRole|INT
760|Nested2PartySubID|STRING
761|BenchmarkSecurityIDSource|STRING
762|SecuritySubType|STRING
763|UnderlyingSecuritySubType|STRING
764|LegSecuritySubType|STRING
765|AllowableOneSidednessPct|PERCENTAGE
766|AllowableOneSidednessValue|AMT
767|AllowableOneSidednessCurr|CURRENCY
768|NoTrdRegTimestamps|NUMINGROUP
769|TrdRegTimestamp|UTCTIMESTAMP
770|TrdRegTimestampType|INT|1=Execution time;2=Time in;3=Time out;4=Broker receipt;5=Broker execution
771|TrdRegTimestampOrigin|STRING
772|ConfirmRefID|STRING
773|ConfirmType|INT|1=Status;2=Confirmation;3=Confirmation request rejected
774|ConfirmRejReason|INT|1=Mismatched account;2=Missing settlement instructions;99=Other
775|BookingType|INT|0=Regular booking;1=Cfdcontractfordifference;2=Total return swap
776|IndividualAllocRejCode|INT
777|SettlInstMsgID|STRING
778|NoSettlInst|NUMINGROUP
779|LastUpdateTime|UTCTIMESTAMP
780|AllocSettlInstType|INT|0=Use default instructions;1=Derive from parameters provided;2=Full details provided;3=Ssi db ids provided;4=Phone for instructions
781|NoSettlPartyIDs|NUMINGROUP
782|SettlPartyID|STRING
783|SettlPartyIDSource|CHAR
784|SettlPartyRole|INT
785|SettlPartySubID|STRING
786|SettlPartySubIDType|INT
787|DlvyInstType|CHAR|C=Cash;S=Securities
788|TerminationType|INT|1=Overnight;2=Term;3=Flexible;4=Open
789|NextExpectedMsgSeqNum|SEQNUM
790|OrdStatusReqID|STRING
791|SettlInstReqID|STRING
792|SettlInstReqRejCode|INT|0=Unable to process request;1=Unknown account;2=No matching settlement instructions found;99=Other
793|SecondaryAllocID|STRING
794|AllocReportType|INT|3=Sellside calculated using preliminary;4=Sellside calculated without preliminary;5=Warehouse recap;8=Request to intermediary
795|AllocReportRefID|STRING
796|AllocCancReplaceReason|INT|1=Original details incomplete incorrect;2=Change in underlying order details;99=Other
797|CopyMsgIndicator|BOOLEAN
798|AllocAccountType|INT|1=Account is carried pn customer side of books;2=Account is carried on non customer side of books;3=House trader;4=Floor trader;6=Account is carried on non customer side of books and is cross margined;7=Account is house trader and is cross margined;8=Joint back office account
799|OrderAvgPx|PRICE
800|OrderBookingQty|QTY
801|NoSettlPartySubIDs|NUMINGROUP
802|NoPartySubIDs|NUMINGROUP
803|PartySubIDType|INT|1=Firm;10=Securities account number;11=Registration number;12=Registered address 12;13=Regulatory status;14=Registration name;15=Cash account number;16=Bic;17=Csd participant member code;18=Registered address 18;19=Fund account name;2=Person;20=Telex number;21=Fax number;22=Securities account name;23=Cash account name;24=Department;25=Location desk;26=Position account type;3=System;4=Application;4000=Reservedandavailableforbilaterallyagreeduponuserdefinedvalues;5=Full legal name of firm;6=Postal address;7=Phone number;8=Email address;9=Contact name
804|NoNestedPartySubIDs|NUMINGROUP
805|NestedPartySubIDType|INT
806|NoNested2PartySubIDs|NUMINGROUP
807|Nested2PartySubIDType|INT
808|AllocIntermedReqType|INT|1=Pending accept;2=Pending release;3=Pending reversal;4=Accept;5=Block level reject;6=Account level reject
810|UnderlyingPx|PRICE
811|PriceDelta|FLOAT
812|ApplQueueMax|INT
813|ApplQueueDepth|INT
814|ApplQueueResolution|INT|0=No action taken;1=Queue flushed;2=Overlay last;3=End session
815|ApplQueueAction|INT|0=No action taken;1=Queue flushed;2=Overlay last;3=End session
816|NoAltMDSource|NUMINGROUP
817|AltMDSourceID|STRING
818|SecondaryTradeReportID|STRING
819|AvgPxIndicator|INT|0=No average pricing;1=Trade is part of an average price group identified by the tradelinkid;2=Last trade is the average price group identified by the tradelinkid
820|TradeLinkID|STRING
821|OrderInputDevice|STRING
822|UnderlyingTradingSessionID|STRING
823|UnderlyingTradingSessionSubID|STRING
824|TradeLegRefID|STRING
825|ExchangeRule|STRING
826|TradeAllocIndicator|INT|0=Allocation not required;1=Allocationrequiredallocationinformationnotprovided;2=Use allocation provided with the trade
827|ExpirationCycle|INT|0=Expire on trading session close;1=Expire on trading session open
828|TrdType|INT|0=Regular trade;1=Block trade 1;10=After hours trade;2=Efp;3=Transfer;4=Late trade;5=T trade;6=Weighted average price trade;7=Bunched trade;8=Late bunched trade;9=Prior reference price trade
829|TrdSubType|INT
830|TransferReason|STRING
831|AsgnReqID|STRING
832|TotNumAssignmentReports|INT
833|AsgnRptID|STRING
834|ThresholdAmount|PRICEOFFSET
835|PegMoveType|INT|0=Floating;1=Fixed
836|PegOffsetType|INT|0=Price;1=Basis points;2=Ticks;3=Pricetierlevel
837|PegLimitType|INT|0=Or better;1=Strict;2=Or worse
838|PegRoundDirection|INT|1=More aggressive;2=More passive
839|PeggedPrice|PRICE
840|PegScope|INT|1=Localexchangeecnats;2=National;3=Global;4=National excluding local
841|DiscretionMoveType|INT|0=Floating;1=Fixed
842|DiscretionOffsetType|INT|0=Price;1=Basis points;2=Ticks;3=Pricetierlevel
843|DiscretionLimitType|INT|0=Or better;1=Strict;2=Or worse
844|DiscretionRoundDirection|INT|1=More aggressive;2=More passive
845|DiscretionPrice|PRICE
846|DiscretionScope|INT|1=Localexchangeecnats;2=National;3=Global;4=National excluding local
847|TargetStrategy|INT|1=Vwap;1000=Reservedandavailableforbilaterallyagreeduponuserdefinedvalues;2=Participate;3=Mininize market impact
848|TargetStrategyParameters|STRING
849|ParticipationRate|PERCENTAGE
850|TargetStrategyPerformance|FLOAT
851|LastLiquidityInd|INT|1=Added liquidity;2=Removed liquidity;3=Liquidity routed out
852|PublishTrdIndicator|BOOLEAN|N=No;Y=Yes
853|ShortSaleReason|INT|0=Dealer sold short;1=Dealer sold short exempt;2=Selling customer sold short;3=Selling customer sold short exempt;4=Qualified service representative;5=Qsr or agu contra side sold short exempt
854|QtyType|INT|0=Units;1=Contracts
855|SecondaryTrdType|INT
856|TradeReportType|INT|0=Submit;1=Alleged 1;2=Accept;3=Decline;4=Addendum;5=No was;6=Trade report cancel;7=Lockedintradebreak
857|AllocNoOrdersType|INT|0=Not specified;1=Explicit list provided
858|SharedCommission|AMT
859|ConfirmReqID|STRING
860|AvgParPx|PRICE
861|ReportedPx|PRICE
862|NoCapacities|NUMINGROUP
863|OrderCapacityQty|QTY
864|NoEvents|NUMINGROUP
865|EventType|INT|1=Put;2=Call;3=Tender;4=Sinking fund call;99=Other
866|EventDate|LOCALMKTDATE
867|EventPx|PRICE
868|EventText|STRING
869|PctAtRisk|PERCENTAGE
870|NoInstrAttrib|NUMINGROUP
871|InstrAttribType|INT|1=Flat;10=Original issue discount;11=Callable puttable;12=Escrowed to maturity;13=Escrowed to redemption date;14=Pre refunded;15=In default;16=Unrated;17=Taxable;18=Indexed;19=Subject to alternative minimum tax;2=Zero coupon;20=Original issue discount price supply price in the instrattribvalue;21=Callable below maturity value;22=Callable without notice by mail to holder unless registered;3=Interest bearing;4=No periodic payments;5=Variable rate;6=Less fee for put;7=Stepped coupon;8=Coupon period;9=When and if issued;99=Text supply the text of the attribute or disclaimer in the instrattribvalue
872|InstrAttribValue|STRING
873|DatedDate|LOCALMKTDATE
874|InterestAccrualDate|LOCALMKTDATE
875|CPProgram|INT|1=3a3;2=42;99=Other
876|CPRegType|STRING
877|UnderlyingCPProgram|STRING
878|UnderlyingCPRegType|STRING
879|UnderlyingQty|QTY
880|TrdMatchID|STRING
881|SecondaryTradeReportRefID|STRING
882|UnderlyingDirtyPrice|PRICE
883|UnderlyingEndPrice|PRICE
884|UnderlyingStartValue|AMT
885|UnderlyingCurrentValue|AMT
886|UnderlyingEndValue|AMT
887|NoUnderlyingStips|NUMINGROUP
888|UnderlyingStipType|STRING
889|UnderlyingStipValue|STRING
890|MaturityNetMoney|AMT
891|MiscFeeBasis|INT|0=Absolute;1=Per unit;2=Percentage
892|TotNoAllocs|INT
893|LastFragment|BOOLEAN|N=No;Y=Yes
894|CollReqID|STRING
895|CollAsgnReason|INT|0=Initial;1=Scheduled;2=Time warning;3=Margin deficiency;4=Margin excess;5=Forward collateral demand;6=Event of default;7=Adverse tax event
896|CollInquiryQualifier|INT|0=Trade date;1=Gc instrument;2=Collateral instrument;3=Substitution eligible;4=Not assigned;5=Partially assigned;6=Fully assigned;7=Outstanding trades
897|NoTrades|NUMINGROUP
898|MarginRatio|PERCENTAGE
899|MarginExcess|AMT
900|TotalNetValue|AMT
901|CashOutstanding|AMT
902|CollAsgnID|STRING
903|CollAsgnTransType|INT|0=New;1=Replace;2=Cancel;3=Release;4=Reverse
904|CollRespID|STRING
905|CollAsgnRespType|INT|0=Received;1=Accepted;2=Declined;3=Rejected
906|CollAsgnRejectReason|INT|0=Unknown deal;1=Unknown or invalid instrument;2=Unauthorized transaction;3=Insufficient collateral;4=Invalid type of collateral;5=Excessive substitution;99=Other
907|CollAsgnRefID|STRING
908|CollRptID|STRING
909|CollInquiryID|STRING
910|CollStatus|INT|0=Unassigned;1=Partially assigned;2=Assignment proposed;3=Assignedaccepted;4=Challenged
911|TotNumReports|INT
912|LastRptRequested|BOOLEAN|N=No;Y=Yes
913|AgreementDesc|STRING
914|AgreementID|STRING
915|AgreementDate|LOCALMKTDATE
916|StartDate|LOCALMKTDATE
917|EndDate|LOCALMKTDATE
918|AgreementCurrency|CURRENCY
919|DeliveryType|INT|0=Versus payment deliver;1=Free deliver;2=Tri party;3=Hold in custody
920|EndAccruedInterestAmt|AMT
921|StartCash|AMT
922|EndCash|AMT
923|UserRequestID|STRING
924|UserRequestType|INT|1=Log on user;2=Log off user;3=Change password for user;4=Request individual user status
925|NewPassword|STRING
926|UserStatus|INT|1=Logged in;2=Not logged in;3=User not recognised;4=Password incorrect;5=Password changed;6=Other
927|UserStatusText|STRING
928|StatusValue|INT|1=Connected;2=Notconnecteddownexpectedup;3=Notconnecteddownexpecteddown;4=In process
929|StatusText|STRING
930|RefCompID|STRING
931|RefSubID|STRING
932|NetworkResponseID|STRING
933|NetworkRequestID|STRING
934|LastNetworkResponseID|STRING
935|NetworkRequestType|INT|1=Snapshot;2=Subscribe;4=Stop subscribing;8=Level of detail then nocompids becomes required
936|NoCompIDs|NUMINGROUP
937|NetworkStatusResponseType|INT|1=Full;2=Incremental update
938|NoCollInquiryQualifier|NUMINGROUP
939|TrdRptStatus|INT|0=Accepted;1=Rejected
940|AffirmStatus|INT|1=Received;2=Confirm rejected ie not affirmed;3=Affirmed
941|UnderlyingStrikeCurrency|CURRENCY
942|LegStrikeCurrency|CURRENCY
943|TimeBracket|STRING
944|CollAction|INT|0=Retain;1=Add;2=Remove
945|CollInquiryStatus|INT|0=Accepted;1=Accepted with warnings;2=Completed;3=Completed with warnings;4=Rejected
946|CollInquiryResult|INT|0=Successful;1=Invalid or unknown instrument;2=Invalid or unknown collateral type;3=Invalid parties;4=Invalid transport type requested;5=Invalid destination requested;6=No collateral found for the trade specified;7=No collateral found for the order specified;8=Collateral inquiry type not supported;9=Unauthorized for collateral inquiry;99=Other
947|StrikeCurrency|CURRENCY
948|NoNested3PartyIDs|NUMINGROUP
949|Nested3PartyID|STRING
950|Nested3PartyIDSource|CHAR
951|Nested3PartyRole|INT
952|NoNested3PartySubIDs|NUMINGROUP
953|Nested3PartySubID|STRING
954|Nested3PartySubIDType|INT
955|LegContractSettlMonth|MONTHYEAR
956|LegInterestAccrualDate|LOCALMKTDATE`,
  messages: `0|Heartbeat|admin|
1|TestRequest|admin|112
2|ResendRequest|admin|7,16
3|Reject|admin|45
4|SequenceReset|admin|36
5|Logout|admin|
6|IOI|app|23,28,54,27
7|Advertisement|app|2,5,4,53
8|ExecutionReport|app|37,17,150,39,54,151,14,6
9|OrderCancelReject|app|37,11,41,39,434
A|Logon|admin|98,108
B|News|app|148,33
C|Email|app|164,94,147,33
D|NewOrderSingle|app|11,54,60,40
E|NewOrderList|app|66,394,68,73
F|OrderCancelRequest|app|41,11,54,60
G|OrderCancelReplaceRequest|app|41,11,54,60,40
H|OrderStatusRequest|app|11,54
J|AllocationInstruction|app|70,71,626,857,54,53,6,75
K|ListCancelRequest|app|66,60
L|ListExecute|app|66,60
M|ListStatusRequest|app|66
N|ListStatus|app|66,429,82,431,83,68,73
P|AllocationInstructionAck|app|70,60,87
Q|DontKnowTrade|app|37,17,127,54
R|QuoteRequest|app|131,146
S|Quote|app|117
T|SettlementInstructions|app|777,160,60
V|MarketDataRequest|app|262,263,264,267,146
W|MarketDataSnapshotFullRefresh|app|268
X|MarketDataIncrementalRefresh|app|268
Y|MarketDataRequestReject|app|262
Z|QuoteCancel|app|117,298
a|QuoteStatusRequest|app|
b|MassQuoteAcknowledgement|app|297
c|SecurityDefinitionRequest|app|320,321
d|SecurityDefinition|app|320,322,323
e|SecurityStatusRequest|app|324,263
f|SecurityStatus|app|
g|TradingSessionStatusRequest|app|335,263
h|TradingSessionStatus|app|336,340
i|MassQuote|app|117,296
j|BusinessMessageReject|app|372,380
k|BidRequest|app|391,374,393,394,418,419
l|BidResponse|app|420
m|ListStrikePrice|app|66,422,428
o|RegistrationInstructions|app|513,514,508
p|RegistrationInstructionsResponse|app|513,514,508,506
q|OrderMassCancelRequest|app|11,530,60
r|OrderMassCancelReport|app|37,530,531
s|NewOrderCross|app|548,549,550,552,60,40
t|CrossOrderCancelReplaceRequest|app|548,551,549,550,552,60,40
u|CrossOrderCancelRequest|app|548,551,549,550,552,60
v|SecurityTypeRequest|app|320
w|SecurityTypes|app|320,322,323
x|SecurityListRequest|app|320,559
y|SecurityList|app|320,322,560
z|DerivativeSecurityListRequest|app|320,559
AA|DerivativeSecurityList|app|320,322,560
AB|NewOrderMultileg|app|11,54,555,60,40
AC|MultilegOrderCancelReplace|app|41,11,54,555,60,40
AD|TradeCaptureReportRequest|app|568,569
AE|TradeCaptureReport|app|571,570,32,31,75,60,552
AF|OrderMassStatusRequest|app|584,585
AG|QuoteRequestReject|app|131,658,146
AH|RFQRequest|app|644,146
AI|QuoteStatusReport|app|117
AJ|QuoteResponse|app|693,694
AK|Confirmation|app|664,666,773,665,60,75,711,555,80,54,862,79,6,381,118
AL|PositionMaintenanceRequest|app|710,709,712,715,1,581,60
AM|PositionMaintenanceReport|app|721,709,712,713,722,715,1,581,60
AN|RequestForPositions|app|710,724,1,581,715,60
AO|RequestForPositionsAck|app|721,728,729,1,581
AP|PositionReport|app|721,728,715,1,581,730,731,734
AQ|TradeCaptureReportRequestAck|app|568,569,749,750
AR|TradeCaptureReportAck|app|571,150
AS|AllocationReport|app|755,71,794,87,857,54,53,6,75
AT|AllocationReportAck|app|755,70,60,87
AU|ConfirmationAck|app|664,75,60,940
AV|SettlementInstructionRequest|app|791,60
AW|AssignmentReport|app|833,581,730,731,732,744,746,747,716,717,715
AX|CollateralRequest|app|894,895,60
AY|CollateralAssignment|app|902,895,903,60
AZ|CollateralResponse|app|904,902,895,905,60
BA|CollateralReport|app|908,910
BB|CollateralInquiry|app|
BC|NetworkCounterpartySystemStatusRequest|app|935,933
BD|NetworkCounterpartySystemStatusResponse|app|937,932,936
BE|UserRequest|app|923,924,553
BF|UserResponse|app|923,553
BG|CollateralInquiryAck|app|909,945
BH|ConfirmationRequest|app|859,773,60`,
  groups: `33|58,354,355
73|11,526,67,583,160,453,229,75,1,660,581,589,590,70,591,78,63,64,544,635,21,18,110,111,100,386,81,55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,711,140,54,401,114,60,232,854,38,152,516,468,469,40,423,44,99,218,220,221,222,662,663,699,761,235,236,701,696,697,698,15,376,377,23,117,59,168,432,126,427,12,13,479,497,528,529,582,121,120,775,58,354,355,193,192,640,77,203,210,211,835,836,837,838,840,388,389,841,842,843,844,846,847,848,849,494,37,198,66,756,799,800,14,39,636,151,84,6,103
78|79,661,736,467,539,80,573,366,81,208,209,161,360,361,12,13,479,497,153,154,119,737,120,155,156,742,741,136,576,635,780,172,169,170,171,85,776,948,756
85|165,787,781
124|32,17,527,31,669,29
136|137,138,139,891
146|55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,913,914,915,918,788,916,917,919,898,711,140,303,537,336,625,229,54,854,38,152,516,468,469,63,64,193,192,15,232,1,660,581,555,735,692,40,62,126,60,218,220,221,222,662,663,699,761,423,44,640,235,236,701,696,697,698,453,386,815,812,668,869,870,561,562,827,58,354,355
199|104
215|216,217
232|233,234
267|269
268|269,270,15,271,272,273,274,275,336,625,276,277,282,283,284,286,59,432,126,110,18,287,37,299,288,289,346,290,546,811,58,354,355,279,285,278,280,55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,711,555,291,292,451
295|55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874,913,914,915,918,788,916,917,919,898,711,555,299,132,133,134,135,62,188,190,189,191,631,632,633,634,60,336,625,64,40,193,192,642,643,15,368
296|302,311,312,309,305,457,462,463,310,763,313,542,241,242,243,244,245,246,256,595,592,593,594,247,316,941,317,436,435,308,306,362,363,307,364,365,877,878,318,879,810,882,883,884,885,886,887,304,893,295,367
382|375,337,437,438,655
384|372,385
386|336,625
398|399,400,401,404,441,402,403,405,406,407,408
420|66,54,336,625,430,63,64,1,660,12,13,479,497,421,44,423,406,58,354,355
428|55,65,48,22,454,460,461,167,762,200,541,224,225,239,226,227,228,255,543,470,471,472,240,202,947,206,231,223,207,106,348,349,107,350,351,691,667,875,876,864,873,874
453|448,447,452,802
454|455,456
457|458,459
473|509,511,474,482,539,522,486,475
510|477,512,478,498,499,500,501,502
518|519,520,521
534|41,535,536
539|524,525,538,804
552|54,11,526,583,453,229,75,1,660,581,589,590,591,70,78,854,38,152,516,468,469,12,13,479,497,528,529,582,121,120,775,58,354,355,77,203,544,635,377,659,41,586,376,37,198,66,81,575,576,578,579,821,15,40,18,483,336,625,943,381,157,230,158,159,738,920,921,922,238,237,118,119,155,156,752,518,232,136,825,826,797,852,853
555|600,601,602,603,604,607,608,609,764,610,611,248,249,250,251,252,253,257,599,596,597,598,254,612,942,613,614,615,616,617,618,619,620,621,622,623,624,556,740,739,955,956,682,683,687,690,564,565,539,654,566,587,588,637,676,677,678,679,680,686,681,684,670
558|167,762,460,461
576|577
580|75,60
604|605,606
627|628,629,630
670|671,672,756,673,674,675
683|688,689
702|703,704,705,706,539
711|311,312,309,305,457,462,463,310,763,313,542,241,242,243,244,245,246,256,595,592,593,594,247,316,941,317,436,435,308,306,362,363,307,364,365,877,878,318,879,810,882,883,884,885,886,887,140,11,526,54,44,15,58,354,355,732,733,944
735|695
753|707,708
756|757,758,759,806
768|769,770,771
778|162,163,214,453,54,460,167,461,168,126,779,172,169,170,171,85,492,476,488,489,503,490,491,504,505
781|782,783,784,801
801|785,786
802|523,803
804|545,805
806|760,807
816|817
862|528,529,863
864|865,866,867,868
870|871,872
887|888,889
897|571,818
936|930,931,283,284,928,929
938|896
948|949,950,951,952
952|953,954`,
  header: "8,9,35,49,56,115,128,90,91,34,50,142,57,143,116,144,129,145,43,97,52,122,212,213,347,369,627",
  headerReq: "8,9,35,49,56,34,52",
  trailer: "93,89,10",
};
