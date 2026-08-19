const dns = require("dns");

dns.setServers(["1.1.1.1", "1.0.0.1"]);

dns.resolveSrv(
  "_mongodb._tcp.cluster0.hcqbqwc.mongodb.net",
  (error, records) => {
    if (error) {
      console.error("DNS ERROR:", error);
      return;
    }

    console.log("DNS SUCCESS:");
    console.log(records);
  }
);