const https = require("https");

https.get("https://sams-web-emwb.onrender.com/transactions", (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
        const match = data.match(/src="(\/assets\/[^<]+?\.js)"/);
        if (match) {
            console.log("Found JS:", match[1]);
            https.get("https://sams-web-emwb.onrender.com" + match[1], (res2) => {
                let js = "";
                res2.on("data", (c) => { js += c; });
                res2.on("end", () => {
                    console.log("Size:", js.length);
                    // Match the api.get("/catalog") explicitly
                    const hasOld = js.includes("/v1/catalog");
                    const hasNew = js.includes("api.get(\"/catalog\")");
                    console.log("Contains /v1/catalog?", hasOld);
                    console.log("Contains api.get(\"/catalog\")?", hasNew);
                });
            });
        } else {
            console.log("No JS found");
        }
    });
});
