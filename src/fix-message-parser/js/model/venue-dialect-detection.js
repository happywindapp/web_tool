// Exchange-server (venue) dialect: spotted by venue-only tags; the venue id is 49 of a venue → firm message, else 56 of a firm → venue message.
const FixVenue = (() => {
  const FROM_VENUE = new Set(["8", "9", "h", "f", "j", "AI"]), TO_VENUE = new Set(["D", "F", "G", "s", "t", "u", "S", "Z", "AJ", "R"]);
  const isVenue = it => /(^|[^\d])(369|4488|6363|6464)=/.test(it.raw);
  const idOf = msgs => (msgs.find(m => FROM_VENUE.has(m.type) && m.get("49")) || { get: () => "" }).get("49")
    || (msgs.find(m => TO_VENUE.has(m.type) && m.get("56")) || { get: () => "" }).get("56");
  return { isVenue, idOf };
})();
