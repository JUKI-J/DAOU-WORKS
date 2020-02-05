'use strict'

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const logger = require('./config/winston');
const moment = require('moment-timezone');

const workOnOff = async () => {

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
          if (today.toString() === el.locdate.toString()) {
            isWorkDays = false;
            return;
          }
        });
      }else{
        if (today.toString() === dataJson.locdate.toString()) {
          isWorkDays = false;
        }
      }
    }else{
      data = "{}";
    }

    await logger.debug("-----DONE read JSON File >>> isWorkDays : [" + isWorkDays + "]");

    if (isWorkDays) {
      var currenttime = moment().tz("Asia/Seoul").format("HHmmSS");
      var status = "";
      var time = parseInt(currenttime);

      if (time > 80000 && time < 90000) {
        //출근(08:00 ~ 09:00)
        status = "workIn";
      } else if (time > 180000 && time < 190000) {
        //퇴근(18:00 ~ 19:00)
        status = "workOut";
      } else {
        status = "none";
      }
      asyncRunPuppeteer4WorkOnOff(status);
    }
  }

  async function asyncRunPuppeteer4WorkOnOff(status) {
    logger.info("-----RUN puppeteer : asyncRunPuppeteer4WorkOnOff[status:" + status + "]");
    const browser = await puppeteer.launch(
      (process.env.NODE_ENV === "dev") ? devOption : prodOption
    ).then(async browser => {
      const page = (await browser.pages())[0];

      //그룹웨어 로그인페이지
      await page.goto(process.env.GW_LOGIN_URL, { waitUntil: "domcontentloaded" });

      try {
        var selectorId = '';
        var isPaidHoliday = false;

        const userId = process.env.YOUR_ID;
        const userPassword = process.env.YOUR_PW;

        //로그인 데이터 입력 및 전송
        await page.$eval(process.env.LOGIN_USERNAME, (el, userId) => { el.value = userId }, userId);
        await page.$eval(process.env.LOGIN_PASSWORD, (el, userPassword) => { el.value = userPassword }, userPassword);
        await page.click(process.env.LOGIN_SUBMIT);

        //10초 슬립
        await page.waitFor(10000);

        //휴가유무 확인 파일
        const fileFullPath = "./holiday/paid-holiday.json";
        var paidData;

        try{
          paidData = fs.readFileSync(fileFullPath, 'utf8');
        }catch(e){
          await logger.debug("-----File Not Found >>> [" + fileFullPath + "]");
          paidData = "";
        }

        if (paidData !== '' && paidData !== "undefined") {
          const today = new String(moment().tz("Asia/Seoul").format("YYYYMMDD"));
          var dataJson = await JSON.parse(data);
          isPaidHoliday = (dataJson[today] === true) ? true : false;
        }
        await logger.info("-----isPaidHoliday :: [isPaidHoliday:"+isPaidHoliday+"]");

        //근태관리페이지 이동
        await page.goto(process.env.GW_WORK_URL, { waitUntil: "domcontentloaded" });

        //10초 슬립 
        await page.waitFor(10000);

        //상태별 출퇴근 처리
        if (status === "workIn") {
          selectorId = process.env.WORK_IN;
        } else if (status === "workOut") {
          selectorId = process.env.WORK_OUT;
        } else {
          await logger.info("-----Click :: Nothing to click");
        }

        if (selectorId !==  '' && await page.$(selectorId) !== null && isPaidHoliday === false) {
          const el = await page.$(selectorId);
          if(isPaidHoliday === false){
            await logger.info("-----FOUND & CLICK :: [selectorId:"+selectorId+"]");
            await el.click();
          }
        } else {
          await logger.info('-----NOT FOUND selectorId : [' + selectorId + ']');
        }
        
      } catch (e) {
        await logger.error(e);
      } finally {
        await browser.close();
        await logger.info("-----EXIT puppeteer : asyncRunPuppeteer4WorkOnOff");
      }
    });
  };

}

module.exports.workOnOff = workOnOff;
