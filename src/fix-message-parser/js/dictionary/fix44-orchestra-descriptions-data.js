// GENERATED from FIXTradingCommunity/orchestrations OrchestraFIX44.xml (Apache-2.0; FIX content © FIX Protocol Ltd) — field: tag|synopsis · code: tag|value|synopsis · message: type|synopsis.
const FixDocStd = {
  fields: `1|Account mnemonic as agreed between buy and sell sides, e.g. broker and institution or investor/intermediary and fund manager.
2|Unique identifier of advertisement message. (Prior to FIX 4.1 this field was of type int)
3|Reference identifier used with CANCEL and REPLACE transaction types. (Prior to FIX 4.1 this field was of type int)
4|Broker's side of advertised trade
5|Identifies advertisement message transaction type
6|Calculated average price of all fills on this order. For Fixed Income trades AvgPx is always expressed as percent-of-par, regardless of the PriceType (423) of LastPx (3). I.e., AvgPx will contain an average of percent-of-par values (see LastParPx (669)) for issues traded in Yield, Spread or Discount.
7|Message sequence number of first message in range to be resent
8|Identifies beginning of new message and protocol version. ALWAYS FIRST FIELD IN MESSAGE. (Always unencrypted)
9|Message length, in bytes, forward to the CheckSum field. ALWAYS SECOND FIELD IN MESSAGE. (Always unencrypted)
10|Three byte, simple checksum . ALWAYS LAST FIELD IN MESSAGE; i.e. serves, with the trailing <SOH>, as the end-of-message delimiter. Always defined as three characters. (Always unencrypted)
11|Unique identifier for Order as assigned by the buy-side (institution, broker, intermediary etc.) (identified by SenderCompID(49) or OnBehalfOfCompID(115) as appropriate). Uniqueness must be guaranteed within a single trading day. Firms, particularly those which electronically submit multi-day orders, trade globally or throughout market close periods, should ensure uniqueness across days, for example by embedding a date within the ClOrdID(11) field.
12|Commission. Note if CommType (3) is percentage, Commission of 5% should be represented as .05.
13|Commission type
14|Total quantity (e.g. number of shares) filled. (Prior to FIX 4.2 this field was of type int)
15|Identifies currency used for price. Absence of this field is interpreted as the default for the security. It is recommended that systems provide the currency value whenever possible. See "Appendix 6-A: Valid Currency Codes" for information on obtaining valid values.
16|Message sequence number of last message in range to be resent. If request is for a single message BeginSeqNo (7) = EndSeqNo. If request is for all messages subsequent to a particular message, EndSeqNo = "0" (representing infinity).
17|Unique identifier of execution message as assigned by sell-side (broker, exchange, ECN) (will be 0 (zero) for ExecType (50) =I (Order Status)). Uniqueness must be guaranteed within a single trading day or the life of a multi-day order. Firms which accept multi-day orders should consider embedding a date within the ExecID field to assure uniqueness across days. (Prior to FIX 4.1 this field was of type int)
18|Instructions for order handling on exchange trading floor. If more than one instruction is applicable to an order, this field can contain multiple instructions separated by space.
19|Reference identifier used with Trade Cancel and Trade Correct execution types. (Prior to FIX 4.1 this field was of type int)
21|Instructions for order handling on Broker trading floor
22|Identifies class or source of the SecurityID (48) value. Required if SecurityID is specified.
23|Unique identifier of IOI message. (Prior to FIX 4.1 this field was of type int)
25|Relative quality of indication
26|Reference identifier used with CANCEL and REPLACE, transaction types. (Prior to FIX 4.1 this field was of type int)
27|Quantity (e.g. number of shares) in numeric form or relative size.
28|Identifies IOI message transaction type
29|Broker capacity in order execution
30|Market of execution for last fill, or an indication of the market where an order was routed Valid values: See "Appendix 6-C"
31|Price of this (last) fill.
32|Quantity (e.g. shares) bought/sold on this (last) fill. (Prior to FIX 4.2 this field was of type int)
33|Identifies number of lines of text body
34|Integer message sequence number
35|Defines message type ALWAYS THIRD FIELD IN MESSAGE. (Always unencrypted) Note: A "U" as the first character in the MsgType field (i.e. U, U2, etc) indicates that the message format is privately defined between the sender and receiver.
36|New sequence number
37|Unique identifier for Order as assigned by sell-side (broker, exchange, ECN). Uniqueness must be guaranteed within a single trading day. Firms which accept multi-day orders should consider embedding a date within the OrderID field to assure uniqueness across days.
38|Quantity ordered. This represents the number of shares for equities or par, face or nominal value for FI instruments. (Prior to FIX 4.2 this field was of type int)
39|Identifies current status of order.
40|Order type
41|ClOrdID of the previous order (NOT the initial order of the day) as assigned by the institution, used to identify the previous order in cancel and cancel/replace requests.
42|Time of message origination (always expressed in UTC (Universal Time Coordinated, also known as "GMT"))
43|Indicates possible retransmission of message with this sequence number
44|Price per unit of quantity (e.g. per share)
45|Reference message sequence number
48|Security identifier value of SecurityIDSource (22) type (e.g. CUSIP, SEDOL, ISIN, etc). Requires SecurityIDSource.
49|Assigned value used to identify firm sending message.
50|Assigned value used to identify specific message originator (desk, trader, etc.)
52|Time of message transmission (always expressed in UTC (Universal Time Coordinated, also known as "GMT")
53|Overall/total quantity (e.g. number of shares) (Prior to FIX 4.2 this field was of type int)
54|Side of order
55|Ticker symbol. Common, "human understood" representation of the security. SecurityID (48) value can be specified if no symbol exists (e.g. non-exchange traded Collective Investment Vehicles) Use "[N/A]" for products which do not have a symbol.
56|Assigned value used to identify receiving firm.
57|Assigned value used to identify specific individual or unit intended to receive message. "ADMIN" reserved for administrative messages not intended for a specific user.
58|Free format text string (Note: this field does not have a specified maximum length)
59|Specifies how long the order remains in effect. Absence of this field is interpreted as DAY.
60|Time of execution/order creation (expressed in UTC (Universal Time Coordinated, also known as "GMT")
61|Urgency flag
62|Indicates expiration time of indication message (always expressed in UTC (Universal Time Coordinated, also known as "GMT")
63|Indicates order settlement period. If present, SettlDate (64) overrides this field. If both SettlType (63) and SettDate (64) are omitted, the default for SettlType (63) is 0 (Regular) Regular is defined as the default settlement period for the particular security on the exchange of execution. In Fixed Income the contents of this field may influence the instrument definition if the SecurityID (48) is ambiguous. In the US an active Treasury offering may be re-opened, and for a time one CUSIP will apply to both the current and "when-issued" securities. Supplying a value of "7" clarifies the instrument description; any other value or the absence of this field should cause the respondent to default to the active issue.
64|Specific date of trade settlement (SettlementDate) in YYYYMMDD format. If present, this field overrides SettlType (63). This field is required if the value of SettlType (63) is 6 (Future) or 8 (Sellers Option). This field must be omitted if the value of SettlType (63) is 7 (When and If Issued) (expressed in local time at place of settlement)
65|Additional information about the security (e.g. preferred, warrants, etc.). Note also see SecurityType(167). Valid values: As defined in the NYSE Stock and bond Symbol Directory and in the AMEX Fitch Directory Fixed Income use: WI = "When Issued" for a security to be reissued under an old CUSIP or ISIN CD = a EUCP with lump-sum interest rather than discount price
66|Unique identifier for list as assigned by institution, used to associate multiple individual orders. Uniqueness must be guaranteed within a single trading day. Firms which generate multi-day orders should consider embedding a date within the ListID field to assure uniqueness across days.
67|Sequence of individual order within list (i.e. ListSeqNo of TotNoOrders (68), 2 of 25, 3 of 25, . . . )
68|Total number of list order entries across all messages. Should be the sum of all NoOrders (73) in each message that has repeating list order entries related to the same ListID (66). Used to support fragmentation. (Prior to FIX 4.2 this field was named "ListNoOrds")
69|Free format text message containing list handling and execution instructions.
70|Unique identifier for allocation message. (Prior to FIX 4.1 this field was of type int)
71|Identifies allocation transaction type
72|Reference identifier to be used with AllocTransType (7) =Replace or Cancel. (Prior to FIX 4.1 this field was of type int)
73|Indicates number of orders to be combined for average pricing and allocation.
74|Indicates number of decimal places to be used for average pricing. Absence of this field indicates that default precision arranged by the broker/institution is to be used.
75|Indicates date of trade referenced in this message in YYYYMMDD format. Absence of this field indicates current day (expressed in local time at place of trade).
77|Indicates whether the resulting position after a trade should be an opening position or closing position. Used for omnibus accounting - where accounts are held on a gross basis instead of being netted together.
78|Number of repeating AllocAccount (79)/AllocPrice (366) entries.
79|Sub-account mnemonic
80|Quantity to be allocated to specific sub-account (Prior to FIX 4.2 this field was of type int)
81|Processing code for sub-account. Absence of this field in AllocAccount (79) / AllocPrice (366) /AllocQty (80) / ProcessCode instance indicates regular trade.
82|Total number of reports within series.
83|Sequence number of message within report series.
84|Total quantity canceled for this order. (Prior to FIX 4.2 this field was of type int)
85|Number of delivery instruction fields in repeating group. Note this field was removed in FIX 4.1 and reinstated in FIX 4.4.
87|Identifies status of allocation
88|Identifies reason for rejection
89|Electronic signature
90|Length of encrypted message
91|Actual encrypted data stream
93|Number of bytes in signature field.
94|Email message type
95|Number of bytes in raw data field.
96|Unformatted raw data, can include bitmaps, word processor documents, etc.
97|Indicates that message may contain information that has been sent under another sequence number.
98|Method of encryption
99|Price per unit of quantity (e.g. per share)
100|Execution destination as defined by institution when order is entered. Valid values: See "Appendix 6-C"
102|Code to identify reason for cancel rejection
103|Code to identify reason for order rejection.
104|Code to qualify IOI use
106|Name of security issuer (e.g. International Business Machines, GNMA). see also Volume 7: "PRODUCT: FIXED INCOME - Euro Issuer Values"
107|Security description.
108|Heartbeat interval (seconds)
110|Minimum quantity of an order to be executed. (Prior to FIX 4.2 this field was of type int)
111|Maximum quantity (e.g. number of shares) within an order to be shown on the exchange floor at any given time. (Prior to FIX 4.2 this field was of type int)
112|Identifier included in Test Request message to be returned in resulting Heartbeat
113|Identifies party of trade responsible for exchange reporting.
114|Indicates whether the broker is to locate the stock in conjunction with a short sell order.
115|Assigned value used to identify firm originating message if the message was delivered by a third party i.e. the third party firm identifier would be delivered in the SenderCompID field and the firm originating the message in this field.
116|Assigned value used to identify specific message originator (i.e. trader) if the message was delivered by a third party
117|Unique identifier for quote
118|Total amount due as the result of the transaction (e.g. for Buy order - principal + commission + fees) reported in currency of execution.
119|Total amount due expressed in settlement currency (includes the effect of the forex transaction)
120|Currency code of settlement denomination.
121|Indicates request for forex accommodation trade to be executed along with security transaction.
122|Original time of message transmission (always expressed in UTC (Universal Time Coordinated, also known as "GMT") when transmitting orders as the result of a resend request.
123|Indicates that the Sequence Reset message is replacing administrative or application messages which will not be resent.
124|No of execution repeating group entries to follow.
126|Time/Date of order expiration (always expressed in UTC (Universal Time Coordinated, also known as "GMT") The meaning of expiration is specific to the context where the field is used. For orders, this is the expiration time of a Good Til Date TimeInForce. For Quotes - this is the expiration of the quote. Expiration time is provided across the quote message dialog to control the length of time of the overall quoting process. For collateral requests, this is the time by which collateral must be assigned. For collateral assignments, this is the time by which a response to the assignment is expected.
127|Reason for execution rejection
128|Assigned value used to identify the firm targeted to receive the message if the message is delivered by a third party i.e. the third party firm identifier would be delivered in the TargetCompID (56) field and the ultimate receiver firm ID in this field.
129|Assigned value used to identify specific message recipient (i.e. trader) if the message is delivered by a third party
130|Indicates that IOI is the result of an existing agency order or a facilitation position resulting from an agency order, not from principal trading or order solicitation activity.
131|Unique identifier for quote request
132|Bid price/rate
133|Offer price/rate
134|Quantity of bid (Prior to FIX 4.2 this field was of type int)
135|Quantity of offer (Prior to FIX 4.2 this field was of type int)
136|Number of repeating groups of miscellaneous fees
137|Miscellaneous fee value
138|Currency of miscellaneous fee
139|Indicates type of miscellaneous fee
140|Previous closing price of security.
141|Indicates that the both sides of the FIX session should reset sequence numbers.
142|Assigned value used to identify specific message originator’s location (i.e. geographic location and/or desk, trader)
143|Assigned value used to identify specific message destination’s location (i.e. geographic location and/or desk, trader)
144|Assigned value used to identify specific message originator’s location (i.e. geographic location and/or desk, trader) if the message was delivered by a third party
145|Assigned value used to identify specific message recipient’s location (i.e. geographic location and/or desk, trader) if the message was delivered by a third party
146|Specifies the number of repeating symbols specified.
147|The subject of an Email message
148|The headline of a News message
149|A URI (Uniform Resource Identifier) or URL (Uniform Resource Locator) link to additional information (i.e. http://www.XYZ.com/research.html) See "Appendix 6-B FIX Fields Based Upon Other Standards"
150|Describes the specific ExecutionRpt (i.e. Pending Cancel) while OrdStatus (39) will always identify the current order status (i.e. Partially Filled)
151|Quantity open for further execution. If the OrdStatus (39) is Canceled, DoneForTheDay, Expired, Calculated, or Rejected (in which case the order is no longer active) then LeavesQty could be 0, otherwise LeavesQty = OrderQty (38) – CumQty (4). (Prior to FIX 4.2 this field was of type int)
152|Specifies the approximate order quantity desired in total monetary units vs. as tradeable units (e.g. number of shares). The broker or fund manager (for CIV orders) would be responsible for converting and calculating a tradeable unit (e.g. share) quantity (OrderQty (38)) based upon this amount to be used for the actual order and subsequent messages.
153|AvgPx (6) for a specific AllocAccount (79) For Fixed Income this is always expressed as "percent of par" price type.
154|NetMoney(118) for a specific AllocAccount (79)
155|Foreign exchange rate used to compute SettlCurrAmt(119) from Currency(15) to SettlCurrency(120)
156|Specifies whether or not SettlCurrFxRate(155) should be multiplied or divided
157|Number of Days of Interest for convertible bonds and fixed income. Note value may be negative.
158|The amount the buyer compensates the seller for the portion of the next coupon interest payment the seller has earned but will not receive from the issuer because the issuer will send the next coupon payment to the buyer. Accrued Interest Rate is the annualized Accrued Interest amount divided by the purchase price of the bond.
159|Amount of Accrued Interest for convertible bonds and fixed income
160|Indicates mode used for Settlement Instructions message.
161|Free format text related to a specific AllocAccount (79).
162|Unique identifier for Settlement Instruction.
163|Settlement Instructions message transaction type
164|Unique identifier for an email thread (new and chain of replies)
165|Indicates source of Settlement Instructions
167|Indicates type of security. See also the Product(460) and CFICode(461) fields. It is recommended that CFICode(461) be used instead of SecurityType(167) for non-Fixed Income instruments. Example values (grouped by Product field value) (Note: additional values may be used by mutual agreement of the counterparties): * Identify the Issuer in the field Issuer(106) NOTE: Additional values may be used by mutual agreement of the counterparties)
168|Time the details within the message should take effect (always expressed in UTC (Universal Time Coordinated, also known as "GMT")
169|Identifies the Standing Instruction database used
170|Name of the Standing Instruction database represented with StandInstDbType (69) (i.e. the Global Custodian’s name).
171|Unique identifier used on the Standing Instructions database for the Standing Instructions to be referenced.
172|Identifies type of settlement
188|Bid F/X spot rate.
189|Bid F/X forward points added to spot rate. May be a negative value.
190|Offer F/X spot rate.
191|Offer F/X forward points added to spot rate. May be a negative value.
192|OrderQty (38) of the future part of an F/X swap order.
193|SettDate (64) of the future part of an F/X swap order.
194|F/X spot rate.
195|F/X forward points added to LastSpotRate(194). May be a negative value.
196|Can be used to link two different Allocation messages (each with unique AllocID (70)) together, i.e. for F/X "Netting" or "Swaps". Should be unique.
197|Identifies the type of Allocation linkage when AllocLinkID(196) is used.
198|Assigned by the party which accepts the order. Can be used to provide the OrderID (37) used by an exchange or executing system.
199|Number of repeating groups of IOIQualifiers (04).
200|Can be used with standardized derivatives vs. the MaturityDate (541) field. Month and Year of the maturity (used for standardized futures and options). Format: YYYYMM (i.e. 199903) YYYYMMDD (20030323) YYYYMMwN (200303w) for week A specific date or can be appended to the MaturityMonthYear. For instance, if multiple standard products exist that mature in the same Year and Month, but actually mature at a different time, a value can be appended, such as "w" or "w2" to indicate week as opposed to week 2 expiration. Likewise, the date (0-3) can be appended to indicate a specific expiration (maturity date).
201|Indicates whether an Option is for a put or call
202|Strike Price for an Option.
203|Used for derivative products, such as options
206|Can be used for SecurityType(167)=OPT to identify a particular security. Valid values vary by SecurityExchange: For Exchange: MONEP (Paris) L = Long (a.k.a. "American") S = Short (a.k.a. "European") For Exchanges: DTB (Frankfurt), HKSE (Hong Kong), and SOFFEX (Zurich) 0-9 = single digit "version" number assigned by exchange following capital adjustments (0=current, 1=prior, 2=prior to 1, etc).
207|Market used to help identify a security. Valid values: See "Appendix 6-C"
208|Indicates whether or not details should be communicated to BrokerOfCredit (i.e. step-in broker).
209|Indicates how the receiver (i.e. third party) of Allocation message should handle/process the account details
210|Maximum quantity (e.g. number of shares) within an order to be shown to other customers (i.e. sent via an IOI). (Prior to FIX 4.2 this field was of type int)
211|Amount (signed) added to the peg for a pegged order in the context of the PegOffsetType (836) (Prior to FIX 4.4 this field was of type PriceOffset)
212|Length of the XmlData data block.
213|Actual XML data stream (e.g. FIXML). See approriate XML reference (e.g. FIXML). Note: may contain embedded SOH characters.
214|Reference identifier for the SettlInstID (62) with Cancel and Replace SettlInstTransType (63) transaction types.
215|Number of repeating groups of RoutingID (27) and RoutingType (26) values. See Volume 3: "Pre-Trade Message Targeting/Routing"
216|Indicates the type of RoutingID (27) specified
217|Assigned value used to identify a specific routing destination.
218|For Fixed Income. Either Swap Spread or Spread to Benchmark depending upon the order type. Spread to Benchmark: Basis points relative to a benchmark. To be expressed as "count of basis points" (vs. an absolute value). E.g. High Grade Corporate Bonds may express price as basis points relative to benchmark (the BenchmarkCurveName(221) field). Note: Basis points can be negative. Swap Spread: Target spread for a swap.
220|Identifies currency used for benchmark curve. See "Appendix 6-A: Valid Currency Codes" for information on obtaining valid values. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
221|Name of benchmark curve.
222|Point on benchmark curve. Free form values: e.g. "Y", "7Y", "INTERPOLATED". Sample values: M = combination of a number between 1-12 and a "M" for month Y = combination of number between 1-100 and a "Y" for year} 10Y-OLD = see above, then add "-OLD" when appropriate INTERPOLATED = the point is mathematically derived 2/2031 5 3/8 = the point is stated via a combination of maturity month / year and coupon See Fixed Income-specific documentation at http://www.fixprotocol.org for additional values. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
223|The rate of interest that, when multiplied by the principal, par value, or face value of a bond, provides the currency amount of the periodic interest payment. The coupon is always cited, along with maturity, in any quotation of a bond's price.
224|Date interest is to be paid. Used in identifying Corporate Bond issues. (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
225|The date on which a bond or stock offering is issued. It may or may not be the same as the effective date ("Dated Date") or the date on which interest begins to accrue ("Interest Accrual Date") (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
226|Number of business days before repurchase of a repo. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
227|Percent of par at which a Repo will be repaid. Represented as a percent, e.g. .9525 represents 95-/4 percent of par. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
228|For Fixed Income: Amortization Factor for deriving Current face from Original face for ABS or MBS securities, note the fraction may be greater than, equal to or less than 1. In TIPS securities this is the Inflation index. Qty * Factor * Price = Gross Trade Amount For Derivatives: Contract Value Factor by which price must be adjusted to determine the true nominal value of one futures/options contract. (Qty * Price) * Factor = Nominal Value (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
229|Used with Fixed Income for Municipal New Issue Market. Agreement in principal between counter-parties prior to actual trade date. (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
230|The date when a distribution of interest is deducted from a securities assets or set aside for payment to bondholders. On the ex-date, the securities price drops by the amount of the distribution (plus or minus any market activity). (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
231|Specifies the ratio or multiply factor to convert from "nominal" units (e.g. contracts) to total units (e.g. shares) (e.g. 1.0, 100, 1000, etc). Applicable For Fixed Income, Convertible Bonds, Derivatives, etc. In general quantities for all classes should be expressed in the basic unit of the instrument, e.g. shares for equities, nominal or par amount for bonds, currency for foreign exchange. When quantity is expressed in contracts, e.g. financing transactions and bond trade reporting, ContractMultiplier should contain the number of units in one contract and can be omitted if the multiplier is the default amount for the instrument, i.e. 1,000 par of bonds, 1,000,000 par for financing transactions.
232|Number of stipulation entries (Note tag # was reserved in FIX 4.1, added in FIX 4.3).
233|Type of Stipulation
234|For Fixed Income. Value of stipulation. The expression can be an absolute single value or a combination of values and logical operators: < value > value <= value >= value value value – value2 value OR value2 value AND value2 YES NO (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
235|Type of yield
236|Yield percentage. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
237|The price at which the securities are distributed to the different members of an underwriting group for the primary market in Municipals, total gross underwriter's spread. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
238|Provides the reduction in price for the secondary market in Municipals. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
239|Identifies the collateral used in the transaction. Valid values: see SecurityType(167) field (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
240|Return of investor's principal in a security. Bond redemption can occur before maturity date. (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
241|Underlying security’s CouponPaymentDate. See CouponPaymentDate (224) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
242|Underlying security’s IssueDate. See IssueDate (225) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
243|Underlying security’s RepoCollateralSecurityType. See RepoCollateralSecurityType (239) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
244|Underlying security’s RepurchaseTerm. See RepurchaseTerm (226) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
245|Underlying security’s RepurchaseRate. See RepurchaseRate (227) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
246|Underlying security’s Factor. See Factor (228) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
247|Underlying security’s RedemptionDate. See RedemptionDate (240) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
248|Multileg instrument's individual leg security’s CouponPaymentDate. See CouponPaymentDate (224) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
249|Multileg instrument's individual leg security’s IssueDate. See IssueDate (225) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
250|Multileg instrument's individual leg security’s RepoCollateralSecurityType. See RepoCollateralSecurityType (239) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
251|Multileg instrument's individual leg security's RepurchaseTerm. See RepurchaseTerm (226) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
252|Multileg instrument's individual leg security’s RepurchaseRate. See RepurchaseRate (227) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
253|Multileg instrument's individual leg security’s Factor. See Factor (228) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
254|Multileg instrument's individual leg security’s RedemptionDate. See RedemptionDate (240) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
255|An evaluation of a company's ability to repay obligations or its likelihood of not defaulting. These evaluation are provided by Credit Rating Agencies, i.e. S&P, Moody's. (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
256|Underlying security’s CreditRating. See CreditRating (255) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
257|Multileg instrument's individual leg security’s CreditRating. See CreditRating (255) field for description (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
258|Driver and part of trade in the event that the Security Master file was wrong at the point of entry (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
259|BasisFeatureDate allows requesting firms within fixed income the ability to request an alternative yield-to-worst, -maturity, -extended or other call. This flows through the confirm process. (Note tag # was reserved in FIX 4.1, added in FIX 4.3) (prior to FIX 4.4 field was of type UTCDate)
260|Price for BasisFeatureDate. See BasisFeatureDate (259) (Note tag # was reserved in FIX 4.1, added in FIX 4.3)
262|Unique identifier for Market Data Request
263|Subscription Request Type
264|Depth of market for Book Snapshot
265|Specifies the type of Market Data update
266|Specifies whether or not book entries should be aggregated.
267|Number of MDEntryType (269) fields requested.
268|Number of entries in Market Data message.
269|Type Market Data entry
270|Price of the Market Data Entry.
271|Quantity or volume represented by the Market Data Entry.
272|Date of Market Data Entry. (prior to FIX 4.4 field was of type UTCDate)
273|Time of Market Data Entry.
274|Direction of the "tick"
275|Market posting quote / trade. Valid values: See "Appendix 6-C"
276|Space-delimited list of conditions describing a quote
277|Space-delimited list of conditions describing a trade
278|Unique Market Data Entry identifier.
279|Type of Market Data update action
280|Refers to a previous MDEntryID (278).
281|Reason for the rejection of a Market Data request
282|Originator of a Market Data Entry
283|Identification of a Market Maker’s location
284|Identification of a Market Maker’s desk
285|Reason for deletion
286|Flag that identifies a market data entry (Prior to FIX 4.3 this field was of type char)
287|Specifies the number of days that may elapse before delivery of the security
288|Buying party in a trade
289|Selling party in a trade
290|Display position of a bid or offer, numbered from most competitive to least competitive, per market side, beginning with .
291|Identifies a firm’s financial status
292|Identifies the type of Corporate Action
293|Default Bid Size.
294|Default Offer Size.
295|The number of quote entries for a QuoteSet.
296|The number of sets of quotes in the message.
297|Identifies the status of the quote acknowledgement
298|Identifies the type of quote cancel.
299|Uniquely identifies the quote as part of a QuoteSet.
300|Reason Quote was rejected
301|Level of Response requested from receiver of quote messages.
302|Unique id for the Quote Set.
303|Indicates the type of Quote Request being generated
304|Total number of quotes for the quote set across all messages. Should be the sum of all NoQuoteEntries (295) in each message that has repeating quotes that are part of the same quote set. (Prior to FIX 4.4 this field was named TotQuoteEntries)
305|Underlying security’s SecurityIDSource. Valid values: see SecurityIDSource (22) field
306|Underlying security’s Issuer. See Issuer(106) field for description
307|Underlying security’s SecurityDesc. See SecurityDesc (07) field for description
308|Underlying security’s SecurityExchange. Can be used to identify the underlying security. Valid values: see SecurityExchange (207)
309|Underlying security’s SecurityID. See SecurityID (48) field for description
310|Underlying security’s SecurityType. Valid values: see SecurityType(167) field (see below for details concerning this fields use in conjunction with SecurityType=REPO) The following applies when used in conjunction with SecurityType=REPO Represents the general or specific type of security that underlies a financing agreement Valid values for SecurityType=REPO: TREASURY = Federal government or treasury PROVINCE = State, province, region, etc. AGENCY = Federal agency MORTGAGE = Mortgage passthrough CP = Commercial paper CORP = Corporate EQUITY = Equity SUPRA = Supra-national agency CASH If bonds of a particular issuer or country are wanted in an Order or are in the basket of an Execution and the SecurityType is not granular enough, include the UnderlyingIssuer (306), UnderlyingCountryOfIssue (592), UnderlyingProgram, UnderlyingRegType and/or <UnderlyingStipulations> block e.g.: SecurityType=REPO UnderlyingSecurityType=MORTGAGE UnderlyingIssuer=GNMA or SecurityType=REPO UnderlyingSecurityType=AGENCY UnderlyingIssuer=CA Housing Trust UnderlyingCountryOfIssue=CA or SecurityType=REPO UnderlyingSecurityType=CORP UnderlyingNoStipulations= UnderlyingStipulationType=RATING UnderlyingStipulationValue=>bbb-
311|Underlying security’s Symbol. See Symbol (55) field for description
312|Underlying security’s SymbolSfx. See SymbolSfx (65) field for description
313|Underlying security’s MaturityMonthYear. Can be used with standardized derivatives vs. the UnderlyingMaturityDate (542) field. See MaturityMonthYear (200) field for description
315|Underlying security’s PutOrCall. See PutOrCall field for description
316|Underlying security’s StrikePrice. See StrikePrice (202) field for description
317|Underlying security’s OptAttribute. See OptAttribute (206) field for description
318|Underlying security’s Currency. See Currency(15) field for description and valid values
320|Unique ID of a Security Definition Request.
321|Type of Security Definition Request.
322|Unique ID of a Security Definition message.
323|Type of Security Definition message response
324|Unique ID of a Security Status Request message.
325|Indicates whether or not message is being sent as a result of a subscription request or not.
326|Identifies the trading status applicable to the transaction
327|Denotes the reason for the Opening Delay or Trading Halt
328|Indicates whether or not the halt was due to Common Stock trading being halted.
329|Indicates whether or not the halt was due to the Related Security being halted.
330|Quantity bought.
331|Quantity sold.
332|Represents an indication of the high end of the price range for a security prior to the open or reopen
333|Represents an indication of the low end of the price range for a security prior to the open or reopen
334|Identifies the type of adjustment
335|Unique ID of a Trading Session Status message.
336|Identifier for Trading Session Can be used to represent a specific market trading session (e.g. "PRE-OPEN", "CROSS_2", "AFTER-HOURS", "TOSTNET", "TOSTNET2", etc). To specify good for session where session spans more than one calendar day, use TimeInForce = Day in conjunction with TradingSessionID. Values should be bi-laterally agreed to between counterparties. Firms may register Trading Session values on the FIX website (presently a document maintained within "ECN and Exchanges" working group section).
337|Identifies the trader (e.g. "badge number") of the ContraBroker.
338|Method of trading
339|Trading Session Mode
340|State of the trading session
341|Starting time of the trading session
342|Time of the opening of the trading session
343|Time of the pre-closed of the trading session
344|Closing time of the trading session
345|End time of the trading session
346|Number of orders in the market.
347|Type of message encoding (non-ASCII (non-English) characters) used in a message’s "Encoded" fields.
348|Byte length of encoded (non-ASCII characters) EncodedIssuer (349) field.
349|Encoded (non-ASCII characters) representation of the Issuer field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the Issuer field.
350|Byte length of encoded (non-ASCII characters) EncodedSecurityDesc (35) field.
351|Encoded (non-ASCII characters) representation of the SecurityDesc (07) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the SecurityDesc field.
352|Byte length of encoded (non-ASCII characters) EncodedListExecInst (353) field.
353|Encoded (non-ASCII characters) representation of the ListExecInst (69) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the ListExecInst field.
354|Byte length of encoded (non-ASCII characters) EncodedText (355) field.
355|Encoded (non-ASCII characters) representation of the Text (58) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the Text field.
356|Byte length of encoded (non-ASCII characters) EncodedSubject (357) field.
357|Encoded (non-ASCII characters) representation of the Subject (47) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the Subject field.
358|Byte length of encoded (non-ASCII characters) EncodedHeadline (359) field.
359|Encoded (non-ASCII characters) representation of the Headline (48) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the Headline field.
360|Byte length of encoded (non-ASCII characters) EncodedAllocText (36) field.
361|Encoded (non-ASCII characters) representation of the AllocText (6) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the AllocText field.
362|Byte length of encoded (non-ASCII characters) EncodedUnderlyingIssuer (363) field.
363|Encoded (non-ASCII characters) representation of the UnderlyingIssuer (306) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the UnderlyingIssuer field.
364|Byte length of encoded (non-ASCII characters) EncodedUnderlyingSecurityDesc (365) field.
365|Encoded (non-ASCII characters) representation of the UnderlyingSecurityDesc (307) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the UnderlyingSecurityDesc field.
366|Executed price for an AllocAccount (79) entry used when using "executed price" vs. "average price" allocations (e.g. Japan).
367|Indicates expiration time of this particular QuoteSet (always expressed in UTC (Universal Time Coordinated, also known as "GMT")
368|Reason Quote Entry was rejected
369|The last MsgSeqNum (34) value received by the FIX engine and processed by downstream application, such as trading engine or order routing system. Can be specified on every message sent. Useful for detecting a backlog with a counterparty.
371|The tag number of the FIX field being referenced.
372|The MsgType (35) of the FIX message being referenced.
373|Code to identify reason for a session-level Reject message
374|Identifies the Bid Request message type
375|Identifies contra broker. Standard NASD market-maker mnemonic is preferred.
376|ID used to represent this transaction for compliance purposes (e.g. OATS reporting).
377|Indicates whether or not the order was solicited.
378|Code to identify reason for an ExecutionRpt message sent with ExecType=Restated or used when communicating an unsolicited cancel.
379|The value of the business-level "ID" field on the message being referenced.
380|Code to identify reason for a Business Message Reject message
381|Total amount traded (e.g. CumQty (4) * AvgPx (6)) expressed in units of currency.
382|The number of ContraBroker (375) entries.
383|Maximum number of bytes supported for a single message.
384|Number of MsgTypes (35) in repeating group.
385|Specifies the direction of the message
386|Number of TradingSessionIDs (336) in repeating group.
387|Total volume (quantity) traded.
388|Code to identify the price a DiscretionOffsetValue (389) is related to and should be mathematically added to
389|Amount (signed) added to the "related to" price specified via DiscretionInst (388), in the context of DiscretionOffsetType (842) (Prior to FIX 4.4 this field was of type PriceOffset)
390|Unique identifier for Bid Response as assigned by sell-side (broker, exchange, ECN). Uniqueness must be guaranteed within a single trading day.
391|Unique identifier for a Bid Request as assigned by institution. Uniqueness must be guaranteed within a single trading day.
392|Descriptive name for list order.
393|Total number of securities. (Prior to FIX 4.4 this field was named TotalNumSecurities)
394|Code to identify the type of Bid Request
395|Total number of tickets.
396|Amounts in currency
397|Amounts in currency
398|Number of BidDescriptor (400) entries.
399|Code to identify the type of BidDescriptor (400)
400|BidDescriptor value. Usage depends upon BidDescriptorTyp (399). If BidDescriptorType = 1 Industrials etc. - Free text If BidDescriptorType =2 "FR" etc. - ISO Country Codes If BidDescriptorType =3 FT00, FT250, STOX - Free text
401|Code to identify which "SideValue" the value refers to. SideValue and SideValue2 are used as opposed to Buy or Sell so that the basket can be quoted either way as Buy or Sell.
402|Liquidity indicator or lower limit if TotalNumSecurities (393) > . Represented as a percentage.
403|Upper liquidity indicator if TotalNumSecurities (393) > . Represented as a percentage.
404|Value between LiquidityPctLow (402) and LiquidityPctHigh (403) in Currency
405|Eg Used in EFP trades 2% (EFP – Exchange for Physical ). Represented as a percentage.
406|Used in EFP trades
407|Used in EFP trades. Represented as a percentage.
408|Used in EFP trades
409|Code to identify the type of liquidity indicator
410|Overall weighted average liquidity expressed as a % of average daily volume. Represented as a percentage.
411|Indicates whether or not to exchange for physical.
412|Value of stocks in Currency
413|Percentage of program that crosses in Currency. Represented as a percentage.
414|Code to identify the desired frequency of progress reports
415|Time in minutes between each ListStatus report sent by SellSide. Zero means don’t send status.
416|Code to represent whether value is net (inclusive of tax) or gross
417|Indicates the total number of bidders on the list
418|Code to represent the type of trade
419|Code to represent the basis price type
420|Indicates the number of list entries.
421|ISO Country Code in field
422|Total number of strike price entries across all messages. Should be the sum of all NoStrikes (428) in each message that has repeating strike price entries related to the same ListID (66). Used to support fragmentation.
423|Code to represent the price type
424|For GT orders, the OrderQty (38) less all quantity (adjusted for stock splits) that traded on previous days. DayOrderQty (424) = OrderQty – (CumQty (4) – DayCumQty (425))
425|Quantity on a GT order that has traded today.
426|The average price for quantity on a GT order that has traded today.
427|Code to identify whether to book out executions on a part-filled GT order on the day of execution or to accumulate
428|Number of list strike price entries.
429|Code to represent the status type
430|Code to represent whether value is net (inclusive of tax) or gross
431|Code to represent the status of a list order
432|Date of order expiration (last day the order can trade), always expressed in terms of the local market date. The time at which the order expires is determined by the local market’s business practices
433|Identifies the type of ListExecInst (69)
434|Identifies the type of request that a Cancel Reject is in response to
435|Underlying security’s CouponRate. See CouponRate (223) field for description
436|Underlying security’s ContractMultiplier. See ContractMultiplier (23) field for description
437|Quantity traded with the ContraBroker (375).
438|Identifies the time of the trade with the ContraBroker (375). (always expressed in UTC (Universal Time Coordinated, also known as "GMT")
441|Number of Securities between LiquidityPctLow (402) and LiquidityPctHigh (403) in Currency.
442|Used to indicate what an Execution Report represents (e.g. used with multi-leg securities, such as option strategies, spreads, etc.).
443|The time at which current market prices are used to determine the value of a basket.
444|Free format text string related to List Status.
445|Byte length of encoded (non-ASCII characters) EncodedListStatusText (446) field.
446|Encoded (non-ASCII characters) representation of the ListStatusText (444) field in the encoded format specified via the MessageEncoding (347) field. If used, the ASCII (English) representation should also be specified in the ListStatusText field.
447|Identifies class or source of the PartyID (448) value. Required if PartyID is specified. Note: applicable values depend upon PartyRole (452) specified. See "Appendix 6-G – Use of <Parties> Component Block"
448|Party identifier/code. See PartyIDSource (447) and PartyRole (452). See "Appendix 6-G – Use of <Parties> Component Block"
451|Net change from previous day’s closing price vs. last traded price.
452|Identifies the type or role of the PartyID (448) specified. See "Appendix 6-G – Use of <Parties> Component Block"
453|Number of PartyID (448), PartyIDSource (447), and PartyRole (452) entries
454|Number of SecurityAltID (455) entries.
455|Alternate Security identifier value for this security of SecurityAltIDSource (456) type (e.g. CUSIP, SEDOL, ISIN, etc). Requires SecurityAltIDSource.
456|Identifies class or source of the SecurityAltID (455) value. Required if SecurityAltID is specified. Valid values: Same valid values as the SecurityIDSource (22) field
457|Number of UnderlyingSecurityAltID (458) entries.
458|Alternate Security identifier value for this underlying security of UnderlyingSecurityAltIDSource (459) type (e.g. CUSIP, SEDOL, ISIN, etc). Requires UnderlyingSecurityAltIDSource.
459|Identifies class or source of the UnderlyingSecurityAltID (458) value. Required if UnderlyingSecurityAltID is specified. Valid values: Same valid values as the SecurityIDSource (22) field
460|Indicates the type of product the security is associated with. See also the CFICode(146) and SecurityType(167) fields.
461|Indicates the type of security using ISO 10962 standard, Classification of Financial Instruments (CFI code) values. ISO 10962 is maintained by ANNA (Association of National Numbering Agencies) acting as Registration Authority. See "Appendix 6-B FIX Fields Based Upon Other Standards". See also the Product(460) and SecurityType(167) fields. It is recommended that CFICode(461) be used instead of SecurityType(167) for non-Fixed Income instruments. A subset of possible values applicable to FIX usage are identified in "Appendix 6-D CFICode Usage - ISO 10962 Classification of Financial Instruments (CFI code)"
462|Underlying security’s Product. Valid values: see Product(460) field
463|Underlying security’s CFICode. Valid values: see CFICode(461) field
464|Indicates whether or not this FIX Session is a "test" vs. "production" connection. Useful for preventing "accidents".
466|Common reference passed to a post-trade booking process (e.g. industry matching utility).
467|Unique identifier for a specific NoAllocs (78) repeating group instance (e.g. for an AllocAccount).
468|Specifies which direction to round For CIV – indicates whether or not the quantity of shares/units is to be rounded and in which direction where CashOrdQty (52) or (for CIV only) OrderPercent (56) are specified on an order. The default is for rounding to be at the discretion of the executing broker or fund manager. e.g. for an order specifying CashOrdQty or OrderPercent if the calculated number of shares/units was 325.76 and RoundingModulus (469) was 0 – "round down" would give 320 units, "round up" would give 330 units and "round to nearest" would give 320 units.
469|For CIV - a float value indicating the value to which rounding is required. i.e. 0 means round to a multiple of 0 units/shares; 0.5 means round to a multiple of 0.5 units/shares. The default, if RoundingDirection (468) is specified without RoundingModulus, is to round to a whole unit/share.
470|ISO Country code of instrument issue (e.g. the country portion typically used in ISIN). Can be used in conjunction with non-ISIN SecurityID (48) (e.g. CUSIP for Municipal Bonds without ISIN) to provide uniqueness.
471|A two-character state or province abbreviation.
472|Identifies the locale. For Municipal Security Issuers other than state or province. Refer to http://www.atmos.albany.edu/cgi/stagrep-cgi Reference the IATA city codes for values. Note IATA (International Air Transport Association) maintains the codes at www.iata.org.
473|The number of registration details on a Registration Instructions message
474|Set of Correspondence address details, possibly including phone, fax, etc.
475|The ISO 366 Country code (2 character) identifying which country the beneficial investor is resident for tax purposes.
476|"Settlement Payment Reference" – A free format Payment reference to assist with reconciliation, e.g. a Client and/or Order ID number.
477|A code identifying the payment method for a (fractional) distribution. 13 through 998 are reserved for future use Values above 000 are available for use by private agreement among counterparties
478|Specifies currency to be used for Cash Distributions– see "Appendix 6-A; Valid Currency Codes".
479|Specifies currency to be used for Commission (2) if the Commission currency is different from the Deal Currency - see "Appendix 6-A; Valid Currency Codes".
480|For CIV – A one character code identifying whether Cancellation rights/Cooling-off period applies
481|A one character code identifying Money laundering status
482|Free format text to specify mailing instruction requirements, e.g. "no third party mailings".
483|For CIV A date and time stamp to indicate the time a CIV order was booked by the fund manager.
484|For CIV - Identifies how the execution price LastPx (3) was calculated from the fund unit/share price(s) calculated at the fund valuation point
485|For CIV the amount or percentage by which the fund unit/share price was adjusted, as indicated by ExecPriceType (484)
486|The date of birth applicable to the individual, e.g. required to open some types of tax-exempt account.
487|Identifies Trade Report message transaction type (Prior to FIX 4.4 this field was of type char)
488|The name of the payment cardholder as specified on the card being used for payment.
489|The number of the payment card as specified on the card being used for payment.
490|The expiry date of the payment card as specified on the card being used for payment.
491|The issue number of the payment card as specified on the card being used for payment. This is only applicable to certain types of card.
492|A code identifying the Settlement payment method. 16 through 998 are reserved for future use Values above 000 are available for use by private agreement among counterparties
493|For CIV – a fund manager-defined code identifying which of the fund manager’s account types is required.
494|Free format text defining the designation to be associated with a holding on the register. Used to identify assets of a specific underlying investor using a common registration, e.g. a broker’s nominee or street name.
495|For CIV - a code identifying the type of tax-exempt account in which purchased shares/units are to be held
496|Text indicating reason(s) why a Registration Instruction has been rejected.
497|A one character code identifying whether the Fund based renewal commission is to be waived.
498|Name of local agent bank if for cash distributions
499|BIC (Bank Identification Code--Swift managed) code of agent bank for cash distributions
500|Account number at agent bank for distributions.
501|Free format Payment reference to assist with reconciliation of distributions.
502|Name of account at agent bank for distributions.
503|The start date of the card as specified on the card being used for payment.
504|The date written on a cheque or date payment should be submitted to the relevant clearing system.
505|Identifies sender of a payment, e.g. the payment remitter or a customer reference number.
506|Registration status as returned by the broker or (for CIV) the fund manager
507|Reason(s) why Registration Instructions has been rejected. The reason may be further amplified in the RegistRejReasonCode field. Possible values of reason code include:
508|Reference identifier for the RegistID(513) with Cancel and Replace RegistTransType(514) transaction types.
509|Set of Registration name and address details, possibly including phone, fax etc.
510|The number of Distribution Instructions on a Registration Instructions message
511|Email address relating to Registration name and address details
512|The amount of each distribution to go to this beneficiary, expressed as a percentage
513|Unique identifier of the registration details as assigned by institution or intermediary.
514|Identifies Registration Instructions transaction type
515|For CIV - a date and time stamp to indicate the fund valuation point with respect to which an order was priced by the fund manager.
516|For CIV specifies the approximate order quantity desired. For a CIV Sale it specifies percentage of investor’s total holding to be sold. For a CIV switch/exchange it specifies percentage of investor’s cash realised from sales to be re-invested. The executing broker, intermediary or fund manager is responsible for converting and calculating OrderQty (38) in shares/units for subsequent messages.
517|The relationship between Registration parties.
518|The number of Contract Amount details on an Execution Report message
519|Type of ContAmtValue (520). NOTE That Commission Amount / % in Contract Amounts is the commission actually charged, rather than the commission instructions given in Fields 2/3.
520|Value of Contract Amount, e.g. a financial amount or percentage as indicated by ContAmtType (59).
521|Specifies currency for the Contract amount if different from the Deal Currency - see "Appendix 6-A; Valid Currency Codes".
522|Identifies the type of owner
523|Sub-identifier (e.g. Clearing Account for PartyRole (452)=Clearing Firm, Locate ID # for PartyRole=Locate/Lending Firm, etc). Not required when using PartyID (448), PartyIDSource (447), and PartyRole.
524|PartyID value within a nested repeating group. Same values as PartyID (448)
525|PartyIDSource value within a nested repeating group. Same values as PartyIDSource (447)
526|Assigned by the party which originates the order. Can be used to provide the ClOrdID (11) used by an exchange or executing system.
527|Assigned by the party which accepts the order. Can be used to provide the ExecID (7) used by an exchange or executing system.
528|Designates the capacity of the firm placing the order (as of FIX 4.3, this field replaced Rule80A (tag 47) --used in conjunction with OrderRestrictions (529) field)
529|Restrictions associated with an order. If more than one restriction is applicable to an order, this field can contain multiple instructions separated by space.
530|Specifies scope of Order Mass Cancel Request
531|Specifies the action taken by counterparty order handling system as a result of the Order Mass Cancel Request
532|Reason Order Mass Cancel Request was rejected
533|Total number of orders affected by mass cancel request.
534|Number of affected orders in the repeating group of order ids.
535|OrderID (37) of an order affected by a mass cancel request.
536|SecondaryOrderID (98) of an order affected by a mass cancel request.
537|Identifies the type of quote. An indicative quote is used to inform a counterparty of a market. An indicative quote does not result directly in a trade. A tradeable quote is submitted to a market and will result directly in a trade against other orders and quotes in a market. A restricted tradeable quote is submitted to a market and within a certain restriction (possibly based upon price or quantity) will automatically trade against orders. Order that do not comply with restrictions are sent to the quote issuer who can choose to accept or decline the order. A counter quote is used in the negotiation model. See Volume 7 – Product: Fixed Income for example usage.
538|PartyRole value within a nested repeating group. Same values as PartyRole (452)
539|Number of NestedPartyID (524), NestedPartyIDSource (525), and NestedPartyRole (538) entries
540|Total Amount of Accrued Interest for convertible bonds and fixed income
541|Date of maturity.
542|Underlying security’s maturity date. See MaturityDate(541) field for description
543|The location at which records of ownership are maintained for this instrument, and at which ownership changes must be recorded.
544|Identifies whether an order is a margin order or a non-margin order. This is primarily used when sending orders to Japanese exchanges to indicate sell margin or buy to cover. The same tag could be assigned also by buy-side to indicate the intent to sell or buy margin and the sell-side to accept or reject (base on some validation criteria) the margin request.
545|PartySubID value within a nested repeating group. Same values as PartySubID (523)
546|Defines the scope of a data element
547|Defines how a server handles distribution of a truncated book. Defaults to broker option.
548|Identifier for a cross order. Must be unique during a given trading day. Recommend that firms use the order date as part of the CrossID for Good Till Cancel (GT) orders.
549|Type of cross being submitted to a market
550|Indicates if one side or the other of a cross order should be prioritized. The definition of prioritization is left to the market. In some markets prioritization means which side of the cross order is applied to the market first. In other markets – prioritization may mean that the prioritized side is fully executed (sometimes referred to as the side being protected).
551|CrossID of the previous cross order (NOT the initial cross order of the day) as assigned by the institution, used to identify the previous cross order in Cross Cancel and Cross Cancel/Replace Requests.
552|Number of Side repeating group instances.
553|Userid or username.
554|Password or passphrase.
555|Number of InstrumentLeg repeating group instances.
556|Currency associated with a particular Leg's quantity
557|Indicates total number of security types in the event that multiple Security Type messages are used to return results (Prior to FIX 4.4 this field was named TotalNumSecurityTypes)
558|Number of Security Type repeating group instances.
559|Identifies the type/criteria of Security List Request
560|The results returned to a Security Request message
561|The trading lot size of a security
562|The minimum trading volume for a security
563|Indicates the method of execution reporting requested by issuer of the order
564|PositionEffect for leg of a multileg See PositionEffect (77) field for description
565|CoveredOrUncovered for leg of a multileg See CoveredOrUncovered (203) field for description
566|Price for leg of a multileg See Price (44) field for description
567|Indicates the reason a Trading Session Status Request was rejected
568|Trade Capture Report Request ID
569|Type of Trade Capture Report
570|Indicates if the trade capture report was previously reported to the counterparty
571|Unique identifier of trade capture report
572|Reference identifier used with CANCEL and REPLACE transaction types.
573|The status of this trade with respect to matching or comparison
574|The point in the matching process at which this trade was matched
575|This trade is to be treated as an odd lot
576|Number of clearing instructions
577|Eligibility of this trade for clearing and central counterparty processing
578|Type of input device or system from which the trade was entered.
579|Specific device number, terminal number or station where trade was entered
580|Number of Date fields provided in date range
581|Type of account associated with an order
582|Capacity of customer placing the order Primarily used by futures exchanges to indicate the CTICode (customer type indicator) as required by the US CFTC (Commodity Futures Trading Commission).
583|Permits order originators to tie together groups of orders in which trades resulting from orders are associated for a specific purpose, for example the calculation of average execution price for a customer or to associate lists submitted to a broker as waves of a larger program trade.
584|Value assigned by issuer of Mass Status Request to uniquely identify the request
585|Mass Status Request Type
586|The most recent (or current) modification TransactTime (tag 60) reported on an Execution Report for the order. The OrigOrdModTime is provided as an optional field on Order Cancel Request and Order Cancel Replace Requests to identify that the state of the order has not changed since the request was issued. This is provided to support markets similar to Eurex and A/C/E.
587|Refer to values for SettlType[63]
588|Refer to description for SettlDate[64]
589|Indicates whether or not automatic booking can occur.
590|Indicates what constitutes a bookable unit.
591|Indicates the method of preallocation.
592|Underlying security’s CountryOfIssue. See CountryOfIssue (470) field for description
593|Underlying security’s StateOrProvinceOfIssue. See StateOrProvinceOfIssue (471) field for description
594|Underlying security’s LocaleOfIssue. See LocaleOfIssue (472) field for description
595|Underlying security’s InstrRegistry. See InstrRegistry (543) field for description
596|Multileg instrument's individual leg security’s CountryOfIssue. See CountryOfIssue (470) field for description
597|Multileg instrument's individual leg security’s StateOrProvinceOfIssue. See StateOrProvinceOfIssue (471) field for description
598|Multileg instrument's individual leg security’s LocaleOfIssue. See LocaleOfIssue (472) field for description
599|Multileg instrument's individual leg security’s InstrRegistry. See InstrRegistry (543) field for description
600|Multileg instrument's individual security’s Symbol. See Symbol (55) field for description
601|Multileg instrument's individual security’s SymbolSfx. See SymbolSfx (65) field for description
602|Multileg instrument's individual security’s SecurityID. See SecurityID (48) field for description
603|Multileg instrument's individual security’s SecurityIDSource. See SecurityIDSource (22) field for description
604|Multileg instrument's individual security’s NoSecurityAltID. See NoSecurityAltID (454) field for description
605|Multileg instrument's individual security’s SecurityAltID. See SecurityAltID (455) field for description
606|Multileg instrument's individual security’s SecurityAltIDSource. See SecurityAltIDSource (456) field for description
607|Multileg instrument's individual security’s Product. See Product (460) field for description
608|Multileg instrument's individual security’s CFICode. See CFICode(461) field for description
609|Multileg instrument's individual security’s SecurityType. See SecurityType(167) field for description
610|Multileg instrument's individual security’s MaturityMonthYear. See MaturityMonthYear (200) field for description
611|Multileg instrument's individual security’s MaturityDate. See MaturityDate(541) field for description
612|Multileg instrument's individual security’s StrikePrice. See StrikePrice (202) field for description
613|Multileg instrument's individual security’s OptAttribute. See OptAttribute (206) field for description
614|Multileg instrument's individual security’s ContractMultiplier. See ContractMultiplier (23) field for description
615|Multileg instrument's individual security’s CouponRate. See CouponRate (223) field for description
616|Multileg instrument's individual security’s SecurityExchange. See SecurityExchange (207) field for description
617|Multileg instrument's individual security’s Issuer. See Issuer (106) field for description
618|Multileg instrument's individual security’s EncodedIssuerLen. See EncodedIssuerLen (348) field for description
619|Multileg instrument's individual security’s EncodedIssuer. See EncodedIssuer (349) field for description
620|Multileg instrument's individual security’s SecurityDesc. See SecurityDesc (07) field for description
621|Multileg instrument's individual security’s EncodedSecurityDescLen. See EncodedSecurityDescLen (350) field for description
622|Multileg instrument's individual security’s EncodedSecurityDesc. See EncodedSecurityDesc (35) field for description
623|The ratio of quantity for this individual leg relative to the entire multileg security.
624|The side of this individual leg (multileg security). See Side (54) field for description and values
625|Optional market assigned sub identifier for a trading session. Usage is determined by market or counterparties. Used by US based futures markets to identify exchange specific execution time bracket codes as required by US market regulations.
626|Describes the specific type or purpose of an Allocation message (i.e. "Buyside Calculated")
627|Number of HopCompID entries in repeating group.
628|Assigned value used to identify the third party firm which delivered a specific message either from the firm which originated the message or from another third party (if multiple "hops" are performed). It is recommended that this value be the SenderCompID (49) of the third party. Applicable when messages are communicated/re-distributed via third parties which function as service bureaus or "hubs". Only applicable if OnBehalfOfCompID(115) is being used.
629|Time that HopCompID (628) sent the message. It is recommended that this value be the SendingTime (52) of the message sent by the third party. Applicable when messages are communicated/re-distributed via third parties which function as service bureaus or "hubs". Only applicable if OnBehalfOfCompID(115) is being used.
630|Reference identifier assigned by HopCompID (628) associated with the message sent. It is recommended that this value be the MsgSeqNum (34) of the message sent by the third party. Applicable when messages are communicated/re-distributed via third parties which function as service bureaus or "hubs". Only applicable if OnBehalfOfCompID(115) is being used.
631|Mid price/rate
632|Bid yield
633|Mid yield
634|Offer yield
635|Indicates type of fee being assessed of the customer for trade executions at an exchange. Applicable for futures markets only at this time. (Values source CBOT, CME, NYBOT, and NYMEX):
636|Indicates if the order is currently being worked. Applicable only for OrdStatus = "New". For open outcry markets this indicates that the order is being worked in the crowd. For electronic markets it indicates that the order has transitioned from a contingent order to a market order.
637|Execution price assigned to a leg of a multileg instrument. See LastPx (31) field for description and values
638|Indicates if a Cancel/Replace has caused an order to lose book priority
639|Amount of price improvement.
640|Price of the future part of an F/X swap order. See Price (44) for description.
641|F/X forward points of the future part of an F/X swap order added to LastSpotRate(194). May be a negative value.
642|Bid F/X forward points of the future portion of an F/X swap quote added to spot rate. May be a negative value.
643|Offer F/X forward points of the future portion of an F/X swap quote added to spot rate. May be a negative value.
644|RFQ Request ID – used to identify an RFQ Request.
645|Used to indicate the best bid in a market
646|Used to indicate the best offer in a market
647|Used to indicate a minimum quantity for a bid. If this field is used the BidSize (134) field is interpreted as the maximum bid size
648|Used to indicate a minimum quantity for an offer. If this field is used the OfferSize (135) field is interpreted as the maximum offer size.
649|Unique identifier for Quote Status Request.
650|Indicates that this message is to serve as the final and legal confirmation.
651|The calculated or traded price for the underlying instrument that corresponds to a derivative. Used for transactions that include the cash instrument and the derivative.
652|The calculated or traded quantity for the underlying instrument that corresponds to a derivative. Used for transactions that include the cash instrument and the derivative.
654|Unique indicator for a specific leg.
655|Unique indicator for a specific leg for the ContraBroker (375).
656|Foreign exchange rate used to compute the bid "SettlCurrAmt" (119) from Currency (15) to SettlCurrency (120)
657|Foreign exchange rate used to compute the offer "SettlCurrAmt" (119) from Currency (15) to SettlCurrency (120)
658|Reason Quote was rejected:
659|ID within repeating group of sides which is used to represent this transaction for compliance purposes (e.g. OATS reporting).
660|Used to identify the source of the Account (1) code. This is especially useful if the account is a new account that the Respondent may not have set up yet in their system.
661|Used to identify the source of the AllocAccount (79) code. See AcctIDSource (660) for valid values.
662|Specifies the price of the benchmark.
663|Identifies type of BenchmarkPrice (662). See PriceType (423) for valid values.
664|Message reference for Confirmation
665|Identifies the status of the Confirmation.
666|Identifies the Confirmation transaction type
667|Specifies when the contract (i.e. MBS/TBA) will settle.
668|Identifies the form of delivery
669|Last price expressed in percent-of-par. Conditionally required for Fixed Income trades when LastPx (3) is expressed in Yield, Spread, Discount or any other type. Usage: Execution Report and Allocation Report repeating executions block (from sellside).
670|Number of Allocations for the leg
671|Allocation Account for the leg See AllocAccount (79) for description and valid values.
672|Reference for the individual allocation ticket See IndividualAllocID (467) for description and valid values.
673|Leg allocation quantity. See AllocQty (80) for description and valid values.
674|The source of the LegAllocAccount(671) See AllocAcctIDSource(660) for description and valid values.
675|Identifies settlement currency for the Leg. See SettlCurrency(120) for description and valid values
676|LegBenchmarkPrice (679) currency See BenchmarkCurveCurrency (220) for description and valid values.
677|Name of the Leg Benchmark Curve. See BenchmarkCurveName(221) for description and valid values.
678|Identifies the point on the Leg Benchmark Curve. See BenchmarkCurvePoint (222) for description and valid values.
679|Used to identify the price of the benchmark security. See BenchmarkPrice (662) for description and valid values.
680|The price type of the LegBenchmarkPrice. See BenchmarkPriceType (663) for description and valid values.
681|Bid price of this leg. See BidPx (32) for description and valid values.
682|Leg-specific IOI quantity. See IOIQty (27) for description and valid values
683|Number of leg stipulation entries
684|Offer price of this leg. See OfferPx (33) for description and valid values
686|The price type of the LegBidPx (68) and/or LegOfferPx (684). See PriceType (423) for description and valid values
687|Quantity of this leg, e.g. in Quote dialog. See Quantity (53) for description and valid values
688|For Fixed Income, type of Stipulation for this leg. See StipulationType (233) for description and valid values
689|For Fixed Income, value of stipulation. See StipulationValue (234) for description and valid values
690|For Fixed Income, used instead of LegQty (687) or LegOrderQty (685) to requests the respondent to calculate the quantity based on the quantity on the opposite side of the swap.
691|For Fixed Income, identifies MBS / ABS pool.
692|Code to represent price type requested in Quote
693|Message reference for Quote Response
694|Identifies the type of Quote Response
695|Code to qualify Quote use See IOIQualifier (04) for description and valid values.
696|Date to which the yield has been calculated (i.e. maturity, par call or current call, pre-refunded date).
697|Price to which the yield has been calculated.
698|The price type of the YieldRedemptionPrice (697) See PriceType (423) for description and valid values.
699|The identifier of the benchmark security, e.g. Treasury against Corporate bond. See SecurityID (tag 48) for description and valid values.
700|Indicates a trade that reverses a previous trade.
701|Include as needed to clarify yield irregularities associated with date, e.g. when it falls on a non-business day.
702|Number of position entries.
703|Used to identify the type of quantity that is being returned
704|Long Quantity
705|Short Quantity
706|Status of this position
707|Type of Position amount
708|Position amount
709|Identifies the type of position transaction
710|Unique identifier for the position maintenance request as assigned by the submitter
711|Number of underlying legs that make up the security.
712|Maintenance Action to be performed
713|Reference to the PosReqID (710) of a previous maintenance request that is being replaced or canceled.
714|Reference to a PosMaintRptID (721) from a previous Position Maintenance Report that is being replaced or canceled.
715|The "Clearing Business Date" referred to by this maintenance request.
716|Identifies a specific settlement session
717|SubID value associated with SettlSessID (76)
718|Type of adjustment to be applied, used for PCS & PAJ
719|Required to be set to true (Y) when a position maintenance request is being performed contrary to current money position. Required when an exercise of an out of the money position is requested or an abandonement (do not exercise ) for an in the money position.
720|Indicates if requesting a rollover of prior day’s spread submissions.
721|Unique identifier for this position report
722|Status of Position Maintenance Request
723|Result of Position Maintenance Request.
724|Unique identifier for the position maintenance request as assigned by the submitter
725|Identifies how the response to the request should be transmitted.
726|URI (Uniform Resource Identifier) for details) or other pre-arranged value. Used in conjunction with ResponseTransportType (725) value of Out-of-Band to identify the out-of-band destination. See "Appendix 6-B FIX Fields Based Upon Other Standards"
727|Total number of Position Reports being returned.
728|Result of Request for Position 4000+ Reserved and available for bi-laterally agreed upon user-defined values
729|Status of Request for Positions
730|Settlement price
731|Type of settlement price
732|Underlying security’s SettlPrice. See SettlPrice (730) field for description
733|Underlying security’s SettlPriceType. See SettlPriceType (73) field for description
734|Previous settlement price
735|Number of repeating groups of QuoteQualifiers (695).
736|Currency code of settlement denomination for a specific AllocAccount (79).
737|Total amount due expressed in settlement currency (includes the effect of the forex transaction) for a specific AllocAccount (79).
738|Amount of interest (i.e. lump-sum) at maturity.
739|The effective date of a new securities issue determined by its underwriters. Often but not always the same as the Issue Date and the Interest Accrual Date
740|For Fixed Income, identifies MBS / ABS pool for a specific leg of a multi-leg instrument. See Pool (69) for description and valid values.
741|Amount of interest (i.e. lump-sum) at maturity at the account-level.
742|Amount of Accrued Interest for convertible bonds and fixed income at the allocation-level.
743|Date of delivery.
744|Method under which assignment was conducted
745|Quantity Increment used in performing assignment.
746|Open interest that was eligible for assignment.
747|Exercise Method used to in performing assignment
748|Total number of trade reports returned.
749|Result of Trade Request 4000+ Reserved and available for bi-laterally agreed upon user-defined values
750|Status of Trade Request.
751|Reason Trade Capture Request was rejected. 4000+ Reserved and available for bi-laterally agreed upon user-defined values
752|Used to indicate if the side being reported on Trade Capture Report represents a leg of a multileg instrument or a single security
753|Number of position amount entries.
754|Identifies whether or not an allocation has been automatically accepted on behalf of the Carry Firm by the Clearing House.
755|Unique identifier for Allocation Report message.
756|Number of Nested2PartyID (757), Nested2PartyIDSource (758), and Nested2PartyRole (759) entries
757|PartyID value within a "second instance" Nested repeating group. Same values as PartyID (448)
758|PartyIDSource value within a "second instance" Nested repeating group. Same values as PartyIDSource (447)
759|PartyRole value within a "second instance" Nested repeating group. Same values as PartyRole (452)
760|PartySubID value within a "second instance" Nested repeating group. Same values as PartySubID (523)
761|Identifies class or source of the BenchmarkSecurityID (699) value. Required if BenchmarkSecurityID is specified. Same values as the SecurityIDSource (22) field
762|Sub-type qualification/identification of the SecurityType (e.g. for SecurityType="REPO"). Example Values: General = General Collateral (for SecurityType=REPO) For SecurityType="MLEG" markets can provide the name of the option or futures strategy, such as Calendar, Vertical, Butterfly, etc. NOTE: Additional values may be used by mutual agreement of the counterparties
763|Underlying security’s SecuritySubType. See SecuritySubType (762) field for description
764|SecuritySubType of the leg instrument. See SecuritySubType (762) field for description
765|The maximum percentage that execution of one side of a program trade can exceed execution of the other.
766|The maximum amount that execution of one side of a program trade can exceed execution of the other.
767|The currency that AllowableOneSidednessValue (766) is expressed in if AllowableOneSidednessValue is used.
768|Number of TrdRegTimestamp (769) entries
769|Traded / Regulatory timestamp value. Use to store time information required by government regulators or self-regulatory organizations (such as an exchange or clearing house).
770|Traded / Regulatory timestamp type Note of Applicability: values are required in US futures markets by the CFTC to support computerized trade reconstruction.
771|Text which identifies the "origin" (i.e. system which was used to generate the time stamp) for the Traded / Regulatory timestamp value.
772|Reference identifier to be used with ConfirmTransType (666) = Replace or Cancel
773|Identifies the type of Confirmation message being sent
774|Identifies the reason for rejecting a Confirmation
775|Method for booking out this order. Used when notifying a broker that an order to be settled by that broker is to be booked out as an OTC derivative (e.g. CFD or similar).
776|Identified reason for rejecting an individual AllocAccount (79) detail. Same values as AllocRejCode (88)
777|Unique identifier for Settlement Instruction message.
778|Number of settlement instructions within repeating group.
779|Timestamp of last update to data item (or creation if no updates made since creation).
780|Used to indicate whether settlement instructions are provided on an allocation instruction message, and if not, how they are to be derived
781|Number of SettlPartyID (782), SettlPartyIDSource (783), and SettlPartyRole (784) entries
782|PartyID value within a settlement parties component. Nested repeating group. Same values as PartyID (448)
783|PartyIDSource value within a settlement parties component. Same values as PartyIDSource (447)
784|PartyRole value within a settlement parties component. Same values as PartyRole (452)
785|PartySubID value within a settlement parties component. Same values as PartySubID (523)
786|Type of SettlPartySubID (785) value. Same values as PartySubIDType (803)
787|Used to indicate whether a delivery instruction is used for securities or cash settlement
788|Type of financing termination
789|Next expected MsgSeqNum value to be received.
790|Can be used to uniquely identify a specific Order Status Request message.
791|Unique ID of settlement instruction request message
792|Identifies reason for rejection (of a settlement instruction request message)
793|Secondary allocation identifier. Unlike the AllocID (70), this can be shared across a number of allocation instruction or allocation report messages, thereby making it possible to pass an identifier for an original allocation message on multiple messages (e.g. from one party to a second to a third, across cancel and replace messages etc.).
794|Describes the specific type or purpose of an Allocation Report message
795|Reference identifier to be used with AllocTransType (7) = Replace or Cancel
796|Reason for cancelling or replacing an Allocation Instruction or Allocation Report message
797|Indicates whether or not this message is a drop copy of another message.
798|Type of account associated with a confirmation or other trade-level message
799|Average price for a specific order
800|Quantity of the order that is being booked out as part of an Allocation Instruction or Allocation Report message
801|Number of SettlPartySubID (785) and SettlPartySubIDType (786) entries
802|Number of PartySubID (523)and PartySubIDType (803) entries
803|Type of PartySubID (523) value 4000+ = Reserved and available for bi-laterally agreed upon user defined values
804|Number of NestedPartySubID (545) and NestedPartySubIDType (805) entries
805|Type of NestedPartySubID (545) value. Same values as PartySubIDType (803)
806|Number of Nested2PartySubID (760) and Nested2PartySubIDType (807) entries. Second instance of <NestedParties>.
807|Type of Nested2PartySubID (760) value. Second instance of <NestedParties>. Same values as PartySubIDType (803)
808|Response to allocation to be communicated to a counterparty through an intermediary, i.e. clearing house. Used in conjunction with AllocType = "Request to Intermediary" and AllocReportType = "Request to Intermediary"
810|Underlying price associate with a derivative instrument.
811|Delta calculated from theoretical price
812|Used to specify the maximum number of application messages that can be queued bedore a corrective action needs to take place to resolve the queuing issue.
813|Current number of application messages that were queued at the time that the message was created by the counterparty.
814|Resolution taken when ApplQueueDepth (813) exceeds ApplQueueMax (812) or system specified maximum queue size.
815|Action to take to resolve an application message queue (backlog).
816|Number of alternative market data sources
817|Session layer source for market data (For the standard FIX session layer, this would be the TargetCompID (56) where market data can be obtained).
818|Secondary trade report identifier - can be used to associate an additional identifier with a trade.
819|Average Pricing Indicator
820|Used to link a group of trades together. Useful for linking a group of trades together for average price calculations.
821|Specific device number, terminal number or station where order was entered
822|Trading Session in which the underlying instrument trades
823|Trading Session sub identifier in which the underlying instrument trades
824|Reference to the leg of a multileg instrument to which this trade refers
825|Used to report any exchange rules that apply to this trade. Primarily intended for US futures markets. Certain trading practices are permitted by the CFTC, such as large lot trading, block trading, all or none trades. If the rules are used, the exchanges are required to indicate these rules on the trade.
826|Identifies how the trade is to be allocated
827|Part of trading cycle when an instrument expires. Field is applicable for derivatives.
828|Type of Trade
829|Further qualification to the trade type
830|Reason trade is being transferred
832|Total Number of Assignment Reports being returned to a firm
833|Unique identifier for the Assignment Report
834|Amount that a position has to be in the money before it is exercised.
835|Describes whether peg is static or floats
836|Type of Peg Offset value
837|Type of Peg Limit
838|If the calculated peg price is not a valid tick price, specifies whether to round the price to be more or less aggressive
839|The price the order is currently pegged at
840|The scope of the peg
841|Describes whether discretionary price is static or floats
842|Type of Discretion Offset value
843|Type of Discretion Limit
844|If the calculated discretionary price is not a valid tick price, specifies whether to round the price to be more or less aggressive
845|The current discretionary price of the order
846|The scope of the discretion
847|The target strategy of the order 1000+ = Reserved and available for bi-laterally agreed upon user defined values
848|Field to allow further specification of the TargetStrategy – usage to be agreed between counterparties
849|For a TargetStrategy=Participate order specifies the target participation rate. For other order types this is a volume limit (i.e. do not be more than this percent of the market volume)
850|For communication of the performance of the order versus the target strategy
851|Indicator to identify whether this fill was a result of a liquidity provider providing or liquidity taker taking the liquidity. Applicable only for OrdStatus of Partial or Filled.
852|Indicates if a trade should be reported via a market reporting service.
853|Reason for short sale
854|Type of quantity specified in a quantity field
855|Additional TrdType (see tag 828) assigned to a trade by trade match system.
856|Type of Trade Report
857|Indicates how the orders being booked and allocated by an Allocation Instruction or Allocation Report message are identified, i.e. by explicit definition in the NoOrders group or not.
858|Commission to be shared with a third party, e.g. as part of a directed brokerage commission sharing arrangement.
859|Unique identifier for a Confirmation Request message
860|Used to express average price as percent of par (used where AvgPx field is expressed in some other way)
861|Reported price (used to differentiate from AvgPx on a confirmation of a marked-up or marked-down principal trade)
862|Number of repeating OrderCapacity entries.
863|Quantity executed under a specific OrderCapacity (e.g. quantity executed as agent, quantity executed as principal)
864|Number of repeating EventType entries.
865|Code to represent the type of event
866|Date of event
867|Predetermined price of issue at event, if applicable
868|Comments related to the event.
869|Percent at risk due to lowest possible call.
870|Number of repeating InstrAttribType entries.
871|Code to represent the type of instrument attribute
872|Attribute value appropriate to the InstrAttribType (87) field.
873|The effective date of a new securities issue determined by its underwriters. Often but not always the same as the Issue Date and the Interest Accrual Date
874|The start date used for calculating accrued interest on debt instruments which are being sold between interest payment dates. Often but not always the same as the Issue Date and the Dated Date
875|The program under which a commercial paper is issued
876|The registration type of a commercial paper issuance
877|The program under which the underlying commercial paper is issued
878|The registration type of the underlying commercial paper issuance
879|Unit amount of the underlying security (par, shares, currency, etc.)
880|Identifier assigned to a trade by a matching system.
881|Used to refer to a previous SecondaryTradeReportRefID when amending the transaction (cancel, replace, release, or reversal).
882|Price (percent-of-par or per unit) of the underlying security or basket. "Dirty" means it includes accrued interest
883|Price (percent-of-par or per unit) of the underlying security or basket at the end of the agreement.
884|Currency value attributed to this collateral at the start of the agreement
885|Currency value currently attributed to this collateral
886|Currency value attributed to this collateral at the end of the agreement
887|Number of underlying stipulation entries
888|Type of stipulation. Same values as StipulationType (233)
889|Value of stipulation. Same values as StipulationValue (234)
890|Net Money at maturity if Zero Coupon and maturity value is different from par value
891|Defines the unit for a miscellaneous fee.
892|Total number of NoAlloc entries across all messages. Should be the sum of all NoAllocs in each message that has repeating NoAlloc entries related to the same AllocID or AllocReportID. Used to support fragmentation.
893|Indicates whether this message is the last in a sequence of messages for those messages that support fragmentation, such as Allocation Instruction, Mass Quote, Security List, Derivative Security List
894|Collateral Request Identifier
895|Reason for Collateral Assignment
896|Collateral inquiry qualifiers:
897|Number of trades in repeating group.
898|The fraction of the cash consideration that must be collateralized, expressed as a percent. A MarginRatio of 02% indicates that the value of the collateral (after deducting for "haircut") must exceed the cash consideration by 2%.
899|Excess margin amount (deficit if value is negative)
900|TotalNetValue is determined as follows: At the initial collateral assignment TotalNetValue is the sum of (UnderlyingStartValue * (1-haircut)). In a collateral substitution TotalNetValue is the sum of (UnderlyingCurrentValue * (1-haircut)). For listed derivatives clearing margin management, this is the collateral value which equals (Market value * haircut)
901|Starting consideration less repayments
902|Collateral Assignment Identifier
903|Collateral Assignment Transaction Type
904|Collateral Response Identifier
905|Collateral Assignment Response Type
906|Collateral Assignment Reject Reason
907|Collateral Assignment Identifier to which a transaction refers
908|Collateral Report Identifier
909|Collateral Inquiry Identifier
910|Collateral Status
911|Total number of reports returned in response to a request
912|Indicates whether this message is that last report message in response to a request, such as Order Mass Status Request.
913|The full name of the base standard agreement, annexes and amendments in place between the principals applicable to a financing transaction.
914|A common reference to the applicable standing agreement between the counterparties to a financing transaction.
915|A reference to the date the underlying agreement specified by AgreementID and AgreementDesc was executed.
916|Start date of a financing deal, i.e. the date the buyer pays the seller cash and takes control of the collateral
917|End date of a financing deal, i.e. the date the seller reimburses the buyer and takes back control of the collateral
918|Contractual currency forming the basis of a financing agreement and associated transactions. Usually, but not always, the same as the trade currency.
919|Identifies type of settlement
920|Accrued Interest Amount applicable to a financing transaction on the End Date.
921|Starting dirty cash consideration of a financing deal, i.e. paid to the seller on the Start Date.
922|Ending dirty cash consideration of a financing deal. i.e. reimbursed to the buyer on the End Date.
923|Unique identifier for a User Request.
924|Indicates the action required by a User Request Message
925|New Password or passphrase
926|Indicates the status of a user
927|A text description associated with a user status.
928|Indicates the status of a network connection
929|A text description associated with a network status.
930|Assigned value used to identify a firm.
931|Assigned value used to identify specific elements within a firm.
932|Unique identifier for a network response.
933|Unique identifier for a network request.
934|Identifier of the previous Network Response message sent to a counterparty, used to allow incremental updates.
935|Indicates the type and level of details required for a Network Status Request Message Boolean logic applies EG If you want to subscribe for changes to certain id’s then UserRequestType =0 (8+2), Snapshot for certain ID’s = 9 (8+)
936|Number of CompID entries in a repeating group.
937|Indicates the type of Network Response Message
938|Number of CollInquiryQualifier entries in a repeating group.
939|Trade Report Status
940|Identifies the status of the ConfirmationAck
941|Currency in which the strike price of an underlying instrument is denominated
942|Currency in which the strike price of an instrument leg of a multileg instrument is denominated
943|A code that represents a time interval in which a fill or trade occurred. Required for US futures markets.
944|Action proposed for an Underlying Instrument instance
945|Status of Collateral Inquiry
946|Result returned in response to Collateral Inquiry 4000+ Reserved and available for bi-laterally agreed upon user-defined values
947|Currency in which the StrikePrice is denominated.
948|Number of Nested3PartyID (949), Nested3PartyIDSource (950), and Nested3PartyRole (95) entries
949|PartyID value within a "third instance" Nested repeating group. Same values as PartyID (448)
950|PartyIDSource value within a "third instance" Nested repeating group. Same values as PartyIDSource (447)
951|PartyRole value within a "third instance" Nested repeating group. Same values as PartyRole (452)
952|Number of Nested3PartySubIDs (953) entries
953|PartySubID value within a "third instance" Nested repeating group. Same values as PartySubID (523)
954|PartySubIDType value within a "third instance" Nested repeating group. Same values as PartySubIDType (803)
955|Specifies when the contract (i.e. MBS/TBA) will settle.
956|The start date used for calculating accrued interest on debt instruments which are being sold between interest payment dates. Often but not always the same as the Issue Date and the Dated Date`,
  codes: `13|1|per unit (implying shares, par, currency, etc)
13|2|percentage
13|3|absolute (total monetary amount)
13|4|(for CIV buy orders) percentage waived – cash discount
13|5|(for CIV buy orders) percentage waived – enhanced units
13|6|points per bond or contract [Supply ContractMultiplier (231) in the <Instrument> component block if the object security is denominated in a size other than the industry default - 1000 par for bonds.]
18|6|Participate don't initiate
18|A|No cross (cross is forbidden)
18|D|Percent of volume "(indicates that the sender does not want to be all the volume on the floor vs. a specific percentage)"
18|E|Do not increase - DNI
18|F|Do not reduce - DNR
18|G|All or none - AON
18|H|Reinstate on System Failure (mutually exclusive with Q)
18|J|Reinstate on Trading Halt (mutually exclusive with K)
18|K|Cancel on Trading Halt (mutually exclusive with L)
18|L|Last peg (last sale)
18|M|Mid-price peg (midprice of inside quote)
18|Q|Cancel on System Failure (mutually exclusive with H)
18|R|Primary peg (primary market - buy at bid/sell at offer)
18|U|Customer Display Instruction (Rule11Ac1-1/4)
18|V|Netting (for Forex)
18|b|Strict Limit (No Price Improvement)
21|1|Automated execution order, private, no Broker intervention
21|2|Automated execution order, public, Broker intervention OK
21|3|Manual order, best execution
22|9|Consolidated Tape Association (CTA) Symbol (SIAC CTS/CQS line format)
22|G|"Common" (Clearstream and Euroclear)
22|H|Clearing House / Clearing Organization
22|I|ISDA/FpML Product Specification
22|J|Options Price Reporting Authority
35|6|Indication of Interest
35|D|Order – Single
35|E|Order – List
35|Q|Don’t Know Trade (DK)
35|l|Bid Response (lowercase L)
35|n|XML message (e.g. non-FIX MsgType)
35|t|Cross Order Cancel/Replace Request (a.k.a. Cross Order Modification Request)
35|AC|Multileg Order Cancel/Replace (a.k.a. Multileg Order Modification Request)
35|AS|Allocation Report (aka Allocation Claim)
35|AT|Allocation Report Ack (aka Allocation Claim Ack)
35|AU|Confirmation Ack (aka Affirmation)
39|6|Pending Cancel (e.g. result of Order Cancel Request)
39|E|Pending Replace (e.g. result of Order Cancel/Replace Request)
40|7|Limit or better (Deprecated)
40|I|Funari (Limit Day Order with unexecuted portion handled as Market On Close. E.g. Japan)
40|J|Market If Touched (MIT)
40|K|Market with Leftover as Limit (market order then unexecuted quantity becomes limit order at last price)
40|L|Previous Fund Valuation Point (Historic pricing) (for CIV)
40|M|Next Fund Valuation Point –(Forward pricing) (for CIV)
54|7|Undisclosed (valid for IOI and List Order messages only)
54|8|Cross (orders where counterparty is an exchange, valid for all messages except IOIs)
54|B|"As Defined" (for use with multileg instruments)
54|C|"Opposite" (for use with multileg instruments)
54|D|Subscribe (e.g. CIV)
54|E|Redeem (e.g. CIV)
54|F|Lend (FINANCING - identifies direction of collateral)
54|G|Borrow (FINANCING - identifies direction of collateral)
59|0|Day (or session)
59|1|Good Till Cancel (GTC)
59|2|At the Opening (OPG)
59|3|Immediate or Cancel (IOC)
59|4|Fill or Kill (FOK)
59|5|Good Till Crossing (GTX)
63|2|Next Day (T+1)
63|3|T+2
63|4|T+3
63|5|T+4
63|9|T+ 5
87|0|accepted (successfully processed)
87|3|received (received, not yet processed)
88|0|unknown account(s)
88|5|unknown OrderID (37)
88|6|unknown ListID (66)
88|7|other (further in Note 58=)
88|10|unknown or stale ExecID (17)
88|11|mismatched data value (further in Note 58=)
88|12|unknown ClOrdID (11)
98|0|None / other
98|1|PKCS (proprietary)
98|2|DES (ECB mode)
98|3|PKCS/DES (proprietary)
98|4|PGP/DES (defunct)
98|5|PGP/DES-MD5 (see app note on FIX website)
98|6|PEM/DES-MD5 (see app note on FIX website)
102|2|Broker / Exchange Option
102|3|Order already in Pending Cancel or Pending Replace status
102|5|OrigOrdModTime (586) did not match last TransactTime (60) of order
102|6|Duplicate ClOrdID (11) received
103|0|Broker / Exchange option
103|6|Duplicate Order (e.g. dupe ClOrdID (11))
103|15|Unknown account(s)
104|B|Market On Close (MOC) (held to close)
104|C|At the close (around/not held to close)
104|D|VWAP (Volume Weighted Avg Price)
104|Q|At the Market (previously called Current Quote)
104|W|Indication - Working away
113|Y|Indicates that party receiving message must report trade
113|N|Indicates that party sending message will report trade
114|Y|Indicates the broker is responsible for locating the stock
114|N|Indicates the broker is not required to locate
123|Y|Gap Fill message, MsgSeqNum field valid
123|N|Sequence Reset, ignore MsgSeqNum
139|1|Regulatory (e.g. SEC)
141|Y|Yes, reset sequence numbers
150|5|Replace
150|6|Pending Cancel (e.g. result of Order Cancel Request)
150|D|Restated (ExecutionRpt sent unsolicited by sellside, with ExecRestatementReason (378) set)
150|E|Pending Replace (e.g. result of Order Cancel/Replace Request)
150|F|Trade (partial fill or fill)
150|G|Trade Correct (formerly an ExecTransType (20))
150|H|Trade Cancel (formerly an ExecTransType)
150|I|Order Status (formerly an ExecTransType)
160|4|Specific Order for a single account (for CIV)
163|T|Restate (used where the Settlement Instruction is being used to communicate standing instructions which have not been changed or added to)
165|1|Broker’s Instructions
165|2|Institution’s Instructions
165|3|Investor (e.g. CIV use)
167|UST|US Treasury Note (deprecated value, use "TNOTE")
167|USTB|US Treasury Bill (deprecated value, use "TBILL")
167|RVLVTRM|Revolver/Term Loan
167|AMENDED|Amended & Restated
167|CMBS|Corp. Mortgage-backed Securities
167|AN|Other Anticipation Notes BAN, GAN, etc.
167|MF|Mutual Fund (i.e. any kind of open-ended "Collective Investment Vehicle")
167|MLEG|Multi-leg instrument (e.g. options strategy or futures spread. CFICode (461) can be used to identify if options-based, futures-based, etc.)
169|3|A Global Custodian (StandInstDbName (170) must be provided)
172|0|"Versus. Payment": Deliver (if Sell) or Receive (if Buy) vs. (Against) Payment
172|1|"Free": Deliver (if Sell) or Receive (if Buy) Free
221|LIBOR|LIBOR (London Inter-Bank Offer)
233|AMT|AMT (y/n)
233|AUTOREINV|Auto Reinvestment at <rate> or better
233|BANKQUAL|Bank qualified (y/n)
233|BGNCON|Bargain Conditions– see (234) for values
233|CUSTOMDATE|Custom start/end date
233|GEOG|Geographics and % Range (ex. 234=CA 0-80 [minimum of 80% California assets])
233|INSURED|Insured (y/n)
233|ISSUE|Year or Year/Month of Issue (ex. 234=2002/09)
233|ISSUER|Issuer’s ticker
233|LOTVAR|Lot Variance (value in percent maximum over- or under-allocation allowed)
233|MAXSUBS|Maximum substitutions (Repo)
233|PAYFREQ|Payment frequency, calendar
233|REDEMPTION|Type of redemption – values are: NonCallable, Callable, Prefunded, EscrowedToMaturity, Putable, Convertible
233|RESTRICTED|Restricted (y/n)
233|SUBSFREQ|Substitutions frequency (Repo)
233|SUBSLEFT|Substitutions left (Repo)
233|TRDVAR|Trade Variance (value in percent maximum over- or under-allocation allowed)
233|WAC|Weighted Average Coupon:value in percent (exact or range) plus ‘Gross’ or ‘Net’ of servicing spread (the default) (ex. 234=6.5- Net [minimum of 6.5% net of servicing fee])
233|WAL|Weighted Average Life Coupon: value in percent (exact or range)
233|WALA|Weighted Average Loan Age: value in months (exact or range)
233|WAM|Weighted Average Maturity : value in months (exact or range)
233|WHOLE|Whole Pool (y/n)
235|AFTERTAX|After Tax Yield (Municipals)
235|ATISSUE|Yield At Issue (Municipals)
235|GOVTEQUIV|Government Equivalent Yield
235|NEXTREFUND|Yield To Next Refund (Sinking Fund Bonds)
263|1|Snapshot + Updates (Subscribe)
263|2|Disable previous Snapshot + Update Request (Unsubscribe)
266|Y|one book entry per side per price
266|N|Multiple entries per side per price allowed
276|A|Open / Active
276|B|Closed / Inactive
277|A|Cash (only) Market
277|C|Cash Trade (same day clearing)
277|D|Next Day (only) Market
277|E|Opening / Reopening Trade Detail
277|G|Rule 127 Trade (NYSE)
277|H|Rule 155 Trade (Amex)
277|I|Sold Last (late reporting)
277|J|Next Day Trade (next day clearing)
277|K|Opened (late report of opened trade)
277|M|Sold (out of sequence)
277|N|Stopped Stock (guarantee of price but does not execute the order)
277|P|Imbalance More Buyers (Cannot be used in combination with Q)
277|Q|Imbalance More Sellers (Cannot be used in combination with P)
285|0|Cancelation / Trade Bust
286|0|Daily Open / Close / Settlement entry
286|1|Session Open / Close / Settlement entry
297|1|Canceled for Symbol(s)
297|2|Canceled for Security Type(s)
298|1|Cancel for Symbol(s)
298|2|Cancel for Security Type(s)
298|3|Cancel for Underlying Symbol
300|1|Unknown symbol (Security)
300|2|Exchange (Security) closed
300|7|Invalid bid/ask spread
301|0|No Acknowledgement (Default)
301|2|Acknowledge each quote messages
321|1|Request Security identity for the specifications provided (Name of the security is not supplied)
321|3|Request List Securities (Can be qualified with Symbol, SecurityType, TradingSessionID, SecurityExchange. If provided then only list Securities for the specific type)
323|1|Accept security proposal as is
323|2|Accept security proposal with revisions as indicated in the message
326|4|No Open/No Resume
326|17|Ready to trade (start of session)
326|18|Not Available for trading (end of session)
329|Y|Halt was due to related security being halted
329|N|Halt was not related to a halt of the related security
347|ISO-2022-JP|JIS
347|EUC-JP|EUC
347|Shift_JIS|for using SJIS
347|UTF-8|Unicode
373|5|Value is incorrect (out of range) for this tag
373|17|Non "data" value includes field delimiter (SOH character)
378|1|GT renewal / restatement (no corporate action)
378|5|Partial decline of OrderQty (e.g. exchange-initiated partial cancel)
378|8|Market (Exchange) Option
378|9|Canceled, Not Best
394|1|"Non Disclosed" Style (e.g. US/European)
394|2|"Disclosed" Style (e.g. Japanese)
409|1|5day moving average
409|2|20 day moving average
414|1|BuySide explicitly requests status using StatusRequest (Default) The sell-side firm can however, send a DONE status List Status Response in an unsolicited fashion
414|2|SellSide periodically sends status using ListStatus. Period optionally specified in ProgressPeriod
414|3|Real-time execution reports (to be discouraged)
419|9|VWAP through a day except "YORI" (an opening auction)
419|A|VWAP through a morning session except "YORI" (an opening auction)
419|B|VWAP through an afternoon session except "YORI" (an opening auction)
423|1|Percentage (e.g. percent of par) (often called "dollar price" for fixed income)
423|2|Per unit (i.e. per share or contract)
423|3|Fixed Amount (absolute value)
423|4|Discount – percentage points below par
423|5|Premium – percentage points over par
423|10|Fixed cabinet trade price (primarily for listed futures and options)
423|11|Variable cabinet trade price (primarily for listed futures and options)
427|1|accumulate executions until order is filled or expires
427|2|accumulate until verbally notified otherwise
431|4|Canceling
433|2|Wait for Execute Instruction (e.g. a List Execute message or phone call before proceeding with execution of the list)
433|3|Exchange/switch CIV order – Sell driven
433|4|Exchange/switch CIV order – Buy driven, cash top-up (i.e. additional cash will be provided to fulfil the order)
433|5|Exchange/switch CIV order – Buy driven, cash withdraw (i.e. additional cash will not be provided to fulfil the order)
434|2|Order Cancel/Replace Request
442|1|Single Security (default if not specified)
447|B|BIC (Bank Identification Code—Swift managed) code (ISO 9362 - See "Appendix 6-B")
447|C|Generally accepted market participant identifier (e.g. NASD mnemonic)
447|D|Proprietary/Custom code
447|F|Settlement Entity Location (note if Local Market Settlement use "E = ISO Country Code") (see "Appendix 6-G" for valid values)
447|G|MIC (ISO 10383 - Market Identifier Code) (See "Appendix 6-C")
447|H|CSD participant/member code (e.g. Euroclear, DTC, CREST or Kassenverein number)
447|2|Taiwanese Qualified Foreign Investor ID QFII / FID
447|3|Taiwanese Trading Account
447|4|Malaysian Central Depository (MCD) number
447|5|Chinese B Share (Shezhen and Shanghai)
447|8|US Employer Identification Number
447|I|Directed broker three character acronym as defined in ISITC ‘ETC Best Practice’ guidelines document
452|1|Executing Firm (formerly FIX 4.2 ExecBroker)
452|2|Broker of Credit (formerly FIX 4.2 BrokerOfCredit)
452|3|Client ID (formerly FIX 4.2 ClientID)
452|4|Clearing Firm (formerly FIX 4.2 ClearingFirm)
452|8|Locate/Lending Firm (for short-sales)
452|9|Fund manager Client ID (for CIV)
452|10|Settlement Location (formerly FIX 4.2 SettlLocation)
452|11|Order Origination Trader (associated with Order Origination Firm – e.g. trader who initiates/submits the order)
452|12|Executing Trader (associated with Executing Firm - actually executes)
452|13|Order Origination Firm (e.g. buyside firm)
452|14|Giveup Clearing Firm (firm to which trade is given up)
452|27|Buyer/Seller (Receiver/Deliverer)
464|Y|True (Test)
464|N|False (Production)
477|8|Direct Credit (BECS, BACS)
481|1|Exempt – Below The Limit
481|2|Exempt – Client Money Type Exemption
481|3|Exempt – Authorised Credit or Financial Institution.
484|D|Creation price plus adjustment %
484|P|Offer price minus adjustment %
492|9|Direct Debit (BECS)
492|10|Direct Credit (BECS)
492|15|High Value Clearing System (HVACS)
495|0|None/Not Applicable (default)
495|1|Maxi ISA (UK)
495|2|TESSA (UK)
495|3|Mini Cash ISA (UK)
495|4|Mini Stocks and Shares ISA (UK)
495|5|Mini Insurance ISA (UK)
495|6|Current year payment (US)
495|7|Prior year payment (US)
495|8|Asset transfer (US)
495|9|Employee - prior year (US)
495|10|Employee – current year (US)
495|11|Employer - prior year (US)
495|12|Employer – current year (US)
495|13|Non-fund prototype IRA (US)
495|14|Non-fund qualified plan (US)
495|15|Defined contribution plan (US)
495|16|Individual Retirement Account (US)
495|17|Individual Retirement Account – Rollover (US)
495|18|KEOGH (US)
495|19|Profit Sharing Plan (US)
495|20|401K (US)
495|21|Self-Directed IRA (US)
495|22|403(b) (US)
495|23|457 (US)
495|24|Roth IRA (fund prototype) (US)
495|25|Roth IRA (non-prototype) (US)
495|26|Roth Conversion IRA (fund prototype) (US)
495|27|Roth Conversion IRA (non-prototype) (US)
495|28|Education IRA (fund prototype) (US)
495|29|Education IRA (non-prototype) (US)
506|N|Reminder – i.e. Registration Instructions are still outstanding
507|1|Invalid/unacceptable Account Type
507|2|Invalid/unacceptable Tax Exempt Type
507|3|Invalid/unacceptable Ownership Type
507|4|Invalid/unacceptable No Reg Dtls
507|5|Invalid/unacceptable Reg Seq No
507|6|Invalid/unacceptable Reg Dtls
507|7|Invalid/unacceptable Mailing Dtls
507|8|Invalid/unacceptable Mailing Inst
507|9|Invalid/unacceptable Investor ID
507|10|Invalid/unacceptable Investor ID Source
507|11|Invalid/unacceptable Date of Birth
507|12|Invalid/unacceptable Investor Country Of Residence
507|13|Invalid/unacceptable NoDistribInstns
507|14|Invalid/unacceptable Distrib Percentage
507|15|Invalid/unacceptable Distrib Payment Method
507|16|Invalid/unacceptable Cash Distrib Agent Acct Name
507|17|Invalid/unacceptable Cash Distrib Agent Code
507|18|Invalid/unacceptable Cash Distrib Agent Acct Num
519|1|Commission Amount (actual)
519|2|Commission % (actual)
519|4|Initial Charge %
519|6|Discount %
519|8|Dilution Levy %
519|10|Exit Charge %
519|11|Fund-based Renewal Commission % (a.k.a. Trail commission)
519|12|Projected Fund Value (i.e. for investments intended to realise or exceed a specific future value)
519|13|Fund-based Renewal Commission Amount (based on Order value)
519|14|Fund-based Renewal Commission Amount (based on Projected Fund value)
528|P|Principal (Note for CMS purposes, Principal includes Proprietary)
529|5|Acting as Market Maker or Specialist in the security
529|6|Acting as Market Maker or Specialist in the underlying security of a derivative security
529|7|Foreign Entity (of foreign government or regulatory jurisdiction)
531|0|Cancel Request Rejected -- See MassCancelRejectReason (532)
532|2|Invalid or unknown underlying
537|3|Counter (tradable)
546|1|Local (Exchange, ECN, ATS)
547|Y|Client has responsibility for implicitly deleting bids or offers falling outside the MarketDepth of the request.
547|N|Server must send an explicit delete for bids or offers falling outside the requested MarketDepth of the request.
549|1|Cross Trade which is executed completely or not. Both sides are treated in the same manner. This is equivalent to an All or None.
549|2|Cross Trade which is executed partially and the rest is cancelled. One side is fully executed, the other side is partially executed with the remainder being cancelled. This is equivalent to an Immediate or Cancel on the other side. Note: The CrossPrioritzation (550) field may be used to indicate which side should fully execute in this scenario.
549|3|Cross trade which is partially executed with the unfilled portions remaining active. One side of the cross is fully executed (as denoted with the CrossPrioritization field), but the unfilled portion remains active.
549|4|Cross trade is executed with existing orders with the same price. In the case other orders exist with the same price, the quantity of the Cross is executed against the existing orders and quotes, the remainder of the cross is executed against the other side of the cross. The two sides potentially have different quantities.
559|1|SecurityType and/or CFICode
560|2|No instruments found that match selection criteria
563|0|Report by mulitleg security only (Do not report legs)
563|1|Report by multileg security and by instrument legs belonging to the multileg security.
563|2|Report by instrument legs belonging to the multileg security only (Do not report status of multileg security)
569|1|Matched trades matching Criteria provided on request (parties, exec id, trade id, order id, instrument, input source, etc.)
570|Y|previously reported to counterparty
573|0|compared, matched or affirmed
573|1|uncompared, unmatched, or unaffirmed
574|A1|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator plus four badges and execution time (within two-minute window)
574|A2|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator plus four badges
574|A3|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator plus two badges and execution time (within two-minute window)
574|A4|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator plus two badges
574|A5|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator plus execution time (within two-minute window)
574|AQ|Compared records resulting from stamped advisories or specialist accepts/pair-offs
574|S1|Summarized Match using A1 exact match criteria except quantity is summarized
574|S2|Summarized Match using A2 exact match criteria except quantity is summarized
574|S3|Summarized Match using A3 exact match criteria except quantity is summarized
574|S4|Summarized Match using A4 exact match criteria except quantity is summarized
574|S5|Summarized Match using A5 exact match criteria except quantity is summarized
574|M1|Exact match on Trade Date, Stock Symbol, Quantity, Price, Trade Type, and Special Trade Indicator minus badges And times: ACT M1 match
574|M2|Summarized match minus badges and times: ACT M2 Match
574|MT|OCS Locked In: Non-ACT
577|8|Manual mode (pre-posting and/or pre-giveup)
577|9|Automatic posting mode (trade posting to the position account number specified)
577|10|Automatic give-up mode (trade give-up to the give-up destination number specified)
581|1|Account is carried on customer Side of Books
581|2|Account is carried on non-Customer Side of books
581|6|Account is carried on non-customer side of books and is cross margined
581|7|Account is house trader and is cross margined
581|8|Joint Backoffice Account (JBO)
589|0|Can trigger booking without reference to the order initiator ("auto")
589|1|Speak with order initiator before booking ("speak first")
590|1|Aggregate partial executions on this order, and book one trade per order
590|2|Aggregate executions for this symbol, side, and settlement date
591|1|Do not pro-rata = discuss first
626|1|Calculated (includes MiscFees and NetMoney)
626|2|Preliminary (without MiscFees and NetMoney)
635|F|Full and Associate Member trading for own account and as floor Brokers
635|H|106.H and 106.J Firms
635|I|GIM, IDEM and COM Membership Interest Holders
635|L|Lessee and 106.F Employees
635|1|1st year delegate trading for his own account
635|2|2nd year delegate trading for his own account
635|3|3rd year delegate trading for his own account
635|4|4th year delegate trading for his own account
635|5|5th year delegate trading for his own account
635|9|6th year and beyond delegate trading for his own account
636|Y|Order is currently being worked
636|N|Order has been accepted but not yet in a working state
650|N|Does not constitute a legal confirm
658|1|Unknown symbol (Security)
658|2|Exchange (Security) closed
660|3|TFM (GSPTA)
660|4|OMGEO (AlertID)
660|99|Other (custom or proprietary)
692|1|percent (percent of par)
692|2|per share (e.g. cents per share)
692|3|fixed amount (absolute value)
692|4|discount – percentage points below par
692|5|premium – percentage points over par
692|6|basis points relative to benchmark
692|9|Yield spread (swaps)
694|1|Hit/Lift
707|CASH|Cash Amount (Corporate Event)
709|4|Position Change Submission/Margin Disposition
712|1|New: used to increment the overall transaction quantity
712|2|Replace: used to override the overall transaction quantity or specific add messages based on the reference id
712|3|Cancel: used to remove the overall transaction or specific add messages based on reference id
723|0|Successful completion - no warnings or errors
725|0|Inband: transport the request was sent over (Default)
725|1|Out-of-Band: pre-arranged out of band delivery mechanism (i.e. FTP, HTTP, NDM, etc) between counterparties. Details specified via ResponseDestination (726).
728|99|Other (use Text(58) in conjunction with this code for an explanation)
749|0|Successful (Default)
749|9|Unauthorized for Trade Capture Report Request
751|0|Successful (Default)
751|1|Invalid party information
752|1|Single Security (default if not specified)
773|3|Confirmation Request Rejected (reason can be stated in Text field)
775|1|CFD (Contract For Difference)
792|0|unable to process request (e.g. database unavailable)
794|3|Sellside Calculated Using Preliminary (includes MiscFees and NetMoney)
794|4|Sellside Calculated Without Preliminary (sent unsolicited by sellside, includes MiscFees and NetMoney)
796|1|Original details incomplete/incorrect
798|1|Account is carried on customer Side of Books
798|2|Account is carried on non-Customer Side of books
798|6|Account is carried on non-customer side of books and is cross margined
798|7|Account is house trader and is cross margined
798|8|Joint Backoffice Account (JBO)
803|6|Postal address (inclusive of street address, location, and postal code)
803|10|Securities account number (for settlement instructions)
803|11|Registration number (for settlement instructions and confirmations)
803|12|Registered address (for confirmation purposes)
803|13|Regulatory status (for confirmation purposes)
803|14|Registration name (for settlement instructions)
803|15|Cash account number (for settlement instructions)
803|17|CSD participant/member code (e.g. Euroclear, DTC, CREST or Kassenverein number)
819|1|Trade is part of an average price group identified by the TradeLinkID
819|2|Last Trade in the average price group identified by the TradeLinkID
826|1|Allocation required (give up trade) allocation information not provided (incomplete)
827|0|Expire on trading session close (default)
828|2|EFP (Exchange for Physical)
835|0|Floating (default)
836|0|Price (default)
836|3|Price Tier / Level
837|0|Or better (default) - price improvement allowed
837|1|Strict – limit is a strict limit
837|2|Or worse – for a buy the peg limit is a minimum and for a sell the peg limit is a maximum (for use for orders which have a price range)
838|1|More aggressive – on a buy order round the price up to the nearest tick, on a sell round down to the nearest tick
838|2|More passive – on a buy order round down to nearest tick on a sell order round up to nearest tick
840|1|Local (Exchange, ECN, ATS)
841|0|Floating (default)
842|0|Price (default)
842|3|Price Tier / Level
843|0|Or better (default) - price improvement allowed
843|1|Strict – limit is a strict limit
843|2|Or worse – for a buy the discretion price is a minimum and for a sell the discretion price is a maximum (for use for orders which have a price range)
844|1|More aggressive – on a buy order round the price up to the nearest tick, on a sell round down to the nearest tick
844|2|More passive – on a buy order round down to nearest tick on a sell order round up to nearest tick
846|1|Local (Exchange, ECN, ATS)
847|2|Participate (i.e. aim to be x percent of the market volume)
847|3|Minimize market impact
853|4|Qualified Service Representative (QSR) or Automatic Giveup (AGU) Contra Side Sold Short
854|0|Units (shares, par, currency)
854|1|Contracts (if used - should specify ContractMultiplier (tag 231))
856|5|No/Was
856|7|Locked In Trade Break
871|1|Flat (securities pay interest on a current basis but are traded without interest)
871|3|Interest bearing (for Euro commercial paper when not issued at discount)
871|8|Coupon period (if not semi-annual). Supply redemption date in the InstrAttribValue (872) field
871|9|When [and if] issued
871|11|Callable, puttable
871|13|Escrowed to redemption date – callable. Supply redemption date in the InstrAttribValue (872) field
871|20|Original issue discount price. Supply price in the InstrAttribValue (872) field
871|22|Callable without notice by mail to holder unless registered
871|99|Text. Supply the text of the attribute or disclaimer in the InstrAttribValue (872) field
875|1|3(a)(3)
875|2|4(2)
896|7|Outstanding Trades (Today < end date)
906|0|Unknown deal (order / trade)
910|3|Assigned (Accepted)
919|0|"Versus. Payment": Deliver (if Sell) or Receive (if Buy) vs. (Against) Payment
919|1|"Free": Deliver (if Sell) or Receive (if Buy) Free
928|2|Not connected – down expected up
928|3|Not connected – down expected down
935|8|Level of detail, then NoCompID’s becomes required
940|2|Confirm rejected, i.e. not affirmed
946|0|Successful (Default)
946|99|Other (further information in Text (58) field)`,
  messages: `0|The Heartbeat monitors the status of the communication link and identifies when the last of a string of messages was not received.
1|The test request message forces a heartbeat from the opposing application.
2|The resend request is sent by the receiving application to initiate the retransmission of messages. This function is utilized if a sequence number gap is detected, if the receiving application lost a message, or as a function of the initialization process.
3|The reject message should be issued when a message is received but cannot be properly processed due to a session-level rule violation.
4|The Sequence Reset message has two modes: Gap Fill mode and Reset mode.
5|The logout message initiates or confirms the termination of a FIX session.
6|Indication of interest messages are used to market merchandise which the broker is buying or selling in either a proprietary or agency capacity.
7|Advertisement messages are used to announce completed transactions.
8|The execution report message is used to: 1. Confirm the receipt of an order 2. Confirm changes to an existing order (i.e. accept cancel and replace requests) 3. Relay order status information 4. Relay fill information on working orders 5. Relay fill information on tradeable or restricted tradeable quotes 6. Reject orders 7. Report post-trade fees calculations associated with a trade
9|The order cancel reject message is issued by the broker upon receipt of a cancel request or cancel/replace request message which cannot be honored.
A|The logon message authenticates a user establishing a connection to a remote system.
B|The news message is a general free format message between the broker and institution.
C|The email message is similar to the format and purpose of the News message, however, it is intended for private use between two parties.
D|The new order message type is used by institutions wishing to electronically submit securities and forex orders to a broker for execution.
E|The NewOrderList Message can be used in one of two ways depending on which market conventions are being followed.
F|The order cancel request message requests the cancellation of all the remaining quantity of an existing order.
G|The order cancel/replace request is used to change the parameters of an existing order.
H|The order status request message is used by the institution to generate an order status message back from the broker.
J|The Allocation Instruction message provides the ability to specify how an order or set of orders should be subdivided amongst one or more accounts. In versions of FIX prior to version 4.4, this same message was known as the Allocation message. Note in versions of FIX prior to version 4.4, the allocation message was also used to communicate fee and expense details from the Sellside to the Buyside. This role has now been removed from the Allocation Instruction and is now performed by the new (to version 4.4) Allocation Report and Confirmation messages.,The Allocation Report message should be used for the Sell-side Initiated Allocation role as defined in previous versions of the protocol.
K|The List Cancel Request message type is used by institutions wishing to cancel previously submitted lists either before or during execution.
L|The List Execute message type is used by institutions to instruct the broker to begin execution of a previously submitted list. This message may or may not be used, as it may be mirroring a phone conversation.
M|The list status request message type is used by institutions to instruct the broker to generate status messages for a list.
N|The list status message is issued as the response to a List Status Request message sent in an unsolicited fashion by the sell-side. It indicates the current state of the orders within the list as they exist at the broker's site. This message may also be used to respond to the List Cancel Request.
P|In versions of FIX prior to version 4.4, this message was known as the Allocation ACK message. The Allocation Instruction Ack message is used to acknowledge the receipt of and provide status for an Allocation Instruction message.
Q|The Don’t Know Trade (DK) message notifies a trading partner that an electronically received execution has been rejected. This message can be thought of as an execution reject message.
R|In some markets it is the practice to request quotes from brokers prior to placement of an order. The quote request message is used for this purpose. This message is commonly referred to as a Request For Quote (RFQ)
S|The Quote message is used as the response to a Quote Request or a Quote Response message in both indicative, tradeable, and restricted tradeable quoting markets.
T|The Settlement Instructions message provides the broker’s, the institution’s, or the intermediary’s instructions for trade settlement. This message has been designed so that it can be sent from the broker to the institution, from the institution to the broker, or from either to an independent "standing instructions" database or matching system or, for CIV, from an intermediary to a fund manager.
V|Some systems allow the transmission of real-time quote, order, trade, trade volume, open interest, and/or other price information on a subscription basis. A Market Data Request is a general request for market data on specific securities or forex quotes.
W|The Market Data messages are used as the response to a Market Data Request message.
X|The second Market Data message format is used for incremental updates.
Y|The Market Data Request Reject is used when the broker cannot honor the Market Data Request, due to business or technical reasons.
Z|The Quote Cancel message is used by an originator of quotes to cancel quotes.
a|The quote status request message is used for the following purposes in markets that employ tradeable or restricted tradeable quotes:
b|Mass Quote Acknowledgement is used as the application level response to a Mass Quote message.
c|The Security Definition Request message is used for the following: 1. Request a specific Security to be traded with the second party. The request security can be defined as a multileg security made up of one or more instrument legs.
d|The Security Definition message is used for the following: 1. Accept the security defined in a Security Definition message. 2. Accept the security defined in a Security Definition message with changes to the definition and/or identity of the security. 3. Reject the security requested in a Security Definition message
e|The Security Status Request message provides for the ability to request the status of a security.
f|The Security Status message provides for the ability to report changes in status to a security.
g|The Trading Session Status Request is used to request information on the status of a market.
h|The Trading Session Status provides information on the status of a market.
i|The Mass Quote message can contain quotes for multiple securities to support applications that allow for the mass quoting of an option series.
k|The BidRequest Message can be used in one of two ways depending on which market conventions are being followed.
l|The Bid Response message can be used in one of two ways depending on which market conventions are being followed. In the "Non disclosed" convention the Bid Response message can be used to supply a bid based on the sector, country, index and liquidity information contained within the corresponding bid request message. See "Program/Basket/List Trading" for an example. In the "Disclosed" convention the Bid Response message can be used to supply bids based on the List Order Detail messages sent in advance of the corresponding Bid Request message.
m|The strike price message is used to exchange strike price information for principal trades. It can also be used to exchange reference prices for agency trades.
o|The Registration Instructions message type may be used by institutions or retail intermediaries wishing to electronically submit registration information to a broker or fund manager (for CIV) for an order or for an allocation.
p|The Registration Instructions Response message type may be used by broker or fund manager (for CIV) in response to a Registration Instructions message submitted by an institution or retail intermediary for an order or for an allocation.
q|The order mass cancel request message requests the cancellation of all the remaining quantity of a group of orders matching criteria specified within the request. NOTE: This message can only be used to cancel order messages (reduce the full quantity).
r|The Order Mass Cancel Report is used to acknowledge an Order Mass Cancel Request. Note that each affected order that is canceled is acknowledged with a separate Execution Report or Order Cancel Reject message.
s|Used to submit a cross order into a market. The cross order contains two order sides (a buy and a sell).
t|Used to modify a cross order previously submitted using the New Order - Cross message. See Order Cancel Replace Request for details concerning message usage.
u|Used to fully cancel the remaining open quantity of a cross order.
v|The Security Type Request message is used to return a list of security types available from a counterparty or market.
w|The Security Type message is used to return a list of security types available from a counterparty or market.
x|The Security List Request message is used to return a list of securities from the counterparty that match criteria provided on the request
y|The Security List message is used to return a list of securities that matches the criteria specified in a Security List Request.
z|The Derivative Security List Request message is used to return a list of securities from the counterparty that match criteria provided on the request
AA|The Derivative Security List message is used to return a list of securities that matches the criteria specified in a Derivative Security List Request.
AB|The New Order - Multileg is provided to submit orders for securities that are made up of multiple securities, known as legs.
AC|Used to modify a multileg order previously submitted using the New Order - Multileg message. See Order Cancel Replace Request for details concerning message usage.
AD|Trade Capture Reporting allows sell-side firms (broker, exchange, ECN) to provide timely reporting of completed trades to an external entity not involved in the execution of the trade.
AE|The Trade Capture Report message can be: • Used to report trades between counterparties. • Used to report trades to a trade matching system • Can be sent unsolicited between counterparties. • Sent as a reply to a Trade Capture Report Request. • Can be used to report unmatched and matched trades.
AF|The order mass status request message requests the status for orders matching criteria specified within the request.
AG|The Quote Request Reject message is used to reject Quote Request messages for all quoting models.
AH|In tradeable and restricted tradeable quoting markets – Quote Requests are issued by counterparties interested in ascertaining the market for an instrument.
AI|The quote status report message is used: * As the response to a Quote Status Request message * As a response to a Quote Cancel message * As a response to a Quote Response message in a negotiation dialog
AJ|The Quote Response message is used to respond to an IOI message or Quote message.
AK|The Confirmation messages are used to provide individual trade level confirmations from the sell side to the buy side. In versions of FIX prior to version 4.4, this role was performed by the allocation message. Unlike the allocation message, the confirmation message operates at an allocation account (trade) level rather than block level, allowing for the affirmation or rejection of individual confirmations. This message is also used to report back, confirm or exception, the booking status of each allocation instance. When the buy-side, in response, "affirms" with the ConfirmationAck message, the trade is ready to settle.
AL|Position Maintenance Request
AM|Position Maintenance Report
AN|Request For Positions
AO|Request for Positions Ack
AP|Position Report
AQ|The Trade Capture Request Ack message is used to: • Provide an acknowledgement to a Trade Capture Report Request in the case where the Trade Capture Report Request is used to specify a subscription or delivery of reports via an out-of-band ResponseTransmissionMethod. • Provide an acknowledgement to a Trade Capture Report Request in the case when the return of the Trade Capture Reports matching that request will be delayed or delivered asynchronously. This is useful in distributed trading system environments. • Indicate that no trades were found that matched the selection criteria specified on the Trade Capture Report Request • The Trade Capture Request was invalid for some business reason, such as request is not authorized, invalid or unknown instrument, party, trading session, etc.
AR|The Trade Capture Report Ack message can be: • Used to acknowledge trade capture reports received from a counterparty • Used to reject a trade capture report received from a counterparty
AS|Sent from sell-side to buy-side, sell-side to 3rd-party or 3rd-party to buy-side, the Allocation Report (Claim) provides account breakdown of an order or set of orders plus any additional follow-up front-office information developed post-trade during the trade allocation, matching and calculation phase. In versions of FIX prior to version 4.4, this functionality was provided through the Allocation message. Depending on the needs of the market and the timing of "confirmed" status, the role of Allocation Report can be taken over in whole or in part by the Confirmation message. Note the response to the Allocation Report message is the Allocation Report Ack message. In versions of FIX prior to version 4.4, the Allocation ACK served this purpose.
AT|The Allocation Report Ack message is used to acknowledge the receipt of and provide status for an Allocation Report message.
AU|The Confirmation Ack (aka Affirmation) message is used to respond to a Confirmation message.
AW|Assignment Reports are sent from a clearing house to counterparties, such as a clearing firm as a result of the assignment process.
AX|An initiator that requires collateral from a respondent sends a Collateral Request. The initiator can be either counterparty to a trade in a two party model or an intermediary such as an ATS or clearinghouse in a three party model. A Collateral Assignment is expected as a response to a request for collateral.
AY|Used to assign collateral to cover a trading position. This message can be sent unsolicited or in reply to a Collateral Request message.
AZ|Used to respond to a Collateral Assignment message
BA|Used to report collateral status when responding to a Collateral Inquiry message.
BB|Used to inquire for collateral status
BG|Used to respond to a Collateral Inquiry
BH|The Confirmation Request message is used to request a Confirmation message.`,
};
