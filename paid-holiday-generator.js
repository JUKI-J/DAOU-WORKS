'use strict'

require('dotenv').config();
const puppeteer = require('puppeteer');
const appRoot = require('app-root-path');
const fs = require('fs');
const logger = require('./config/winston');
const moment = require('moment-timezone');

const paidHoliday = async () => {

  var devOption = {
    headless: false
    ,executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  }

  var prodOption = {
    headless: true
    //,executablePath: '/usr/bin/chromium-browser'
    ,args: ['--no-sandbox', '--disable-dev-shm-usage']
  }

  var isMon2Fri = async () => {
    var day = moment().tz("Asia/Seoul").day();
    return (day > 0 && day < 6) ? true : false;
  }

  if (isMon2Fri()) {
    var solYear = moment().tz("Asia/Seoul").year();
    var solMonth = moment().tz("Asia/Seoul").month() + 1;
    var solDay = moment().tz("Asia/Seoul").date();
    solMonth = ("0" + solMonth).slice(-2);
    solDay = ("0" + solDay).slice(-2);
    const fileFullPath = "./holiday/" + solYear + solMonth + ".json";
    var data;

    try{
      data = fs.readFileSync(fileFullPath, 'utf8');
    }catch(e){
      await logger.debug("-----File Not Found >>> [" + fileFullPath + "]");
      data = "";
    }
    
    var isWorkDays = true;
    if (data !== '' && data !== "undefined") {
      const today = solYear + solMonth + solDay;
      var dataJson = await JSON.parse(data);
      if(Array.isArray(dataJson)){
        dataJson.forEach(el => {
          if (today === el.locdate) {
            isWorkDays = false;
            return;
          }
        });
      }else{
        if (today === dataJson.locdate) {
          isWorkDays = false;
        }
      }
      
    }

    await logger.debug("-----DONE read JSON File >>> isWorkDays : [" + isWorkDays + "]");

    if (isWorkDays) {
      asyncPaidHolidayGenerator();
    }
  }

  async function asyncPaidHolidayGenerator() {
    logger.info("-----RUN puppeteer : asyncPaidHolidayGenerator");
    const browser = await puppeteer.launch(
      (process.env.NODE_ENV === "dev") ? devOption : prodOption
    ).then(async browser => {
      const page = (await browser.pages())[0];

      //그룹웨어 로그인페이지
      await page.goto(process.env.GW_LOGIN_URL, { waitUntil: "domcontentloaded" });

      try {
        var isPaidHoliday = false;

        const userId = process.env.YOUR_ID;
        const userPassword = process.env.YOUR_PW;

        //로그인 데이터 입력 및 전송
        await page.$eval(process.env.LOGIN_USERNAME, (el, userId) => { el.value = userId }, userId);
        await page.$eval(process.env.LOGIN_PASSWORD, (el, userPassword) => { el.value = userPassword }, userPassword);
        await page.click(process.env.LOGIN_SUBMIT);

        //10초 슬립
        await page.waitFor(10000);

        //json api이용 하기전 셋팅
        await page.setRequestInterception(true);
        page.on("request", interceptedRequest => {
          interceptedRequest.continue({
            method: "GET",
            headers: { "Content-Type": "application/json" }
          });
        });

        //로그인 세션정보 API
        await logger.info("-----[API_1]START Get User Session");
        var userUniqueID = "";
        const sessionAPI = process.env.GW_USER_SESSION;
        const sessionResponse = await page.goto(sessionAPI);
        const resultSessionJSON = await JSON.parse(await sessionResponse.text());

        if(resultSessionJSON !== null && await resultSessionJSON.code === '200'){
          var _data = await resultSessionJSON.data;
          if(_data !== null){
            userUniqueID = String(_data.id);
          }
        }
        await logger.info("-----[API_1]END Get User Session, USER_UNIQUE_ID:["+ userUniqueID +"]");

        //일정정보 API
        await logger.info("-----[API_2]START Get User Calendar Information");
        var userCalendarId = "";
        var userCalendarAPI = process.env.GW_USER_CALENDAR;
        userCalendarAPI = userCalendarAPI.replace("{id}", userUniqueID);
        const userCalendarResponse = await page.goto(userCalendarAPI);
        const resultUserCalJSON = await JSON.parse(await userCalendarResponse.text());

        if(await resultUserCalJSON !== null && await resultUserCalJSON.code === '200'){
          var _data = await resultUserCalJSON.data;
          await Promise.all([
            _data.every(async function(ele, idx){
              var _id = ele.id;
              var _name = ele.name;
              var isContinue = true;
              if("내 일정" === _name){
                userCalendarId = _id;
                isContinue = false;
              }else{
                isContinue= true;
              }
              return isContinue;
            })
          ]);
        }
        await logger.info("-----[API_2]END Get User Calendar Information, USER CALENDAR ID:[" + userCalendarId + "]");

        //연차 정보 API
        await logger.info("-----[API_3]START CHECK PAID HOLIDAY");
        var calendarAPI = process.env.GW_API_CALENDAR_EVENT;
        var _time = moment().tz("Asia/Seoul").format("YYYY-MM-DD");

        calendarAPI = calendarAPI + 'timeMin=' + _time + '&timeMax=' + _time + '&calendarIds%5B%5D=' + userCalendarId;

        //연차 여부 체크
        const holidayResponse = await page.goto(calendarAPI);
        const resultHolidayJSON = await JSON.parse(await holidayResponse.text());

        if(resultHolidayJSON !== null && await resultHolidayJSON.code === '200' && userUniqueID !== ""){
          var _data = await resultHolidayJSON.data;
          await Promise.all([
            _data.every(async function(ele, idx){
              var _cId = ele.calendarId;
              var _cIsContinue = true;
              if(_cId === userCalendarId){
                _cIsContinue = false;
                isPaidHoliday = true;
              }else{
                _cIsContinue= true;
              }
              return _cIsContinue;
            })
          ]);
        }

        await logger.info("-----[API_3]END CHECK PAID HOLIDAY, isPaidHoliday:[" + isPaidHoliday + "]");

        const dirFullPath = `${appRoot}` + '/holiday/'
        const fileFullPath = dirFullPath + "paid-holiday.json";
        if( !fs.existsSync(dirFullPath) ){
          fs.mkdirSync(dirFullPath);
        }
        const today = String(moment().tz("Asia/Seoul").format("YYYYMMDD"));
        var obj = {};
        obj[today] = isPaidHoliday;
        fs.writeFileSync(fileFullPath, JSON.stringify(obj));
      } catch (e) {
        await logger.error(e);
      } finally {
        await browser.close();
        await logger.info("-----EXIT puppeteer : asyncRunPuppeteer4WorkOnOff");
      }
    });
  };

}

module.exports.paidHoliday = paidHoliday;
