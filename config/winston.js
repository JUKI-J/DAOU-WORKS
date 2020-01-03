const appRoot = require('app-root-path');
const winston = require('winston');
const process = require('process');
//const moment = require('moment');
const moment = require('moment-timezone');

const { combine, timestamp, label, printf } = winston.format;
 
const myFormat = printf(({ level, message, label}) => {
  return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss.SSS') + ` [${label}] ${level}: ${message}`;
});

const options = {
  // log파일
  file: {
    level: 'info',
    filename: `${appRoot}/logs/works.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: true,
    format: combine(
      label({ label: `${appRoot}` }),
      timestamp(),
      myFormat
    )
  },

  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
    format: combine(
      label({ label: `${appRoot}` }),
      timestamp(),
      myFormat
    )
  }
}
 
let logger = new winston.createLogger({
  format: combine(
    timestamp({
      format: moment().format('YYYY-MM-DD HH:mm:ss.SSS')
    })
  ),
  transports: [
    new winston.transports.File(options.file)
  ],
  exitOnError: false, 
});
 
if(process.env.NODE_ENV !== 'production'){
  logger.add(new winston.transports.Console(options.console))
}
 
module.exports = logger;
