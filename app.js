//app.js
App({
  onLaunch: function () {
    console.log('[App] AI待办助理启动')
    
    // 初始化存储
    this.initStorage()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  
  onShow: function () {
    console.log('[App] 应用显示')
  },
  
  onHide: function () {
    console.log('[App] 应用隐藏')
  },
  
  onError: function (msg) {
    console.error('[App] 应用错误', msg)
  },
  
  // 初始化存储
  initStorage: function() {
    try {
      // 初始化待办事项数据
      if (!wx.getStorageSync('todos')) {
        wx.setStorageSync('todos', [])
      }
      
      // 初始化用户设置
      if (!wx.getStorageSync('userSettings')) {
        wx.setStorageSync('userSettings', {
          notificationEnabled: true,
          defaultPriority: 'normal',
          customTags: []
        })
      }
      
      console.log('[App] 本地存储初始化完成')
    } catch (error) {
      console.error('[App] 存储初始化失败', error)
    }
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const authToken = wx.getStorageSync('authToken')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (authToken && userInfo) {
      this.globalData.authToken = authToken
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      console.log('[App] 用户已登录', userInfo.phone)
    } else {
      this.globalData.isLoggedIn = false
      console.log('[App] 用户未登录')
    }
  },
  
  // 用户登录
  login: function(authToken, userInfo) {
    try {
      wx.setStorageSync('authToken', authToken)
      wx.setStorageSync('userInfo', userInfo)
      
      this.globalData.authToken = authToken
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      
      console.log('[App] 用户登录成功', userInfo.phone)
      return true
    } catch (error) {
      console.error('[App] 登录失败', error)
      return false
    }
  },
  
  // 用户退出
  logout: function() {
    try {
      wx.removeStorageSync('authToken')
      wx.removeStorageSync('userInfo')
      
      this.globalData.authToken = null
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
      
      console.log('[App] 用户退出成功')
      return true
    } catch (error) {
      console.error('[App] 退出失败', error)
      return false
    }
  },
  
  // API请求封装
  request: function(options) {
    const { url, data, method = 'GET', header = {}, ...rest } = options
    
    return new Promise((resolve, reject) => {
      // 添加用户认证信息
      if (this.globalData.authToken) {
        header['X-Auth-Token'] = this.globalData.authToken
      }
      
      wx.request({
        url: this.globalData.apiBaseUrl + url,
        data,
        method,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: (res) => {
          console.log('[API] 请求成功', url, res.data)
          resolve(res.data)
        },
        fail: (err) => {
          console.error('[API] 请求失败', url, err)
          reject(err)
        },
        ...rest
      })
    })
  },
  
  globalData: {
    userInfo: null,
    authToken: null,
    isLoggedIn: false,
    apiBaseUrl: 'https://your-api-domain.com/api', // 需要配置实际的API地址
    todos: [],
    currentDate: null,
    holidays: {} // 缓存节假日数据
  }
}) 