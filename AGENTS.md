# Architecture rules

- Keep admin financial input rules and refund sequencing in a browser-safe pure module, with tests alongside it, so receipt validation and omitted-cap serialization can be verified without live financial writes.