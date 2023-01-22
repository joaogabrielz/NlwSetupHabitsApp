import axios from 'axios';

//Android doesnt work with 'http://localhost:3333', put IP maq

export const api = axios.create({
  baseURL: 'http://192.168.0.22:3333'
});