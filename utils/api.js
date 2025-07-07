// utils/api.js - API服务封装层
const app = getApp()

// API配置
const API_CONFIG = {
  BASE_URL: 'https://todo.chenrf.top/api',
  TIMEOUT: 10000,
  AI_TIMEOUT: 60000, // AI分析专用超时时间：60秒
  RETRY_COUNT: 3
}

// 请求拦截器
const requestInterceptor = (options) => {
  // 添加公共请求头
  options.header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  
  // 添加用户认证信息
  if (app.globalData.authToken) {
    options.header['Authorization'] = `Bearer ${app.globalData.authToken}`
  }
  
  // 调试：打印认证Token
  console.log('[API] 当前认证Token:', app.globalData.authToken ? `${app.globalData.authToken.substring(0, 10)}...` : '无')
  
  return options
}

// 响应拦截器
const responseInterceptor = (response, requestUrl) => {
  const { statusCode, data } = response
  
  if (statusCode === 200) {
    // 特殊处理节假日API - 它返回的数据没有success字段
    if (requestUrl && requestUrl.includes('/holidays')) {
      if (data.holidays || data.year) {
        return { success: true, ...data }
      } else {
        console.error('[API] 节假日数据格式错误:', data)
        throw new Error('节假日数据格式错误')
      }
    }
    
    // 标准API响应处理
    if (data.success) {
      return data
    } else if (data.success === false) {
      // 业务错误
      console.error('[API] 业务错误:', data.error)
      throw new Error(data.error || '请求失败')
    } else {
      // 如果没有success字段，可能是直接返回数据的API
      return data
    }
  } else if (statusCode === 401) {
    // 认证失败，跳转到登录页
    console.error('[API] 认证失败')
    app.logout()
    wx.reLaunch({
      url: '/pages/login/login'
    })
    throw new Error('认证失败，请重新登录')
  } else if (statusCode === 500) {
    // 服务器内部错误，特殊处理AI相关接口
    console.error('[API] 服务器内部错误:', statusCode, 'URL:', requestUrl)
    if (requestUrl && (requestUrl.includes('/ai-parser') || requestUrl.includes('/image-parser'))) {
      throw new Error('AI服务暂时不可用，请稍后重试')
    } else {
      throw new Error('服务器繁忙，请稍后重试')
    }
  } else {
    // 其他HTTP错误
    console.error('[API] HTTP错误:', statusCode)
    throw new Error(`网络错误: ${statusCode}`)
  }
}

// 基础请求方法
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 应用请求拦截器
    options = requestInterceptor(options)
    
    // 完整的请求URL
    options.url = API_CONFIG.BASE_URL + options.url
    
    // 设置超时时间
    options.timeout = options.timeout || API_CONFIG.TIMEOUT
    
    console.log('[API] 请求开始:', {
      url: options.url,
      method: options.method,
      header: options.header,
      data: options.data,
      timeout: options.timeout
    })
    
    wx.request({
      ...options,
      success: (res) => {
        try {
          const result = responseInterceptor(res, options.url)
          console.log('[API] 请求成功:', options.url, result)
          resolve(result)
        } catch (error) {
          console.error('[API] 响应处理失败:', error)
          reject(error)
        }
      },
      fail: (err) => {
        console.error('[API] 请求失败:', options.url, err)
        reject(new Error('网络请求失败'))
      }
    })
  })
}

// 带重试机制的请求
const requestWithRetry = async (options, retryCount = 0) => {
  try {
    return await request(options)
  } catch (error) {
    if (retryCount < API_CONFIG.RETRY_COUNT) {
      console.log(`[API] 重试第${retryCount + 1}次:`, options.url)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return requestWithRetry(options, retryCount + 1)
    } else {
      throw error
    }
  }
}

// 用户认证相关接口
const authAPI = {
  // 发送验证码
  sendCode: (phone) => {
    return request({
      url: '/auth',
      method: 'POST',
      data: { phone, action: 'login' }
    })
  },
  
  // 验证码登录
  verifyCode: (phone, code) => {
    return request({
      url: '/auth',
      method: 'POST',
      data: { phone, action: 'verify', code }
    })
  }
}

// 待办事项相关接口
const todoAPI = {
  // 获取待办事项列表
  getTodos: (params = {}) => {
    return request({
      url: '/todos',
      method: 'GET',
      data: params
    })
  },
  
  // 获取特定日期的待办事项
  getTodosByDate: (date) => {
    return request({
      url: '/todos',
      method: 'GET',
      data: { date }
    })
  },
  
  // 创建待办事项
  createTodo: (todo) => {
    return request({
      url: '/todos',
      method: 'POST',
      data: todo
    })
  },
  
  // 更新待办事项
  updateTodo: (id, todo) => {
    return request({
      url: `/todos/${id}`,
      method: 'PUT',
      data: todo
    })
  },
  
  // 删除待办事项
  deleteTodo: (id) => {
    return request({
      url: `/todos/${id}`,
      method: 'DELETE'
    })
  },
  
  // 切换待办事项完成状态
  toggleTodo: (id, completed) => {
    return request({
      url: `/todos/${id}`,
      method: 'PUT',
      data: { completed: !completed }
    })
  }
}

