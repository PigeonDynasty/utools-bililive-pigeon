<template>
  <div id="app">
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
import DanmakuClient from '@/assets/bilibili-danmaku-client'
const utools = window.utools
export default {
  name: 'App',
  data: () => ({
    roomId: null,
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
    document.onkeydown = null
  },
  beforeCreate () {
    utools.onPluginEnter(() => {
      utools.setSubInput(({ text }) => {
        this.roomId = text
      }, "直播间号（支持短位）");
    });
    document.onkeydown = e => {
      switch (e.keyCode) {
        case 13:
          this.getTrueRoom();
          utools.subInputBlur()
          break;
        case 32:
          this.getTrueRoom();
          utools.subInputBlur()
          break;
      }
    }
  },
  methods: {
    // 获取真实房间号
    getTrueRoom () {
      if (this.WebSocket) {
        // this.WebSocket.room = res.data.room_id
        this.WebSocket.terminate()
        console.log(this.WebSocket)
        return
      }
      const reg = /^[0-9]*$/
      if (!this.roomId || !reg.test(this.roomId)) {
        this.pushMessage({
          name: 'local',
          text: '请检查所输入的房间号'
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
              text: '房间号无效，请检查'
            })
          }
        })
        .catch(() => {
          this.pushMessage({
            name: 'local',
            text: '连接失败,请重试'
          })
        })
    },
    // 连接房间 弹幕池
    linkRoom (roomid) {
      console.log(this.WebSocket)
      this.WebSocket = new DanmakuClient(roomid)
      this.WebSocket.start()
      this.WebSocket.on('open', () => {
        this.pushMessage({
          name: 'local',
          text: '连接成功'
        })
      })
      this.WebSocket.on('close', () => {
        this.WebSocket = null
        this.pushMessage({
          name: 'local',
          text: '旧连接已断开'
        })
        this.getTrueRoom()
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
              uname = obj.content.sender.name
            let uface
            try {
              uface = await this.getUserFace(obj.content.sender.uid)
            } catch{
              uface = "http://i0.hdslb.com/bfs/face/member/noface.jpg"
            }
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
.ws-box {
  height: 100%;
  overflow: auto;
  padding: 0 8px;
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
