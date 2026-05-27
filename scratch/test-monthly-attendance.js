const https = require('https');

const data = JSON.stringify({
  company_id: '15',
  api_token: '10915|Wk7ZOhM4e6T0lXv1g2BfT7cR8iY1jM4rB9vU3xL5',
  user_id: '4210',
  ranger_id: '4210',
  month: 5,
  year: 2026
});

const options = {
  hostname: 'fms.pugarch.in',
  port: 443,
  path: '/api/v2/attendance/getUserMonthlyAttendance',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body.substring(0, 1000)));
});
req.write(data);
req.end();
