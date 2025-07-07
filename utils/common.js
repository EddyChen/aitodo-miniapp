// utils/common.js - 通用工具函数库
const app = getApp()

// 手机号验证
const validatePhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 格式化手机号显示
const formatPhoneDisplay = (phone) => {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 日期相关工具
const dateUtils = {
  // 获取今天的日期字符串
  today: () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  },
  
  // 获取当前月份的第一天和最后一天
  getMonthRange: (year, month) => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    return {
      first: firstDay.getDate(),
      last: lastDay.getDate(),
      firstWeekday: firstDay.getDay()
    }
  },
  
  // 判断是否为今天
  isToday: (dateString) => {
    return dateString === dateUtils.today()
  },
  
  // 判断是否为同一天
  isSameDay: (date1, date2) => {
    return dateUtils.formatDate(date1) === dateUtils.formatDate(date2)
  },
  
  // 格式化日期
  formatDate: (date) => {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },
  
  // 格式化时间
  formatTime: (time) => {
    if (!time) return ''
    const t = new Date(time)
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  },
  
  // 格式化相对时间
  formatRelativeTime: (date) => {
    const now = new Date()
    const target = new Date(date)
    const diff = target - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '明天'
    if (days === -1) return '昨天'
    if (days > 0) return `${days}天后`
    return `${Math.abs(days)}天前`
  }
}

// 优先级相关工具
const priorityUtils = {
  // 优先级映射
  levels: {
    'low': { label: '一般', color: '#6b7280', bgColor: '#f3f4f6' },
    'normal': { label: '紧急', color: '#d97706', bgColor: '#fef3c7' },
    'high': { label: '非常紧急', color: '#dc2626', bgColor: '#fee2e2' }
  },
  
  // 获取优先级信息
  getInfo: (level) => {
    return priorityUtils.levels[level] || priorityUtils.levels.normal
  },
  
  // 排序函数
  sort: (todos) => {
    const order = { 'high': 3, 'normal': 2, 'low': 1 }
    return todos.sort((a, b) => {
      const aOrder = order[a.priority] || 1
      const bOrder = order[b.priority] || 1
      return bOrder - aOrder
    })
  },
  
  // 获取CSS类名
  getCssClass: (priority) => {
    const classMap = {
      'low': 'normal',
      'normal': 'urgent', 
      'high': 'very-urgent'
    }
    return classMap[priority] || 'urgent'
  }
}

// 存储相关工具
const storageUtils = {
  // 安全获取存储数据
  get: (key, defaultValue = null) => {
    try {
      const value = wx.getStorageSync(key)
      return value || defaultValue
    } catch (error) {
      console.error(`[Storage] 获取 ${key} 失败:`, error)
      return defaultValue
    }
  },
  
  // 安全设置存储数据
  set: (key, value) => {
    try {
      wx.setStorageSync(key, value)
      return true
    } catch (error) {
      console.error(`[Storage] 设置 ${key} 失败:`, error)
      return false
    }
  },
  
  // 安全删除存储数据
  remove: (key) => {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error(`[Storage] 删除 ${key} 失败:`, error)
      return false
    }
  },
  
  // 清空存储
  clear: () => {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('存储清空失败:', error)
      return false
    }
  }
}

// 防抖函数
const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 显示Loading
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏Loading
const hideLoading = () => {
  wx.hideLoading()
}

// 显示成功提示
const showSuccess = (title, duration = 1500) => {
  wx.showToast({
    title,
    icon: 'success',
    duration
  })
}

// 显示错误提示
const showError = (title, duration = 2000) => {
  wx.showToast({
    title,
    icon: 'error',
    duration
  })
}

// 显示普通提示
const showToast = (title, duration = 1500) => {
  wx.showToast({
    title,
    icon: 'none',
    duration
  })
}

