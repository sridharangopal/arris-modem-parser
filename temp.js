import dotenv from 'dotenv'
dotenv.config({ silent: true })
import request from 'request'

var creds_cookie = ""
var creds = ""
const loginUrl = 'http://192.168.100.1/cgi-bin/basic_pwd_cgi'
const dataUrl = 'http://192.168.100.1/cgi-bin/status_cgi'
const auth = new Buffer.from(process.env.MODEM_USERNAME + ":" + process.env.MODEM_PASSWORD).toString("base64")
var arNonce = ("" + Math.random()).substr(2, 8)

var loginOpts = {
  'method': 'POST',
  'url': loginUrl,
  'headers': {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  form: {
    'arguments': auth,
    'ar_nonce': arNonce
  }
};

request(loginOpts, function (error, response) {
  if (error) throw new Error(error)
  creds_cookie = response.headers['set-cookie']
  creds = creds_cookie[0].slice(0, -1)
  console.log(creds)

  var dataOpts = {
    'method': 'GET',
    'url': dataUrl,
    'headers': {
      'Cookie': creds
    }
  };
  
  request(dataOpts, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);

    
  });
});


