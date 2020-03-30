
import request from 'request'
const baseUrl = 'https://api.live.bilibili.com'
export default function (options, cookieObj) {
  const headers = options.headers || {}
  if (cookieObj) {
    let cookieStr = ''
    Object.keys(cookieObj).forEach(key => {
      cookieStr += `${key}=${cookieObj[key]};`
    })
    headers.Cookie = cookieStr
  }
  const config = Object.assign({ baseUrl }, options, { headers })
  return new Promise((resolve, reject) => {
    request(config, (error, res, body) => {
      if (!error && res.statusCode === 200) {
        console.log('request', JSON.parse(body))
        resolve(JSON.parse(body))
      } else {
        console.log('request', error)
        reject(error)
      }
    })
  })
}
