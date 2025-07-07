const app = getApp()
const api = require('../../utils/api')
const common = require('../../utils/common')
const { dateUtils, showLoading, hideLoading, showError, showSuccess, navigateUtils } = common
const { formatDate } = dateUtils

Page({
  data: {
    // 用户信息
    userInfo: {},
    
    // 日历数据
    currentDate: new Date(),
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    today: new Date(),
    
    // 日历显示
    monthName: '',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    
    // 待办事项
    todos: [],
    selectedDate: null,
    selectedTodos: [],
    
    // 节假日
    holidays: {},
    
    // 加载状态
    loading: false,
    refreshing: false,
    
    // 统计数据
    todoStats: {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0
    }
  },

  onLoad: function () {
    console.log('[Calendar] 日历页面加载')
    
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      this.navigateToLogin()
      return
    }
    
    // 设置用户信息
    this.setUserInfo()
    
    // 初始化页面
    this.initCalendar()
  },

  onShow: function () {
    console.log('[Calendar] 日历页面显示')
    
    // 刷新待办事项
    this.loadTodos()
  },

  onReady: function () {
    console.log('[Calendar] 日历页面就绪')
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: 'AI待办助理'
    })
  },

  // 设置用户信息
  setUserInfo: function () {
    const userInfo = app.globalData.userInfo || {}
    this.setData({
      userInfo: userInfo
    })
  },

  // 初始化日历
  initCalendar: function () {
    const now = new Date()
    this.setData({
      currentDate: now,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      today: now
    })
    
    // 生成日历数据
    this.generateCalendar()
    
    // 加载节假日数据
    this.loadHolidays()
    
    // 加载待办事项
    this.loadTodos()
  },

  // 生成日历数据
  generateCalendar: function () {
    const { year, month } = this.data
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    // 获取当月第一天是周几
    const firstDayWeek = firstDay.getDay()
    
    // 获取当月天数
    const daysInMonth = lastDay.getDate()
    
    // 生成日历数据
    const calendarDays = []
    
    // 填充上个月的末尾几天
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      calendarDays.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        fullDate: new Date(year, month - 2, prevMonthLastDay - i)
      })
    }
    
    // 填充当月的所有天
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month - 1, day)
      const dateStr = formatDate(fullDate)
      
      calendarDays.push({
        day: day,
        isCurrentMonth: true,
        fullDate: fullDate,
        dateStr: dateStr,
        isToday: this.isSameDay(fullDate, this.data.today),
        isWeekend: fullDate.getDay() === 0 || fullDate.getDay() === 6
      })
    }
    
    // 填充下个月的开头几天，确保总是6行
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        day: day,
        isCurrentMonth: false,
        isNextMonth: true,
        fullDate: new Date(year, month, day)
      })
    }
    
    // 更新数据
    this.setData({
      calendarDays: calendarDays,
      monthName: `${year}年${month}月`
    })
  },

  // 加载节假日数据
  loadHolidays: async function () {
    try {
      const { year, month } = this.data
      const result = await api.holiday.getHolidays(year, month)
      
      if (result.holidays) {
        this.setData({
          holidays: result.holidays
        })
        
        // 更新日历显示
        this.updateCalendarWithHolidays()
      }
      
    } catch (error) {
      console.error('[Calendar] 加载节假日失败:', error)
      // 节假日加载失败不影响主要功能
    }
  },

  // 更新日历显示节假日
  updateCalendarWithHolidays: function () {
    const { calendarDays, holidays } = this.data
    
    const updatedDays = calendarDays.map(day => {
      if (day.isCurrentMonth && day.dateStr) {
        const holidayInfo = holidays[day.dateStr]
        if (holidayInfo) {
          return {
            ...day,
            isHoliday: true,
            holidayName: holidayInfo.name,
            isOffDay: holidayInfo.isOffDay
          }
        }
      }
      return day
    })
    
    this.setData({
      calendarDays: updatedDays
    })
  },

  // 加载待办事项
  loadTodos: async function () {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 获取当月所有待办事项
      const result = await api.todo.getTodos({
        page: 1,
        limit: 100 // 获取足够多的数据
      })
      
      if (result.todos) {
        // 过滤当月的待办事项
        const { year, month } = this.data
        const currentMonthTodos = result.todos.filter(todo => {
          const dueDate = new Date(todo.due_date)
          return dueDate.getFullYear() === year && dueDate.getMonth() + 1 === month
        }).map(todo => {
          // 转换优先级为英文，以便生成正确的CSS类名
          const priority = api.utils.parsePriority(todo.priority)
          const priorityClass = common.priorityUtils.getCssClass(priority)
          return {
            ...todo,
            priority: priority,
            priorityClass: priorityClass,
            priorityLabel: common.priorityUtils.getInfo(priority).label
          }
        })
        
        this.setData({
          todos: currentMonthTodos
        })
        
        // 更新日历显示
        this.updateCalendarWithTodos()
        
        // 更新统计数据
        this.updateTodoStats()
      }
      
    } catch (error) {
      console.error('[Calendar] 加载待办事项失败:', error)
      showError('加载待办事项失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 更新日历显示待办事项
  updateCalendarWithTodos: function () {
    const { calendarDays, todos } = this.data
    
    // 按日期分组待办事项
    const todosByDate = {}
    todos.forEach(todo => {
      const date = todo.due_date
      if (!todosByDate[date]) {
        todosByDate[date] = []
      }
      todosByDate[date].push(todo)
    })
    
    // 更新日历数据
    const updatedDays = calendarDays.map(day => {
      if (day.isCurrentMonth && day.dateStr) {
        const dayTodos = todosByDate[day.dateStr] || []
        const completedCount = dayTodos.filter(todo => todo.completed).length
        const pendingCount = dayTodos.filter(todo => !todo.completed).length
        
        return {
          ...day,
          hasTodos: dayTodos.length > 0,
          todoCount: dayTodos.length,
          completedCount: completedCount,
          pendingCount: pendingCount,
          todos: dayTodos
        }
      }
      return day
    })
    
    this.setData({
      calendarDays: updatedDays
    })
  },

  // 更新统计数据
  updateTodoStats: function () {
    const { todos } = this.data
    
    const total = todos.length
    const completed = todos.filter(todo => todo.completed).length
    const pending = todos.filter(todo => !todo.completed).length
    
    // 计算过期的待办事项
    const today = new Date()
    const overdue = todos.filter(todo => {
      if (todo.completed) return false
      const dueDate = new Date(todo.due_date)
      return dueDate < today
    }).length
    
    this.setData({
      todoStats: {
        total,
        completed,
        pending,
        overdue
      }
    })
  },

  // 点击日期
  onDateTap: function (e) {
    const { index } = e.currentTarget.dataset
    const day = this.data.calendarDays[index]
    
    if (!day.isCurrentMonth) return
    
    const selectedDate = day.dateStr
    const selectedTodos = day.todos || []
    
    this.setData({
      selectedDate: selectedDate,
      selectedTodos: selectedTodos
    })
  },

  // 上个月
  onPrevMonth: function () {
    let { year, month } = this.data
    
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
    
    this.setData({
      year: year,
      month: month
    })
    
    this.generateCalendar()
    this.loadHolidays()
    this.loadTodos()
  },

  // 下个月
  onNextMonth: function () {
    let { year, month } = this.data
    
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    
    this.setData({
      year: year,
      month: month
    })
    
    this.generateCalendar()
    this.loadHolidays()
    this.loadTodos()
  },



  // 下拉刷新
  onPullDownRefresh: function () {
    this.setData({ refreshing: true })
    
    Promise.all([
      this.loadHolidays(),
      this.loadTodos()
    ]).finally(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  // 添加待办
  onAddTodo: function () {
    const selectedDate = this.data.selectedDate || formatDate(new Date())
    this.navigateToAddTodo(selectedDate)
  },

  // 退出登录
  onLogout: function () {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  // 执行退出登录
  performLogout: function () {
    try {
      // 清除应用数据
      app.logout()
      
      // 显示提示
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      
      // 跳转到登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 1000)
      
    } catch (error) {
      console.error('[Calendar] 退出登录失败:', error)
      wx.showToast({
        title: '退出失败',
        icon: 'error'
      })
    }
  },

  // 切换待办状态
  onToggleTodo: async function (e) {
    const { id } = e.currentTarget.dataset
    
    // 找到当前待办事项
    const currentTodo = this.data.selectedTodos.find(todo => todo.id == id)
    if (!currentTodo) {
      showError('待办事项不存在')
      return
    }
    
    try {
      // 先立即更新本地显示（乐观更新）
      const updatedSelectedTodos = this.data.selectedTodos.map(todo => {
        if (todo.id == id) {
          return { ...todo, completed: !todo.completed }
        }
        return todo
      })
      
      this.setData({
        selectedTodos: updatedSelectedTodos
      })
      
      // 调用API切换状态
      await api.todo.toggleTodo(id, currentTodo.completed)
      
      // 重新加载待办事项以确保数据一致性
      await this.loadTodos()
      
      // 更新当前选中日期的待办事项显示
      this.updateSelectedTodos()
      
      showSuccess('状态已更新')
      
    } catch (error) {
      console.error('[Calendar] 切换待办状态失败:', error)
      showError('操作失败，请重试')
      
      // 如果API调用失败，恢复原状态
      this.updateSelectedTodos()
    }
  },

  // 更新当前选中日期的待办事项显示
  updateSelectedTodos: function () {
    const { selectedDate, calendarDays } = this.data
    
    if (!selectedDate) return
    
    // 找到对应的日期对象
    const selectedDay = calendarDays.find(day => day.dateStr === selectedDate)
    if (selectedDay && selectedDay.todos) {
      this.setData({
        selectedTodos: selectedDay.todos
      })
    }
  },

  // 导航方法
  navigateToLogin: function () {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  navigateToAddTodo: function (date) {
    wx.navigateTo({
      url: `/pages/add-todo/add-todo?date=${date}`
    })
  },

  navigateToTodoDetail: function (id) {
    wx.navigateTo({
      url: `/pages/todo-detail/todo-detail?id=${id}`
    })
  },

  navigateToTodoList: function () {
    wx.navigateTo({
      url: '/pages/todo-list/todo-list'
    })
  },

  // 工具方法
  isSameDay: function (date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: 'AI待办助理 - 智能管理您的待办事项',
      path: '/pages/calendar/calendar',
      imageUrl: '/images/share-calendar.png'
    }
  }
}) 