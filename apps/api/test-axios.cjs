const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

console.log(api.getUri({ url: '/inventory/transactions' }));
console.log(api.getUri({ url: 'inventory/transactions' }));
console.log(api.getUri({ url: '/catalog' }));
