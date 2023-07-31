<template>
  <div class="color-strip">
    <div
      v-for="(color, index) in colors"
      :key="index"
      :style="{ backgroundColor: color }"
      @mousemove="onMouseMove($event, index)"></div>
    <div class="color-value" v-if="showValue">
      {{ value }}
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // 颜色条的颜色数组
      colors: [],
      // 当前鼠标所在的颜色索引
      currentIndex: -1,
      // 是否显示数值
      showValue: false,
      // 当前数值
      value: 0,
      // 最大数值
      maxValue: 100,
    }
  },
  mounted() {
    // 初始化颜色条
    for (let i = 0; i <= 100; i += 5) {
      const color = this.getColorByValue(i, 100)
      this.colors.push(color)
    }
  },
  methods: {
    // 根据数值获取颜色
    getColorByValue(value, maxValue) {
      const brightness = Math.round((value / maxValue) * 255)
      const red = brightness
      const green = 255 - brightness
      const redHex = red.toString(16).padStart(2, '0')
      const greenHex = green.toString(16).padStart(2, '0')
      return `#${redHex}${greenHex}ff`
    },
    // 鼠标移动事件处理函数
    onMouseMove(event, index) {
      this.currentIndex = index
      this.showValue = true
      this.value = Math.round((index / this.colors.length) * this.maxValue)
      const rect = event.target.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.$nextTick(() => {
        const valueEl = this.$el.querySelector('.color-value')
        valueEl.style.left = `${x}px`
        valueEl.style.top = `${y}px`
      })
    },
  },
}
</script>

<style scoped>
.color-strip {
  display: flex;
  flex-wrap: wrap;
  width: 200px;
  height: 100px;
  position: relative;
}

.color-strip div {
  flex: 1 1 0;
  height: 100%;
  cursor: pointer;
}

.color-value {
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