// 显示确认对话框
const showConfirm = (options) => {
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: '',
      showCancel: true,
      ...options,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 图片选择工具
const imageUtils = {
  // 选择图片
  chooseImage: (count = 1, sourceType = ['album', 'camera']) => {
    return new Promise((resolve, reject) => {
      console.log('[ImageUtils] 开始选择图片:', { count, sourceType })
      
      wx.chooseImage({
        count: count,
        sizeType: ['compressed'],
        sourceType: sourceType,
        success: (res) => {
          console.log('[ImageUtils] 图片选择成功:', res)
          // 返回数组格式，保持一致性
          resolve(res.tempFilePaths)
        },
        fail: (err) => {
          console.error('[ImageUtils] 图片选择失败:', err)
          reject(err)
        }
      })
    })
  },
  
  // 预览图片
  previewImage: (urls, current = 0) => {
    wx.previewImage({
      urls: Array.isArray(urls) ? urls : [urls],
      current: Array.isArray(urls) ? urls[current] : urls
    })
  },
  
  // 保存图片到相册
  saveImageToPhotosAlbum: (filePath) => {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: resolve,
        fail: reject
      })
    })
  }
}

// 权限检查工具
const permissionUtils = {
  // 检查相机权限
  checkCamera: () => {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.camera'] === false) {
            wx.showModal({
              title: '需要相机权限',
              content: '请在设置中开启相机权限',
              showCancel: false,
              success: () => {
                wx.openSetting()
              }
            })
            resolve(false)
          } else {
            resolve(true)
          }
        }
      })
    })
  },
  
  // 检查相册权限
  checkAlbum: () => {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.writePhotosAlbum'] === false) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中开启相册权限',
              showCancel: false,
              success: () => {
                wx.openSetting()
              }
            })
            resolve(false)
          } else {
            resolve(true)
          }
        }
      })
    })
  },
  
  // 检查权限
  checkPermission: (scope) => {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          resolve(res.authSetting[scope] === true)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  },
  
  // 请求权限
  requestPermission: (scope) => {
    return new Promise((resolve) => {
      wx.authorize({
        scope: scope,
        success: () => {
          resolve(true)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  },
  
  // 打开设置页面
  openSetting: () => {
    return new Promise((resolve) => {
      wx.openSetting({
        success: (res) => {
          resolve(res.authSetting)
        },
        fail: () => {
          resolve({})
        }
      })
    })
  }
}

// 页面跳转工具
const navigateUtils = {
  // 跳转到登录页
  toLogin: () => {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },
  
  // 跳转到日历页
  toCalendar: () => {
    wx.reLaunch({
      url: '/pages/calendar/calendar'
    })
  },
  
  // 跳转到添加待办页
  toAddTodo: (params = {}) => {
    let url = '/pages/add-todo/add-todo'
    if (params.date) {
      url += `?date=${params.date}`
    }
    if (params.type) {
      url += `${params.date ? '&' : '?'}type=${params.type}`
    }
    wx.navigateTo({ url })
  },
  
  // 跳转到待办详情页
  toTodoDetail: (params = {}) => {
    if (!params.id) {
      console.error('待办事项ID不能为空')
      return
    }
    wx.navigateTo({
      url: `/pages/todo-detail/todo-detail?id=${params.id}`
    })
  },
  
  // 跳转到待办列表页
  toTodoList: (params = {}) => {
    let url = '/pages/todo-list/todo-list'
    const queries = []
    if (params.date) queries.push(`date=${params.date}`)
    if (params.status) queries.push(`status=${params.status}`)
    if (params.priority) queries.push(`priority=${params.priority}`)
    if (queries.length > 0) {
      url += `?${queries.join('&')}`
    }
    wx.navigateTo({ url })
  },
  
  // 跳转到AI分析页
  toAiAnalysis: (params = {}) => {
    let url = '/pages/ai-analysis/ai-analysis'
    if (params.type) {
      url += `?type=${params.type}`
    }
    wx.navigateTo({ url })
  },
  
  // 跳转到我的页面
  toProfile: () => {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },
  
  // 跳转到设置页
  toSettings: () => {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },
  
  // 返回上一页
  goBack: () => {
    wx.navigateBack()
  },
  
  // 返回到首页
  toHome: () => {
    wx.switchTab({
      url: '/pages/calendar/calendar'
    })
  }
}

// 导出所有工具函数
module.exports = {
  // 验证工具
  validatePhone,
  formatPhoneDisplay,
  
  // 日期工具
  dateUtils,
  
  // 优先级工具
  priorityUtils,
  
  // 存储工具
  storageUtils,
  
  // 防抖节流
  debounce,
  throttle,
  
  // UI工具
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showToast,
  showConfirm,
  
  // 图片工具
  imageUtils,
  
  // 权限工具
  permissionUtils,
  
  // 导航工具
  navigateUtils
} 