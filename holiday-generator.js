'use strict'

require('dotenv').config();
const request = require('request');
const fs = require('fs');
const appRoot = require('app-root-path');
const logger = require('./config/winston');
const moment = require('moment-timezone');

const holiday = async () => {

  logger.info("-----start holiday-generator");

  var solYear = moment().tz("Asia/Seoul").year();
  var solMonth = moment().tz("Asia/Seoul").month() + 1;
  solMonth = ("0" + solMonth).slice(-2);

  var url = 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';
  var queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + process.env.ServiceKey;
  queryParams += '&' + encodeURIComponent('solYear') + '=' + encodeURIComponent(solYear);
  queryParams += '&' + encodeURIComponent('solMonth') + '=' + encodeURIComponent(solMonth);
  queryParams += '&_type=json';

  request({
    url: url + queryParams,
    method: 'GET'
  }, async function (error, response, body) {
    var body2Json = JSON.parse(body);
    var item = body2Json.response.body.items.item;
    const dirFullPath = `${appRoot}` + '/holiday/'
    const fileFullPath = dirFullPath + solYear + solMonth + ".json";
    if( !fs.existsSync(dirFullPath) ){
      fs.mkdirSync(dirFullPath);
    }
    if (typeof item != 'undefined') {
      fs.writeFileSync(fileFullPath, JSON.stringify(item));
      logger.info("-----SUCCESS, Write on " + fileFullPath);
    } else {
      fs.writeFileSync(fileFullPath, "");
      logger.info("-----SUCCESS, Empty Write on " + fileFullPath);
    }
    logger.info("-----end holiday-generator");
  });
}

module.exports.holiday = holiday;
