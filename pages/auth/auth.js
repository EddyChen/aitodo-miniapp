const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    loading: false
  },

  onLoad: function () {
    console.log('[Auth] 授权页面加载')
    
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    // 检查是否已经有用户信息
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
      // 已有用户信息，直接跳转
      setTimeout(() => {
        this.navigateToIndex()
      }, 1000)
    }
  },

  getUserProfile: function(e) {
    console.log('[Auth] 开始获取用户信息')
    this.setData({
      loading: true
    })
    
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    wx.getUserProfile({
      desc: '用于完善用户资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log('[Auth] 获取用户信息成功', res.userInfo)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true,
          loading: false
        })
        app.globalData.userInfo = res.userInfo
        app.globalData.hasUserInfo = true
        
        // 获取成功后跳转到首页
        wx.showToast({
          title: '授权成功',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          this.navigateToIndex()
        }, 1500)
      },
      fail: (err) => {
        console.error('[Auth] 获取用户信息失败', err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '授权失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  navigateToIndex: function() {
    console.log('[Auth] 跳转到首页')
    wx.redirectTo({
      url: '/pages/index/index',
      success: () => {
        console.log('[Auth] 跳转成功')
      },
      fail: (err) => {
        console.error('[Auth] 跳转失败', err)
      }
    })
  },

  onShareAppMessage: function () {
    return {
      title: 'AI待办助理',
      path: '/pages/auth/auth'
    }
  }
}) 