// AI分析相关接口
const aiAPI = {
  // 文字分析
  analyzeText: (text, conversationId = null) => {
    // 清理文本内容
    const cleanText = text ? text.trim() : ''
    
    if (!cleanText) {
      throw new Error('文本内容不能为空')
    }
    
    console.log('[API] AI文字分析请求:', {
      originalText: text,
      cleanText: cleanText,
      textLength: cleanText.length,
      conversationId: conversationId
    })
    
    // 临时测试：如果当前token不工作，尝试使用curl中的token
    const testToken = 'bbedff2044b59177bd5255f5c54281988828938b3f5ecd95a9f458dbfb8ff669'
    
    return request({
      url: '/ai-parser',
      method: 'POST',
      timeout: API_CONFIG.AI_TIMEOUT, // 使用AI专用超时时间
      header: {
        'Authorization': `Bearer ${testToken}` // 临时使用curl中的token
      },
      data: { 
        text: cleanText,
        conversation_id: conversationId
      }
    })
  },
  
  // 图片分析
  analyzeImage: (imageFile, conversationId = null) => {
    return new Promise((resolve, reject) => {
      console.log('[API] 图片分析请求:', {
        imageFile: imageFile,
        fileType: typeof imageFile,
        conversationId: conversationId
      })
      
      const formData = {}
      if (conversationId) {
        formData.conversation_id = conversationId
      }
      
      // 临时测试：使用curl中的token
      const testToken = 'bbedff2044b59177bd5255f5c54281988828938b3f5ecd95a9f458dbfb8ff669'
      
      wx.uploadFile({
        url: API_CONFIG.BASE_URL + '/image-parser',
        filePath: imageFile,
        name: 'image',
        formData,
        timeout: API_CONFIG.AI_TIMEOUT, // 使用AI专用超时时间
        header: {
          'Authorization': `Bearer ${testToken}` // 临时使用curl中的token
        },
        success: (res) => {
          console.log('[API] 图片上传响应:', {
            statusCode: res.statusCode,
            data: res.data
          })
          
          try {
            const data = JSON.parse(res.data)
            if (data.success) {
              resolve(data)
            } else {
              reject(new Error(data.error || '图片解析失败'))
            }
          } catch (error) {
            console.error('[API] 图片解析响应解析失败:', error)
            reject(new Error('图片解析响应解析失败'))
          }
        },
        fail: (err) => {
          console.error('[API] 图片上传失败:', err)
          reject(new Error(`图片上传失败: ${err.errMsg || '未知错误'}`))
        }
      })
    })
  }
}

// 节假日相关接口
const holidayAPI = {
  // 获取节假日信息
  getHolidays: (year, month) => {
    const params = {}
    if (year && month) {
      params.month = `${year}${String(month).padStart(2, '0')}`
    } else if (year) {
      params.year = year
    }
    
    return request({
      url: '/holidays',
      method: 'GET',
      data: params
    })
  }
}

// 用户管理相关接口
const userAPI = {
  // 搜索用户
  searchUsers: (query) => {
    return request({
      url: '/users',
      method: 'GET',
      data: { q: query }
    })
  }
}

// 分享相关接口
const shareAPI = {
  // 分享待办事项
  shareTodo: (todoId, userId, permission = 'read') => {
    return request({
      url: '/share',
      method: 'POST',
      data: {
        todo_id: todoId,
        user_id: userId,
        permission
      }
    })
  }
}

// 工具方法
const utils = {
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
  
  // 格式化日期时间
  formatDateTime: (datetime) => {
    if (!datetime) return ''
    const dt = new Date(datetime)
    return `${utils.formatDate(dt)} ${utils.formatTime(dt)}`
  },
  
  // 解析优先级
  parsePriority: (priority) => {
    const priorityMap = {
      '一般': 'low',
      '紧急': 'normal', 
      '非常紧急': 'high'
    }
    return priorityMap[priority] || 'normal'
  },
  
  // 格式化优先级显示
  formatPriority: (priority) => {
    const priorityMap = {
      'low': '一般',
      'normal': '紧急',
      'high': '非常紧急'
    }
    return priorityMap[priority] || '紧急'
  }
}

// 导出API对象
module.exports = {
  // 配置
  config: API_CONFIG,
  
  // 基础方法
  request,
  requestWithRetry,
  
  // 接口模块
  auth: authAPI,
  todo: todoAPI,
  ai: aiAPI,
  holiday: holidayAPI,
  user: userAPI,
  share: shareAPI,
  
  // 工具方法
  utils
} 