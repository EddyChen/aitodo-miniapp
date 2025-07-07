const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    webviewUrl: 'https://todo.chenrf.top',
    webviewLoading: true,
    webviewError: false,
    showUserPanel: false
  },

  onLoad: function () {
    console.log('[Index] 首页加载')
    
    // 获取用户信息
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
      console.log('[Index] 用户信息已存在:', app.globalData.userInfo)
    } else {
      console.log('[Index] 用户信息不存在，跳转到授权页面')
      // 如果没有用户信息，跳转到授权页面
      wx.redirectTo({
        url: '/pages/auth/auth'
      })
    }
  },

  onShow: function () {
    console.log('[Index] 首页显示')
  },

  onReady: function () {
    console.log('[Index] 首页渲染完成')
  },

  // webview相关事件处理
  onWebviewLoad: function (e) {
    console.log('[Index] WebView加载完成', e.detail)
    this.setData({
      webviewLoading: false,
      webviewError: false
    })
    
    wx.showToast({
      title: '加载完成',
      icon: 'success',
      duration: 1500
    })
  },

  onWebviewError: function (e) {
    console.error('[Index] WebView加载失败', e.detail)
    this.setData({
      webviewLoading: false,
      webviewError: true
    })
    
    wx.showModal({
      title: '加载失败',
      content: '网页加载失败，请检查网络连接或稍后重试',
      showCancel: true,
      cancelText: '重试',
      confirmText: '确定',
      success: (res) => {
        if (res.cancel) {
          // 重试加载
          this.reloadWebview()
        }
      }
    })
  },

  onWebviewMessage: function (e) {
    console.log('[Index] 收到WebView消息', e.detail)
  },

  // 重新加载webview
  reloadWebview: function () {
    console.log('[Index] 重新加载WebView')
    this.setData({
      webviewLoading: true,
      webviewError: false
    })
    
    // 刷新webview，通过修改url参数强制刷新
    const timestamp = Date.now()
    const separator = this.data.webviewUrl.includes('?') ? '&' : '?'
    this.setData({
      webviewUrl: `https://todo.chenrf.top${separator}_t=${timestamp}`
    })
  },

  // 切换用户面板显示
  toggleUserPanel: function () {
    this.setData({
      showUserPanel: !this.data.showUserPanel
    })
  },

  // 重新授权
  reauth: function () {
    wx.redirectTo({
      url: '/pages/auth/auth'
    })
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: `${this.data.userInfo.nickName}邀请你使用AI待办助理`,
      path: '/pages/auth/auth',
      imageUrl: '/images/share.png' // 可以添加分享图片
    }
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: 'AI待办助理 - 您的智能待办事项管理助手',
      query: 'from=timeline',
      imageUrl: '/images/share.png' // 可以添加分享图片
    }
  }
}) 