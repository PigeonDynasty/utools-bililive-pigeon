<template>
  <div id="app">
    <div class="ws-top">
      <label>房间号：</label>
      <input
        type="text"
        class="input-room"
        placeholder="房间号"
        v-model="roomId"
      >
      <button
        class="btn-link"
        @click="link"
      >{{isLink?'断开':'连接'}}</button>
    </div>
    <div
      ref="danmuBox"
      class="ws-box"
    >
      <div
        class="ws-item"
        v-for="(msg,index) in danmuShow"
        :key="index"
        v-html="msg"
      />
    </div>
  </div>
</template>

<script>
import { getTrueRoomId, getUserInfo } from './api'
import DanmakuClient from 'bilibili-danmaku-client'
export default {
  name: 'App',
  data: () => ({
    roomId: null,
    isLink: false,
    popularity: 0, // 人气值
    filterKey: '', // 弹幕池过滤
    wsMessages: ['请先连接房间'], // 弹幕池
    WebSocket: null,
  }),
  computed: {
    danmuShow () {
      return this.wsMessages
        .filter(msg => msg.indexOf(this.filterKey) > -1)
        .map(msg => {
          if (!this.filterKey) {
            return msg
          }
          // 匹配关键字正则
          const replaceReg = new RegExp(this.filterKey, 'g')
          // 高亮替换v-html值
          const replaceHtml =
            '<span class="highlight-text">' + this.filterKey + '</span>'
          // 开始替换
          return msg.replace(replaceReg, replaceHtml)
        })
    },
  },
  destroyed () {
    this.disconnectRoom()
  },
  methods: {
    link () {
      this.isLink ? this.disconnectRoom() : this.getTrueRoom()
    },
    // 获取真实房间号
    getTrueRoom () {
      const reg = /^[0-9]*$/
      if (!this.roomId || !reg.test(this.roomId)) {
        this.pushMessage({
          name: 'local',
          text: '请输入正确的房间号'
        })
        return
      }
      this.pushMessage({
        name: 'local',
        text: '连接中...'
      })
      getTrueRoomId(this.roomId)
        .then(res => {
          if (res.msg === 'ok') {
            this.pushMessage({
              name: 'local',
              text: `真实房间号:${res.data.room_id}`
            })
            // 开始连接
            this.linkRoom(res.data.room_id)
          } else {
            this.pushMessage({
              name: 'local',
              text: '房间号无效'
            })
          }
        })
        .catch(() => {
          this.pushMessage({
            name: 'local',
            text: '连接失败'
          })
        })
    },
    // 连接房间 弹幕池
    linkRoom (roomid) {
      this.WebSocket = new DanmakuClient(roomid)
      this.WebSocket.start()
      this.WebSocket.on('open', () => {
        this.isLink = true
      })
      this.WebSocket.on('close', () => {
        this.WebSocket = null
        this.pushMessage({
          name: 'local',
          text: '连接已断开'
        })
        this.isLink = false
      })
      this.WebSocket.on('event', (obj) => {
        this.pushMessage(obj)
      })
    },
    async pushMessage (obj) {
      let html = ''
      switch (obj.name) {
        case 'local': {
          html = `<span class="local">${obj.text}</span>`
          break
        }
        case 'danmaku':
          {
            const text = obj.content.content,
              uname = obj.content.sender.name,
              uface = await this.getUserFace(obj.content.sender.uid)
            html = `<span class="user-face" style="background-image:url(${uface})"></span>
                <span class="user-name">${uname}</span>
                ：${text}
                `
            break;
          }
        case 'gift':
          {
            const { name, face } = obj.content.sender,
              { action, num } = obj.content,
              giftname = obj.content.gift.name
            html = `<span class="user-face" style="background-image:url(${face})"></span>
               感谢
               <span class="user-name">${name}</span>
                <span class="gift-action">${action}</span>
                ${num}个
                <span class="gift-name">${giftname}</span>
                `
            break;
          }
      }
      this.wsMessages.push(html)
      // 滚动到底部
      this.$nextTick(() => {
        this.$refs.danmuBox.scrollTop = this.$refs.danmuBox.scrollHeight
      })
    },
    // 获取用户头像
    getUserFace (uid) {
      return getUserInfo(uid).then(res => {
        return res.data.face
      })
    },
    // 断开连接
    disconnectRoom () {
      if (this.WebSocket) {
        this.WebSocket.terminate()
      }
    }
  }
}
</script>

<style>
html,
body {
  height: 100%;
  margin: 0;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: calc(100% - 11px);
  padding: 8px;
}
.ws-top {
  display: inline-flex;
  align-items: center;
  margin-bottom: 8px;
}
.ws-top label {
  height: 30px;
  line-height: 30px;
  font-size: 16px;
}
.ws-top .input-room {
  height: 28px;
  margin-right: 10px;
  padding: 0 5px;
  border: 1px solid #ddd;
  border-radius: 5px;
}
.ws-top .btn-link {
  height: 30px;
  padding: 0 10px;
  background: #66ccff;
  color: #fff;
  box-shadow: none;
  border: none;
  border-radius: 5px;
}
.ws-box {
  height: 100%;
  overflow: auto;
}
.ws-item {
  display: flex;
  align-items: center;
  color: #fff;
  text-shadow: -2px -2px #333, -2px -1px #333, -2px 0 #333, -2px 1px #333,
    -2px 2px #333, -1px -2px #333, -1px -1px #333, -1px 0 #333, -1px 1px #333,
    -1px 2px #333, 0 -2px #333, 0 -1px #333, 0 0 #333, 0 1px #333, 0 2px #333,
    1px -2px #333, 1px -1px #333, 1px 0 #333, 1px 1px #333, 1px 2px #333,
    2px -2px #333, 2px -1px #333, 2px 0 #333, 2px 1px #333, 2px 2px #333;
  font-size: 20px;
}
.ws-item .user-face {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 6px;
  background-size: cover;
}
.ws-item .user-name {
  color: #23ade5;
}
.ws-item .gift-actiion {
  color: #ffa000;
}
.ws-item .gift-name {
  color: #e040fb;
}
</style>
