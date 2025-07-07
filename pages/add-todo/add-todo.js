const app = getApp()
const api = require('../../utils/api')
const common = require('../../utils/common')
const { dateUtils, showLoading, hideLoading, showSuccess, showError, showToast, imageUtils } = common
const { formatDate, formatTime } = dateUtils

Page({
  data: {
    // 表单数据
    form: {
      title: '',
      description: '',
      due_date: '',
      due_time: '',
      priority: '紧急',
      tags: [],
      involved_users: [],
      reminder_enabled: true,
      reminder_method: '系统通知'
    },
    
    // 页面状态
    loading: false,
    mode: 'ai-image', // manual, ai-text, ai-image
    
    // 日期时间选择
    datePickerValue: '',
    timePickerValue: '',
    
    // 优先级选项
    priorityOptions: [
      { label: '一般', value: '一般', color: '#64748b' },
      { label: '紧急', value: '紧急', color: '#f59e0b' },
      { label: '非常紧急', value: '非常紧急', color: '#ef4444' }
    ],
    
    // 提醒方式选项
    reminderOptions: [
      { label: '系统通知', value: '系统通知' },
      { label: '短信提醒', value: '短信提醒' },
      { label: '邮件提醒', value: '邮件提醒' }
    ],
    
    // 常用标签
    commonTags: ['工作', '生活', '学习', '健康', '家庭', '出行', '购物', '娱乐'],
    
    // AI分析相关
    aiAnalysisText: '',
    conversationId: null,
    
    // 图片相关
    selectedImage: null,
    
    // 多个待办事项管理
    extractedTodos: [], // 从AI识别出的所有待办事项
    currentTodoIndex: 0, // 当前正在处理的待办事项索引
    
    // 涉及人员
    involvedUsers: [],
    searchUserKeyword: '',
    
    // 表单验证
    formValid: false
  },

  onLoad: function (options) {
    console.log('[AddTodo] 添加待办页面加载', options)
    
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      this.navigateToLogin()
      return
    }
    
    // 处理传入的参数
    this.handleOptions(options)
  },

  onShow: function () {
    console.log('[AddTodo] 添加待办页面显示')
  },

  onReady: function () {
    console.log('[AddTodo] 添加待办页面就绪')
  },

  onUnload: function () {
    console.log('[AddTodo] 添加待办页面卸载')
    // 清理可能的定时器和异步操作
    this.setData({ loading: false })
    hideLoading()
  },

  // 处理页面参数
  handleOptions: function (options) {
    const { date, type } = options
    
    // 设置默认日期
    if (date) {
      this.setData({
        'form.due_date': date,
        datePickerValue: date
      })
    } else {
      const today = formatDate(new Date())
      this.setData({
        'form.due_date': today,
        datePickerValue: today
      })
    }
    
    // 设置默认时间
    const now = new Date()
    const timeStr = formatTime(now)
    this.setData({
      'form.due_time': timeStr,
      timePickerValue: timeStr
    })
    
    // 设置模式
    if (type === 'ai-text') {
      this.setData({ mode: 'ai-text' })
    } else if (type === 'ai-image') {
      this.setData({ mode: 'ai-image' })
    }
    
    // 初始化表单验证状态
    this.updateFormValid()
  },

  // 切换模式
  onModeChange: function (e) {
    const { mode } = e.currentTarget.dataset
    this.setData({ mode })
    
    // 清空相关数据
    if (mode === 'ai-text') {
      this.setData({
        aiAnalysisText: '',
        extractedTodos: [],
        currentTodoIndex: 0
      })
    } else if (mode === 'ai-image') {
      this.setData({
        selectedImage: null,
        extractedTodos: [],
        currentTodoIndex: 0
      })
    } else if (mode === 'manual') {
      this.setData({
        extractedTodos: [],
        currentTodoIndex: 0
      })
    }
  },

  // 表单输入处理
  onTitleInput: function (e) {
    this.setData({
      'form.title': e.detail.value
    }, () => {
      this.updateFormValid()
    })
  },

  onDescriptionInput: function (e) {
    this.setData({
      'form.description': e.detail.value
    })
  },

  onDateChange: function (e) {
    const date = e.detail.value
    this.setData({
      'form.due_date': date,
      datePickerValue: date
    }, () => {
      this.updateFormValid()
    })
  },

  onTimeChange: function (e) {
    const time = e.detail.value
    this.setData({
      'form.due_time': time,
      timePickerValue: time
    })
  },

  onPriorityChange: function (e) {
    const priority = e.detail.value
    this.setData({
      'form.priority': priority
    })
  },

  onReminderToggle: function (e) {
    this.setData({
      'form.reminder_enabled': e.detail.value
    })
  },

  onReminderMethodChange: function (e) {
    const method = e.detail.value
    this.setData({
      'form.reminder_method': method
    })
  },

  // 标签管理
  onTagTap: function (e) {
    const { tag } = e.currentTarget.dataset
    const { tags } = this.data.form
    
    if (tags.includes(tag)) {
      // 移除标签
      const newTags = tags.filter(t => t !== tag)
      this.setData({
        'form.tags': newTags
      })
    } else {
      // 添加标签
      this.setData({
        'form.tags': [...tags, tag]
      })
    }
  },

  onAddCustomTag: function () {
    wx.showModal({
      title: '添加自定义标签',
      content: '请输入标签名称',
      editable: true,
      placeholderText: '请输入标签名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const tag = res.content.trim()
          if (tag) {
            const { tags } = this.data.form
            if (!tags.includes(tag)) {
              this.setData({
                'form.tags': [...tags, tag]
              })
            }
          }
        }
      }
    })
  },

  // AI文字分析
  onAiTextInput: function (e) {
    this.setData({
      aiAnalysisText: e.detail.value
    })
  },

  onAiTextAnalysis: async function () {
    const { aiAnalysisText } = this.data
    
    if (!aiAnalysisText.trim()) {
      showError('请输入要分析的文字内容')
      return
    }
    
    this.setData({ loading: true })
    showLoading('AI分析中...')
    
    try {
      console.log('[AddTodo] 开始AI文字分析:', {
        text: aiAnalysisText,
        textLength: aiAnalysisText.length,
        conversationId: this.data.conversationId,
        appAuthToken: app.globalData.authToken ? `${app.globalData.authToken.substring(0, 20)}...` : '无'
      })
      
      // 对比curl命令的数据格式
      const expectedData = {
        text: "明天下午3点在支行B1召开客户经理例会",
        conversation_id: null
      }
      console.log('[AddTodo] 对比curl数据格式:', {
        expected: expectedData,
        actual: { text: aiAnalysisText.trim(), conversation_id: this.data.conversationId }
      })
      
      const result = await api.ai.analyzeText(aiAnalysisText, this.data.conversationId)
      
      console.log('[AddTodo] AI分析结果:', result)
      
      if (result.extracted) {
        // 文字识别返回的是单个对象，而不是数组
        const extractedData = Array.isArray(result.extracted) ? result.extracted : [result.extracted]
        
        this.setData({
          extractedTodos: extractedData,
          currentTodoIndex: 0,
          conversationId: result.conversation_id
        })
        
        // 将AI分析结果填充到表单
        this.fillFormWithAiResult(extractedData[0])
        
        const count = extractedData.length
        showSuccess(`AI分析完成，共识别到 ${count} 个待办事项`)
      } else {
        console.warn('[AddTodo] AI分析结果为空:', result)
        showError('AI分析未能识别出待办事项，请尝试更明确的描述')
      }
      
    } catch (error) {
      console.error('[AddTodo] AI文字分析失败:', error)
      
      // 根据错误类型提供不同的提示
      let errorMsg = 'AI分析失败，请重试'
      if (error.message.includes('AI服务暂时不可用')) {
        errorMsg = 'AI服务暂时不可用，您可以切换到手动输入模式'
        // 延迟提示切换到手动输入
        setTimeout(() => {
          wx.showModal({
            title: '切换输入模式',
            content: '当前AI服务不可用，是否切换到手动输入模式？',
            success: (res) => {
              if (res.confirm) {
                this.setData({ mode: 'manual' })
              }
            }
          })
        }, 1500)
      } else if (error.message.includes('网络')) {
        errorMsg = '网络连接异常，请检查网络后重试'
      } else if (error.message.includes('超时')) {
        errorMsg = 'AI分析超时，请尝试简化文字内容'
      }
      
      showError(errorMsg)
    } finally {
      hideLoading()
      this.setData({ loading: false })
    }
  },

  // 图片选择和分析
  onChooseImage: async function () {
    try {
      console.log('[AddTodo] 开始选择图片')
      
      // 检查权限
      const hasPermission = await this.checkImagePermission()
      if (!hasPermission) {
        showError('需要相册或相机权限才能选择图片')
        return
      }
      
      const images = await imageUtils.chooseImage(1, ['album', 'camera'])
      
      console.log('[AddTodo] 图片选择结果:', images)
      
      if (images && images.length > 0) {
        const selectedImagePath = images[0]
        console.log('[AddTodo] 选中的图片路径:', selectedImagePath)
        
        // 验证图片路径是否有效
        if (!selectedImagePath || selectedImagePath.length < 10) {
          console.error('[AddTodo] 图片路径无效:', selectedImagePath)
          showError('图片路径无效，请重新选择')
          return
        }
        
        this.setData({
          selectedImage: selectedImagePath
        })
        
        // 自动进行AI分析
        this.onImageAnalysis()
      } else {
        showError('未选择图片')
      }
      
    } catch (error) {
      console.error('[AddTodo] 选择图片失败:', error)
      showError(`选择图片失败: ${error.message || '未知错误'}`)
    }
  },

  // 检查图片权限
  checkImagePermission: function () {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          console.log('[AddTodo] 当前权限设置:', res.authSetting)
          
          // 如果权限被明确拒绝，引导用户去设置
          if (res.authSetting['scope.album'] === false || res.authSetting['scope.camera'] === false) {
            wx.showModal({
              title: '需要权限',
              content: '请在设置中允许访问相册和相机',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting()
                }
                resolve(false)
              }
            })
          } else {
            resolve(true)
          }
        },
        fail: () => {
          resolve(true) // 获取设置失败时默认允许尝试
        }
      })
    })
  },

  onImageAnalysis: async function () {
    const { selectedImage } = this.data
    
    if (!selectedImage) {
      showError('请先选择图片')
      return
    }
    
    console.log('[AddTodo] 开始图片AI分析:', {
      imagePath: selectedImage,
      imagePathType: typeof selectedImage,
      conversationId: this.data.conversationId
    })
    
    this.setData({ loading: true })
    showLoading('图片识别中...')
    
    try {
      const result = await api.ai.analyzeImage(selectedImage, this.data.conversationId)
      
      console.log('[AddTodo] 图片AI分析结果:', result)
      
      if (result.extracted && result.extracted.length > 0) {
        this.setData({
          extractedTodos: result.extracted,
          currentTodoIndex: 0,
          conversationId: result.conversation_id
        })
        
        // 将第一个AI分析结果填充到表单
        this.fillFormWithAiResult(result.extracted[0])
        
        const count = result.extracted.length
        showSuccess(`图片识别完成，共识别到 ${count} 个待办事项`)
      } else {
        console.warn('[AddTodo] 图片AI分析结果为空:', result)
        showError('图片识别未能识别出待办事项，请尝试更清晰的图片')
      }
      
    } catch (error) {
      console.error('[AddTodo] 图片分析失败:', error)
      
      // 根据错误类型提供不同的提示
      let errorMsg = '图片分析失败，请重试'
      if (error.message.includes('AI服务暂时不可用')) {
        errorMsg = 'AI服务暂时不可用，您可以切换到手动输入模式'
      } else if (error.message.includes('图片上传失败')) {
        errorMsg = '图片上传失败，请检查图片格式和大小'
      } else if (error.message.includes('网络')) {
        errorMsg = '网络连接异常，请检查网络后重试'
      }
      
      showError(errorMsg)
    } finally {
      hideLoading()
      this.setData({ loading: false })
    }
  },

  // 清除图片
  onClearImage: function () {
    this.setData({
      selectedImage: null,
      extractedTodos: [],
      currentTodoIndex: 0
    })
  },

  // 预览图片
  onPreviewImage: function () {
    const { selectedImage } = this.data
    if (selectedImage) {
      imageUtils.previewImage([selectedImage])
    }
  },

  // 用AI结果填充表单
  fillFormWithAiResult: function (aiResult) {
    console.log('[AddTodo] 填充表单，AI结果:', aiResult)
    
    const updatedForm = { ...this.data.form }
    
    if (aiResult.title) updatedForm.title = aiResult.title
    if (aiResult.description) updatedForm.description = aiResult.description
    
    // 处理日期字段映射 - 优先使用due_date（文字识别），其次date（图片识别）
    if (aiResult.due_date) {
      updatedForm.due_date = aiResult.due_date
      this.setData({ datePickerValue: aiResult.due_date })
      console.log('[AddTodo] 使用due_date字段:', aiResult.due_date)
    } else if (aiResult.date) {
      updatedForm.due_date = aiResult.date
      this.setData({ datePickerValue: aiResult.date })
      console.log('[AddTodo] 使用date字段:', aiResult.date)
    }
    
    // 处理时间字段映射 - 优先使用due_time（文字识别），其次time（图片识别）
    if (aiResult.due_time) {
      updatedForm.due_time = aiResult.due_time
      this.setData({ timePickerValue: aiResult.due_time })
      console.log('[AddTodo] 使用due_time字段:', aiResult.due_time)
    } else if (aiResult.time) {
      updatedForm.due_time = aiResult.time
      this.setData({ timePickerValue: aiResult.time })
      console.log('[AddTodo] 使用time字段:', aiResult.time)
    }
    
    if (aiResult.priority) updatedForm.priority = aiResult.priority
    
    // 处理标签字段 - 优先使用tags（文字识别），其次category（图片识别）
    if (aiResult.tags) {
      updatedForm.tags = Array.isArray(aiResult.tags) ? aiResult.tags : [aiResult.tags]
      console.log('[AddTodo] 使用tags字段:', aiResult.tags, '转换后:', updatedForm.tags)
    } else if (aiResult.category) {
      updatedForm.tags = [aiResult.category]
      console.log('[AddTodo] 使用category字段:', aiResult.category, '转换后:', updatedForm.tags)
    } else {
      console.log('[AddTodo] 未找到标签数据，AI结果:', aiResult)
      updatedForm.tags = [] // 确保是空数组而不是undefined
    }
    
    // 处理涉及人员字段映射：involved_people -> involved_users  
    if (aiResult.involved_people && Array.isArray(aiResult.involved_people)) {
      updatedForm.involved_users = aiResult.involved_people
      console.log('[AddTodo] 使用involved_people字段:', aiResult.involved_people)
    } else if (aiResult.involved_users && Array.isArray(aiResult.involved_users)) {
      updatedForm.involved_users = aiResult.involved_users
      console.log('[AddTodo] 使用involved_users字段:', aiResult.involved_users)
    } else {
      updatedForm.involved_users = []
    }
    
    if (aiResult.reminder_enabled !== undefined) updatedForm.reminder_enabled = aiResult.reminder_enabled
    if (aiResult.reminder_method) updatedForm.reminder_method = aiResult.reminder_method
    
    console.log('[AddTodo] 更新后的表单数据:', updatedForm)
    
    // 确保数组字段正确处理
    if (updatedForm.tags && !Array.isArray(updatedForm.tags)) {
      updatedForm.tags = []
    }
    if (updatedForm.involved_users && !Array.isArray(updatedForm.involved_users)) {
      updatedForm.involved_users = []
    }
    
    this.setData({ form: updatedForm }, () => {
      this.updateFormValid()
      // 验证数据是否正确设置
      console.log('[AddTodo] setData后的form.tags:', this.data.form.tags)
      console.log('[AddTodo] setData后的form.involved_users:', this.data.form.involved_users)
    })
  },



  onNextTodo: function () {
    const { currentTodoIndex, extractedTodos } = this.data
    if (currentTodoIndex < extractedTodos.length - 1) {
      const newIndex = currentTodoIndex + 1
      this.setData({ currentTodoIndex: newIndex })
      this.fillFormWithAiResult(extractedTodos[newIndex])
    }
  },

  onSkipTodo: function () {
    const { currentTodoIndex, extractedTodos } = this.data
    if (currentTodoIndex < extractedTodos.length - 1) {
      // 跳过当前，显示下一个
      this.onNextTodo()
    } else {
      // 已经是最后一个，完成所有待办事项处理
      showSuccess('所有待办事项已处理完成')
      // 减少延迟时间，避免webview管理问题
      setTimeout(() => {
        if (this.data) { // 确保页面还存在
          wx.navigateBack()
        }
      }, 800)
    }
  },

  onSaveAndNext: async function () {
    if (!this.validateForm()) return
    
    if (this.data.loading) return
    
    this.setData({ loading: true })
    showLoading('保存中...')
    
    try {
      const result = await api.todo.createTodo(this.data.form)
      
      if (result.todo) {
        const { currentTodoIndex, extractedTodos } = this.data
        showSuccess('待办事项保存成功')
        
        if (currentTodoIndex < extractedTodos.length - 1) {
          // 还有更多待办事项，显示下一个
          setTimeout(() => {
            if (this.data) { // 确保页面还存在
              this.onNextTodo()
            }
          }, 800)
        } else {
          // 已经是最后一个，完成所有待办事项处理
          setTimeout(() => {
            if (this.data) { // 确保页面还存在
              showSuccess('所有待办事项已保存完成')
              // 进一步减少延迟，避免嵌套setTimeout
              setTimeout(() => {
                if (this.data) {
                  wx.navigateBack()
                }
              }, 800)
            }
          }, 500)
        }
      } else {
        showError('保存失败，请重试')
      }
      
    } catch (error) {
      console.error('[AddTodo] 保存待办失败:', error)
      showError('保存失败: ' + error.message)
    } finally {
      hideLoading()
      this.setData({ loading: false })
    }
  },

  // 更新表单验证状态
  updateFormValid: function () {
    const { title, due_date } = this.data.form
    const isValid = title && title.length > 0 && due_date
    this.setData({
      formValid: isValid
    })
  },

  // 表单验证
  validateForm: function () {
    const { title, due_date } = this.data.form
    
    if (!title || title.length === 0) {
      showError('请输入待办事项标题')
      return false
    }
    
    if (!due_date) {
      showError('请选择截止日期')
      return false
    }
    
    return true
  },

  // 提交表单
  onSubmit: async function () {
    if (!this.validateForm()) return
    
    if (this.data.loading) return
    
    this.setData({ loading: true })
    showLoading('保存中...')
    
    try {
      const result = await api.todo.createTodo(this.data.form)
      
      if (result.todo) {
        showSuccess('待办事项创建成功')
        
        // 减少延迟时间，避免webview管理问题
        setTimeout(() => {
          if (this.data) { // 确保页面还存在
            wx.navigateBack()
          }
        }, 800)
      } else {
        showError('创建失败，请重试')
      }
      
    } catch (error) {
      console.error('[AddTodo] 创建待办失败:', error)
      showError('创建失败: ' + error.message)
    } finally {
      hideLoading()
      this.setData({ loading: false })
    }
  },



  // 导航方法
  navigateToLogin: function () {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  // 工具方法
  showInputDialog: function (title, placeholder = '') {
    return new Promise((resolve) => {
      // 简化处理，实际应该用自定义弹窗
      wx.showModal({
        title: title,
        content: `请在下方输入${placeholder}`,
        editable: true,
        success: (res) => {
          resolve(res.confirm ? res.content : null)
        }
      })
    })
  }
}) 