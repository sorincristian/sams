const axios = require("axios");

const api = axios.create({ baseURL: "https://sams-api-vfvj.onrender.com/api" });
console.log(api.getUri({ url: "/inventory/transactions" }));
console.log(api.getUri({ url: "/v1/catalog" }));
