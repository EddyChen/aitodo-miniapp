const app = getApp()
const api = require('../../utils/api')
const { validatePhone, showLoading, hideLoading, showSuccess, showError, navigateUtils } = require('../../utils/common')

Page({
  data: {
    phoneNumber: '',
    verificationCode: '',
    step: 1, // 1: 输入手机号, 2: 输入验证码
    loading: false,
    agreed: false,
    countdown: 0,
    resendEnabled: true
  },

  onLoad: function () {
    console.log('[Login] 登录页面加载')
    
    // 检查是否已经登录
    if (app.globalData.isLoggedIn) {
      console.log('[Login] 用户已登录，跳转到日历页')
      navigateUtils.toCalendar()
      return
    }
    
    // 获取应用信息
    this.getAppInfo()
  },

  onShow: function () {
    console.log('[Login] 登录页面显示')
  },

  // 获取应用基础信息
  getAppInfo: function () {
    try {
      const appInfo = wx.getAppBaseInfo()
      const deviceInfo = wx.getDeviceInfo()
      const windowInfo = wx.getWindowInfo()
      
      const systemInfo = {
        ...appInfo,
        ...deviceInfo,
        ...windowInfo
      }
      
      this.setData({
        systemInfo: systemInfo
      })
      console.log('[Login] 应用信息:', systemInfo)
    } catch (error) {
      console.warn('[Login] 获取应用信息失败:', error)
    }
  },

  // 输入手机号
  onPhoneInput: function (e) {
    const phoneNumber = e.detail.value.replace(/\D/g, '') // 只保留数字
    this.setData({
      phoneNumber: phoneNumber.slice(0, 11) // 限制11位
    })
  },

  // 输入验证码
  onCodeInput: function (e) {
    const verificationCode = e.detail.value.replace(/\D/g, '') // 只保留数字
    this.setData({
      verificationCode: verificationCode.slice(0, 6) // 限制6位
    })
  },

  // 同意协议
  onAgreeChange: function (e) {
    this.setData({
      agreed: e.detail.value.length > 0
    })
  },

  // 查看用户协议
  onViewAgreement: function () {
    wx.showModal({
      title: '用户协议',
      content: '这是用户协议的内容。我们会保护您的隐私，不会泄露您的个人信息。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 查看隐私政策
  onViewPrivacy: function () {
    wx.showModal({
      title: '隐私政策',
      content: '这是隐私政策的内容。我们严格遵守相关法律法规，保护用户隐私。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 发送验证码
  onSendCode: function () {
    if (this.data.loading) return
    
    if (!this.data.phoneNumber) {
      showError('请输入手机号')
      return
    }
    
    if (!validatePhone(this.data.phoneNumber)) {
      showError('请输入正确的手机号')
      return
    }
    
    if (!this.data.agreed) {
      showError('请先同意用户协议和隐私政策')
      return
    }

    this.sendVerificationCode()
  },

  // 发送验证码
  sendVerificationCode: async function () {
    this.setData({ loading: true })
    showLoading('正在发送验证码...')

    try {
      const result = await api.auth.sendCode(this.data.phoneNumber)
      
      hideLoading()
      this.setData({ 
        loading: false,
        step: 2 
      })
      
      // 显示调试验证码（生产环境应移除）
      if (result.debug_code) {
        showSuccess(`验证码已发送: ${result.debug_code}`)
        // 自动填入验证码（仅调试用）
        this.setData({
          verificationCode: result.debug_code
        })
      } else {
        showSuccess('验证码已发送')
      }
      
      // 开始倒计时
      this.startCountdown()
      
    } catch (error) {
      console.error('[Login] 发送验证码失败:', error)
      hideLoading()
      this.setData({ loading: false })
      showError(error.message || '发送验证码失败，请重试')
    }
  },

  // 验证码登录
  onVerifyCode: function () {
    if (this.data.loading) return
    
    if (!this.data.verificationCode) {
      showError('请输入验证码')
      return
    }
    
    if (this.data.verificationCode.length !== 6) {
      showError('请输入6位验证码')
      return
    }

    this.verifyCode()
  },

  // 验证验证码
  verifyCode: async function () {
    this.setData({ loading: true })
    showLoading('正在验证...')

    try {
      const result = await api.auth.verifyCode(this.data.phoneNumber, this.data.verificationCode)
      
      // 保存登录信息
      const success = app.login(result.token, result.user)
      
      if (success) {
        hideLoading()
        showSuccess('登录成功')
        
        // 跳转到日历页
        setTimeout(() => {
          navigateUtils.toCalendar()
        }, 1500)
      } else {
        throw new Error('保存登录信息失败')
      }
      
    } catch (error) {
      console.error('[Login] 验证失败:', error)
      hideLoading()
      this.setData({ loading: false })
      showError(error.message || '验证失败，请重试')
    }
  },

  // 重新发送验证码
  onResendCode: function () {
    if (!this.data.resendEnabled) return
    this.sendVerificationCode()
  },

  // 返回上一步
  onBackStep: function () {
    this.setData({
      step: 1,
      verificationCode: '',
      countdown: 0,
      resendEnabled: true
    })
  },

  // 开始倒计时
  startCountdown: function () {
    this.setData({
      countdown: 60,
      resendEnabled: false
    })

    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      this.setData({ countdown })

      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({
          resendEnabled: true,
          countdown: 0
        })
      }
    }, 1000)
  },



  // 客服联系
  onContactService: function () {
    wx.showModal({
      title: '联系客服',
      content: '如遇问题，请通过以下方式联系我们：\n\n微信：your_wechat\n邮箱：your_email@example.com',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: 'AI待办助理 - 智能管理您的待办事项',
      path: '/pages/login/login',
      imageUrl: '/images/share.png'
    }
  }
}) 