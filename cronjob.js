'use strict'

const cronJob = require('cron').CronJob;
const logger = require('./config/winston');
const holiday = require('./holiday-generator');
const paidHoliday = require('./paid-holiday-generator');
const work = require('./work-on-off');

//01:00, 08:00, On the first of every month  
const holidayJob = new cronJob('0 0 1,8 1 * *', async () => {
  await logger.info("-----RUN CRON : holidayJob");
  await holiday.holiday();
  await logger.info("-----EXIT CRON : holidayJob");
}, undefined, true, "Asia/Seoul");

//08:20, 08:40, Mon-Fri
const paidHolidayJob = new cronJob('0 20,40 8 * * 1-5', async () => {
  await logger.info("-----RUN CRON : paidHolidayJob");
  await paidHoliday.paidHoliday();
  await logger.info("-----EXIT CRON : paidHolidayJob");
}, undefined, true, "Asia/Seoul");

//08:45, Mon-Fri
const workOn = new cronJob('0 45 8 * * 1-5', async () => {
  const _min = Math.floor(Math.random() * 10);
  await logger.info("-----RUN CRON : workOn, sleep on [" + _min + "] mins");
  await sleep(_min);
  await work.workOnOff();
  await logger.info("-----EXIT CRON : workOn");
}, undefined, true, "Asia/Seoul");

//18:07, Mon-Fri
const workOff = new cronJob('0 4 18 * * 1-5', async () => {
  const _min = Math.floor(Math.random() * 10);
  await logger.info("-----RUN CRON : workOff, sleep on [" + _min + "] mins");
  await sleep(_min);
  await work.workOnOff();
  await logger.info("-----EXIT CRON : workOff");
}, undefined, true, "Asia/Seoul");

const sleep = (min) => {
  return new Promise(resolve => setTimeout(resolve, min*1000) * 60);
}

holidayJob.start();
paidHolidayJob.start();
workOn.start();
workOff.start();
