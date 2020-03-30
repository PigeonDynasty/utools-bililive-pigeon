import request from './request'
// 获取真实的房间信息
export function getTrueRoomId (id) {
  return request({
    url: '/room/v1/Room/room_init',
    method: 'GET',
    qs: {
      id
    }
  })
}
// // 发送弹幕消息
// export function danmuSend (data, cookieObj) {
//   return request({
//     method: 'POST',
//     url: '/msg/send',
//     form: data
//   }, cookieObj)
// }

// 获取用户头像
export function getUserInfo (uid) {
  return request({
    // https://api.bilibili.com/x/space/acc/info?mid
    baseUrl: 'https://api.bilibili.com',
    url: `/x/space/acc/info?mid=${uid}`,
    method: 'GET',
  })
}