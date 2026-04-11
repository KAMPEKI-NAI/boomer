// config/api.config.ts
export const API_CONFIG = {
  baseUrl: 'https://boomer-k9z3.onrender.com',
  
  get apiUrl() {
    return `${this.baseUrl}/api`;
  },
  
  get socketUrl() {
    return `${this.baseUrl}`;
  }
};